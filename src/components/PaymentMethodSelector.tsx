import { CreditCard, QrCode, Barcode } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethod = "credit_card" | "pix" | "boleto";

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export function PaymentMethodSelector({ 
  selected, 
  onSelect, 
  disabled = false 
}: PaymentMethodSelectorProps) {
  const methods = [
    {
      id: "credit_card" as const,
      label: "Cartão de Crédito",
      description: "Até 12x sem juros",
      icon: CreditCard,
    },
    {
      id: "pix" as const,
      label: "PIX",
      description: "Aprovação instantânea",
      icon: QrCode,
    },
    {
      id: "boleto" as const,
      label: "Boleto",
      description: "Até 3 dias úteis",
      icon: Barcode,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {methods.map((method) => {
        const Icon = method.icon;
        const isSelected = selected === method.id;

        return (
          <button
            key={method.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(method.id)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-muted-foreground/20 bg-background",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="text-center">
              <p className={cn("font-medium text-sm", isSelected && "text-primary")}>
                {method.label}
              </p>
              <p className="text-xs text-muted-foreground">{method.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}