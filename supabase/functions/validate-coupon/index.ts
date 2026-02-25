import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CouponValidationRequest {
  code: string;
  order_total: number;
}

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value: number | null;
  max_discount: number | null;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { code, order_total }: CouponValidationRequest = await req.json();

    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "Código do cupom é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize the code (uppercase, trim)
    const normalizedCode = code.trim().toUpperCase();

    // Fetch the coupon
    const { data: coupon, error: fetchError } = await supabase
      .from("coupons")
      .select("*")
      .ilike("code", normalizedCode)
      .eq("is_active", true)
      .single();

    if (fetchError || !coupon) {
      return new Response(
        JSON.stringify({ valid: false, error: "Cupom não encontrado ou inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedCoupon = coupon as Coupon;
    const now = new Date();

    // Check if coupon is within valid date range
    const validFrom = new Date(typedCoupon.valid_from);
    if (now < validFrom) {
      return new Response(
        JSON.stringify({ valid: false, error: "Este cupom ainda não está ativo" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typedCoupon.valid_until) {
      const validUntil = new Date(typedCoupon.valid_until);
      if (now > validUntil) {
        return new Response(
          JSON.stringify({ valid: false, error: "Este cupom expirou" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check usage limit
    if (typedCoupon.max_uses !== null && typedCoupon.current_uses >= typedCoupon.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, error: "Este cupom atingiu o limite de usos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check minimum order value
    if (typedCoupon.min_order_value && order_total < typedCoupon.min_order_value) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Valor mínimo do pedido: R$ ${typedCoupon.min_order_value.toFixed(2).replace(".", ",")}` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate discount
    let discountAmount: number;
    
    if (typedCoupon.discount_type === "percentage") {
      discountAmount = (order_total * typedCoupon.discount_value) / 100;
      
      // Apply max discount cap if set
      if (typedCoupon.max_discount && discountAmount > typedCoupon.max_discount) {
        discountAmount = typedCoupon.max_discount;
      }
    } else {
      discountAmount = typedCoupon.discount_value;
      
      // Don't allow discount greater than order total
      if (discountAmount > order_total) {
        discountAmount = order_total;
      }
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    return new Response(
      JSON.stringify({
        valid: true,
        coupon: {
          id: typedCoupon.id,
          code: typedCoupon.code,
          description: typedCoupon.description,
          discount_type: typedCoupon.discount_type,
          discount_value: typedCoupon.discount_value,
        },
        discount_amount: discountAmount,
        final_total: order_total - discountAmount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Erro ao validar cupom";
    return new Response(
      JSON.stringify({ valid: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
