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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores podem excluir usuários." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user_id to delete from request body
    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (user_id === user.id) {
      return new Response(
        JSON.stringify({ error: "Você não pode excluir sua própria conta por aqui" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete all user data in order
    console.log(`Admin ${user.id} deleting user: ${user_id}`);

    // 1. Delete saved cards
    await adminClient.from("saved_cards").delete().eq("user_id", user_id);
    
    // 2. Delete addresses
    await adminClient.from("addresses").delete().eq("user_id", user_id);
    
    // 3. Delete profile
    await adminClient.from("profiles").delete().eq("user_id", user_id);
    
    // 4. Delete user roles (if any)
    await adminClient.from("user_roles").delete().eq("user_id", user_id);

    // 5. Delete scheduled deletions (if any)
    await adminClient.from("scheduled_deletions").delete().eq("user_id", user_id);

    // 6. Anonymize orders (keep for records)
    const { data: orders } = await adminClient
      .from("orders")
      .select("id")
      .eq("user_id", user_id);

    if (orders && orders.length > 0) {
      await adminClient
        .from("orders")
        .update({ 
          metadata: { 
            deleted_user: true, 
            original_user_id: user_id,
            deleted_at: new Date().toISOString(),
            deleted_by: user.id
          } 
        })
        .eq("user_id", user_id);
    }

    // 7. Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error(`Error deleting auth user ${user_id}:`, deleteError);
      return new Response(
        JSON.stringify({ error: `Erro ao excluir usuário: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully deleted user: ${user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Usuário excluído com sucesso",
        orders_anonymized: orders?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-delete-user:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

