import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Time threshold in minutes for considering a cart as abandoned
const ABANDONMENT_THRESHOLD_MINUTES = 30;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[Cart Recovery] Starting abandoned cart processing...");

    // Calculate the threshold time (30 minutes ago)
    const thresholdTime = new Date();
    thresholdTime.setMinutes(thresholdTime.getMinutes() - ABANDONMENT_THRESHOLD_MINUTES);

    // Query abandoned leads that:
    // 1. Have status = 'abandoned'
    // 2. Were created more than 30 minutes ago
    // 3. Haven't received a recovery email yet
    const { data: abandonedLeads, error: queryError } = await supabase
      .from("leads")
      .select("id, email, name, phone, cart_items, cart_total, created_at")
      .eq("status", "abandoned")
      .is("recovery_email_sent_at", null)
      .lt("created_at", thresholdTime.toISOString())
      .order("created_at", { ascending: true })
      .limit(50); // Process in batches to avoid timeouts

    if (queryError) {
      console.error("[Cart Recovery] Error querying leads:", queryError);
      throw new Error(`Failed to query abandoned leads: ${queryError.message}`);
    }

    if (!abandonedLeads || abandonedLeads.length === 0) {
      console.log("[Cart Recovery] No abandoned carts to process");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No abandoned carts to process",
          processed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Cart Recovery] Found ${abandonedLeads.length} abandoned carts to process`);

    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each abandoned cart
    for (const lead of abandonedLeads) {
      try {
        console.log(`[Cart Recovery] Processing lead: ${lead.email}`);

        // Call the send-cart-recovery function
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-cart-recovery`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            email: lead.email,
            name: lead.name,
            link: "https://reidasbombasoficial.com.br/checkout",
            lead_id: lead.id,
          }),
        });

        const emailResult = await emailResponse.json();

        if (emailResponse.ok && emailResult.success) {
          // Mark the lead as having received a recovery email
          const { error: updateError } = await supabase
            .from("leads")
            .update({
              recovery_email_sent_at: new Date().toISOString(),
              notes: `Email de recuperação enviado automaticamente em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
            })
            .eq("id", lead.id);

          if (updateError) {
            console.error(`[Cart Recovery] Failed to update lead ${lead.id}:`, updateError);
          }

          results.success++;
          console.log(`[Cart Recovery] Successfully sent email to ${lead.email}`);
        } else {
          results.failed++;
          results.errors.push(`${lead.email}: ${emailResult.error || "Unknown error"}`);
          console.error(`[Cart Recovery] Failed to send email to ${lead.email}:`, emailResult);
        }

        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${lead.email}: ${error instanceof Error ? error.message : "Unknown error"}`);
        console.error(`[Cart Recovery] Error processing lead ${lead.email}:`, error);
        results.processed++;
      }
    }

    console.log(`[Cart Recovery] Completed. Success: ${results.success}, Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} abandoned carts`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[Cart Recovery] Fatal error:", error);
    const message = error instanceof Error ? error.message : "Erro ao processar carrinhos abandonados";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
