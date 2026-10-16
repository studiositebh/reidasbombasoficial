import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadPayload {
  email: string;
  name?: string;
  phone?: string;
  document?: string;
  notes?: string;
  cart_items?: unknown[];
  cart_total?: number;
  source?: string;
}

const generateContactNotificationHtml = (data: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}): string => {
  const baseUrl = "https://reidasbombasoficial.com.br";
  const leadsUrl = `${baseUrl}/admin/leads`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #dc2626; margin: 0;">Rei das Bombas</h1>
        <p style="color: #6b7280; margin: 4px 0 0 0;">Novo Contato pelo Site</p>
      </div>
      
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px 0; color: #065f46;">📩 Nova mensagem recebida!</h2>
        <p style="margin: 0; color: #047857;">
          Um visitante enviou uma mensagem através do formulário de contato.
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px;">Nome</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${data.name}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">E-mail</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <a href="mailto:${data.email}" style="color: #dc2626; text-decoration: none;">${data.email}</a>
          </td>
        </tr>
        ${data.phone ? `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Telefone</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <a href="tel:${data.phone}" style="color: #dc2626; text-decoration: none;">${data.phone}</a>
          </td>
        </tr>
        ` : ""}
      </table>

      ${data.message ? `
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 14px;">💬 Mensagem:</h3>
        <p style="margin: 0; color: #1f2937; white-space: pre-wrap;">${data.message}</p>
      </div>
      ` : ""}

      <div style="text-align: center; margin: 32px 0;">
        <a href="mailto:${data.email}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-right: 12px;">
          Responder por E-mail
        </a>
        <a href="${leadsUrl}" style="display: inline-block; background: #f3f4f6; color: #374151; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Ver no Painel
        </a>
      </div>

      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">
          Esta é uma notificação automática do formulário de contato.
        </p>
        <p style="margin: 8px 0 0 0;">
          Rei das Bombas - Painel Administrativo
        </p>
      </div>
    </body>
    </html>
  `;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: LeadPayload = await req.json();

    // Validate email
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@") || email.length < 5) {
      return new Response(
        JSON.stringify({ success: false, error: "E-mail inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from("leads").upsert(
      {
        email,
        name: body.name?.trim() || null,
        phone: body.phone?.replace(/\D/g, "") || null,
        document: body.document?.replace(/\D/g, "") || null,
        notes: body.notes?.trim() || null,
        cart_items: body.cart_items || [],
        cart_total: body.cart_total ?? 0,
        status: body.source === "contact_form" ? "new" : "abandoned",
        source: body.source || "checkout",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    if (error) {
      console.error("[save-lead] Upsert failed:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email notification to admin for contact form submissions
    if (body.source === "contact_form") {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

      if (RESEND_API_KEY) {
        try {
          // Fetch admin email from store_settings
          const { data: settings } = await supabase
            .from("store_settings")
            .select("email")
            .single();

          if (settings?.email) {
            const resend = new Resend(RESEND_API_KEY);

            const emailHtml = generateContactNotificationHtml({
              name: body.name?.trim() || "Visitante",
              email,
              phone: body.phone?.replace(/\D/g, "") || undefined,
              message: body.notes?.trim() || undefined,
            });

            const emailResponse = await resend.emails.send({
              from: "Rei das Bombas <contato@resend.dev>",
              to: [settings.email],
              subject: `📩 Novo contato: ${body.name?.trim() || email}`,
              html: emailHtml,
            });

            console.log("[save-lead] Admin notification sent:", emailResponse);
          } else {
            console.warn("[save-lead] Admin email not configured in store_settings");
          }
        } catch (emailError) {
          // Log error but don't fail the lead save
          console.error("[save-lead] Failed to send admin notification:", emailError);
        }
      } else {
        console.warn("[save-lead] RESEND_API_KEY not configured - skipping admin notification");
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[save-lead] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
