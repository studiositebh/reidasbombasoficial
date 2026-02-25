import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CustomerData {
  name: string;
  phone: string;
  cpfCnpj: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

interface UseCustomerLookupReturn {
  lookupCustomer: (email: string) => Promise<CustomerData | null>;
  isLooking: boolean;
}

export function useCustomerLookup(): UseCustomerLookupReturn {
  const [isLooking, setIsLooking] = useState(false);

  const lookupCustomer = useCallback(async (email: string): Promise<CustomerData | null> => {
    if (!email || !email.includes("@")) return null;

    setIsLooking(true);
    try {
      // Get current session (avoid querying protected tables if no session)
      const { data: { session } } = await supabase.auth.getSession();

      // First, try to find user by checking orders with this email
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("user_id, shipping_address, metadata")
        .neq("user_id", "00000000-0000-0000-0000-000000000000")
        .order("created_at", { ascending: false })
        .limit(50);

      if (ordersError) {
        // Silently handle 406/403 for guests (RLS may block)
        if (ordersError.code === "406" || ordersError.code === "PGRST301") {
          return null;
        }
        console.error("Error fetching orders:", ordersError);
        return null;
      }

      // Find order with matching email
      const matchingOrder = orders?.find((order) => {
        const metadata = order.metadata as { buyer_email?: string } | null;
        return metadata?.buyer_email?.toLowerCase() === email.toLowerCase();
      });

      if (!matchingOrder) {
        return null;
      }

      const userId = matchingOrder.user_id;

      // Only fetch profiles/addresses if there's an active session (prevents 406 for guests)
      if (!session) {
        // Guest: use shipping_address from the order only
        const shippingAddr = matchingOrder.shipping_address as {
          name?: string;
          phone?: string;
          cpf_cnpj?: string;
          cep?: string;
          street?: string;
          number?: string;
          complement?: string;
          neighborhood?: string;
          city?: string;
          state?: string;
        } | null;

        if (shippingAddr) {
          return {
            name: shippingAddr.name || "",
            phone: shippingAddr.phone || "",
            cpfCnpj: shippingAddr.cpf_cnpj || "",
            address: shippingAddr.cep
              ? {
                  cep: shippingAddr.cep,
                  street: shippingAddr.street || "",
                  number: shippingAddr.number || "",
                  complement: shippingAddr.complement || "",
                  neighborhood: shippingAddr.neighborhood || "",
                  city: shippingAddr.city || "",
                  state: shippingAddr.state || "",
                }
              : undefined,
          };
        }
        return null;
      }

      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, document")
        .eq("user_id", userId)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching profile:", profileError);
      }

      // Fetch default address
      const { data: address, error: addressError } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .eq("is_default", true)
        .single();

      if (addressError && addressError.code !== "PGRST116") {
        console.error("Error fetching address:", addressError);
      }

      // Build customer data from profile + address
      const customerData: CustomerData = {
        name: profile?.full_name || "",
        phone: profile?.phone || "",
        cpfCnpj: profile?.document || "",
      };

      if (address) {
        customerData.address = {
          cep: address.cep,
          street: address.street,
          number: address.number,
          complement: address.complement || "",
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
        };
      } else if (matchingOrder.shipping_address) {
        // Fallback to last order's shipping address
        const shippingAddr = matchingOrder.shipping_address as {
          cep?: string;
          street?: string;
          number?: string;
          complement?: string;
          neighborhood?: string;
          city?: string;
          state?: string;
        };
        
        if (shippingAddr.cep) {
          customerData.address = {
            cep: shippingAddr.cep,
            street: shippingAddr.street || "",
            number: shippingAddr.number || "",
            complement: shippingAddr.complement || "",
            neighborhood: shippingAddr.neighborhood || "",
            city: shippingAddr.city || "",
            state: shippingAddr.state || "",
          };
        }
      }

      return customerData;
    } catch (error) {
      console.error("Error looking up customer:", error);
      return null;
    } finally {
      setIsLooking(false);
    }
  }, []);

  return { lookupCustomer, isLooking };
}
