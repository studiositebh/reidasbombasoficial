import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CEP de origem da loja (depósito)
const ORIGIN_CEP = "31160640"; // Belo Horizonte - MG

// Validation patterns
const CEP_REGEX = /^\d{8}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CartItemForShipping {
  product_id: string;
  quantity: number;
}

interface ShippingOption {
  id: number;
  name: string;
  company: {
    id: number;
    name: string;
    picture: string;
  };
  price: number;
  delivery_min: number;
  delivery_max: number;
  delivery_time: string;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MELHOR_ENVIO_TOKEN = Deno.env.get("MELHOR_ENVIO_TOKEN");
    if (!MELHOR_ENVIO_TOKEN) {
      throw new Error("MELHOR_ENVIO_TOKEN not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { destination_cep, items }: { destination_cep: string; items: CartItemForShipping[] } = await req.json();

    // =====================================================
    // INPUT VALIDATION - Security hardening
    // =====================================================
    
    // Validate CEP format (8 digits only)
    if (!destination_cep || !CEP_REGEX.test(destination_cep)) {
      return new Response(
        JSON.stringify({ error: "CEP deve conter exatamente 8 dígitos numéricos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Carrinho vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate all product IDs are UUIDs
    const invalidProductIds = items.filter(item => !UUID_REGEX.test(item.product_id));
    if (invalidProductIds.length > 0) {
      return new Response(
        JSON.stringify({ error: "IDs de produto inválidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate quantities are reasonable (integer between 1 and 100)
    const invalidQuantities = items.filter(item => 
      !Number.isInteger(item.quantity) || 
      item.quantity < 1 || 
      item.quantity > 100
    );
    if (invalidQuantities.length > 0) {
      return new Response(
        JSON.stringify({ error: "Quantidades inválidas (deve ser entre 1 e 100)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // BUSINESS LOGIC
    // =====================================================

    // Fetch product dimensions from database
    const productIds = [...new Set(items.map((item) => item.product_id))];
    
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, title, weight, width, height, length, base_price, is_active")
      .in("id", productIds)
      .eq("is_active", true);

    if (productsError) {
      console.error("Error fetching products:", productsError);
      throw new Error("Erro ao buscar produtos");
    }

    // Verify all products exist and are active
    if (!products || products.length !== productIds.length) {
      return new Response(
        JSON.stringify({ error: "Um ou mais produtos não estão disponíveis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build products array for Melhor Envio
    const meProducts = items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) {
        throw new Error("Produto não encontrado");
      }

      return {
        id: product.id,
        width: product.width || 20,
        height: product.height || 15,
        length: product.length || 10,
        weight: product.weight || 1,
        insurance_value: product.base_price || 50,
        quantity: item.quantity,
      };
    });

    // Call Melhor Envio API
    const melhorEnvioPayload = {
      from: {
        postal_code: ORIGIN_CEP,
      },
      to: {
        postal_code: destination_cep,
      },
      products: meProducts,
      options: {
        receipt: false,
        own_hand: false,
      },
      services: "1,2,3,4,17", // PAC, SEDEX, Mini Envios, .Package, etc.
    };

    console.log("Melhor Envio request:", JSON.stringify(melhorEnvioPayload, null, 2));

    const meResponse = await fetch("https://melhorenvio.com.br/api/v2/me/shipment/calculate", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MELHOR_ENVIO_TOKEN}`,
        "User-Agent": "ReiDasBombas/1.0",
      },
      body: JSON.stringify(melhorEnvioPayload),
    });

    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      console.error("Melhor Envio API error:", meResponse.status, errorText);
      throw new Error(`Erro na API do Melhor Envio: ${meResponse.status}`);
    }

    const meData = await meResponse.json();
    console.log("Melhor Envio response:", JSON.stringify(meData, null, 2));

    // Parse and filter valid options
    const shippingOptions: ShippingOption[] = [];

    for (const option of meData) {
      // Skip options with errors
      if (option.error) {
        console.log(`Skipping ${option.name}: ${option.error}`);
        continue;
      }

      // Skip options without price
      if (!option.price || option.price === 0) {
        continue;
      }

      shippingOptions.push({
        id: option.id,
        name: option.name,
        company: {
          id: option.company?.id || 0,
          name: option.company?.name || option.name,
          picture: option.company?.picture || "",
        },
        price: parseFloat(option.price),
        delivery_min: option.delivery_range?.min || option.delivery_time || 1,
        delivery_max: option.delivery_range?.max || option.delivery_time || 10,
        delivery_time: option.delivery_range
          ? `${option.delivery_range.min} a ${option.delivery_range.max} dias úteis`
          : `${option.delivery_time || "N/A"} dias úteis`,
      });
    }

    // Sort by price
    shippingOptions.sort((a, b) => a.price - b.price);

    return new Response(
      JSON.stringify({
        success: true,
        origin_cep: ORIGIN_CEP,
        destination_cep,
        options: shippingOptions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error calculating shipping:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro ao calcular frete",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
