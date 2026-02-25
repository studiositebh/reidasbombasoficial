import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PaymentConfig {
  environment: "sandbox" | "production";
  publicKey: string;
  isTestMode: boolean;
}

export function usePaymentConfig() {
  return useQuery({
    queryKey: ["payment-config"],
    queryFn: async (): Promise<PaymentConfig> => {
      // Use the public view which includes mp_* public keys
      const { data, error } = await supabase
        .from("store_settings_public")
        .select("mp_environment, mp_sandbox_public_key, mp_production_public_key")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching payment config:", error);
        // Fallback to env variable if DB fetch fails
        const envKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || "";
        return {
          environment: envKey.startsWith("TEST-") ? "sandbox" : "production",
          publicKey: envKey,
          isTestMode: envKey.startsWith("TEST-"),
        };
      }

      const environment = (data?.mp_environment as "sandbox" | "production") || "production";
      const publicKey = environment === "sandbox" 
        ? (data?.mp_sandbox_public_key || "") 
        : (data?.mp_production_public_key || "");

      return {
        environment,
        publicKey,
        isTestMode: environment === "sandbox",
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10,
  });
}
