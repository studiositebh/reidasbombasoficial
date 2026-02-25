import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminNotificationRequest {
  order_id: string;
  status: "approved" | "rejected" | "pending";
  payment_method: string;
  total_amount: number;
  buyer_email: string;
  buyer_name?: string;
  error_detail?: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getPaymentMethodLabel = (method?: string): string => {
  const labels: Record<string, string> = {
    "credit_card": "Cartão de Crédito",
    "debit_card": "Cartão de Débito",
    "bank_transfer": "PIX",
    "ticket": "Boleto Bancário",
    "pix": "PIX",
    "bolbradesco": "Boleto Bancário",
    "saved_card": "Cartão Salvo",
  };
  return labels[method || ""] || method || "Pagamento Online";
};

const getStatusConfig = (status: string): { color: string; bgColor: string; borderColor: string; icon: string; title: string } => {
  switch (status) {
    case "approved":
      return {
        color: "#166534",
        bgColor: "#dcfce7",
        borderColor: "#86efac",
        icon: "✅",
        title: "Pagamento Aprovado",
      };
    case "rejected":
      return {
        color: "#991b1b",
        bgColor: "#fee2e2",
        borderColor: "#fca5a5",
        icon: "❌",
        title: "Pagamento Recusado",
      };
    default:
      return {
        color: "#92400e",
        bgColor: "#fef3c7",
        borderColor: "#fcd34d",
        icon: "⏳",
        title: "Pagamento Pendente",
      };
  }
};

const generateAdminNotificationHtml = (data: AdminNotificationRequest): string => {
  const baseUrl = "https://reidasbombas.lovable.app";
  const orderUrl = `${baseUrl}/admin/orders/${data.order_id}`;
  const statusConfig = getStatusConfig(data.status);
  const paymentMethodLabel = getPaymentMethodLabel(data.payment_method);

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
        <p style="color: #6b7280; margin: 4px 0 0 0;">Painel Administrativo</p>
      </div>
      
      <div style="background: ${statusConfig.bgColor}; border: 1px solid ${statusConfig.borderColor}; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px 0; color: ${statusConfig.color};">${statusConfig.icon} ${statusConfig.title}</h2>
        <p style="margin: 0; color: ${statusConfig.color};">
          ${data.status === "approved" 
            ? `Um pagamento de <strong>${formatCurrency(data.total_amount)}</strong> foi aprovado!` 
            : data.status === "rejected" 
              ? `O pagamento do pedido foi recusado.`
              : `Um pagamento está aguardando confirmação.`
          }
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Pedido</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; font-family: monospace;">#${data.order_id.slice(0, 8).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Valor</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: ${data.status === "approved" ? "#16a34a" : "#dc2626"};">${formatCurrency(data.total_amount)}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Forma de Pagamento</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${paymentMethodLabel}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Cliente</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            ${data.buyer_name ? `${data.buyer_name}<br>` : ""}
            <span style="color: #6b7280; font-size: 14px;">${data.buyer_email}</span>
          </td>
        </tr>
        ${data.error_detail ? `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Motivo da Recusa</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #991b1b;">${data.error_detail}</td>
        </tr>
        ` : ""}
      </table>

      <div style="text-align: center; margin-top: 32px;">
        <a href="${orderUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Ver Detalhes do Pedido
        </a>
      </div>

      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">
          Esta é uma notificação automática do sistema de pagamentos.
        </p>
        <p style="margin: 8px 0 0 0;">
          Rei das Bombas - Painel Administrativo
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
      console.warn("RESEND_API_KEY not configured - skipping admin notification");
      return new Response(
        JSON.stringify({ success: false, message: "Email service not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get admin email from store_settings
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("email")
      .single();

    if (settingsError || !settings?.email) {
      console.warn("Admin email not configured in store_settings");
      return new Response(
        JSON.stringify({ success: false, message: "Admin email not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminEmail = settings.email;
    const resend = new Resend(RESEND_API_KEY);
    const data: AdminNotificationRequest = await req.json();

    if (!data.order_id || !data.status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailHtml = generateAdminNotificationHtml(data);
    
    const statusEmoji = data.status === "approved" ? "✅" : data.status === "rejected" ? "❌" : "⏳";
    const statusText = data.status === "approved" ? "Aprovado" : data.status === "rejected" ? "Recusado" : "Pendente";
    const subject = `${statusEmoji} Pagamento ${statusText} - Pedido #${data.order_id.slice(0, 8).toUpperCase()} - ${formatCurrency(data.total_amount)}`;

    const emailResponse = await resend.emails.send({
      from: "Rei das Bombas <notificacoes@resend.dev>",
      to: [adminEmail],
      subject,
      html: emailHtml,
    });

    console.log(`Admin notification sent successfully to ${adminEmail}:`, emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending admin notification:", error);
    const message = error instanceof Error ? error.message : "Failed to send notification";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
