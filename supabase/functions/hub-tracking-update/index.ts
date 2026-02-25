import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seller-key",
};

interface TrackingUpdatePayload {
  external_order_id: string;
  tracking_code: string;
  carrier?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate authentication from Hub
    const sellerKey = req.headers.get("x-seller-key");
    
    // Get hub settings to validate the key
    const { data: settings } = await supabase
      .from("store_settings")
      .select("hub_api_key")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    // Allow if key matches our stored key (Hub calling us back)
    // In production, you might want a separate webhook secret
    if (!sellerKey || sellerKey !== settings?.hub_api_key) {
      console.warn("Invalid or missing x-seller-key");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: TrackingUpdatePayload = await req.json();
    const { external_order_id, tracking_code, carrier } = payload;

    if (!external_order_id || !tracking_code) {
      return new Response(
        JSON.stringify({ error: "external_order_id and tracking_code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received tracking update from Hub:", { external_order_id, tracking_code, carrier });

    // Get current order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, metadata, tracking_token, total_amount, user_id")
      .eq("id", external_order_id)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", external_order_id);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order with tracking info and set status to shipped
    const updatedMetadata = {
      ...(order.metadata as Record<string, unknown>),
      tracking_code: tracking_code,
      carrier: carrier || "Transportadora",
      shipped_at: new Date().toISOString(),
      hub_tracking_received: true,
    };

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "shipped",
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", external_order_id);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Order updated to shipped with tracking:", tracking_code);

    // Send shipping notification email to customer
    const buyerEmail = (order.metadata as Record<string, unknown>)?.buyer_email as string;
    const shippingAddress = (order.metadata as Record<string, unknown>)?.shipping_address as Record<string, unknown>;

    if (buyerEmail) {
      try {
        console.log("Sending shipping notification to:", buyerEmail);

        // Get order items for email
        const { data: orderItems } = await supabase
          .from("order_items")
          .select(`
            quantity,
            unit_price,
            variants!inner(
              sku,
              attrs,
              products!inner(title)
            )
          `)
          .eq("order_id", external_order_id);

        const emailItems = (orderItems || []).map((item) => {
          const variantData = item.variants as unknown as { sku: string; attrs: Record<string, unknown>; products: { title: string } };
          return {
            title: variantData?.products?.title || "Produto",
            quantity: item.quantity,
            unit_price: item.unit_price,
            sku: variantData?.sku || "",
            attrs: variantData?.attrs || {},
          };
        });

        await fetch(`${supabaseUrl}/functions/v1/send-shipping-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            to: buyerEmail,
            order_id: external_order_id,
            tracking_token: order.tracking_token,
            tracking_code: tracking_code,
            carrier: carrier || "Transportadora",
            total_amount: order.total_amount,
            items: emailItems,
            shipping_address: shippingAddress,
          }),
        });

        console.log("Shipping notification sent successfully");
      } catch (emailError) {
        console.error("Error sending shipping notification:", emailError);
        // Don't fail the webhook for email errors
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Tracking updated successfully",
        order_id: external_order_id,
        new_status: "shipped",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing tracking update:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
