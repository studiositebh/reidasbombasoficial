import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STORE_DEFAULTS } from "@/lib/constants";

export interface StoreSettings {
  // Contact - from defaults (not exposed in public view for security)
  whatsapp: string;
  whatsappRaw: string;
  whatsappUrl: string;
  phone: string;
  email: string;
  cnpj: string;
  storeName: string;
  
  // Address - from defaults (not exposed in public view for security)
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
    full: string;
  };
  
  // Social Media - from public view
  social: {
    facebook: string;
    instagram: string;
    youtube: string;
    linkedin: string;
  };
  
  // Business hours
  hours: string;
}

export function useStoreSettings() {
  return useQuery({
    queryKey: ["store-settings"],
    queryFn: async (): Promise<StoreSettings> => {
      // Use the public view which now includes all public data
      const { data, error } = await supabase
        .from("store_settings_public")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch store settings:", error);
      }

      // Get whatsapp from database or fallback to defaults
      const whatsappRaw = (data?.whatsapp || STORE_DEFAULTS.whatsapp).replace(/\D/g, "");
      
      return {
        // Contact - now from public view (safe fields)
        whatsapp: data?.whatsapp || STORE_DEFAULTS.whatsapp,
        whatsappRaw,
        whatsappUrl: `https://wa.me/${whatsappRaw}`,
        phone: data?.phone || STORE_DEFAULTS.phone,
        email: data?.email || STORE_DEFAULTS.email,
        cnpj: data?.cnpj || STORE_DEFAULTS.cnpj,
        storeName: data?.store_name || STORE_DEFAULTS.storeName,
        
        // Address - from defaults (not in public view for privacy)
        address: {
          street: STORE_DEFAULTS.address.street,
          number: STORE_DEFAULTS.address.number,
          complement: "",
          neighborhood: STORE_DEFAULTS.address.neighborhood,
          city: STORE_DEFAULTS.address.city,
          state: STORE_DEFAULTS.address.state,
          zip: STORE_DEFAULTS.address.zip,
          full: `${STORE_DEFAULTS.address.street}, ${STORE_DEFAULTS.address.number} - ${STORE_DEFAULTS.address.neighborhood}, ${STORE_DEFAULTS.address.city}/${STORE_DEFAULTS.address.state} - CEP: ${STORE_DEFAULTS.address.zip}`,
        },
        
        // Social Media - from public view or defaults
        social: {
          facebook: data?.facebook_url || STORE_DEFAULTS.social.facebook,
          instagram: data?.instagram_url || STORE_DEFAULTS.social.instagram,
          youtube: data?.youtube_url || "",
          linkedin: data?.linkedin_url || "",
        },
        
        // Business hours
        hours: STORE_DEFAULTS.hours,
      };
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    gcTime: 1000 * 60 * 30,    // Keep in memory for 30 minutes
  });
}

/**
 * Helper function to generate a WhatsApp URL with an optional message
 */
export function getWhatsAppUrl(baseUrl: string, message?: string): string {
  if (!message) return baseUrl;
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}
