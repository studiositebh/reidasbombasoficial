import { useEffect, useState } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { Loader2 } from "lucide-react";
import { usePaymentConfig } from "@/hooks/usePaymentConfig";

// Type for the CardPayment form data
export interface CardPaymentFormData {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

interface MercadoPagoCardPaymentProps {
  amount: number;
  payerEmail: string;
  onSubmit: (formData: CardPaymentFormData) => Promise<void>;
  onError: (error: unknown) => void;
  isProcessing: boolean;
}

export function MercadoPagoCardPayment({ 
  amount, 
  payerEmail,
  onSubmit, 
  onError, 
  isProcessing 
}: MercadoPagoCardPaymentProps) {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { data: paymentConfig, isLoading: configLoading } = usePaymentConfig();

  useEffect(() => {
    if (configLoading || !paymentConfig) return;

    const publicKey = paymentConfig.publicKey;
    
    if (!publicKey) {
      setInitError("Chave pública do Mercado Pago não configurada");
      return;
    }

    try {
      initMercadoPago(publicKey, { locale: "pt-BR" });
      setIsReady(true);
    } catch (error) {
      console.error("Failed to initialize MercadoPago:", error);
      setInitError("Erro ao inicializar Mercado Pago");
    }

    return () => {
      // Cleanup on unmount
      const brickController = (window as unknown as { cardPaymentBrickController?: { unmount: () => void } }).cardPaymentBrickController;
      if (brickController) {
        brickController.unmount();
      }
    };
  }, [paymentConfig, configLoading]);

  if (configLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {initError}
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando formulário de pagamento...</p>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Processando pagamento...</p>
      </div>
    );
  }

  return (
    <div className="mercadopago-card-payment-container">
      <CardPayment
        initialization={{
          amount,
          payer: {
            email: payerEmail,
          },
        }}
        onSubmit={async (formData) => {
          await onSubmit(formData as CardPaymentFormData);
        }}
        onError={(error) => {
          console.error("CardPayment error:", error);
          onError(error);
        }}
        customization={{
          paymentMethods: {
            maxInstallments: 12,
            minInstallments: 1,
          },
          visual: {
            style: {
              theme: "default",
            },
            hideFormTitle: true,
            hidePaymentButton: false,
          },
        }}
      />
    </div>
  );
}
