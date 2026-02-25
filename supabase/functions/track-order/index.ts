import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackOrderRequest {
  token: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token }: TrackOrderRequest = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ error: "Token é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate token format (32 hex characters)
    if (!/^[a-f0-9]{32}$/i.test(token)) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order by tracking token
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total_amount,
        created_at,
        updated_at,
        shipping_address,
        metadata,
        order_items (
          id,
          quantity,
          unit_price,
          variants (
            sku,
            attrs,
            products (
              title,
              image_url
            )
          )
        )
      `)
      .eq("tracking_token", token.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("Error fetching order:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar pedido" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Return sanitized order data (exclude sensitive info)
    const sanitizedOrder = {
      id: order.id,
      status: order.status,
      total_amount: order.total_amount,
      created_at: order.created_at,
      updated_at: order.updated_at,
      shipping_address: order.shipping_address,
      items: order.order_items?.map((item: any) => ({
        quantity: item.quantity,
        unit_price: item.unit_price,
        sku: item.variants?.sku,
        attrs: item.variants?.attrs,
        product_title: item.variants?.products?.title,
        product_image: item.variants?.products?.image_url,
      })) || [],
    };

    return new Response(
      JSON.stringify({ order: sanitizedOrder }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("Error in track-order function:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});