import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HubOrder {
  external_order_id: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  tracking_code?: string;
  carrier?: string;
  shipped_at?: string;
}

interface SyncResult {
  success: boolean;
  updated: number;
  errors: string[];
  message: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Hub settings
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("hub_url, hub_api_key")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .maybeSingle();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ success: false, message: "Erro ao buscar configurações do Hub" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settings.hub_url || !settings.hub_api_key) {
      return new Response(
        JSON.stringify({ success: false, message: "Hub não configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the orders endpoint URL
    const baseUrl = settings.hub_url.replace(/\/marketplace-products$/, "");
    const ordersUrl = `${baseUrl}/marketplace-orders`;

    console.log("Fetching orders from Hub:", ordersUrl);

    // Fetch orders from Hub
    const response = await fetch(ordersUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-seller-key": settings.hub_api_key,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hub orders fetch failed:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, message: `Erro ao buscar pedidos do Hub: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hubResponse = await response.json();
    
    // Handle different API response formats (array or { orders: [...] } or { data: [...] })
    let hubOrders: HubOrder[] = [];
    if (Array.isArray(hubResponse)) {
      hubOrders = hubResponse;
    } else if (hubResponse?.orders && Array.isArray(hubResponse.orders)) {
      hubOrders = hubResponse.orders;
    } else if (hubResponse?.data && Array.isArray(hubResponse.data)) {
      hubOrders = hubResponse.data;
    } else {
      console.warn("Hub returned unexpected format:", JSON.stringify(hubResponse).slice(0, 500));
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Formato de resposta do Hub não reconhecido",
          debug: { received_keys: Object.keys(hubResponse || {}) }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Received ${hubOrders.length} orders from Hub`);

    let updated = 0;
    const errors: string[] = [];

    // Process each order from Hub
    for (const hubOrder of hubOrders) {
      try {
        // Find the local order by ID
        const { data: localOrder, error: findError } = await supabase
          .from("orders")
          .select("id, status, metadata, user_id")
          .eq("id", hubOrder.external_order_id)
          .maybeSingle();

        if (findError || !localOrder) {
          console.warn(`Order not found locally: ${hubOrder.external_order_id}`);
          continue;
        }

        // Map Hub status to local status
        let newStatus: "pending" | "paid" | "shipped" | "cancelled" = localOrder.status;
        if (hubOrder.status === "shipped" || hubOrder.status === "delivered") {
          newStatus = "shipped";
        } else if (hubOrder.status === "cancelled") {
          newStatus = "cancelled";
        }

        // Check if we need to update
        const currentMetadata = (localOrder.metadata || {}) as Record<string, unknown>;
        const hasNewTrackingCode = hubOrder.tracking_code && 
          currentMetadata.tracking_code !== hubOrder.tracking_code;
        const hasStatusChange = localOrder.status !== newStatus;

        if (!hasNewTrackingCode && !hasStatusChange) {
          continue; // No changes needed
        }

        // Update the order
        const updatedMetadata = {
          ...currentMetadata,
          ...(hubOrder.tracking_code && { tracking_code: hubOrder.tracking_code }),
          ...(hubOrder.carrier && { carrier: hubOrder.carrier }),
          ...(hubOrder.shipped_at && { hub_shipped_at: hubOrder.shipped_at }),
          hub_last_sync_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: newStatus,
            metadata: updatedMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq("id", hubOrder.external_order_id);

        if (updateError) {
          errors.push(`Erro ao atualizar pedido ${hubOrder.external_order_id}: ${updateError.message}`);
          continue;
        }

        updated++;

        // If status changed to shipped and we have tracking, send notification
        if (newStatus === "shipped" && hasStatusChange && hubOrder.tracking_code) {
          console.log(`Triggering shipping notification for order ${hubOrder.external_order_id}`);
          
          // Get order details for email
          const { data: orderDetails } = await supabase
            .from("orders")
            .select("*, order_items(*, variants(*, products(*)))")
            .eq("id", hubOrder.external_order_id)
            .single();

          if (orderDetails) {
            // Trigger shipping notification email
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-shipping-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  order_id: hubOrder.external_order_id,
                  tracking_code: hubOrder.tracking_code,
                  carrier: hubOrder.carrier || "Transportadora",
                }),
              });
              console.log(`Shipping notification sent for order ${hubOrder.external_order_id}`);
            } catch (emailError) {
              console.error("Error sending shipping notification:", emailError);
            }
          }
        }

      } catch (orderError) {
        console.error(`Error processing order ${hubOrder.external_order_id}:`, orderError);
        errors.push(`Erro ao processar pedido ${hubOrder.external_order_id}`);
      }
    }

    const result: SyncResult = {
      success: true,
      updated,
      errors,
      message: updated > 0 
        ? `${updated} pedido(s) atualizado(s) com sucesso` 
        : "Nenhum pedido precisou ser atualizado",
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Sync orders error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : "Erro ao sincronizar pedidos" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
