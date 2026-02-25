import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface MercadoPagoCredentials {
  accessToken: string;
  publicKey: string;
  environment: "sandbox" | "production";
}

export async function getMercadoPagoCredentials(): Promise<MercadoPagoCredentials> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: settings, error } = await supabase
    .from("store_settings")
    .select("mp_environment, mp_sandbox_public_key, mp_sandbox_access_token, mp_production_public_key, mp_production_access_token")
    .single();

  if (error) {
    console.error("Error fetching MP settings:", error);
    // Fallback to environment variables
    const fallbackToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!fallbackToken) {
      throw new Error("Mercado Pago credentials not configured");
    }
    return {
      accessToken: fallbackToken,
      publicKey: Deno.env.get("MERCADO_PAGO_PUBLIC_KEY") || "",
      environment: fallbackToken.startsWith("TEST-") ? "sandbox" : "production",
    };
  }

  const environment = (settings?.mp_environment as "sandbox" | "production") || "production";
  
  const accessToken = environment === "sandbox"
    ? settings?.mp_sandbox_access_token
    : settings?.mp_production_access_token;

  const publicKey = environment === "sandbox"
    ? settings?.mp_sandbox_public_key
    : settings?.mp_production_public_key;

  if (!accessToken) {
    // Fallback to environment variables if DB credentials are empty
    const fallbackToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!fallbackToken) {
      throw new Error(`Mercado Pago ${environment} access token not configured`);
    }
    return {
      accessToken: fallbackToken,
      publicKey: Deno.env.get("MERCADO_PAGO_PUBLIC_KEY") || "",
      environment,
    };
  }

  return {
    accessToken,
    publicKey: publicKey || "",
    environment,
  };
}
