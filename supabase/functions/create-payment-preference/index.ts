import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getMercadoPagoCredentials } from "../_shared/mercadopago-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  product: {
    id: string;
    title: string;
    base_price: number;
    image_url: string;
  };
  variant: {
    id: string;
    sku: string;
    price_modifier: number;
    attrs: Record<string, string | number>;
  };
  quantity: number;
}

interface ShippingAddress {
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

interface ShippingOption {
  id: number;
  name: string;
  company: string;
  price: number;
  delivery_time: string;
}

interface RequestBody {
  items: CartItem[];
  buyer_email: string;
  shipping_address?: ShippingAddress;
  shipping_option?: ShippingOption | null;
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header (optional for guest checkout)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { items, buyer_email, shipping_address, shipping_option }: RequestBody = await req.json();

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Carrinho vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!buyer_email) {
      return new Response(
        JSON.stringify({ error: "E-mail do comprador é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate total (products + shipping)
    const productsTotal = items.reduce((sum, item) => {
      const unitPrice = item.product.base_price + (item.variant.price_modifier || 0);
      return sum + unitPrice * item.quantity;
    }, 0);
    
    const shippingCost = shipping_option?.price || 0;
    const totalAmount = productsTotal + shippingCost;

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId || "00000000-0000-0000-0000-000000000000", // Guest user placeholder
        status: "pending",
        total_amount: totalAmount,
        metadata: { 
          buyer_email,
          shipping: shipping_option ? {
            id: shipping_option.id,
            name: shipping_option.name,
            company: shipping_option.company,
            price: shipping_option.price,
            delivery_time: shipping_option.delivery_time,
          } : null,
        },
        shipping_address: shipping_address || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error("Erro ao criar pedido");
    }

    // Create order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      variant_id: item.variant.id,
      quantity: item.quantity,
      unit_price: item.product.base_price + (item.variant.price_modifier || 0),
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      // Rollback order
      await supabase.from("orders").delete().eq("id", order.id);
      throw new Error("Erro ao criar itens do pedido");
    }

    // Build Mercado Pago preference
    const mpItems = items.map((item) => ({
      id: item.variant.sku,
      title: item.product.title,
      description: Object.entries(item.variant.attrs)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" | "),
      picture_url: item.product.image_url,
      quantity: item.quantity,
      unit_price: item.product.base_price + (item.variant.price_modifier || 0),
      currency_id: "BRL",
    }));

    // Add shipping as an item if present
    if (shipping_option && shipping_option.price > 0) {
      mpItems.push({
        id: `FRETE-${shipping_option.id}`,
        title: `Frete ${shipping_option.name} (${shipping_option.company})`,
        description: shipping_option.delivery_time,
        picture_url: "",
        quantity: 1,
        unit_price: shipping_option.price,
        currency_id: "BRL",
      });
    }

    const baseUrl = "https://reidasbombas.lovable.app";
    const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;

    const preference = {
      items: mpItems,
      payer: {
        email: buyer_email,
      },
      back_urls: {
        success: `${baseUrl}/pedido-confirmado?order_id=${order.id}`,
        failure: `${baseUrl}/checkout?error=payment_failed`,
        pending: `${baseUrl}/pedido-pendente?order_id=${order.id}`,
      },
      auto_return: "approved",
      notification_url: webhookUrl,
      external_reference: order.id,
      statement_descriptor: "REI DAS BOMBAS",
      payment_methods: {
        installments: 12,
      },
    };

    // Create preference in Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const mpError = await mpResponse.text();
      console.error("Mercado Pago error:", mpError);
      // Rollback order
      await supabase.from("order_items").delete().eq("order_id", order.id);
      await supabase.from("orders").delete().eq("id", order.id);
      throw new Error("Erro ao criar preferência de pagamento");
    }

    const mpData = await mpResponse.json();

    // Send order confirmation email (fire and forget)
    try {
      const emailPayload = {
        to: buyer_email,
        order_id: order.id,
        tracking_token: order.tracking_token,
        total_amount: totalAmount,
        items: items.map((item) => ({
          title: item.product.title,
          quantity: item.quantity,
          unit_price: item.product.base_price + (item.variant.price_modifier || 0),
          sku: item.variant.sku,
          attrs: item.variant.attrs,
        })),
        shipping_address: shipping_address || null,
        shipping_info: shipping_option ? {
          name: shipping_option.name,
          company: shipping_option.company,
          price: shipping_option.price,
          delivery_time: shipping_option.delivery_time,
        } : null,
      };

      fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(emailPayload),
      }).catch((err) => console.error("Failed to send order email:", err));
    } catch (emailError) {
      console.error("Error preparing order email:", emailError);
      // Don't fail the order if email fails
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
