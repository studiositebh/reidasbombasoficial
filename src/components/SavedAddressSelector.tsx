import { useState, useEffect } from "react";
import { MapPin, Check, Plus, Home, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SavedAddress {
  id: string;
  label: string;
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

interface SavedAddressSelectorProps {
  onSelect: (address: SavedAddress) => void;
  onNewAddress: () => void;
  selectedId?: string | null;
}

export function SavedAddressSelector({ 
  onSelect, 
  onNewAddress,
  selectedId 
}: SavedAddressSelectorProps) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAddresses();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchAddresses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || addresses.length === 0) {
    return null;
  }

  const getAddressIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("trabalho") || lowerLabel.includes("comercial")) {
      return Building2;
    }
    return Home;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Endereços salvos</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onNewAddress}
          className="text-primary hover:text-primary/80"
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo endereço
        </Button>
      </div>

      <div className="grid gap-3">
        {addresses.map((address) => {
          const Icon = getAddressIcon(address.label);
          const isSelected = selectedId === address.id;

          return (
            <button
              key={address.id}
              type="button"
              onClick={() => onSelect(address)}
              className={cn(
                "relative flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all",
                "hover:border-primary/50 hover:bg-primary/5",
                isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-muted bg-background"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-10 w-10 rounded-full shrink-0",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{address.label}</span>
                  {address.is_default && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Padrão
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {address.street}, {address.number}
                  {address.complement && `, ${address.complement}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {address.neighborhood} - {address.city}/{address.state}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CEP: {address.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}
                </p>
              </div>

              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onNewAddress}
        className={cn(
          "flex items-center gap-3 w-full p-4 rounded-lg border-2 border-dashed text-left transition-all",
          "hover:border-primary/50 hover:bg-primary/5",
          selectedId === "new" 
            ? "border-primary bg-primary/10" 
            : "border-muted-foreground/30"
        )}
      >
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-muted-foreground">
          <Plus className="h-5 w-5" />
        </div>
        <div>
          <span className="font-medium text-foreground">Usar outro endereço</span>
          <p className="text-sm text-muted-foreground">Digite um novo endereço de entrega</p>
        </div>
      </button>
    </div>
  );
}

export type { SavedAddress };
