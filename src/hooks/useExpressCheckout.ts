import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SavedCard {
  id: string;
  card_id: string;
  last_four_digits: string;
  first_six_digits: string;
  card_brand: string;
  card_holder_name: string;
  expiration_month: number;
  expiration_year: number;
  is_default: boolean;
  customer_id?: string;
}

interface SavedAddress {
  id: string;
  name: string;
  phone: string | null;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
}

interface UserProfile {
  full_name: string | null;
  phone: string | null;
  document: string | null;
  document_type: string | null;
}

export interface ExpressCheckoutData {
  card: SavedCard;
  address: SavedAddress;
  profile: UserProfile;
  email: string;
}

export function useExpressCheckout() {
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expressData, setExpressData] = useState<ExpressCheckoutData | null>(null);

  const checkAvailability = useCallback(async () => {
    if (!user) {
      setIsAvailable(false);
      setExpressData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch default card, default address, and profile in parallel
      const [cardsResult, addressResult, profileResult] = await Promise.all([
        supabase.functions.invoke("manage-saved-cards", {
          body: { action: "list" },
        }),
        supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_default", true)
          .single(),
        supabase
          .from("profiles")
          .select("full_name, phone, document, document_type")
          .eq("user_id", user.id)
          .single(),
      ]);

      // Check for default card
      const cards = cardsResult.data?.cards || [];
      const defaultCard = cards.find((c: SavedCard) => c.is_default) || cards[0];
      
      // Check for default address
      const defaultAddress = addressResult.data;
      
      // Check for profile with required fields
      const profile = profileResult.data;
      const hasRequiredProfile = profile?.full_name && profile?.document;

      // Express checkout is available if all requirements are met
      if (defaultCard && defaultAddress && hasRequiredProfile && user.email) {
        setIsAvailable(true);
        setExpressData({
          card: defaultCard,
          address: defaultAddress,
          profile: profile as UserProfile,
          email: user.email,
        });
      } else {
        setIsAvailable(false);
        setExpressData(null);
      }
    } catch (error) {
      console.error("Error checking express checkout availability:", error);
      setIsAvailable(false);
      setExpressData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  return {
    isAvailable,
    isLoading,
    expressData,
    refresh: checkAvailability,
  };
}
