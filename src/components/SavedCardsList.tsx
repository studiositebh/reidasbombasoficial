import { useState, useEffect } from "react";
import { CreditCard, Trash2, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SavedCard {
  id: string;
  last_four_digits: string;
  first_six_digits: string;
  card_brand: string;
  card_holder_name: string;
  expiration_month: number;
  expiration_year: number;
  is_default: boolean;
}

interface SavedCardsListProps {
  onSelectCard: (cardId: string | null) => void;
  selectedCardId: string | null;
  showNewCardOption?: boolean;
}

const cardBrandLogos: Record<string, string> = {
  visa: "💳 Visa",
  master: "💳 Mastercard",
  mastercard: "💳 Mastercard",
  amex: "💳 Amex",
  elo: "💳 Elo",
  hipercard: "💳 Hipercard",
};

export function SavedCardsList({ 
  onSelectCard, 
  selectedCardId,
  showNewCardOption = true 
}: SavedCardsListProps) {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setCards([]);
        return;
      }

      const { data, error } = await supabase.functions.invoke("manage-saved-cards", {
        body: { action: "list" },
      });

      if (error) throw error;
      
      setCards(data.cards || []);
      
      // Auto-select default card if no selection
      if (!selectedCardId && data.cards?.length > 0) {
        const defaultCard = data.cards.find((c: SavedCard) => c.is_default);
        if (defaultCard) {
          onSelectCard(defaultCard.id);
        }
      }
    } catch (error) {
      console.error("Error loading saved cards:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(cardId: string) {
    try {
      setDeletingId(cardId);
      
      const { error } = await supabase.functions.invoke("manage-saved-cards", {
        body: { action: "delete", card_id: cardId },
      });

      if (error) throw error;
      
      toast.success("Cartão removido com sucesso");
      setCards(cards.filter(c => c.id !== cardId));
      
      if (selectedCardId === cardId) {
        onSelectCard(null);
      }
    } catch (error) {
      console.error("Error deleting card:", error);
      toast.error("Erro ao remover cartão");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetDefault(cardId: string) {
    try {
      const { error } = await supabase.functions.invoke("manage-saved-cards", {
        body: { action: "set_default", card_id: cardId },
      });

      if (error) throw error;
      
      toast.success("Cartão definido como padrão");
      setCards(cards.map(c => ({
        ...c,
        is_default: c.id === cardId,
      })));
    } catch (error) {
      console.error("Error setting default card:", error);
      toast.error("Erro ao definir cartão padrão");
    }
  }

  function getCardBrandLabel(brand: string): string {
    const normalizedBrand = brand.toLowerCase();
    return cardBrandLogos[normalizedBrand] || `💳 ${brand}`;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (cards.length === 0 && !showNewCardOption) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Você não tem cartões salvos.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <RadioGroup 
        value={selectedCardId || "new"} 
        onValueChange={(value) => onSelectCard(value === "new" ? null : value)}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            className={cn(
              "flex items-center justify-between p-4 border rounded-lg transition-colors",
              selectedCardId === card.id 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value={card.id} id={card.id} />
              <Label htmlFor={card.id} className="flex items-center gap-3 cursor-pointer">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {getCardBrandLabel(card.card_brand)}
                    </span>
                    <span className="text-muted-foreground">
                      •••• {card.last_four_digits}
                    </span>
                    {card.is_default && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Padrão
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {card.card_holder_name} • Expira {String(card.expiration_month).padStart(2, "0")}/{card.expiration_year}
                  </div>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center gap-1">
              {!card.is_default && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetDefault(card.id)}
                  title="Definir como padrão"
                >
                  <Star className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(card.id)}
                disabled={deletingId === card.id}
                className="text-destructive hover:text-destructive"
              >
                {deletingId === card.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}

        {showNewCardOption && (
          <div
            className={cn(
              "flex items-center p-4 border rounded-lg transition-colors",
              selectedCardId === null 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="new" id="new-card" />
              <Label htmlFor="new-card" className="flex items-center gap-3 cursor-pointer">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Usar novo cartão</span>
              </Label>
            </div>
          </div>
        )}
      </RadioGroup>
    </div>
  );
}
