import { supabase } from "@/integrations/supabase/client";

interface HubSettings {
  hub_url: string | null;
  hub_api_key: string | null;
  hub_auto_update_prices: boolean | null;
}

interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
  message: string;
}

export async function getHubSettings(): Promise<HubSettings | null> {
  const { data, error } = await supabase
    .from("store_settings")
    .select("hub_url, hub_api_key, hub_auto_update_prices")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .maybeSingle();

  if (error) {
    console.error("Error fetching hub settings:", error);
    return null;
  }

  return data as HubSettings | null;
}

export async function importProductsFromHub(): Promise<SyncResult> {
  try {
    // Call the edge function that handles the sync server-side
    const { data, error } = await supabase.functions.invoke("sync-from-hub", {
      method: "POST",
    });

    if (error) {
      return {
        success: false,
        created: 0,
        updated: 0,
        errors: [error.message],
        message: `Erro ao sincronizar: ${error.message}`,
      };
    }

    return data as SyncResult;
  } catch (error) {
    return {
      success: false,
      created: 0,
      updated: 0,
      errors: [],
      message: error instanceof Error ? error.message : "Erro ao sincronizar com o Hub",
    };
  }
}

export async function notifyHubProductStatus(
  productSku: string, 
  isActive: boolean
): Promise<boolean> {
  const settings = await getHubSettings();
  if (!settings?.hub_url || !settings?.hub_api_key) {
    console.warn("Hub settings not configured, skipping notification");
    return false;
  }

  try {
    // Build the status endpoint URL based on hub_url
    const baseUrl = settings.hub_url.replace(/\/marketplace-products$/, '');
    const statusUrl = `${baseUrl}/seller-product-status`;
    
    const response = await fetch(statusUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-seller-key": settings.hub_api_key,
      },
      body: JSON.stringify({
        sku: productSku,
        is_active: isActive,
      }),
    });
    
    if (!response.ok) {
      console.warn(`Hub status update failed: ${response.status}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Failed to notify hub:", error);
    return false;
  }
}

export interface HubOrderItem {
  sku: string;
  quantity: number;
}

export interface HubShippingAddress {
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

export interface HubOrderPayload {
  external_order_id: string;
  items: HubOrderItem[];
  shipping_address: HubShippingAddress;
  shipping_method: string;
}

export async function sendOrderToHub(payload: HubOrderPayload): Promise<{ success: boolean; message: string }> {
  const settings = await getHubSettings();
  if (!settings?.hub_url || !settings?.hub_api_key) {
    return { 
      success: false, 
      message: "Hub settings not configured" 
    };
  }

  try {
    // Build the orders endpoint URL based on hub_url
    const baseUrl = settings.hub_url.replace(/\/marketplace-products$/, '');
    const ordersUrl = `${baseUrl}/marketplace-orders`;
    
    console.log("Sending order to Hub:", ordersUrl, payload);
    
    const response = await fetch(ordersUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-seller-key": settings.hub_api_key,
      },
      body: JSON.stringify(payload),
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`Hub order sync failed: ${response.status}`, responseText);
      return { 
        success: false, 
        message: `Erro ao enviar pedido para o Hub: ${response.status}` 
      };
    }
    
    console.log("Order sent to Hub successfully:", responseText);
    return { 
      success: true, 
      message: "Pedido enviado para o Hub com sucesso" 
    };
  } catch (error) {
    console.error("Failed to send order to hub:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Erro ao enviar pedido para o Hub" 
    };
  }
}

export interface OrderSyncResult {
  success: boolean;
  updated: number;
  errors: string[];
  message: string;
}

export async function refreshOrderStatuses(): Promise<OrderSyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke("sync-orders-from-hub", {
      method: "POST",
    });

    if (error) {
      return {
        success: false,
        updated: 0,
        errors: [error.message],
        message: `Erro ao sincronizar: ${error.message}`,
      };
    }

    return data as OrderSyncResult;
  } catch (error) {
    return {
      success: false,
      updated: 0,
      errors: [],
      message: error instanceof Error ? error.message : "Erro ao sincronizar pedidos com o Hub",
    };
  }
}
