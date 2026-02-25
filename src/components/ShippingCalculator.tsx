import { useState } from "react";
import { Truck, Loader2, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateProductShipping, formatShippingPrice } from "@/services/shippingService";
import type { ShippingOption } from "@/types/shipping";

interface ShippingCalculatorProps {
  productId: string;
  quantity?: number;
}

export function ShippingCalculator({ productId, quantity = 1 }: ShippingCalculatorProps) {
  const [cep, setCep] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 8);
    if (numbers.length > 5) {
      return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
    }
    return numbers;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCep(formatCep(e.target.value));
    setError(null);
    setHasSearched(false);
  };

  const handleCalculate = async () => {
    const cleanCep = cep.replace(/\D/g, "");
    
    if (cleanCep.length !== 8) {
      setError("Digite um CEP válido com 8 dígitos");
      return;
    }

    setIsLoading(true);
    setError(null);
    setOptions([]);

    try {
      const result = await calculateProductShipping(cleanCep, productId, quantity);
      setOptions(result.options);
      setUsedFallback(result.usedFallback);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao calcular frete");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCalculate();
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Calcular Frete</span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Digite seu CEP"
            value={cep}
            onChange={handleCepChange}
            onKeyDown={handleKeyDown}
            className="pl-10"
            maxLength={9}
          />
        </div>
        <Button
          onClick={handleCalculate}
          disabled={isLoading || cep.replace(/\D/g, "").length !== 8}
          className="btn-primary shrink-0"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive mt-2">{error}</p>
      )}

      <a
        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline mt-2 inline-block"
      >
        Não sei meu CEP
      </a>

      {/* Results */}
      {hasSearched && options.length > 0 && (
        <div className="mt-4 space-y-2">
          {usedFallback && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-xs text-amber-700">
                Usando frete estimado. Valor final pode variar.
              </span>
            </div>
          )}

          {options.map((option) => (
            <div
              key={option.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
            >
              <div className="flex items-center gap-3">
                {option.company.picture && (
                  <img
                    src={option.company.picture}
                    alt={option.company.name}
                    className="h-6 w-auto object-contain"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {option.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {option.delivery_time}
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-primary">
                {formatShippingPrice(option.price)}
              </span>
            </div>
          ))}
        </div>
      )}

      {hasSearched && options.length === 0 && !error && (
        <p className="text-xs text-muted-foreground mt-4">
          Nenhuma opção de frete disponível para este CEP.
        </p>
      )}
    </div>
  );
}
