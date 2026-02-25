import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileProductBarProps {
  price: number;
  originalPrice?: number;
  installments?: number;
  onBuyNow: () => void;
  isBackorder?: boolean;
  isLoading?: boolean;
}

export function MobileProductBar({
  price,
  originalPrice,
  installments = 12,
  onBuyNow,
  isBackorder = false,
  isLoading = false,
}: MobileProductBarProps) {
  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const installmentValue = price / installments;

  return (
    <div className="mobile-product-bar">
      <div className="flex flex-col">
        {originalPrice && originalPrice > price && (
          <span className="text-xs text-muted-foreground line-through">
            {formatPrice(originalPrice)}
          </span>
        )}
        <span className="text-lg font-bold text-foreground">
          {formatPrice(price)}
        </span>
        <span className="text-xs text-muted-foreground">
          ou {installments}x de {formatPrice(installmentValue)}
        </span>
      </div>

      <Button
        onClick={onBuyNow}
        disabled={isLoading}
        className={`px-6 py-3 h-auto font-bold ${
          isBackorder 
            ? "bg-amber-600 hover:bg-amber-700" 
            : "bg-primary hover:bg-primary/90"
        }`}
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        {isBackorder ? "Encomendar" : "Comprar"}
      </Button>
    </div>
  );
}
