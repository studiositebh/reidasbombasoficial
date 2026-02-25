import { useState } from "react";
import { Copy, Check, Barcode, Loader2, FileText, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { usePaymentPolling } from "@/hooks/usePaymentPolling";

interface BoletoData {
  barcode: string;
  digitable_line: string;
  external_resource_url: string;
  expiration_date: string;
}

interface BoletoPaymentResult {
  success: boolean;
  order_id?: string;
  boleto_data?: BoletoData;
  error?: string;
}

interface MercadoPagoBoletoPaymentProps {
  amount: number;
  payerEmail: string;
  payerName: string;
  payerCpf: string;
  payerAddress: {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  onProcessPayment: () => Promise<BoletoPaymentResult>;
  isProcessing: boolean;
}

export function MercadoPagoBoletoPayment({
  amount,
  payerEmail,
  payerName,
  payerCpf,
  payerAddress,
  onProcessPayment,
  isProcessing,
}: MercadoPagoBoletoPaymentProps) {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [boletoData, setBoletoData] = useState<BoletoData | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  // Payment polling - check every 30 seconds for boleto (longer interval since it takes 1-3 days)
  const { status, isPolling, isApproved } = usePaymentPolling({
    orderId,
    enabled: !!orderId && !!boletoData,
    intervalMs: 30000, // 30 seconds for boleto
    maxAttempts: 2880, // ~24 hours of polling
    onApproved: () => {
      toast.success("Pagamento do boleto confirmado!", {
        description: "Seu pedido foi aprovado e está sendo processado.",
      });
      setTimeout(() => {
        navigate(`/pedido-confirmado?order_id=${orderId}`);
      }, 2000);
    },
  });

  const formatDigitableLine = (line: string) => {
    if (!line || line.length < 47) return line;
    return `${line.slice(0, 5)}.${line.slice(5, 10)} ${line.slice(10, 15)}.${line.slice(15, 21)} ${line.slice(21, 26)}.${line.slice(26, 32)} ${line.slice(32, 33)} ${line.slice(33)}`;
  };

  const formatExpirationDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const handleGenerateBoleto = async () => {
    setIsGenerating(true);
    
    try {
      const result = await onProcessPayment();
      
      if (result.success && result.boleto_data && result.order_id) {
        setBoletoData(result.boleto_data);
        setOrderId(result.order_id);
        clearCart();
        toast.success("Boleto gerado com sucesso!");
      } else {
        toast.error("Erro ao gerar boleto", {
          description: result.error || "Tente novamente em alguns instantes.",
        });
      }
    } catch (error) {
      console.error("Boleto generation error:", error);
      toast.error("Erro ao gerar boleto", {
        description: "Tente novamente em alguns instantes.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyDigitableLine = async () => {
    if (!boletoData?.digitable_line) return;
    
    try {
      await navigator.clipboard.writeText(boletoData.digitable_line);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Erro ao copiar código");
    }
  };

  const handleOpenBoleto = () => {
    if (boletoData?.external_resource_url) {
      window.open(boletoData.external_resource_url, "_blank");
    }
  };

  const handleGoToOrder = () => {
    if (orderId) {
      navigate(`/pedido-pendente?order_id=${orderId}&payment_method=boleto`);
    }
  };

  // Payment approved state
  if (isApproved) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-green-700">Pagamento Confirmado!</h3>
        <p className="text-sm text-muted-foreground text-center">
          Seu pagamento foi aprovado. Redirecionando...
        </p>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // Show boleto data after generation
  if (boletoData) {
    return (
      <div className="space-y-6">
        {/* Polling Status Indicator */}
        {isPolling && (
          <div className="flex items-center justify-center gap-2 text-primary bg-primary/10 py-2 px-4 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">
              Aguardando pagamento...
            </span>
          </div>
        )}

        {/* Success Header */}
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-green-800">Boleto Gerado!</h3>
          <p className="text-sm text-green-600 mt-1">
            Pague até a data de vencimento para confirmar seu pedido
          </p>
        </div>

        {/* Expiration Warning */}
        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Vencimento: {formatExpirationDate(boletoData.expiration_date)}
            </p>
            <p className="text-xs text-amber-600">
              Após essa data o boleto será cancelado automaticamente
            </p>
          </div>
        </div>

        {/* Digitable Line */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Barcode className="h-4 w-4" />
            <span className="font-medium">Linha Digitável</span>
          </div>
          
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-center font-mono text-sm break-all leading-relaxed">
              {formatDigitableLine(boletoData.digitable_line)}
            </p>
          </div>

          <Button
            onClick={handleCopyDigitableLine}
            variant="outline"
            className="w-full gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                Código Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar Código
              </>
            )}
          </Button>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleOpenBoleto}
            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white font-bold"
          >
            <FileText className="h-4 w-4" />
            Abrir Boleto em PDF
          </Button>

          <Button
            onClick={handleGoToOrder}
            variant="outline"
            className="w-full"
          >
            Ver Detalhes do Pedido
          </Button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm font-medium text-foreground">Como pagar:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Copie a linha digitável e pague pelo app do seu banco</li>
            <li>• Ou imprima o boleto e pague em qualquer banco ou lotérica</li>
            <li>• O pagamento pode levar até 3 dias úteis para ser confirmado</li>
            <li>• Você receberá uma notificação quando o pagamento for confirmado</li>
          </ul>
        </div>
      </div>
    );
  }

  // Initial state - Generate Boleto button
  return (
    <div className="space-y-6">
      {/* Boleto Info */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
            <Barcode className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">Boleto Bancário</h4>
            <p className="text-sm text-muted-foreground">
              Pagamento em até 3 dias úteis
            </p>
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Valor total</span>
          <span className="text-xl font-bold text-primary">{formatPrice(amount)}</span>
        </div>
      </div>

      {/* Payer Info Summary */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p><strong>Pagador:</strong> {payerName}</p>
        <p><strong>CPF/CNPJ:</strong> {payerCpf}</p>
        <p><strong>E-mail:</strong> {payerEmail}</p>
      </div>

      {/* Important Notice */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Informação importante</p>
          <p className="text-blue-600 mt-1">
            O boleto será gerado com vencimento de 3 dias. Seu pedido será confirmado após a compensação do pagamento.
          </p>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerateBoleto}
        disabled={isProcessing || isGenerating}
        className="w-full h-14 text-base gap-2 bg-green-600 hover:bg-green-700 text-white font-bold"
      >
        {isProcessing || isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Gerando Boleto...
          </>
        ) : (
          <>
            <Barcode className="h-5 w-5" />
            Gerar Boleto
          </>
        )}
      </Button>
    </div>
  );
}
