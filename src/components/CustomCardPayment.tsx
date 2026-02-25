import { useState, useEffect, useCallback } from "react";
import { CreditCard, Lock, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InstallmentSelector } from "@/components/InstallmentSelector";
import { usePaymentConfig } from "@/hooks/usePaymentConfig";
import { cn } from "@/lib/utils";

interface CustomCardPaymentProps {
  amount: number;
  payerEmail: string;
  payerDocument: string;
  onSubmit: (data: CustomCardPaymentData) => Promise<void>;
  onError: (error: unknown) => void;
  isProcessing: boolean;
  maxInstallments?: number;
  interestFreeInstallments?: number;
  monthlyInterestRate?: number;
}

export interface CustomCardPaymentData {
  token: string;
  payment_method_id: string;
  issuer_id: string;
  installments: number;
  totalWithInterest: number;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

interface CardData {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}

interface CardErrors {
  number?: string;
  expiry?: string;
  cvv?: string;
  name?: string;
}

// Card brand detection based on BIN (Bank Identification Number)
const detectCardBrand = (number: string): { brand: string; icon: string } => {
  const cleanNumber = number.replace(/\s/g, "");
  
  if (/^4/.test(cleanNumber)) return { brand: "visa", icon: "💳" };
  if (/^5[0-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return { brand: "master", icon: "💳" };
  if (/^3[47]/.test(cleanNumber)) return { brand: "amex", icon: "💳" };
  if (/^6(?:011|5)/.test(cleanNumber)) return { brand: "discover", icon: "💳" };
  if (/^(?:2131|1800|35)/.test(cleanNumber)) return { brand: "jcb", icon: "💳" };
  if (/^3(?:0[0-5]|[68])/.test(cleanNumber)) return { brand: "diners", icon: "💳" };
  if (/^(636368|636369|438935|504175|451416|636297|5067|4576|4011|506699)/.test(cleanNumber)) return { brand: "elo", icon: "💳" };
  if (/^(606282|3841)/.test(cleanNumber)) return { brand: "hipercard", icon: "💳" };
  
  return { brand: "unknown", icon: "💳" };
};

// Format card number with spaces
const formatCardNumber = (value: string): string => {
  const cleanValue = value.replace(/\D/g, "").slice(0, 16);
  const groups = cleanValue.match(/.{1,4}/g);
  return groups ? groups.join(" ") : cleanValue;
};

// Format expiry date
const formatExpiry = (value: string): string => {
  const cleanValue = value.replace(/\D/g, "").slice(0, 4);
  if (cleanValue.length >= 2) {
    return cleanValue.slice(0, 2) + "/" + cleanValue.slice(2);
  }
  return cleanValue;
};

// Luhn algorithm for card validation
const isValidCardNumber = (number: string): boolean => {
  const cleanNumber = number.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(cleanNumber)) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

// Validate expiry date
const isValidExpiry = (expiry: string): boolean => {
  const parts = expiry.split("/");
  if (parts.length !== 2) return false;
  
  const month = parseInt(parts[0], 10);
  const year = parseInt("20" + parts[1], 10);
  
  if (month < 1 || month > 12) return false;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  
  return true;
};

export function CustomCardPayment({
  amount,
  payerEmail,
  payerDocument,
  onSubmit,
  onError,
  isProcessing,
  maxInstallments = 12,
  interestFreeInstallments = 3,
  monthlyInterestRate = 0.0199,
}: CustomCardPaymentProps) {
  const [cardData, setCardData] = useState<CardData>({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });
  const [errors, setErrors] = useState<CardErrors>({});
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [totalWithInterest, setTotalWithInterest] = useState(amount);
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [mpInstance, setMpInstance] = useState<unknown>(null);
  const { data: paymentConfig, isLoading: configLoading } = usePaymentConfig();

  const cardBrand = detectCardBrand(cardData.number);

  // Initialize MercadoPago SDK
  useEffect(() => {
    if (configLoading || !paymentConfig?.publicKey) return;

    const loadMercadoPago = async () => {
      try {
        // Check if SDK is already loaded
        if ((window as unknown as { MercadoPago?: unknown }).MercadoPago) {
          const MP = (window as unknown as { MercadoPago: new (key: string) => unknown }).MercadoPago;
          setMpInstance(new MP(paymentConfig.publicKey));
          return;
        }

        // Load SDK script
        const script = document.createElement("script");
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.async = true;
        
        script.onload = () => {
          const MP = (window as unknown as { MercadoPago: new (key: string) => unknown }).MercadoPago;
          if (MP) {
            setMpInstance(new MP(paymentConfig.publicKey));
          }
        };

        document.body.appendChild(script);
      } catch (error) {
        console.error("Failed to load MercadoPago SDK:", error);
        onError(error);
      }
    };

    loadMercadoPago();
  }, [paymentConfig, configLoading, onError]);

  const handleInputChange = useCallback((field: keyof CardData, value: string) => {
    let formattedValue = value;
    
    if (field === "number") {
      formattedValue = formatCardNumber(value);
    } else if (field === "expiry") {
      formattedValue = formatExpiry(value);
    } else if (field === "cvv") {
      formattedValue = value.replace(/\D/g, "").slice(0, 4);
    } else if (field === "name") {
      formattedValue = value.toUpperCase();
    }

    setCardData((prev) => ({ ...prev, [field]: formattedValue }));
    
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const validateForm = (): boolean => {
    const newErrors: CardErrors = {};

    // Card number validation
    if (!cardData.number.trim()) {
      newErrors.number = "Número do cartão é obrigatório";
    } else if (!isValidCardNumber(cardData.number)) {
      newErrors.number = "Número do cartão inválido";
    }

    // Expiry validation
    if (!cardData.expiry.trim()) {
      newErrors.expiry = "Validade é obrigatória";
    } else if (!isValidExpiry(cardData.expiry)) {
      newErrors.expiry = "Data de validade inválida";
    }

    // CVV validation
    const cvvLength = cardBrand.brand === "amex" ? 4 : 3;
    if (!cardData.cvv.trim()) {
      newErrors.cvv = "CVV é obrigatório";
    } else if (cardData.cvv.length < cvvLength) {
      newErrors.cvv = `CVV deve ter ${cvvLength} dígitos`;
    }

    // Name validation
    if (!cardData.name.trim()) {
      newErrors.name = "Nome no cartão é obrigatório";
    } else if (cardData.name.trim().length < 3) {
      newErrors.name = "Nome deve ter pelo menos 3 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !mpInstance) return;

    setIsTokenizing(true);

    try {
      const expiryParts = cardData.expiry.split("/");
      const cleanDocument = payerDocument.replace(/\D/g, "");
      
      // Create card token using MercadoPago SDK
      const mp = mpInstance as {
        createCardToken: (data: {
          cardNumber: string;
          cardholderName: string;
          cardExpirationMonth: string;
          cardExpirationYear: string;
          securityCode: string;
          identificationType: string;
          identificationNumber: string;
        }) => Promise<{ id: string; first_six_digits: string; last_four_digits: string }>;
      };

      const tokenResult = await mp.createCardToken({
        cardNumber: cardData.number.replace(/\s/g, ""),
        cardholderName: cardData.name,
        cardExpirationMonth: expiryParts[0],
        cardExpirationYear: "20" + expiryParts[1],
        securityCode: cardData.cvv,
        identificationType: cleanDocument.length <= 11 ? "CPF" : "CNPJ",
        identificationNumber: cleanDocument,
      });

      if (!tokenResult?.id) {
        throw new Error("Falha ao gerar token do cartão");
      }

      // Submit payment data
      await onSubmit({
        token: tokenResult.id,
        payment_method_id: cardBrand.brand,
        issuer_id: "", // Will be resolved by backend
        installments: selectedInstallments,
        totalWithInterest,
        payer: {
          email: payerEmail,
          identification: {
            type: cleanDocument.length <= 11 ? "CPF" : "CNPJ",
            number: cleanDocument,
          },
        },
      });
    } catch (error) {
      console.error("Card tokenization error:", error);
      onError(error);
    } finally {
      setIsTokenizing(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  if (configLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (isProcessing || isTokenizing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {isTokenizing ? "Validando cartão..." : "Processando pagamento..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card Form */}
      <div className="space-y-4">
        {/* Card Number */}
        <div className="space-y-2">
          <Label htmlFor="card-number" className="text-sm font-medium">
            Número do Cartão
          </Label>
          <div className="relative">
            <Input
              id="card-number"
              type="text"
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              value={cardData.number}
              onChange={(e) => handleInputChange("number", e.target.value)}
              className={cn(
                "pr-16",
                errors.number && "border-destructive focus-visible:ring-destructive"
              )}
              autoComplete="cc-number"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              {cardBrand.brand !== "unknown" && (
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {cardBrand.brand}
                </span>
              )}
            </div>
          </div>
          {errors.number && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.number}
            </p>
          )}
        </div>

        {/* Expiry and CVV */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="card-expiry" className="text-sm font-medium">
              Validade
            </Label>
            <Input
              id="card-expiry"
              type="text"
              inputMode="numeric"
              placeholder="MM/AA"
              value={cardData.expiry}
              onChange={(e) => handleInputChange("expiry", e.target.value)}
              className={cn(
                errors.expiry && "border-destructive focus-visible:ring-destructive"
              )}
              autoComplete="cc-exp"
            />
            {errors.expiry && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.expiry}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-cvv" className="text-sm font-medium">
              CVV
            </Label>
            <Input
              id="card-cvv"
              type="text"
              inputMode="numeric"
              placeholder={cardBrand.brand === "amex" ? "0000" : "000"}
              value={cardData.cvv}
              onChange={(e) => handleInputChange("cvv", e.target.value)}
              className={cn(
                errors.cvv && "border-destructive focus-visible:ring-destructive"
              )}
              autoComplete="cc-csc"
            />
            {errors.cvv && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.cvv}
              </p>
            )}
          </div>
        </div>

        {/* Cardholder Name */}
        <div className="space-y-2">
          <Label htmlFor="card-name" className="text-sm font-medium">
            Nome no Cartão
          </Label>
          <Input
            id="card-name"
            type="text"
            placeholder="NOME COMO ESTÁ NO CARTÃO"
            value={cardData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className={cn(
              errors.name && "border-destructive focus-visible:ring-destructive"
            )}
            autoComplete="cc-name"
          />
          {errors.name && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.name}
            </p>
          )}
        </div>
      </div>

      {/* Installment Selector */}
      <div className="pt-2 border-t">
        <InstallmentSelector
          amount={amount}
          value={selectedInstallments}
          onChange={(installments, total) => {
            setSelectedInstallments(installments);
            setTotalWithInterest(total);
          }}
          maxInstallments={maxInstallments}
          interestFreeInstallments={interestFreeInstallments}
          monthlyInterestRate={monthlyInterestRate}
        />
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isProcessing || isTokenizing || !mpInstance}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 text-lg"
        size="lg"
      >
        <Lock className="h-4 w-4 mr-2" />
        Pagar {selectedInstallments}x de {formatPrice(totalWithInterest / selectedInstallments)}
      </Button>

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        <span>Pagamento seguro processado pelo Mercado Pago</span>
      </div>
    </div>
  );
}
