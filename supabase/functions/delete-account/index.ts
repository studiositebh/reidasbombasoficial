import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRACE_PERIOD_DAYS = 7;

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

    const { action, reason } = await req.json().catch(() => ({ action: "schedule" }));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use getClaims for proper token validation
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("[delete-account] Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different actions
    if (action === "cancel") {
      // Cancel scheduled deletion
      const { error: cancelError } = await adminClient
        .from("scheduled_deletions")
        .update({ cancelled_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("cancelled_at", null);

      if (cancelError) {
        console.error("Error cancelling deletion:", cancelError);
        return new Response(
          JSON.stringify({ error: "Erro ao cancelar exclusão" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Exclusão cancelada com sucesso" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "status") {
      // Check if there's a pending deletion
      const { data: pending, error: statusError } = await adminClient
        .from("scheduled_deletions")
        .select("*")
        .eq("user_id", userId)
        .is("cancelled_at", null)
        .single();

      if (statusError && statusError.code !== "PGRST116") {
        console.error("Error checking status:", statusError);
      }

      return new Response(
        JSON.stringify({ 
          pending: !!pending,
          scheduled_for: pending?.scheduled_for || null,
          created_at: pending?.created_at || null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default action: schedule deletion
    // Check if already scheduled
    const { data: existing } = await adminClient
      .from("scheduled_deletions")
      .select("id")
      .eq("user_id", userId)
      .is("cancelled_at", null)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Exclusão já agendada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate scheduled date (7 days from now)
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + GRACE_PERIOD_DAYS);

    // Insert scheduled deletion
    const { error: insertError } = await adminClient
      .from("scheduled_deletions")
      .insert({
        user_id: userId,
        scheduled_for: scheduledFor.toISOString(),
        reason: reason || null,
      });

    if (insertError) {
      console.error("Error scheduling deletion:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao agendar exclusão" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Exclusão agendada para ${scheduledFor.toLocaleDateString("pt-BR")}`,
        scheduled_for: scheduledFor.toISOString(),
        grace_period_days: GRACE_PERIOD_DAYS,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in delete-account:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
