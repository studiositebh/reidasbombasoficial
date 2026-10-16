import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  title: string;
  quantity: number;
  unit_price: number;
  sku: string;
  attrs?: Record<string, string | number>;
}

interface ShippingAddress {
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

interface OrderEmailRequest {
  to: string;
  order_id: string;
  tracking_token: string;
  total_amount: number;
  items?: OrderItem[];
  shipping_address?: ShippingAddress | null;
  shipping_info?: {
    name: string;
    company: string;
    price: number;
    delivery_time: string;
  } | null;
  type?: "order_received" | "payment_confirmed";
  payment_method?: string;
  is_new_user?: boolean;
  password_reset_link?: string | null;
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
  };
  return labels[method || ""] || "Pagamento Online";
};

const generateNewUserSection = (passwordResetLink: string): string => {
  return `
    <div style="background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%); border: 1px solid #93c5fd; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
      <div style="font-size: 32px; margin-bottom: 8px;">🎉</div>
      <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 18px;">Criamos uma conta para você!</h3>
      <p style="margin: 0 0 16px 0; color: #3730a3; font-size: 14px; line-height: 1.5;">
        Para acompanhar seus pedidos e fazer compras mais rápidas no futuro, 
        defina uma senha para sua conta clicando no botão abaixo.
      </p>
      <a href="${passwordResetLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Definir minha senha
      </a>
      <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 12px;">
        Este passo é opcional. Seus pedidos estão seguros mesmo sem definir uma senha.
      </p>
    </div>
  `;
};

const generateOrderReceivedHtml = (data: OrderEmailRequest): string => {
  const baseUrl = "https://reidasbombasoficial.com.br";
  const trackingUrl = `${baseUrl}/rastrear?token=${data.tracking_token}`;
  const items = data.items || [];

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${item.title}</strong>
          ${item.sku ? `<br><span style="color: #6b7280; font-size: 12px;">SKU: ${item.sku}</span>` : ""}
          ${item.attrs ? `<br><span style="color: #6b7280; font-size: 12px;">${Object.entries(item.attrs).map(([k, v]) => `${k}: ${v}`).join(" | ")}</span>` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unit_price * item.quantity)}</td>
      </tr>
    `
    )
    .join("");

  const shippingHtml = data.shipping_info
    ? `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>Frete ${data.shipping_info.name}</strong>
          <br><span style="color: #6b7280; font-size: 12px;">${data.shipping_info.company} - ${data.shipping_info.delivery_time}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">1</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(data.shipping_info.price)}</td>
      </tr>
    `
    : "";

  const addressHtml = data.shipping_address
    ? `
      <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">Endereço de Entrega</h3>
        <p style="margin: 0; color: #4b5563; line-height: 1.6;">
          ${data.shipping_address.name}<br>
          ${data.shipping_address.street}, ${data.shipping_address.number}${data.shipping_address.complement ? `, ${data.shipping_address.complement}` : ""}<br>
          ${data.shipping_address.neighborhood}<br>
          ${data.shipping_address.city} - ${data.shipping_address.state}<br>
          CEP: ${data.shipping_address.cep}
        </p>
      </div>
    `
    : "";

  const newUserHtml = data.is_new_user && data.password_reset_link 
    ? generateNewUserSection(data.password_reset_link) 
    : "";

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
      
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px 0; color: #1f2937;">Pedido Recebido! 🎉</h2>
        <p style="margin: 0; color: #4b5563;">
          Obrigado pela sua compra! Seu pedido foi registrado com sucesso.
        </p>
      </div>

      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Número do Pedido</p>
        <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; font-family: monospace;">${data.order_id.slice(0, 8).toUpperCase()}</p>
      </div>

      ${items.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-weight: 600;">Produto</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Qtd</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          ${shippingHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 16px 12px; font-weight: bold; font-size: 18px;">Total</td>
            <td style="padding: 16px 12px; text-align: right; font-weight: bold; font-size: 18px; color: #dc2626;">${formatCurrency(data.total_amount)}</td>
          </tr>
        </tfoot>
      </table>
      ` : `
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #dc2626;">Total: ${formatCurrency(data.total_amount)}</p>
      </div>
      `}

      ${addressHtml}

      ${newUserHtml}

      <div style="text-align: center; margin-top: 32px;">
        <a href="${trackingUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Acompanhar Pedido
        </a>
        <p style="margin-top: 12px; color: #6b7280; font-size: 14px;">
          Ou acesse: <a href="${trackingUrl}" style="color: #dc2626;">${trackingUrl}</a>
        </p>
      </div>

      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">
          Você receberá atualizações sobre o status do seu pedido neste e-mail.
        </p>
        <p style="margin: 8px 0 0 0;">
          Rei das Bombas - Sua loja de confiança
        </p>
      </div>
    </body>
    </html>
  `;
};

const generatePaymentConfirmedHtml = (data: OrderEmailRequest): string => {
  const baseUrl = "https://reidasbombasoficial.com.br";
  const trackingUrl = `${baseUrl}/rastrear?token=${data.tracking_token}`;
  const items = data.items || [];
  const paymentMethodLabel = getPaymentMethodLabel(data.payment_method);

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${item.title}</strong>
          ${item.sku ? `<br><span style="color: #6b7280; font-size: 12px;">SKU: ${item.sku}</span>` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unit_price * item.quantity)}</td>
      </tr>
    `
    )
    .join("");

  const shippingHtml = data.shipping_info
    ? `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>Frete ${data.shipping_info.name}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">1</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(data.shipping_info.price)}</td>
      </tr>
    `
    : "";

  const addressHtml = data.shipping_address
    ? `
      <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">📍 Endereço de Entrega</h3>
        <p style="margin: 0; color: #4b5563; line-height: 1.6;">
          ${data.shipping_address.name}<br>
          ${data.shipping_address.street}, ${data.shipping_address.number}${data.shipping_address.complement ? `, ${data.shipping_address.complement}` : ""}<br>
          ${data.shipping_address.neighborhood}<br>
          ${data.shipping_address.city} - ${data.shipping_address.state}<br>
          CEP: ${data.shipping_address.cep}
        </p>
      </div>
    `
    : "";

  const newUserHtml = data.is_new_user && data.password_reset_link 
    ? generateNewUserSection(data.password_reset_link) 
    : "";

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
      
      <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px 0; color: #166534;">✅ Pagamento Confirmado!</h2>
        <p style="margin: 0; color: #15803d;">
          Seu pagamento via <strong>${paymentMethodLabel}</strong> foi aprovado! Estamos preparando seu pedido.
        </p>
      </div>

      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Número do Pedido</p>
        <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; font-family: monospace;">${data.order_id.slice(0, 8).toUpperCase()}</p>
      </div>

      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>📦 Próximos passos:</strong><br>
          Seu pedido será separado e enviado em breve. Você receberá outro e-mail com o código de rastreamento assim que o envio for realizado.
        </p>
      </div>

      ${items.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-weight: 600;">Produto</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Qtd</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          ${shippingHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 16px 12px; font-weight: bold; font-size: 18px;">Total Pago</td>
            <td style="padding: 16px 12px; text-align: right; font-weight: bold; font-size: 18px; color: #16a34a;">${formatCurrency(data.total_amount)}</td>
          </tr>
        </tfoot>
      </table>
      ` : `
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #16a34a;">Total Pago: ${formatCurrency(data.total_amount)}</p>
      </div>
      `}

      ${addressHtml}

      ${newUserHtml}

      <div style="text-align: center; margin-top: 32px;">
        <a href="${trackingUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Acompanhar Pedido
        </a>
        <p style="margin-top: 12px; color: #6b7280; font-size: 14px;">
          Ou acesse: <a href="${trackingUrl}" style="color: #16a34a;">${trackingUrl}</a>
        </p>
      </div>

      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">
          Obrigado por comprar conosco! Em caso de dúvidas, responda este e-mail.
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
      console.warn("RESEND_API_KEY not configured - skipping email");
      return new Response(
        JSON.stringify({ success: false, message: "Email service not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);
    const data: OrderEmailRequest = await req.json();

    if (!data.to || !data.order_id || !data.tracking_token) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate appropriate email based on type
    const emailType = data.type || "order_received";
    const emailHtml = emailType === "payment_confirmed" 
      ? generatePaymentConfirmedHtml(data)
      : generateOrderReceivedHtml(data);
    
    const subject = emailType === "payment_confirmed"
      ? `✅ Pagamento confirmado - Pedido #${data.order_id.slice(0, 8).toUpperCase()}`
      : `Pedido #${data.order_id.slice(0, 8).toUpperCase()} recebido!`;

    const emailResponse = await resend.emails.send({
      from: "Rei das Bombas <pedidos@resend.dev>",
      to: [data.to],
      subject,
      html: emailHtml,
    });

    console.log(`${emailType} email sent successfully:`, emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const message = error instanceof Error ? error.message : "Failed to send email";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
