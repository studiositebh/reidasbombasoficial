import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getMercadoPagoCredentials } from "../_shared/mercadopago-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

/**
 * Verify MercadoPago webhook signature using HMAC-SHA256
 * @see https://www.mercadopago.com/developers/en/docs/your-integrations/notifications/webhooks#signature
 */
async function verifyMercadoPagoSignature(
  req: Request,
  body: { data?: { id?: string | number }; [key: string]: unknown },
  secret: string
): Promise<boolean> {
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  // If no signature headers, webhook might be from older integration or test
  if (!xSignature || !xRequestId) {
    console.warn("Missing signature headers - allowing for backwards compatibility");
    // In production, you may want to return false here after confirming all webhooks have signatures
    return true;
  }

  try {
    // Parse x-signature header: ts=timestamp,v1=hash
    const parts: Record<string, string> = {};
    xSignature.split(",").forEach((part) => {
      const [key, value] = part.split("=");
      if (key && value) {
        parts[key.trim()] = value.trim();
      }
    });

    const ts = parts["ts"];
    const hash = parts["v1"];

    if (!ts || !hash) {
      console.error("Invalid x-signature format");
      return false;
    }

    // Extract data.id from body
    const dataId = body.data?.id;
    if (!dataId) {
      console.error("No data.id in body for signature verification");
      return false;
    }

    // Construct the signed content as per MercadoPago spec
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // Compute HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
    const computedHash = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const isValid = computedHash === hash;
    if (!isValid) {
      console.error("Signature mismatch", { expected: hash, computed: computedHash });
    }
    return isValid;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get credentials from database (with fallback to env vars)
    const mpCredentials = await getMercadoPagoCredentials();
    const MERCADO_PAGO_ACCESS_TOKEN = mpCredentials.accessToken;
    const WEBHOOK_SECRET = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET") || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook payload
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      const isValidSignature = await verifyMercadoPagoSignature(req, body, WEBHOOK_SECRET);
      if (!isValidSignature) {
        console.error("Invalid webhook signature - rejecting request");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Webhook signature verified successfully");
    } else {
      console.warn("MERCADOPAGO_WEBHOOK_SECRET not configured - skipping signature verification");
    }

    // Mercado Pago sends different types of notifications
    // We're interested in payment notifications
    if (body.type !== "payment") {
      console.log("Ignoring non-payment notification:", body.type);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.log("No payment ID in webhook");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment details from Mercado Pago
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      }
    );

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error("Error fetching payment:", errorText);
      throw new Error("Failed to fetch payment details");
    }

    const payment = await paymentResponse.json();
    console.log("Payment details:", JSON.stringify(payment));

    const orderId = payment.external_reference;
    const paymentStatus = payment.status;
    const paymentMethod = payment.payment_type_id;

    if (!orderId) {
      console.log("No order ID (external_reference) in payment");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current order status to check if we need to process
    const { data: currentOrder, error: orderCheckError } = await supabase
      .from("orders")
      .select("status, metadata, tracking_token, total_amount")
      .eq("id", orderId)
      .single();

    if (orderCheckError) {
      console.error("Error fetching current order:", orderCheckError);
    }

    // SECURITY: Verify payment amount matches order total (within tolerance for rounding)
    if (currentOrder && payment.transaction_amount) {
      const orderTotal = currentOrder.total_amount || 0;
      const paymentAmount = payment.transaction_amount;
      const difference = Math.abs(orderTotal - paymentAmount);
      
      // Allow 1% tolerance for rounding differences
      const tolerance = orderTotal * 0.01;
      if (difference > tolerance && difference > 1) {
        console.error("Payment amount mismatch!", {
          orderId,
          orderTotal,
          paymentAmount,
          difference,
        });
        // Log but don't reject - MercadoPago may have fees deducted
      }
    }

    // Map Mercado Pago status to our order status
    let orderStatus: string;
    switch (paymentStatus) {
      case "approved":
        orderStatus = "paid";
        break;
      case "pending":
      case "in_process":
      case "authorized":
        orderStatus = "pending";
        break;
      case "rejected":
      case "cancelled":
      case "refunded":
      case "charged_back":
        orderStatus = "cancelled";
        break;
      default:
        orderStatus = "pending";
    }

    // Check if this is a new approval (avoid duplicate processing)
    const isNewApproval = paymentStatus === "approved" && currentOrder?.status !== "paid";

    // Update order with payment info
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: orderStatus,
        payment_id: paymentId.toString(),
        payment_method: paymentMethod,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw new Error("Failed to update order");
    }

    console.log(`Order ${orderId} updated to status: ${orderStatus}`);

    // If payment is approved and this is a new approval, decrement stock and send email
    if (isNewApproval) {
      // Get order items
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select(`
          variant_id, 
          quantity,
          unit_price,
          variants!inner(
            sku,
            attrs,
            products!inner(title)
          )
        `)
        .eq("order_id", orderId);

      if (itemsError) {
        console.error("Error fetching order items:", itemsError);
      } else if (orderItems) {
        // Decrement stock for each item
        for (const item of orderItems) {
          const { data: stockResult, error: stockError } = await supabase.rpc(
            "decrement_stock",
            {
              p_variant_id: item.variant_id,
              p_quantity: item.quantity,
            }
          );

          if (stockError) {
            console.error(`Error decrementing stock for ${item.variant_id}:`, stockError);
          } else {
            console.log(`Stock decremented for ${item.variant_id}:`, stockResult);
          }
        }

        // Send payment confirmed email notification
        const buyerEmail = currentOrder?.metadata?.buyer_email;
        if (buyerEmail && currentOrder?.tracking_token) {
          console.log(`Sending payment confirmation email to ${buyerEmail}`);
          
          // Build items array for email
          const emailItems = orderItems.map((item: unknown) => {
            const typedItem = item as {
              quantity: number;
              unit_price: number;
              variants?: { products?: { title?: string }; sku?: string; attrs?: unknown };
            };
            return {
              title: typedItem.variants?.products?.title || "Produto",
              quantity: typedItem.quantity,
              unit_price: typedItem.unit_price,
              sku: typedItem.variants?.sku || "",
              attrs: typedItem.variants?.attrs || {},
            };
          });

          // Get shipping info from metadata
          const shippingInfo = currentOrder.metadata?.shipping_info || null;
          const shippingAddress = currentOrder.metadata?.shipping_address || null;

          try {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                to: buyerEmail,
                order_id: orderId,
                tracking_token: currentOrder.tracking_token,
                total_amount: currentOrder.total_amount,
                items: emailItems,
                shipping_info: shippingInfo,
                shipping_address: shippingAddress,
                type: "payment_confirmed",
                payment_method: paymentMethod,
              }),
            });

            const emailResult = await emailResponse.json();
            console.log("Payment confirmation email result:", emailResult);
          } catch (emailError) {
            console.error("Error sending payment confirmation email:", emailError);
            // Don't throw - email failure shouldn't fail the webhook
          }
        } else {
          console.log("No buyer email or tracking token found for payment confirmation");
        }
      }

      // Send admin notification for approved payments
      try {
        const buyerEmail = currentOrder?.metadata?.buyer_email;
        const buyerName = currentOrder?.metadata?.shipping_address?.name;
        
        await fetch(`${supabaseUrl}/functions/v1/notify-admin-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            order_id: orderId,
            status: "approved",
            payment_method: paymentMethod,
            total_amount: currentOrder?.total_amount || 0,
            buyer_email: buyerEmail || "",
            buyer_name: buyerName || "",
          }),
        });
        console.log("Admin notification sent for approved payment");
      } catch (adminNotifyError) {
        console.error("Error sending admin notification:", adminNotifyError);
      }

      // Hub sync is handled by process-payment (single source of truth)
      // Removed duplicate sync call to prevent multiple orders being sent to Hub
    }

    // Send admin notification for rejected payments
    if (paymentStatus === "rejected" || paymentStatus === "cancelled") {
      try {
        const buyerEmail = currentOrder?.metadata?.buyer_email;
        const buyerName = currentOrder?.metadata?.shipping_address?.name;
        
        await fetch(`${supabaseUrl}/functions/v1/notify-admin-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            order_id: orderId,
            status: "rejected",
            payment_method: paymentMethod,
            total_amount: currentOrder?.total_amount || 0,
            buyer_email: buyerEmail || "",
            buyer_name: buyerName || "",
            error_detail: payment.status_detail || "Pagamento não autorizado",
          }),
        });
        console.log("Admin notification sent for rejected payment");
      } catch (adminNotifyError) {
        console.error("Error sending admin notification:", adminNotifyError);
      }
    }

    return new Response(JSON.stringify({ received: true, order_status: orderStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    // Return 200 to avoid Mercado Pago retrying
    return new Response(JSON.stringify({ error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
