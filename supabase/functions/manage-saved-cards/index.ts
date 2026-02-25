import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SaveCardRequest {
  action: "save" | "delete" | "list" | "set_default" | "pay_with_saved";
  card_data?: {
    token: string;
    payment_method_id: string;
    issuer_id: string;
    payer_email: string;
  };
  card_id?: string;
  // For pay_with_saved
  saved_card_id?: string;
  amount?: number;
  installments?: number;
  order_id?: string;
  payer_email?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação necessária" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, card_data, card_id, saved_card_id, amount, installments, order_id, payer_email }: SaveCardRequest = await req.json();

    switch (action) {
      case "list": {
        const { data: cards, error } = await supabase
          .from("saved_cards")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ cards }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "save": {
        if (!card_data) {
          return new Response(
            JSON.stringify({ error: "Dados do cartão não fornecidos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // First, get or create customer in Mercado Pago
        let customerId: string;
        
        // Check if user already has a customer ID
        const { data: existingCards } = await supabase
          .from("saved_cards")
          .select("customer_id")
          .eq("user_id", user.id)
          .not("customer_id", "is", null)
          .limit(1);

        if (existingCards && existingCards.length > 0 && existingCards[0].customer_id) {
          customerId = existingCards[0].customer_id;
        } else {
          // Create new customer
          const customerResponse = await fetch("https://api.mercadopago.com/v1/customers", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              email: card_data.payer_email,
            }),
          });

          // Customer might already exist with this email
          if (!customerResponse.ok) {
            const errorData = await customerResponse.json();
            // If customer already exists, search for it
            if (errorData.cause?.[0]?.code === "107") {
              const searchResponse = await fetch(
                `https://api.mercadopago.com/v1/customers/search?email=${encodeURIComponent(card_data.payer_email)}`,
                {
                  headers: {
                    Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
                  },
                }
              );
              const searchData = await searchResponse.json();
              if (searchData.results && searchData.results.length > 0) {
                customerId = searchData.results[0].id;
              } else {
                throw new Error("Erro ao buscar cliente existente");
              }
            } else {
              throw new Error("Erro ao criar cliente no Mercado Pago");
            }
          } else {
            const customerData = await customerResponse.json();
            customerId = customerData.id;
          }
        }

        // Now save the card to the customer
        const cardResponse = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}/cards`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            token: card_data.token,
          }),
        });

        if (!cardResponse.ok) {
          const errorData = await cardResponse.json();
          console.error("Error saving card:", errorData);
          
          // Check if card already exists
          if (errorData.cause?.[0]?.code === "224") {
            return new Response(
              JSON.stringify({ error: "Este cartão já está salvo" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          throw new Error("Erro ao salvar cartão");
        }

        const savedCard = await cardResponse.json();

        // Check if user has any cards - if not, this will be default
        const { count } = await supabase
          .from("saved_cards")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const isDefault = count === 0;

        // Save to our database
        const { data: dbCard, error: insertError } = await supabase
          .from("saved_cards")
          .insert({
            user_id: user.id,
            customer_id: customerId,
            card_id: savedCard.id,
            first_six_digits: savedCard.first_six_digits,
            last_four_digits: savedCard.last_four_digits,
            card_brand: savedCard.payment_method.id || savedCard.payment_method.name,
            card_holder_name: savedCard.cardholder.name,
            expiration_month: savedCard.expiration_month,
            expiration_year: savedCard.expiration_year,
            is_default: isDefault,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting card:", insertError);
          throw new Error("Erro ao salvar cartão no banco de dados");
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            card: {
              id: dbCard.id,
              last_four_digits: dbCard.last_four_digits,
              card_brand: dbCard.card_brand,
              card_holder_name: dbCard.card_holder_name,
              is_default: dbCard.is_default,
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        if (!card_id) {
          return new Response(
            JSON.stringify({ error: "ID do cartão não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get card details
        const { data: card, error: fetchError } = await supabase
          .from("saved_cards")
          .select("*")
          .eq("id", card_id)
          .eq("user_id", user.id)
          .single();

        if (fetchError || !card) {
          return new Response(
            JSON.stringify({ error: "Cartão não encontrado" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete from Mercado Pago
        if (card.customer_id && card.card_id) {
          await fetch(`https://api.mercadopago.com/v1/customers/${card.customer_id}/cards/${card.card_id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
            },
          });
        }

        // Delete from our database
        const { error: deleteError } = await supabase
          .from("saved_cards")
          .delete()
          .eq("id", card_id)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        // If this was the default card, set another as default
        if (card.is_default) {
          const { data: remainingCards } = await supabase
            .from("saved_cards")
            .select("id")
            .eq("user_id", user.id)
            .limit(1);

          if (remainingCards && remainingCards.length > 0) {
            await supabase
              .from("saved_cards")
              .update({ is_default: true })
              .eq("id", remainingCards[0].id);
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "set_default": {
        if (!card_id) {
          return new Response(
            JSON.stringify({ error: "ID do cartão não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Remove default from all user cards
        await supabase
          .from("saved_cards")
          .update({ is_default: false })
          .eq("user_id", user.id);

        // Set new default
        const { error } = await supabase
          .from("saved_cards")
          .update({ is_default: true })
          .eq("id", card_id)
          .eq("user_id", user.id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "pay_with_saved": {
        if (!saved_card_id || !amount || !order_id) {
          return new Response(
            JSON.stringify({ error: "Dados insuficientes para pagamento" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get saved card details
        const { data: savedCard, error: cardError } = await supabase
          .from("saved_cards")
          .select("*")
          .eq("id", saved_card_id)
          .eq("user_id", user.id)
          .single();

        if (cardError || !savedCard) {
          return new Response(
            JSON.stringify({ error: "Cartão não encontrado" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create payment with saved card
        const paymentPayload = {
          transaction_amount: amount,
          token: savedCard.card_id, // Use card_id as token for saved cards
          description: "Pedido Rei das Bombas",
          installments: installments || 1,
          payment_method_id: savedCard.card_brand,
          payer: {
            type: "customer",
            id: savedCard.customer_id,
            email: payer_email || user.email,
          },
          external_reference: order_id,
          notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
          statement_descriptor: "REI DAS BOMBAS",
        };

        const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
            "X-Idempotency-Key": `${order_id}-saved-${Date.now()}`,
          },
          body: JSON.stringify(paymentPayload),
        });

        const mpData = await mpResponse.json();

        if (!mpResponse.ok) {
          console.error("Mercado Pago error:", mpData);
          return new Response(
            JSON.stringify({ 
              error: "Erro ao processar pagamento",
              status: "rejected",
              status_detail: mpData.status_detail || mpData.message,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            order_id: order_id,
            status: mpData.status,
            status_detail: mpData.status_detail,
            payment_id: mpData.id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
