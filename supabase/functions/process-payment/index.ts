import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getMercadoPagoCredentials } from "../_shared/mercadopago-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  product: {
    id: string;
    title: string;
    base_price: number;
    image_url: string;
  };
  variant: {
    id: string;
    sku: string;
    price_modifier: number;
    attrs: Record<string, string | number>;
  };
  quantity: number;
}

interface ShippingAddress {
  name: string;
  phone: string;
  cpf_cnpj: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface ShippingOption {
  id: number;
  name: string;
  company: string;
  price: number;
  delivery_time: string;
}

interface CardPaymentData {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  installments: number;
  payer_email: string;
  payer_identification_type: string;
  payer_identification_number: string;
}

interface PixPaymentData {
  payer_email: string;
  payer_name: string;
  payer_identification_type: string;
  payer_identification_number: string;
}

interface BoletoPaymentData {
  payer_email: string;
  payer_name: string;
  payer_identification_type: string;
  payer_identification_number: string;
  payer_address: {
    zip_code: string;
    street_name: string;
    street_number: string;
    neighborhood: string;
    city: string;
    federal_unit: string;
  };
}

interface SavedCardPaymentData {
  saved_card_id: string;
  installments?: number;
  total_with_interest?: number;
  payer_email: string;
  payer_identification_type: string;
  payer_identification_number: string;
}

interface CouponData {
  id: string;
  code: string;
  discount_amount: number;
}

interface RequestBody {
  items: CartItem[];
  payment_type: "credit_card" | "pix" | "boleto" | "saved_card";
  payment_data: CardPaymentData | PixPaymentData | BoletoPaymentData | SavedCardPaymentData;
  shipping_address: ShippingAddress;
  shipping_option?: ShippingOption | null;
  coupon?: CouponData | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // DEBUG: Log Hub config to verify secrets are loaded
    console.log("[process-payment] DEBUG HUB CONFIG:", {
      hasMarketplaceApiUrl: !!Deno.env.get("MARKETPLACE_API_URL"),
      hasMarketplaceApiKey: !!Deno.env.get("MARKETPLACE_API_KEY"),
    });

    // Get credentials from database (with fallback to env vars)
    const mpCredentials = await getMercadoPagoCredentials();
    const MERCADO_PAGO_ACCESS_TOKEN = mpCredentials.accessToken;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header (optional for guest checkout)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { items, payment_type = "credit_card", payment_data, shipping_address, shipping_option, coupon }: RequestBody = await req.json();

    // Log sanitized input (never log card token)
    try {
      const anyPayment = payment_data as any;
      const sanitized = {
        payment_type,
        items_count: Array.isArray(items) ? items.length : 0,
        has_shipping_address: !!shipping_address,
        payer_email: anyPayment?.payer_email,
        payer_identification_type: anyPayment?.payer_identification_type,
        payer_identification_number_last4: typeof anyPayment?.payer_identification_number === "string"
          ? anyPayment.payer_identification_number.slice(-4)
          : undefined,
        installments: anyPayment?.installments,
        payment_method_id: anyPayment?.payment_method_id,
        issuer_id: anyPayment?.issuer_id,
        transaction_amount: anyPayment?.transaction_amount,
      };
      console.log("[process-payment] received:", JSON.stringify(sanitized));
    } catch {
      // ignore logging failures
    }

    // Basic server-side validation (fail fast with useful debug)
    if (!payment_data || typeof payment_data !== "object") {
      return new Response(
        JSON.stringify({ error: "payment_data ausente ou inválido", debug: { payment_type } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const pd: any = payment_data;
    const requiredCommon = ["payer_email", "payer_identification_number"];
    const missingCommon = requiredCommon.filter((k) => !pd?.[k]);
    if (missingCommon.length) {
      return new Response(
        JSON.stringify({
          error: "Campos obrigatórios ausentes",
          debug: { missing: missingCommon, payment_type },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (payment_type === "credit_card") {
      const missing = ["token", "installments", "payment_method_id"].filter((k) => !pd?.[k]);
      if (missing.length) {
        return new Response(
          JSON.stringify({
            error: "Campos obrigatórios do cartão ausentes",
            debug: { missing, payment_type },
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Carrinho vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate total (products + shipping)
    const productsTotal = items.reduce((sum, item) => {
      const unitPrice = item.product.base_price + (item.variant.price_modifier || 0);
      return sum + unitPrice * item.quantity;
    }, 0);
    
    const shippingCost = shipping_option?.price || 0;
    const couponDiscount = coupon?.discount_amount || 0;
    const totalAmount = Math.max(0, productsTotal + shippingCost - couponDiscount);

    // ============================================
    // AUTO-CREATE USER ACCOUNT IF NOT LOGGED IN
    // ============================================
    let isNewUser = false;
    let passwordResetLink: string | null = null;

    if (!userId && payment_data.payer_email) {
      console.log("Guest checkout - checking for existing user:", payment_data.payer_email);
      
      // Search for existing user by email
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === payment_data.payer_email.toLowerCase()
      );

      if (existingUser) {
        // User already exists - use their ID
        userId = existingUser.id;
        console.log("Found existing user:", userId);
      } else {
        // Create new user with random password
        console.log("Creating new user account for:", payment_data.payer_email);
        
        // Use single UUID to stay under bcrypt's 72-byte limit
        const randomPassword = crypto.randomUUID();
        const buyerName = shipping_address?.name || "Cliente";
        
        const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
          email: payment_data.payer_email,
          password: randomPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: buyerName,
          },
        });

        if (signUpError) {
          console.error("Error creating user:", signUpError);
          // Continue with guest checkout if user creation fails
        } else if (newUser?.user) {
          userId = newUser.user.id;
          isNewUser = true;
          console.log("Created new user:", userId);

          // Create profile for new user
          const cpfCnpj = shipping_address?.cpf_cnpj || "";
          const { error: profileError } = await supabase.from("profiles").insert({
            user_id: userId,
            full_name: buyerName,
            phone: shipping_address?.phone || null,
            document: cpfCnpj,
            document_type: cpfCnpj.replace(/\D/g, "").length > 11 ? "cnpj" : "cpf",
          });

          if (profileError) {
            console.error("Error creating profile:", profileError);
          }

          // Save address for new user
          if (shipping_address) {
            const { error: addressError } = await supabase.from("addresses").insert({
              user_id: userId,
              name: shipping_address.name,
              phone: shipping_address.phone || null,
              cep: shipping_address.cep,
              street: shipping_address.street,
              number: shipping_address.number,
              complement: shipping_address.complement || null,
              neighborhood: shipping_address.neighborhood,
              city: shipping_address.city,
              state: shipping_address.state,
              is_default: true,
              label: "Principal",
            });

            if (addressError) {
              console.error("Error saving address:", addressError);
            }
          }

          // Generate password reset link for new user
          try {
            const baseUrl = "https://reidasbombas.lovable.app";
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
              type: "recovery",
              email: payment_data.payer_email,
              options: {
                redirectTo: `${baseUrl}/redefinir-senha`,
              },
            });

            if (linkError) {
              console.error("Error generating recovery link:", linkError);
            } else if (linkData?.properties?.action_link) {
              passwordResetLink = linkData.properties.action_link;
              console.log("Generated password reset link for new user");
            }
          } catch (linkError) {
            console.error("Error generating password link:", linkError);
          }
        }
      }
    }

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId || "00000000-0000-0000-0000-000000000000", // Fallback only if creation failed
        status: "pending",
        total_amount: totalAmount,
        metadata: { 
          buyer_email: payment_data.payer_email,
          payment_type: payment_type,
          is_new_user: isNewUser,
          shipping: shipping_option ? {
            id: shipping_option.id,
            name: shipping_option.name,
            company: shipping_option.company,
            price: shipping_option.price,
            delivery_time: shipping_option.delivery_time,
          } : null,
          coupon: coupon ? {
            id: coupon.id,
            code: coupon.code,
            discount_amount: coupon.discount_amount,
          } : null,
        },
        shipping_address: shipping_address || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error("Erro ao criar pedido");
    }

    // Store password reset link and isNewUser flag for email sending later
    const orderContext = { isNewUser, passwordResetLink };

    // Create order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      variant_id: item.variant.id,
      quantity: item.quantity,
      unit_price: item.product.base_price + (item.variant.price_modifier || 0),
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      // Rollback order
      await supabase.from("orders").delete().eq("id", order.id);
      throw new Error("Erro ao criar itens do pedido");
    }

    // Build description from items
    const description = items
      .map((item) => `${item.quantity}x ${item.product.title}`)
      .join(", ")
      .slice(0, 200);

    let paymentPayload: Record<string, unknown>;

    if (payment_type === "pix") {
      // PIX Payment
      const pixData = payment_data as PixPaymentData;
      
      paymentPayload = {
        transaction_amount: totalAmount,
        description: description || "Pedido Rei das Bombas",
        payment_method_id: "pix",
        payer: {
          email: pixData.payer_email,
          first_name: pixData.payer_name?.split(" ")[0] || "",
          last_name: pixData.payer_name?.split(" ").slice(1).join(" ") || "",
          identification: {
            type: pixData.payer_identification_type || "CPF",
            number: pixData.payer_identification_number,
          },
        },
        external_reference: order.id,
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      };
    } else if (payment_type === "boleto") {
      // Boleto Payment
      const boletoData = payment_data as BoletoPaymentData;
      
      // Calculate expiration date (3 days from now)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 3);
      
      paymentPayload = {
        transaction_amount: totalAmount,
        description: description || "Pedido Rei das Bombas",
        payment_method_id: "bolbradesco", // Bradesco Boleto
        payer: {
          email: boletoData.payer_email,
          first_name: boletoData.payer_name?.split(" ")[0] || "",
          last_name: boletoData.payer_name?.split(" ").slice(1).join(" ") || "",
          identification: {
            type: boletoData.payer_identification_type || "CPF",
            number: boletoData.payer_identification_number,
          },
          address: {
            zip_code: boletoData.payer_address.zip_code,
            street_name: boletoData.payer_address.street_name,
            street_number: boletoData.payer_address.street_number,
            neighborhood: boletoData.payer_address.neighborhood,
            city: boletoData.payer_address.city,
            federal_unit: boletoData.payer_address.federal_unit,
          },
        },
        date_of_expiration: expirationDate.toISOString(),
        external_reference: order.id,
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      };
    } else if (payment_type === "saved_card") {
      // Saved Card Payment
      const savedCardData = payment_data as SavedCardPaymentData;
      
      if (!savedCardData.saved_card_id) {
        return new Response(
          JSON.stringify({ error: "ID do cartão salvo não fornecido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get saved card details from database
      const { data: savedCard, error: cardError } = await supabase
        .from("saved_cards")
        .select("*")
        .eq("id", savedCardData.saved_card_id)
        .single();

      if (cardError || !savedCard) {
        return new Response(
          JSON.stringify({ error: "Cartão salvo não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use total with interest if provided, otherwise use base total
      const chargeAmount = savedCardData.total_with_interest || totalAmount;

      paymentPayload = {
        transaction_amount: chargeAmount,
        token: savedCard.card_id,
        description: description || "Pedido Rei das Bombas",
        installments: savedCardData.installments || 1,
        payment_method_id: savedCard.card_brand,
        payer: {
          type: "customer",
          id: savedCard.customer_id,
          email: savedCardData.payer_email,
        },
        external_reference: order.id,
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
        statement_descriptor: "REI DAS BOMBAS",
      };

      // Update order total if interest was applied
      if (savedCardData.total_with_interest && savedCardData.total_with_interest !== totalAmount) {
        await supabase
          .from("orders")
          .update({ 
            total_amount: chargeAmount,
            metadata: {
              ...order.metadata,
              original_amount: totalAmount,
              interest_amount: chargeAmount - totalAmount,
              installments: savedCardData.installments,
            }
          })
          .eq("id", order.id);
      }
    } else {
      // Credit Card Payment
      const cardData = payment_data as CardPaymentData;
      
      if (!cardData.token) {
        return new Response(
          JSON.stringify({ error: "Dados de pagamento inválidos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build base payload without issuer_id
      const basePayload = {
        transaction_amount: totalAmount,
        token: cardData.token,
        description: description || "Pedido Rei das Bombas",
        installments: cardData.installments,
        payment_method_id: cardData.payment_method_id,
        payer: {
          email: cardData.payer_email,
          identification: {
            type: cardData.payer_identification_type || "CPF",
            number: cardData.payer_identification_number,
          },
        },
        external_reference: order.id,
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
        statement_descriptor: "REI DAS BOMBAS",
      };

      // Only add issuer_id if it's a valid number (Mercado Pago requires integer)
      if (cardData.issuer_id && !isNaN(Number(cardData.issuer_id))) {
        paymentPayload = { ...basePayload, issuer_id: Number(cardData.issuer_id) };
      } else {
        paymentPayload = basePayload;
      }
    }

    console.log("Processing payment for order:", order.id, "type:", payment_type);

    let mpResponse: Response;
    let mpData: any = null;
    let mpRawText: string | null = null;

    try {
      mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
          "X-Idempotency-Key": order.id, // Prevent duplicate payments
        },
        body: JSON.stringify(paymentPayload),
      });

      // Mercado Pago usually returns JSON, but if it doesn't, we still want the body.
      mpRawText = await mpResponse.text();
      try {
        mpData = mpRawText ? JSON.parse(mpRawText) : null;
      } catch {
        mpData = { raw: mpRawText };
      }
    } catch (err) {
      console.error("Mercado Pago request failed:", err);
      await supabase
        .from("orders")
        .update({
          status: "cancelled",
          metadata: {
            ...order.metadata,
            payment_error: { message: "MP_REQUEST_FAILED", details: String(err) },
          },
        })
        .eq("id", order.id);

      return new Response(
        JSON.stringify({
          error: "Falha ao comunicar com o Mercado Pago",
          debug: { message: String(err) },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!mpResponse.ok) {
      console.error("Mercado Pago error:", mpData);
      
      // Update order status to failed
      await supabase
        .from("orders")
        .update({ 
          status: "cancelled",
          metadata: { 
            ...order.metadata, 
            payment_error: mpData 
          }
        })
        .eq("id", order.id);

      // Return user-friendly error message
      const errorMessage = getPaymentErrorMessage(mpData);
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: "rejected",
          status_detail: mpData.status_detail || mpData.message,
          mp_error: {
            message: mpData?.message,
            error: mpData?.error,
            status: mpData?.status,
            status_detail: mpData?.status_detail,
            cause: mpData?.cause,
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order with payment info
    const newStatus = mapPaymentStatus(mpData.status);
    await supabase
      .from("orders")
      .update({
        status: newStatus,
        payment_id: mpData.id?.toString(),
        payment_method: payment_type === "pix" ? "pix" : mpData.payment_method_id,
        metadata: {
          ...order.metadata,
          mp_status: mpData.status,
          mp_status_detail: mpData.status_detail,
        },
      })
      .eq("id", order.id);

    // Send order received email for pending payments (PIX/Boleto)
    if (["pending", "in_process"].includes(mpData.status) && (payment_type === "pix" || payment_type === "boleto")) {
      try {
        const emailPayload = {
          type: "order_received",
          to: payment_data.payer_email,
          order_id: order.id,
          tracking_token: order.tracking_token,
          total_amount: totalAmount,
          payment_method: payment_type,
          is_new_user: orderContext.isNewUser,
          password_reset_link: orderContext.passwordResetLink,
          items: items.map((item) => ({
            title: item.product.title,
            quantity: item.quantity,
            unit_price: item.product.base_price + (item.variant.price_modifier || 0),
            sku: item.variant.sku,
            attrs: item.variant.attrs,
          })),
          shipping_address: shipping_address || null,
          shipping_info: shipping_option ? {
            name: shipping_option.name,
            company: shipping_option.company,
            price: shipping_option.price,
            delivery_time: shipping_option.delivery_time,
          } : null,
        };

        fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(emailPayload),
        }).catch((err) => console.error("Failed to send order received email:", err));
      } catch (emailError) {
        console.error("Error preparing order received email:", emailError);
      }
    }

    // Handle PIX specific response
    if (payment_type === "pix" && mpData.point_of_interaction?.transaction_data) {
      const pixInfo = mpData.point_of_interaction.transaction_data;
      
      return new Response(
        JSON.stringify({
          order_id: order.id,
          status: mpData.status,
          status_detail: mpData.status_detail,
          payment_id: mpData.id,
          pix_data: {
            qr_code: pixInfo.qr_code,
            qr_code_base64: pixInfo.qr_code_base64,
            expiration_date: mpData.date_of_expiration,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle Boleto specific response - check for barcode OR transaction_details
    if (payment_type === "boleto" && (mpData.barcode || mpData.transaction_details)) {
      console.log("Boleto response data:", JSON.stringify({
        barcode: mpData.barcode,
        transaction_details: mpData.transaction_details,
        date_of_expiration: mpData.date_of_expiration,
      }));

      const boletoInfo = {
        barcode: mpData.barcode?.content || "",
        digitable_line: mpData.transaction_details?.digitable_line || mpData.barcode?.content || "",
        external_resource_url: mpData.transaction_details?.external_resource_url || "",
        expiration_date: mpData.date_of_expiration,
      };

      return new Response(
        JSON.stringify({
          order_id: order.id,
          status: mpData.status,
          status_detail: mpData.status_detail,
          payment_id: mpData.id,
          boleto_data: boletoInfo,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If payment is approved, decrement stock and record coupon use
    if (mpData.status === "approved") {
      for (const item of items) {
        const { error: stockError } = await supabase.rpc("decrement_stock", {
          p_variant_id: item.variant.id,
          p_quantity: item.quantity,
        });
        
        if (stockError) {
          console.error("Stock decrement error:", stockError);
        }
      }

      // Record coupon usage if a coupon was applied
      if (coupon) {
        try {
          // Insert coupon use record
          await supabase.from("coupon_uses").insert({
            coupon_id: coupon.id,
            order_id: order.id,
            discount_applied: coupon.discount_amount,
          });

          // Increment coupon usage count
          await supabase.rpc("increment_coupon_uses", { p_coupon_id: coupon.id });
        } catch (couponError) {
          console.error("Error recording coupon use:", couponError);
          // Don't block the order for coupon tracking errors
        }
      }

      // Send order confirmation email (fire and forget)
      try {
        const emailPayload = {
          type: "payment_confirmed",
          to: payment_data.payer_email,
          order_id: order.id,
          tracking_token: order.tracking_token,
          total_amount: totalAmount,
          payment_method: payment_type,
          is_new_user: orderContext.isNewUser,
          password_reset_link: orderContext.passwordResetLink,
          items: items.map((item) => ({
            title: item.product.title,
            quantity: item.quantity,
            unit_price: item.product.base_price + (item.variant.price_modifier || 0),
            sku: item.variant.sku,
            attrs: item.variant.attrs,
          })),
          shipping_address: shipping_address || null,
          shipping_info: shipping_option ? {
            name: shipping_option.name,
            company: shipping_option.company,
            price: shipping_option.price,
            delivery_time: shipping_option.delivery_time,
          } : null,
        };

        fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(emailPayload),
        }).catch((err) => console.error("Failed to send order email:", err));
      } catch (emailError) {
        console.error("Error preparing order email:", emailError);
      }

      // Send order to Hub (dropshipping supplier)
      try {
        const hubPayload = { order_id: order.id, type: "payment_approved" };
        console.log("[process-payment] DEBUG: Tentando enviar pedido para o Hub...", JSON.stringify(hubPayload));

        const hubFnResponse = await fetch(`${supabaseUrl}/functions/v1/send-order-to-hub`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(hubPayload),
        });

        const hubFnBody = await hubFnResponse.text().catch(() => "");
        console.log(
          `[process-payment] Hub function response for ${order.id}: status=${hubFnResponse.status}`,
          hubFnBody
        );
      } catch (hubSyncError) {
        console.error("[process-payment] DEBUG: Falha ao enviar ao Hub:", hubSyncError);
      }
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        status: mpData.status,
        status_detail: mpData.status_detail,
        payment_id: mpData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapPaymentStatus(mpStatus: string): string {
  switch (mpStatus) {
    case "approved":
      return "paid";
    case "pending":
    case "in_process":
    case "authorized":
      return "pending";
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "cancelled";
    default:
      return "pending";
  }
}

function getPaymentErrorMessage(mpError: { status_detail?: string; message?: string; cause?: Array<{ code?: string; description?: string }> }): string {
  const statusDetail = mpError.status_detail;
  
  const errorMessages: Record<string, string> = {
    cc_rejected_bad_filled_card_number: "Número do cartão inválido",
    cc_rejected_bad_filled_date: "Data de validade inválida",
    cc_rejected_bad_filled_other: "Dados do cartão inválidos",
    cc_rejected_bad_filled_security_code: "Código de segurança inválido",
    cc_rejected_blacklist: "Cartão não autorizado",
    cc_rejected_call_for_authorize: "Você deve autorizar o pagamento junto ao seu banco",
    cc_rejected_card_disabled: "Cartão desabilitado. Entre em contato com seu banco",
    cc_rejected_card_error: "Erro no cartão. Tente novamente",
    cc_rejected_duplicated_payment: "Pagamento duplicado. Verifique suas compras",
    cc_rejected_high_risk: "Pagamento recusado por segurança",
    cc_rejected_insufficient_amount: "Saldo insuficiente",
    cc_rejected_invalid_installments: "Número de parcelas inválido",
    cc_rejected_max_attempts: "Limite de tentativas excedido. Tente outro cartão",
    cc_rejected_other_reason: "Pagamento não autorizado",
  };

  if (statusDetail && errorMessages[statusDetail]) {
    return errorMessages[statusDetail];
  }

  if (mpError.cause && mpError.cause.length > 0) {
    return mpError.cause[0]?.description || "Erro ao processar pagamento";
  }

  return mpError.message || "Erro ao processar pagamento. Tente novamente.";
}
