import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartRecoveryRequest {
  email: string;
  name: string;
  link?: string;
  lead_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, name, link, lead_id }: CartRecoveryRequest = await req.json();

    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: "Email e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default checkout link
    const checkoutLink = link || "https://reidasbombas.lovable.app/checkout";
    const firstName = name.split(" ")[0];

    // Beautiful HTML email template
    const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu carrinho está te esperando!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #FFD700; margin: 0; font-size: 28px; font-weight: bold;">
                🛒 REI DAS BOMBAS
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 24px;">
                Psiu, ${firstName}! 👋
              </h2>
              
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Notamos que você estava dando uma olhada nos nossos produtos, mas não finalizou sua compra.
              </p>
              
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>Seus itens ainda estão te esperando!</strong> Não deixe escapar essa oportunidade.
              </p>
              
              <!-- Highlight Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td style="background-color: #fff8e1; border-left: 4px solid #FFD700; padding: 20px; border-radius: 0 8px 8px 0;">
                    <p style="color: #1a1a2e; font-size: 16px; margin: 0; font-weight: 500;">
                      💡 <strong>Dica:</strong> Complete sua compra agora e garanta entrega rápida para todo o Brasil!
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${checkoutLink}" 
                       style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; font-size: 18px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
                      CONTINUAR MINHA COMPRA →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Se precisar de ajuda, nossa equipe está à disposição pelo WhatsApp!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                Rei das Bombas - Qualidade e confiança para sua obra
              </p>
              <p style="color: #aaaaaa; font-size: 11px; margin: 0;">
                Este email foi enviado porque você iniciou uma compra em nosso site.
                <br>Se não deseja mais receber esses lembretes, basta ignorar este email.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Rei das Bombas <noreply@reidasbombas.com.br>",
      to: [email],
      subject: `Psiu, ${firstName}! Seus produtos estão te esperando... 🛒`,
      html: emailHtml,
    });

    console.log("Cart recovery email sent to:", email, "Response:", emailResponse);

    // Update lead status to indicate email was sent
    if (lead_id) {
      await supabase
        .from("leads")
        .update({
          notes: `Email de recuperação enviado em ${new Date().toISOString()}`,
        })
        .eq("id", lead_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email de recuperação enviado",
        response: emailResponse 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error sending cart recovery email:", error);
    const message = error instanceof Error ? error.message : "Erro ao enviar email";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
