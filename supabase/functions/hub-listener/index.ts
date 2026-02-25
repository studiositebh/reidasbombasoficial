import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature, x-api-key, x-seller-key",
};

// Variant structure from Hub webhook
interface HubVariantUpdate {
  sku: string;
  stock: number;
  price?: number;
  promotional_price?: number;
  attributes?: Record<string, string | number>;
  image_url?: string;
  ean_gtin?: string;
}

interface HubProductUpdate {
  action: "create" | "update" | "delete";
  sku: string;
  title?: string;
  slug?: string;
  description?: string;
  price?: number;
  promotional_price?: number;
  stock?: number;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  images?: string[];
  attributes?: Record<string, string | number>;
  category_slug?: string;
  // Multi-variant support
  variants?: HubVariantUpdate[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Create admin client to fetch hub settings and update products
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the API key and request ID from headers
    const hubApiKey = req.headers.get("x-seller-key") || req.headers.get("x-api-key") || req.headers.get("x-hub-signature");
    const requestId = req.headers.get("x-request-id");
    const timestamp = req.headers.get("x-hub-timestamp");

    // Fetch store settings to validate the API key
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("hub_api_key, hub_auto_update_prices")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .maybeSingle();

    if (settingsError || !settings) {
      console.error("Error fetching settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API key
    if (!settings.hub_api_key || hubApiKey !== settings.hub_api_key) {
      console.warn("Unauthorized hub webhook attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic replay protection: reject requests older than 5 minutes if timestamp is provided
    if (timestamp) {
      const requestTime = parseInt(timestamp, 10);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (!isNaN(requestTime) && (now - requestTime) > fiveMinutes) {
        console.warn("Hub webhook request too old:", now - requestTime, "ms");
        return new Response(
          JSON.stringify({ error: "Request expired" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Log request for audit trail
    console.log(`Hub webhook: request_id=${requestId || 'none'}, timestamp=${timestamp || 'none'}, ip=${req.headers.get("x-forwarded-for") || 'unknown'}`);

    // Parse request body
    const payload: HubProductUpdate = await req.json();

    // Validate required field
    if (!payload.sku) {
      return new Response(
        JSON.stringify({ error: "SKU is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if variant exists
    const { data: existingVariant } = await supabase
      .from("variants")
      .select("id, product_id")
      .eq("sku", payload.sku)
      .maybeSingle();

    // Handle delete action
    if (payload.action === "delete") {
      if (existingVariant) {
        // Delete variant
        await supabase.from("variants").delete().eq("id", existingVariant.id);

        // Check if product has other variants
        const { data: remainingVariants } = await supabase
          .from("variants")
          .select("id")
          .eq("product_id", existingVariant.product_id);

        // If no more variants, delete the product
        if (!remainingVariants || remainingVariants.length === 0) {
          await supabase.from("product_images").delete().eq("product_id", existingVariant.product_id);
          await supabase.from("products").delete().eq("id", existingVariant.product_id);
        }

        return new Response(
          JSON.stringify({ success: true, action: "deleted", sku: payload.sku }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: "not_found", sku: payload.sku }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up category if provided
    let categoryId: string | null = null;
    if (payload.category_slug) {
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", payload.category_slug)
        .maybeSingle();
      
      if (category) {
        categoryId = category.id;
      }
    }

    if (existingVariant) {
      // UPDATE existing product
      const productUpdate: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Only update fields that are provided
      if (payload.title) productUpdate.title = payload.title;
      if (payload.slug) productUpdate.slug = payload.slug;
      if (payload.description !== undefined) productUpdate.description = payload.description;
      if (payload.weight !== undefined) productUpdate.weight = payload.weight;
      if (payload.width !== undefined) productUpdate.width = payload.width;
      if (payload.height !== undefined) productUpdate.height = payload.height;
      if (payload.length !== undefined) productUpdate.length = payload.length;
      if (payload.images?.[0]) productUpdate.image_url = payload.images[0];
      if (categoryId) productUpdate.category_id = categoryId;

      // Only update prices if auto-update is enabled
      if (settings.hub_auto_update_prices) {
        if (payload.price !== undefined) productUpdate.base_price = payload.price;
        if (payload.promotional_price !== undefined) productUpdate.promotional_price = payload.promotional_price;
      }

      if (Object.keys(productUpdate).length > 1) {
        await supabase
          .from("products")
          .update(productUpdate)
          .eq("id", existingVariant.product_id);
      }

      // Update variant
      const variantUpdate: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (payload.stock !== undefined) variantUpdate.stock_level = payload.stock;
      if (payload.attributes) variantUpdate.attrs = payload.attributes;

      await supabase
        .from("variants")
        .update(variantUpdate)
        .eq("id", existingVariant.id);

      console.log(`Hub webhook: Updated product ${existingVariant.product_id} (SKU: ${payload.sku})`);

      return new Response(
        JSON.stringify({
          success: true,
          action: "updated",
          product_id: existingVariant.product_id,
          sku: payload.sku,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // CREATE new product (only if we have required fields)
      if (!payload.title || !payload.slug || payload.price === undefined) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields for new product",
            required: ["title", "slug", "price"],
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newProduct, error: insertError } = await supabase
        .from("products")
        .insert({
          title: payload.title,
          slug: payload.slug,
          description: payload.description || null,
          base_price: payload.price,
          promotional_price: payload.promotional_price || null,
          weight: payload.weight || 1.0,
          width: payload.width || 20,
          height: payload.height || 15,
          length: payload.length || 10,
          image_url: payload.images?.[0] || null,
          category_id: categoryId,
          metadata: payload.attributes ? { hub_attributes: payload.attributes } : {},
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error creating product:", insertError);
        throw insertError;
      }

      // ========== HANDLE VARIANTS ==========
      const hasMultipleVariants = payload.variants && payload.variants.length > 0;
      let variantsCreated = 0;

      if (hasMultipleVariants) {
        // Create multiple variants
        for (const hubVariant of payload.variants!) {
          if (!hubVariant.sku) continue;

          const { error: variantError } = await supabase.from("variants").insert({
            product_id: newProduct.id,
            sku: hubVariant.sku,
            stock_level: hubVariant.stock || 0,
            attrs: hubVariant.attributes || {},
            price: hubVariant.price || null,
            price_modifier: 0,
            image_url: hubVariant.image_url || null,
            ean_gtin: hubVariant.ean_gtin || null,
            is_active: true,
          });

          if (!variantError) variantsCreated++;
        }
      } else {
        // Create single default variant
        await supabase.from("variants").insert({
          product_id: newProduct.id,
          sku: payload.sku,
          stock_level: payload.stock || 0,
          attrs: payload.attributes || {},
          price: null,
          price_modifier: 0,
          is_active: true,
        });
        variantsCreated = 1;
      }

      // Handle gallery images
      if (payload.images && payload.images.length > 1) {
        const galleryImages = payload.images.slice(1).map((url, index) => ({
          product_id: newProduct.id,
          image_url: url,
          sort_order: index + 1,
        }));

        await supabase.from("product_images").insert(galleryImages);
      }

      console.log(`Hub webhook: Created product ${newProduct.id} with ${variantsCreated} variants`);

      return new Response(
        JSON.stringify({
          success: true,
          action: "created",
          product_id: newProduct.id,
          sku: payload.sku,
          variants_created: variantsCreated,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Hub webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
