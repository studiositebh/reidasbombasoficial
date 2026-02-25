import { useState, useEffect } from "react";
import { CreditCard, Trash2, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SavedCard {
  id: string;
  last_four_digits: string;
  card_brand: string;
  card_holder_name: string;
  expiration_month: number;
  expiration_year: number;
  is_default: boolean;
}

const cardBrandLabels: Record<string, string> = {
  visa: "Visa",
  master: "Mastercard",
  mastercard: "Mastercard",
  amex: "American Express",
  elo: "Elo",
  hipercard: "Hipercard",
};

export default function SavedCards() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<SavedCard | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("manage-saved-cards", {
        body: { action: "list" },
      });
      if (error) throw error;
      setCards(data.cards || []);
    } catch (error) {
      console.error("Error loading saved cards:", error);
      toast.error("Erro ao carregar cartões salvos");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!cardToDelete) return;
    try {
      setDeletingId(cardToDelete.id);
      const { error } = await supabase.functions.invoke("manage-saved-cards", {
        body: { action: "delete", card_id: cardToDelete.id },
      });
      if (error) throw error;
      toast.success("Cartão removido com sucesso");
      setCards(cards.filter(c => c.id !== cardToDelete.id));
    } catch (error) {
      console.error("Error deleting card:", error);
      toast.error("Erro ao remover cartão");
    } finally {
      setDeletingId(null);
      setCardToDelete(null);
    }
  }

  async function handleSetDefault(cardId: string) {
    try {
      const { error } = await supabase.functions.invoke("manage-saved-cards", {
        body: { action: "set_default", card_id: cardId },
      });
      if (error) throw error;
      toast.success("Cartão definido como padrão");
      setCards(cards.map(c => ({ ...c, is_default: c.id === cardId })));
    } catch (error) {
      console.error("Error setting default card:", error);
      toast.error("Erro ao definir cartão padrão");
    }
  }

  function getCardBrandLabel(brand: string): string {
    return cardBrandLabels[brand.toLowerCase()] || brand;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cartões Salvos</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Meus Cartões
          </CardTitle>
          <CardDescription>Gerencie os cartões salvos para compras mais rápidas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum cartão salvo</h3>
              <p className="text-sm text-muted-foreground">
                Você pode salvar um cartão durante o checkout marcando a opção "Salvar cartão".
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cards.map((card) => (
                <div key={card.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getCardBrandLabel(card.card_brand)}</span>
                        <span className="text-muted-foreground">•••• {card.last_four_digits}</span>
                        {card.is_default && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">Padrão</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {card.card_holder_name} • Expira {String(card.expiration_month).padStart(2, "0")}/{card.expiration_year}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!card.is_default && (
                      <Button variant="outline" size="sm" onClick={() => handleSetDefault(card.id)}>
                        <Star className="h-4 w-4 mr-1" />
                        Tornar Padrão
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCardToDelete(card)}
                      disabled={deletingId === card.id}
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingId === card.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Cartão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o cartão <strong>{cardToDelete && getCardBrandLabel(cardToDelete.card_brand)} •••• {cardToDelete?.last_four_digits}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
