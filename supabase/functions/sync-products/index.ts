import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-integration-key",
};

interface ProductPayload {
  title: string;
  slug: string;
  description?: string;
  price: number;
  promotional_price?: number;
  sku: string;
  stock: number;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  images?: string[];
  attributes?: Record<string, string | number>;
  category_slug?: string;
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
    // Validate API key
    const integrationKey = req.headers.get("x-integration-key");
    const expectedKey = Deno.env.get("INTEGRATION_SECRET");

    if (!expectedKey) {
      console.error("INTEGRATION_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!integrationKey || integrationKey !== expectedKey) {
      console.warn("Unauthorized access attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const payload: ProductPayload = await req.json();

    // Validate required fields
    if (!payload.title || !payload.slug || !payload.sku || payload.price === undefined) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields", 
          required: ["title", "slug", "sku", "price"] 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if product with this SKU exists (via variants table)
    const { data: existingVariant, error: variantError } = await supabase
      .from("variants")
      .select("id, product_id")
      .eq("sku", payload.sku)
      .maybeSingle();

    if (variantError) {
      console.error("Error checking existing variant:", variantError);
      throw variantError;
    }

    let productId: string;
    let action: "created" | "updated";

    // Look up category_id if category_slug is provided
    let categoryId: string | null = null;
    if (payload.category_slug) {
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", payload.category_slug)
        .eq("is_active", true)
        .maybeSingle();
      
      if (category) {
        categoryId = category.id;
      }
    }

    // Prepare product data
    const productData = {
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
      metadata: payload.attributes ? { integration_attributes: payload.attributes } : {},
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (existingVariant) {
      // UPDATE existing product
      productId = existingVariant.product_id;
      action = "updated";

      const { error: updateError } = await supabase
        .from("products")
        .update(productData)
        .eq("id", productId);

      if (updateError) {
        console.error("Error updating product:", updateError);
        throw updateError;
      }

      // Update variant stock and attributes
      const { error: variantUpdateError } = await supabase
        .from("variants")
        .update({
          stock_level: payload.stock,
          attrs: payload.attributes || {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingVariant.id);

      if (variantUpdateError) {
        console.error("Error updating variant:", variantUpdateError);
        throw variantUpdateError;
      }

      console.log(`Product updated: ${productId} (SKU: ${payload.sku})`);
    } else {
      // CREATE new product
      action = "created";

      const { data: newProduct, error: insertError } = await supabase
        .from("products")
        .insert({
          ...productData,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error creating product:", insertError);
        throw insertError;
      }

      productId = newProduct.id;

      // Create variant for the product
      const { error: variantInsertError } = await supabase
        .from("variants")
        .insert({
          product_id: productId,
          sku: payload.sku,
          stock_level: payload.stock,
          attrs: payload.attributes || {},
          price: null, // Uses base_price from product
          price_modifier: 0,
          is_active: true,
        });

      if (variantInsertError) {
        console.error("Error creating variant:", variantInsertError);
        throw variantInsertError;
      }

      console.log(`Product created: ${productId} (SKU: ${payload.sku})`);
    }

    // Handle additional images (gallery)
    if (payload.images && payload.images.length > 1) {
      // Delete existing gallery images for this product
      await supabase
        .from("product_images")
        .delete()
        .eq("product_id", productId);

      // Insert new gallery images (skip first one, it's the main image)
      const galleryImages = payload.images.slice(1).map((url, index) => ({
        product_id: productId,
        image_url: url,
        sort_order: index + 1,
      }));

      if (galleryImages.length > 0) {
        const { error: galleryError } = await supabase
          .from("product_images")
          .insert(galleryImages);

        if (galleryError) {
          console.warn("Error inserting gallery images:", galleryError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        product_id: productId,
        sku: payload.sku,
        message: `Product ${action} successfully`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
