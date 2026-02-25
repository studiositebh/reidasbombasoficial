import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seller-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: Validate seller key for security
    const sellerKey = req.headers.get("x-seller-key");
    if (!sellerKey) {
      return new Response(
        JSON.stringify({ error: "Missing x-seller-key header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all attributes WITH their values (the critical fix!)
    const { data: attributes, error } = await supabase
      .from("attributes")
      .select(`
        id,
        name,
        slug,
        created_at,
        updated_at,
        attribute_values (
          id,
          value,
          meta_value,
          sort_order
        )
      `)
      .order("name");

    if (error) {
      console.error("Error fetching attributes:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format response to match expected structure
    const formattedAttributes = (attributes || []).map((attr) => ({
      id: attr.id,
      name: attr.name,
      slug: attr.slug,
      values: (attr.attribute_values || []).map((val: { id: string; value: string; meta_value: string | null; sort_order: number }) => ({
        id: val.id,
        value: val.value,
        meta_value: val.meta_value,
        sort_order: val.sort_order,
      })),
    }));

    console.log(`Returning ${formattedAttributes.length} attributes with values`);

    return new Response(
      JSON.stringify(formattedAttributes),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Marketplace attributes error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
