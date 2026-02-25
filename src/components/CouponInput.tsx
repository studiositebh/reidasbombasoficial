import { useState } from "react";
import { Tag, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface AppliedCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_amount: number;
}

interface CouponInputProps {
  orderTotal: number;
  appliedCoupon: AppliedCoupon | null;
  onApplyCoupon: (coupon: AppliedCoupon) => void;
  onRemoveCoupon: () => void;
  disabled?: boolean;
}

export function CouponInput({
  orderTotal,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  disabled = false,
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  const handleApply = async () => {
    if (!code.trim()) {
      setError("Digite o código do cupom");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("validate-coupon", {
        body: {
          code: code.trim(),
          order_total: orderTotal,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data.valid) {
        setError(data.error || "Cupom inválido");
        return;
      }

      onApplyCoupon({
        id: data.coupon.id,
        code: data.coupon.code,
        description: data.coupon.description,
        discount_type: data.coupon.discount_type,
        discount_value: data.coupon.discount_value,
        discount_amount: data.discount_amount,
      });

      setCode("");
      toast.success("Cupom aplicado!", {
        description: `Desconto de ${formatPrice(data.discount_amount)}`,
      });
    } catch (err) {
      console.error("Error validating coupon:", err);
      setError("Erro ao validar cupom. Tente novamente.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    onRemoveCoupon();
    setCode("");
    setError(null);
    toast.info("Cupom removido");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  if (appliedCoupon) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <div>
              <span className="font-medium text-green-800">{appliedCoupon.code}</span>
              {appliedCoupon.description && (
                <p className="text-xs text-green-600">{appliedCoupon.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-green-700">
              -{formatPrice(appliedCoupon.discount_amount)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
              className="h-7 w-7 p-0 text-green-600 hover:text-green-800 hover:bg-green-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Código do cupom"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled || isValidating}
            className={cn(
              "pl-10 uppercase",
              error && "border-destructive focus-visible:ring-destructive"
            )}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleApply}
          disabled={disabled || isValidating || !code.trim()}
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Aplicar"
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
