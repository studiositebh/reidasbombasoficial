import { supabase } from "@/integrations/supabase/client";
import type { ShippingOption, ShippingCalculationResponse } from "@/types/shipping";

export interface CartItemForShipping {
  product_id: string;
  quantity: number;
}

// Frete de contingência caso a API falhe
const FALLBACK_SHIPPING: ShippingOption = {
  id: 0,
  name: "Frete Padrão",
  company: {
    id: 0,
    name: "Entrega Padrão",
    picture: "",
  },
  price: 40.0,
  delivery_min: 7,
  delivery_max: 15,
  delivery_time: "7 a 15 dias úteis",
};

/**
 * Calcula opções de frete usando a API do Melhor Envio
 */
export async function calculateShipping(
  destinationCep: string,
  items: CartItemForShipping[]
): Promise<{ options: ShippingOption[]; usedFallback: boolean }> {
  // Limpar CEP
  const cleanCep = destinationCep.replace(/\D/g, "");

  if (cleanCep.length !== 8) {
    throw new Error("CEP inválido");
  }

  if (!items || items.length === 0) {
    throw new Error("Carrinho vazio");
  }

  try {
    const { data, error } = await supabase.functions.invoke<ShippingCalculationResponse>(
      "calculate-shipping",
      {
        body: {
          destination_cep: cleanCep,
          items,
        },
      }
    );

    if (error) {
      console.error("Shipping API error:", error);
      // Retornar frete de contingência
      return { options: [FALLBACK_SHIPPING], usedFallback: true };
    }

    if (data?.error) {
      console.error("Shipping calculation error:", data.error);
      return { options: [FALLBACK_SHIPPING], usedFallback: true };
    }

    if (data?.options && data.options.length > 0) {
      return { options: data.options, usedFallback: false };
    }

    // Sem opções disponíveis, usar contingência
    return { options: [FALLBACK_SHIPPING], usedFallback: true };
  } catch (err) {
    console.error("Network error calculating shipping:", err);
    return { options: [FALLBACK_SHIPPING], usedFallback: true };
  }
}

/**
 * Calcula frete para um único produto (página de detalhes)
 */
export async function calculateProductShipping(
  destinationCep: string,
  productId: string,
  quantity: number = 1
): Promise<{ options: ShippingOption[]; usedFallback: boolean }> {
  return calculateShipping(destinationCep, [{ product_id: productId, quantity }]);
}

/**
 * Formata preço em reais
 */
export function formatShippingPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}
