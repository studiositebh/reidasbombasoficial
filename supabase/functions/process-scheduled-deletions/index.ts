import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Find all deletions that are past their scheduled time and not cancelled
    const now = new Date().toISOString();
    const { data: pendingDeletions, error: fetchError } = await adminClient
      .from("scheduled_deletions")
      .select("*")
      .lte("scheduled_for", now)
      .is("cancelled_at", null);

    if (fetchError) {
      console.error("Error fetching pending deletions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar exclusões pendentes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingDeletions || pendingDeletions.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma exclusão pendente", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const deletion of pendingDeletions) {
      const userId = deletion.user_id;
      
      try {
        console.log(`Processing deletion for user: ${userId}`);

        // Delete user's data in order (respecting foreign keys)
        // 1. Delete saved cards
        await adminClient.from("saved_cards").delete().eq("user_id", userId);
        
        // 2. Delete addresses
        await adminClient.from("addresses").delete().eq("user_id", userId);
        
        // 3. Delete profile
        await adminClient.from("profiles").delete().eq("user_id", userId);
        
        // 4. Delete user roles
        await adminClient.from("user_roles").delete().eq("user_id", userId);

        // 5. Anonymize orders (keep for records)
        await adminClient
          .from("orders")
          .update({ 
            metadata: { 
              deleted_user: true, 
              original_user_id: userId,
              deleted_at: new Date().toISOString()
            } 
          })
          .eq("user_id", userId);

        // 6. Delete the scheduled deletion record
        await adminClient
          .from("scheduled_deletions")
          .delete()
          .eq("id", deletion.id);

        // 7. Finally, delete the auth user
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error(`Error deleting auth user ${userId}:`, deleteError);
          results.push({ userId, success: false, error: deleteError.message });
        } else {
          console.log(`Successfully deleted user: ${userId}`);
          results.push({ userId, success: true });
        }
      } catch (err) {
        console.error(`Error processing deletion for user ${userId}:`, err);
        results.push({ userId, success: false, error: String(err) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        message: `Processadas ${pendingDeletions.length} exclusões`,
        processed: successCount,
        failed: failCount,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-scheduled-deletions:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
