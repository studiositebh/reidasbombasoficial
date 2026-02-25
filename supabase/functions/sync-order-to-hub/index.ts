import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HubOrderItem {
  sku: string;
  quantity: number;
}

interface HubShippingAddress {
  name: string;
  phone: string;
  cpf_cnpj: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface HubOrderPayload {
  external_order_id: string;
  items: HubOrderItem[];
  shipping_address: HubShippingAddress;
  shipping_method: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Syncing order to Hub:", order_id);

    // Get hub settings
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("hub_url, hub_api_key")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    if (settingsError || !settings?.hub_url || !settings?.hub_api_key) {
      console.log("Hub settings not configured, skipping sync");
      return new Response(
        JSON.stringify({ success: false, error: "Hub settings not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, shipping_address, metadata")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Error fetching order:", orderError);
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get order items with variant SKUs
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        quantity,
        variants!inner(sku)
      `)
      .eq("order_id", order_id);

    if (itemsError || !orderItems || orderItems.length === 0) {
      console.error("Error fetching order items:", itemsError);
      return new Response(
        JSON.stringify({ success: false, error: "Order items not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build payload for Hub
    const shippingAddress = order.shipping_address as HubShippingAddress;
    const shippingInfo = (order.metadata as Record<string, unknown>)?.shipping as { name?: string } | undefined;
    
    const hubPayload: HubOrderPayload = {
      external_order_id: order.id,
      items: orderItems.map((item) => {
        const variantData = item.variants as unknown as { sku: string };
        return {
          sku: variantData.sku,
          quantity: item.quantity,
        };
      }),
      shipping_address: {
        name: shippingAddress?.name || "",
        phone: shippingAddress?.phone || "",
        cpf_cnpj: shippingAddress?.cpf_cnpj || "",
        cep: shippingAddress?.cep || "",
        street: shippingAddress?.street || "",
        number: shippingAddress?.number || "",
        complement: shippingAddress?.complement || "",
        neighborhood: shippingAddress?.neighborhood || "",
        city: shippingAddress?.city || "",
        state: shippingAddress?.state || "",
      },
      shipping_method: shippingInfo?.name || "Padrão",
    };

    // Send to Hub
    const baseUrl = settings.hub_url.replace(/\/marketplace-products$/, '');
    const ordersUrl = `${baseUrl}/marketplace-orders`;

    console.log("Sending order to Hub:", ordersUrl);

    const hubResponse = await fetch(ordersUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-seller-key": settings.hub_api_key,
      },
      body: JSON.stringify(hubPayload),
    });

    const hubResponseText = await hubResponse.text();

    if (!hubResponse.ok) {
      console.error("Hub order sync failed:", hubResponse.status, hubResponseText);
      
      // Update order metadata with sync error
      await supabase
        .from("orders")
        .update({
          metadata: {
            ...(order.metadata as Record<string, unknown>),
            hub_sync_error: hubResponseText,
            hub_sync_attempted_at: new Date().toISOString(),
          },
        })
        .eq("id", order_id);

      return new Response(
        JSON.stringify({ success: false, error: `Hub sync failed: ${hubResponse.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order metadata with sync success
    await supabase
      .from("orders")
      .update({
        metadata: {
          ...(order.metadata as Record<string, unknown>),
          hub_synced: true,
          hub_synced_at: new Date().toISOString(),
        },
      })
      .eq("id", order_id);

    console.log("Order synced to Hub successfully:", hubResponseText);

    return new Response(
      JSON.stringify({ success: true, message: "Order synced to Hub" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error syncing order to Hub:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
