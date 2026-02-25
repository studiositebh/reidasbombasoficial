import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, CreditCard, MapPin, Loader2, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useExpressCheckout, ExpressCheckoutData } from "@/hooks/useExpressCheckout";
import { useCart } from "@/contexts/CartContext";
import { useInstallmentSettings } from "@/hooks/useInstallmentSettings";
import { InstallmentSelector } from "@/components/InstallmentSelector";
import { cn } from "@/lib/utils";

interface ExpressCheckoutButtonProps {
  productId?: string;
  variantId?: string;
  quantity?: number;
  onAddToCart?: () => void;
  className?: string;
  size?: "default" | "sm" | "lg";
}

interface CartItemForPayment {
  product: {
    id: string;
    title: string;
    base_price: number;
    image_url: string | null;
  };
  variant: {
    id: string;
    sku: string;
    price_modifier: number;
    attrs: Record<string, unknown>;
  };
  quantity: number;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

export function ExpressCheckoutButton({
  onAddToCart,
  className,
  size = "lg",
}: ExpressCheckoutButtonProps) {
  const navigate = useNavigate();
  const { isAvailable, isLoading: isCheckingAvailability, expressData } = useExpressCheckout();
  const { items, subtotal, clearCart } = useCart();
  const { settings: installmentSettings } = useInstallmentSettings();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [totalWithInterest, setTotalWithInterest] = useState(0);

  // Don't render if express checkout is not available
  if (isCheckingAvailability || !isAvailable || !expressData) {
    return null;
  }

  const handleOpenDialog = () => {
    // First add item to cart if callback provided
    if (onAddToCart) {
      onAddToCart();
    }
    
    // Set initial total
    setTotalWithInterest(subtotal);
    setSelectedInstallments(1);
    setIsOpen(true);
  };

  const handleExpressCheckout = async () => {
    if (!expressData || items.length === 0) return;

    setIsProcessing(true);

    try {
      // Build cart items
      const cartItems: CartItemForPayment[] = items.map((item) => ({
        product: {
          id: item.product.id,
          title: item.product.title,
          base_price: item.product.base_price,
          image_url: item.product.image_url,
        },
        variant: {
          id: item.variant.id,
          sku: item.variant.sku,
          price_modifier: item.variant.price_modifier || 0,
          attrs: item.variant.attrs as Record<string, unknown>,
        },
        quantity: item.quantity,
      }));

      // Build shipping address
      const shippingAddress = {
        name: expressData.address.name || expressData.profile.full_name,
        phone: expressData.address.phone || expressData.profile.phone,
        cpf_cnpj: expressData.profile.document?.replace(/\D/g, ""),
        cep: expressData.address.cep,
        street: expressData.address.street,
        number: expressData.address.number,
        complement: expressData.address.complement,
        neighborhood: expressData.address.neighborhood,
        city: expressData.address.city,
        state: expressData.address.state,
      };

      // Calculate shipping first (using default address CEP)
      const { data: shippingData } = await supabase.functions.invoke("calculate-shipping", {
        body: {
          cep: expressData.address.cep,
          products: items.map((item) => ({
            id: item.product.id,
            quantity: item.quantity,
          })),
        },
      });

      const cheapestShipping = shippingData?.options?.[0];
      const shippingCost = cheapestShipping?.price || 0;
      const total = subtotal + shippingCost;

      // Process payment with saved card
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          items: cartItems,
          payment_type: "saved_card",
          payment_data: {
            saved_card_id: expressData.card.id,
            card_id: expressData.card.card_id,
            customer_id: expressData.card.customer_id,
            installments: selectedInstallments,
            transaction_amount: selectedInstallments > installmentSettings.interestFreeInstallments 
              ? totalWithInterest 
              : total,
            payer_email: expressData.email,
            payer_identification_type: expressData.profile.document_type || "CPF",
            payer_identification_number: expressData.profile.document?.replace(/\D/g, ""),
          },
          shipping_address: shippingAddress,
          shipping_option: cheapestShipping ? {
            id: cheapestShipping.id,
            name: cheapestShipping.name,
            company: cheapestShipping.company?.name || "Correios",
            price: cheapestShipping.price,
            delivery_time: cheapestShipping.delivery_time,
          } : null,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Handle success
      if (data?.status === "approved") {
        clearCart();
        toast.success("Compra realizada com sucesso!");
        navigate(`/pedido-confirmado?order_id=${data.order_id}`);
      } else if (data?.status === "in_process" || data?.status === "pending") {
        clearCart();
        toast.info("Pagamento em processamento...");
        navigate(`/pedido-pendente?order_id=${data.order_id}`);
      } else {
        throw new Error(data?.message || "Pagamento não aprovado");
      }
    } catch (error) {
      console.error("Express checkout error:", error);
      toast.error("Erro no checkout expresso", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const cardBrandLabel = (brand: string) => {
    const brands: Record<string, string> = {
      visa: "Visa",
      master: "Mastercard",
      mastercard: "Mastercard",
      amex: "American Express",
      elo: "Elo",
      hipercard: "Hipercard",
    };
    return brands[brand.toLowerCase()] || brand;
  };

  return (
    <>
      <Button
        size={size}
        onClick={handleOpenDialog}
        className={cn(
          "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg",
          size === "lg" && "h-14 text-base",
          className
        )}
      >
        <Zap className="mr-2 h-5 w-5" />
        Compra Expressa
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Compra Expressa
            </DialogTitle>
            <DialogDescription>
              Confirme sua compra com 1 clique usando seus dados salvos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Cart Summary */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Resumo do Pedido</h4>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.variant.id} className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {item.quantity}x {item.product.title}
                    </span>
                    <span className="font-medium">
                      {formatPrice((item.product.base_price + (item.variant.price_modifier || 0)) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(subtotal)}</span>
              </div>
            </div>

            {/* Saved Card */}
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {cardBrandLabel(expressData.card.card_brand)} •••• {expressData.card.last_four_digits}
                </p>
                <p className="text-xs text-muted-foreground">
                  {expressData.card.card_holder_name}
                </p>
              </div>
              <Check className="h-5 w-5 text-green-500" />
            </div>

            {/* Shipping Address */}
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {expressData.address.street}, {expressData.address.number}
                </p>
                <p className="text-xs text-muted-foreground">
                  {expressData.address.neighborhood} - {expressData.address.city}/{expressData.address.state}
                </p>
              </div>
              <Check className="h-5 w-5 text-green-500" />
            </div>

            {/* Installment Selector */}
            <div className="pt-2">
              <InstallmentSelector
                amount={subtotal}
                value={selectedInstallments}
                onChange={(installments, total) => {
                  setSelectedInstallments(installments);
                  setTotalWithInterest(total);
                }}
                maxInstallments={installmentSettings.maxInstallments}
                interestFreeInstallments={installmentSettings.interestFreeInstallments}
                monthlyInterestRate={installmentSettings.monthlyInterestRate}
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleExpressCheckout}
            disabled={isProcessing || items.length === 0}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold h-12"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Confirmar Compra
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Ao confirmar, você concorda com os termos de uso e política de privacidade
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
