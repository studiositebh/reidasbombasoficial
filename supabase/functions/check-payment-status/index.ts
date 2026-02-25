import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id, payment_id } = await req.json();

    if (!order_id && !payment_id) {
      return new Response(
        JSON.stringify({ error: "order_id or payment_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let mpPaymentId = payment_id;

    // If we only have order_id, get payment_id from database
    if (!mpPaymentId && order_id) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("payment_id, status")
        .eq("id", order_id)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If already paid, return immediately
      if (order.status === "paid") {
        return new Response(
          JSON.stringify({
            status: "approved",
            order_status: "paid",
            message: "Pagamento já confirmado",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      mpPaymentId = order.payment_id;
    }

    if (!mpPaymentId) {
      return new Response(
        JSON.stringify({ 
          status: "pending",
          order_status: "pending",
          message: "Aguardando pagamento",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check payment status on Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
    });

    if (!mpResponse.ok) {
      console.error("Mercado Pago API error:", await mpResponse.text());
      return new Response(
        JSON.stringify({ 
          status: "unknown",
          message: "Não foi possível verificar o status do pagamento",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mpData = await mpResponse.json();
    const mpStatus = mpData.status;
    const statusDetail = mpData.status_detail;

    console.log(`Payment ${mpPaymentId} status: ${mpStatus} (${statusDetail})`);

    // Map Mercado Pago status to our order status
    const orderStatus = mapPaymentStatus(mpStatus);

    // If payment is approved, update order and decrement stock
    if (mpStatus === "approved" && order_id) {
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("status")
        .eq("id", order_id)
        .single();

      // Only update if not already paid (avoid duplicate stock decrement)
      if (currentOrder && currentOrder.status !== "paid") {
        // Get current metadata and merge
        const { data: orderData } = await supabase
          .from("orders")
          .select("metadata")
          .eq("id", order_id)
          .single();

        const updatedMetadata = {
          ...(orderData?.metadata || {}),
          mp_status: mpStatus,
          mp_status_detail: statusDetail,
          paid_at: new Date().toISOString(),
        };

        // Update order status
        await supabase
          .from("orders")
          .update({
            status: "paid",
            metadata: updatedMetadata,
          })
          .eq("id", order_id);

        // Get order items to decrement stock
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("variant_id, quantity")
          .eq("order_id", order_id);

        if (orderItems) {
          for (const item of orderItems) {
            await supabase.rpc("decrement_stock", {
              p_variant_id: item.variant_id,
              p_quantity: item.quantity,
            });
          }
        }

        // Trigger email notification (fire and forget)
        try {
          const { data: order } = await supabase
            .from("orders")
            .select("*, metadata")
            .eq("id", order_id)
            .single();

          if (order?.metadata?.buyer_email) {
            fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                to: order.metadata.buyer_email,
                order_id: order_id,
                tracking_token: order.tracking_token,
                total_amount: order.total_amount,
                type: "payment_confirmed",
              }),
            }).catch(console.error);
          }
        } catch (e) {
          console.error("Error sending notification:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: mpStatus,
        status_detail: statusDetail,
        order_status: orderStatus,
        message: getStatusMessage(mpStatus, statusDetail),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapPaymentStatus(mpStatus: string): string {
  switch (mpStatus) {
    case "approved":
      return "paid";
    case "pending":
    case "in_process":
    case "authorized":
      return "pending";
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "cancelled";
    default:
      return "pending";
  }
}

function getStatusMessage(status: string, detail?: string): string {
  const messages: Record<string, string> = {
    approved: "Pagamento aprovado! Seu pedido está sendo processado.",
    pending: "Aguardando confirmação do pagamento...",
    in_process: "Pagamento em processamento...",
    authorized: "Pagamento autorizado, aguardando captura...",
    rejected: "Pagamento recusado.",
    cancelled: "Pagamento cancelado.",
    refunded: "Pagamento estornado.",
    charged_back: "Pagamento contestado.",
  };

  return messages[status] || "Status desconhecido";
}
