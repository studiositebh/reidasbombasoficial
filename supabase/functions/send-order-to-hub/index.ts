import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HubOrderItem {
  sku: string;
  quantity: number;
  unit_price: number;
  product_name: string;
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

interface HubCustomer {
  name: string;
  email: string;
  phone: string;
  document: string;
}

interface HubOrderPayload {
  external_order_id: string;
  customer: HubCustomer;
  items: HubOrderItem[];
  shipping_address: HubShippingAddress;
  shipping_method: string;
  total_amount: number;
  payment_status: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, type } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-order-to-hub] Processing order ${order_id} (trigger: ${type || 'manual'})`);

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch hub settings
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("hub_url, hub_api_key")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .maybeSingle();

    if (settingsError || !settings) {
      console.error("[send-order-to-hub] Failed to fetch hub settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Hub settings not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { hub_url, hub_api_key } = settings;

    const maskedKey = hub_api_key ? `${hub_api_key.slice(0, 4)}...${hub_api_key.slice(-4)}` : null;
    console.log("[send-order-to-hub] Hub settings loaded:", {
      has_hub_url: Boolean(hub_url),
      hub_url_preview: hub_url ? `${hub_url.slice(0, 48)}${hub_url.length > 48 ? "..." : ""}` : null,
      has_hub_api_key: Boolean(hub_api_key),
      hub_api_key_masked: maskedKey,
    });

    if (!hub_url || !hub_api_key) {
      console.log("[send-order-to-hub] Hub URL or API key not configured, skipping");
      return new Response(
        JSON.stringify({ success: false, message: "Hub not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();

    if (orderError || !order) {
      console.error("[send-order-to-hub] Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already synced to hub
    if (order.supplier_order_id) {
      console.log(`[send-order-to-hub] Order ${order_id} already synced, supplier_order_id: ${order.supplier_order_id}`);
      return new Response(
        JSON.stringify({ success: true, message: "Already synced", supplier_order_id: order.supplier_order_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify order is paid
    if (order.status !== "paid") {
      console.log(`[send-order-to-hub] Order ${order_id} is not paid (status: ${order.status}), skipping`);
      return new Response(
        JSON.stringify({ success: false, message: "Order not paid" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order items with variant SKUs and product names
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        quantity,
        unit_price,
        variants!inner(sku, product_id),
        variant_id
      `)
      .eq("order_id", order_id);

    if (itemsError) {
      console.error("[send-order-to-hub] Failed to fetch order items:", itemsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch order items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch product names
    const productIds = [...new Set(items?.map((item: any) => item.variants?.product_id).filter(Boolean))];
    const { data: products } = await supabase
      .from("products")
      .select("id, title")
      .in("id", productIds);

    const productMap = new Map(products?.map((p: any) => [p.id, p.title]) || []);

    // Build hub order items with price in CENTS (Hub expects integer cents)
    const hubItems: HubOrderItem[] = (items || []).map((item: any) => {
      const unitPriceReais = Number(item.unit_price) || 0;
      const unitPriceCents = Math.round(unitPriceReais * 100); // Convert to cents
      
      // Debug: log each item's price mapping
      console.log("[send-order-to-hub] Item mapping:", {
        sku: item.variants?.sku,
        quantity: item.quantity,
        unit_price_reais: unitPriceReais,
        unit_price_cents: unitPriceCents,
        product_id: item.variants?.product_id,
      });

      return {
        sku: item.variants?.sku || "UNKNOWN",
        quantity: item.quantity,
        unit_price: unitPriceCents, // Send cents to Hub
        product_name: productMap.get(item.variants?.product_id) || "Produto",
      };
    });

    // Parse shipping address and metadata from order
    const shippingAddress = order.shipping_address as any;
    const metadata = order.metadata as any;

    // Build customer object with priority: metadata.customer > shipping_address
    const hubCustomer: HubCustomer = {
      name: metadata?.customer?.name 
        || shippingAddress?.name 
        || "Cliente",
      email: metadata?.customer?.email 
        || metadata?.payer?.email 
        || "",
      phone: metadata?.customer?.phone 
        || shippingAddress?.phone 
        || "",
      document: metadata?.customer?.cpf 
        || shippingAddress?.cpf_cnpj 
        || metadata?.payer?.identification?.number 
        || "",
    };

    const hubAddress: HubShippingAddress = {
      name: shippingAddress?.name || metadata?.customer?.name || "Cliente",
      phone: shippingAddress?.phone || metadata?.customer?.phone || "",
      cpf_cnpj: shippingAddress?.cpf_cnpj || metadata?.customer?.cpf || "",
      cep: shippingAddress?.cep || shippingAddress?.zipCode || "",
      street: shippingAddress?.street || "",
      number: shippingAddress?.number || "",
      complement: shippingAddress?.complement || "",
      neighborhood: shippingAddress?.neighborhood || "",
      city: shippingAddress?.city || "",
      state: shippingAddress?.state || "",
    };

    // Build payload with customer field - total in CENTS
    const totalAmountReais = Number(order.total_amount) || 0;
    const totalAmountCents = Math.round(totalAmountReais * 100);
    
    const hubPayload: HubOrderPayload = {
      external_order_id: order.id,
      customer: hubCustomer,
      items: hubItems,
      shipping_address: hubAddress,
      shipping_method: metadata?.shipping?.name || "Standard",
      total_amount: totalAmountCents, // Send cents to Hub
      payment_status: "approved",
    };

    // Detailed payload debug log
    console.log("[send-order-to-hub] DEBUG PAYLOAD HUB:", JSON.stringify({
      order_id: order.id,
      total_amount_reais: totalAmountReais,
      total_amount_cents: totalAmountCents,
      items_count: hubItems.length,
      items_summary: hubItems.map(i => ({ 
        sku: i.sku, 
        qty: i.quantity, 
        price_cents: i.unit_price,
        subtotal_cents: i.quantity * i.unit_price 
      })),
      calculated_subtotal_cents: hubItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0),
    }, null, 2));

    console.log("[send-order-to-hub] Sending payload to Hub:", JSON.stringify(hubPayload));

    // Send to Hub - extract only the base origin from hub_url to avoid path duplication
    const baseUrl = new URL(hub_url).origin;
    const hubEndpoint = `${baseUrl}/functions/v1/marketplace-orders`;
    console.log("[send-order-to-hub] Hub endpoint:", hubEndpoint);
    
    const hubResponse = await fetch(hubEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-seller-key": hub_api_key,
      },
      body: JSON.stringify(hubPayload),
    });

    const hubResult = await hubResponse.json().catch(() => ({}));

    console.log(`[send-order-to-hub] Hub response status: ${hubResponse.status}`, hubResult);

    if (!hubResponse.ok) {
      // Update order metadata with error
      await supabase
        .from("orders")
        .update({
          metadata: {
            ...metadata,
            hub_sync_error: hubResult.error || hubResult.message || "Unknown error",
            hub_sync_attempted_at: new Date().toISOString(),
          },
        })
        .eq("id", order_id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: hubResult.error || hubResult.message || "Failed to send order to Hub",
          status: hubResponse.status 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract supplier_order_id from Hub response (Hub returns hub_order_id)
    const supplierOrderId = hubResult.hub_order_id || hubResult.order_id || hubResult.id || hubResult.supplier_order_id;

    // Update order with supplier_order_id and sync status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        supplier_order_id: supplierOrderId,
        metadata: {
          ...metadata,
          hub_synced: true,
          hub_synced_at: new Date().toISOString(),
          hub_order_response: hubResult,
        },
      })
      .eq("id", order_id);

    if (updateError) {
      console.error("[send-order-to-hub] Failed to update order:", updateError);
    }

    console.log(`[send-order-to-hub] Order ${order_id} successfully sent to Hub, supplier_order_id: ${supplierOrderId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        supplier_order_id: supplierOrderId,
        message: "Order sent to supplier successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[send-order-to-hub] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
