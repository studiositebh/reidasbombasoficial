import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShippingNotificationRequest {
  to: string;
  order_id: string;
  tracking_token: string;
  tracking_code: string;
  carrier: string;
  customer_name?: string;
}

const formatOrderId = (orderId: string): string => {
  return orderId.slice(0, 8).toUpperCase();
};

const generateEmailHtml = (data: ShippingNotificationRequest): string => {
  const baseUrl = "https://reidasbombasoficial.com.br";
  const trackingUrl = `${baseUrl}/rastrear?token=${data.tracking_token}`;

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
      </div>
      
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">📦</div>
        <h2 style="margin: 0 0 8px 0; color: #065f46;">Seu pedido foi enviado!</h2>
        <p style="margin: 0; color: #047857;">
          ${data.customer_name ? `Olá ${data.customer_name.split(' ')[0]}, ` : ''}O seu pedido está a caminho!
        </p>
      </div>

      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Número do Pedido</p>
        <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; font-family: monospace;">#${formatOrderId(data.order_id)}</p>
      </div>

      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">📍 Informações de Rastreamento</h3>
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 14px; color: #78716c;">Transportadora</p>
          <p style="margin: 4px 0 0 0; font-weight: 600; color: #1f2937;">${data.carrier}</p>
        </div>
        <div>
          <p style="margin: 0; font-size: 14px; color: #78716c;">Código de Rastreio</p>
          <p style="margin: 4px 0 0 0; font-weight: 600; font-family: monospace; font-size: 18px; color: #1f2937; letter-spacing: 1px;">${data.tracking_code}</p>
        </div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${trackingUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Acompanhar Entrega
        </a>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 14px;">🔍 Rastreie também em:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px;">
          <li style="margin-bottom: 4px;">Site dos Correios: <a href="https://www.correios.com.br/rastreamento" style="color: #dc2626;">correios.com.br/rastreamento</a></li>
          <li style="margin-bottom: 4px;">Site da transportadora: ${data.carrier}</li>
        </ul>
      </div>

      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">
          Fique tranquilo! Você será notificado sobre qualquer atualização.
        </p>
        <p style="margin: 8px 0 0 0;">
          Rei das Bombas - Sua loja de confiança
        </p>
      </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured - skipping shipping notification email");
      return new Response(
        JSON.stringify({ success: false, message: "Email service not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);
    const data: ShippingNotificationRequest = await req.json();

    if (!data.to || !data.order_id || !data.tracking_code || !data.carrier) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, order_id, tracking_code, carrier" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailHtml = generateEmailHtml(data);

    const emailResponse = await resend.emails.send({
      from: "Rei das Bombas <pedidos@resend.dev>",
      to: [data.to],
      subject: `📦 Pedido #${formatOrderId(data.order_id)} foi enviado!`,
      html: emailHtml,
    });

    console.log("Shipping notification email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending shipping notification email:", error);
    const message = error instanceof Error ? error.message : "Failed to send email";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
