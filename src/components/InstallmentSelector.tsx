import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface InstallmentOption {
  value: number;
  installmentValue: number;
  totalAmount: number;
  hasInterest: boolean;
  label: string;
}

interface InstallmentSelectorProps {
  amount: number;
  value: number;
  onChange: (installments: number, totalWithInterest: number) => void;
  maxInstallments?: number;
  interestFreeInstallments?: number;
  monthlyInterestRate?: number;
  disabled?: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

export function calculateInstallments(
  amount: number,
  maxInstallments: number = 12,
  interestFreeInstallments: number = 3,
  monthlyInterestRate: number = 0.0199 // 1.99% ao mês
): InstallmentOption[] {
  return Array.from({ length: maxInstallments }, (_, i) => {
    const numInstallments = i + 1;
    const hasInterest = numInstallments > interestFreeInstallments;
    
    let totalAmount: number;
    let installmentValue: number;
    
    if (hasInterest) {
      // Cálculo de juros compostos (Price table)
      const rate = monthlyInterestRate;
      const coefficient = (rate * Math.pow(1 + rate, numInstallments)) / (Math.pow(1 + rate, numInstallments) - 1);
      installmentValue = amount * coefficient;
      totalAmount = installmentValue * numInstallments;
    } else {
      totalAmount = amount;
      installmentValue = amount / numInstallments;
    }

    const label = numInstallments === 1
      ? `1x de ${formatPrice(amount)} (à vista)`
      : hasInterest
        ? `${numInstallments}x de ${formatPrice(installmentValue)} (total: ${formatPrice(totalAmount)})`
        : `${numInstallments}x de ${formatPrice(installmentValue)} sem juros`;

    return {
      value: numInstallments,
      installmentValue,
      totalAmount,
      hasInterest,
      label,
    };
  });
}

export function InstallmentSelector({
  amount,
  value,
  onChange,
  maxInstallments = 12,
  interestFreeInstallments = 3,
  monthlyInterestRate = 0.0199,
  disabled = false,
}: InstallmentSelectorProps) {
  const installmentOptions = calculateInstallments(
    amount,
    maxInstallments,
    interestFreeInstallments,
    monthlyInterestRate
  );

  const handleSelect = (option: InstallmentOption) => {
    if (!disabled) {
      onChange(option.value, option.totalAmount);
    }
  };

  const selectedOption = installmentOptions.find(o => o.value === value);
  
  // Best option is the highest number of interest-free installments
  const bestOption = installmentOptions
    .filter(o => !o.hasInterest && o.value > 1)
    .sort((a, b) => b.value - a.value)[0];

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Parcelas</Label>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {installmentOptions.map((option) => {
          const isBestOption = bestOption && option.value === bestOption.value;
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option)}
              disabled={disabled}
              className={cn(
                "relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all text-center min-h-[80px]",
                "hover:border-primary hover:bg-primary/5",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-muted disabled:hover:bg-transparent",
                isBestOption && "border-green-500 bg-green-50 hover:border-green-600 hover:bg-green-100",
                value === option.value
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : !isBestOption && "border-muted bg-background"
              )}
            >
              {isBestOption && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[9px] px-1.5 py-0 h-4 flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  Melhor
                </Badge>
              )}
              <span className="text-lg font-bold text-foreground">{option.value}x</span>
              <span className="text-xs text-foreground/80">{formatPrice(option.installmentValue)}</span>
              <span className={cn(
                "text-[10px] mt-1 font-medium",
                option.value === 1 
                  ? "text-foreground/60" 
                  : option.hasInterest 
                    ? "text-muted-foreground" 
                    : "text-green-600"
              )}>
                {option.value === 1 ? "à vista" : option.hasInterest ? "com juros" : "sem juros"}
              </span>
            </button>
          );
        })}
      </div>
      
      {selectedOption && selectedOption.hasInterest && (
        <p className="text-xs text-muted-foreground text-center">
          Taxa de {(monthlyInterestRate * 100).toFixed(2)}% a.m. • Total: {formatPrice(selectedOption.totalAmount)}
        </p>
      )}
    </div>
  );
}
