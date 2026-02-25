import { useState, useEffect } from "react";
import { Loader2, Copy, Check, QrCode, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { usePaymentPolling } from "@/hooks/usePaymentPolling";

interface PixPaymentData {
  qr_code: string;
  qr_code_base64: string;
  expiration_date: string;
}

interface MercadoPagoPixPaymentProps {
  amount: number;
  payerEmail: string;
  payerName: string;
  payerCpf: string;
  onProcessPayment: () => Promise<{
    success: boolean;
    order_id?: string;
    pix_data?: PixPaymentData;
    error?: string;
  }>;
  isProcessing: boolean;
}

export function MercadoPagoPixPayment({
  amount,
  payerEmail,
  payerName,
  payerCpf,
  onProcessPayment,
  isProcessing,
}: MercadoPagoPixPaymentProps) {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  // Payment polling
  const { status, isPolling, isApproved } = usePaymentPolling({
    orderId,
    enabled: !!orderId && !!pixData,
    intervalMs: 5000,
    onApproved: () => {
      toast.success("Pagamento PIX confirmado!", {
        description: "Seu pedido foi aprovado e está sendo processado.",
      });
      setTimeout(() => {
        navigate(`/pedido-confirmado?order_id=${orderId}`);
      }, 2000);
    },
  });

  useEffect(() => {
    if (pixData?.expiration_date) {
      const updateTimer = () => {
        const now = new Date();
        const expiration = new Date(pixData.expiration_date);
        const diff = expiration.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft("Expirado");
          return;
        }

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [pixData?.expiration_date]);

  const handleGeneratePix = async () => {
    const result = await onProcessPayment();
    
    if (result.success && result.pix_data && result.order_id) {
      setPixData(result.pix_data);
      setOrderId(result.order_id);
      clearCart();
    } else if (result.error) {
      toast.error("Erro ao gerar PIX", {
        description: result.error,
      });
    }
  };

  const handleCopyCode = async () => {
    if (!pixData?.qr_code) return;
    
    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Erro ao copiar código");
    }
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Gerando código PIX...</p>
      </div>
    );
  }

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

  if (pixData) {
    return (
      <div className="space-y-6">
        {/* Polling Status Indicator */}
        {isPolling && (
          <div className="flex items-center justify-center gap-2 text-primary bg-primary/10 py-2 px-4 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">
              Aguardando pagamento... {status?.message || ""}
            </span>
          </div>
        )}

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 py-2 px-4 rounded-lg">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">
            Expira em: <strong>{timeLeft}</strong>
          </span>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-xl border-2 border-primary/20 shadow-lg">
            {pixData.qr_code_base64 ? (
              <img
                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                alt="QR Code PIX"
                className="w-48 h-48"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded">
                <QrCode className="h-16 w-16 text-gray-400" />
              </div>
            )}
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            Escaneie o QR Code acima com o app do seu banco
          </p>
        </div>

        {/* Copy Code */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-center">Ou copie o código abaixo:</p>
          
          <div className="relative">
            <div className="bg-muted/50 p-3 rounded-lg break-all text-xs font-mono text-muted-foreground max-h-24 overflow-y-auto">
              {pixData.qr_code}
            </div>
          </div>
          
          <Button
            onClick={handleCopyCode}
            className={`w-full ${copied ? "" : "bg-green-600 hover:bg-green-700 text-white"}`}
            variant={copied ? "secondary" : "default"}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Código copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar código PIX
              </>
            )}
          </Button>
        </div>

        {/* Amount */}
        <div className="bg-primary/5 p-4 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">Valor a pagar</p>
          <p className="text-2xl font-bold text-primary">{formatPrice(amount)}</p>
        </div>

        {/* Instructions */}
        <div className="bg-muted/30 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">Como pagar:</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Abra o app do seu banco ou carteira digital</li>
            <li>Escolha pagar via PIX com QR Code ou código copia e cola</li>
            <li>Escaneie o QR Code ou cole o código copiado</li>
            <li>Confirme as informações e finalize o pagamento</li>
          </ol>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Após o pagamento, você será redirecionado automaticamente.
        </p>
      </div>
    );
  }

  // Initial state - show generate button
  return (
    <div className="space-y-6">
      {/* PIX Info */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <QrCode className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">Pagar com PIX</h3>
        <p className="text-sm text-muted-foreground">
          Pagamento instantâneo e seguro. O código PIX expira em 30 minutos.
        </p>
      </div>

      {/* Amount Preview */}
      <div className="bg-primary/5 p-4 rounded-lg text-center">
        <p className="text-sm text-muted-foreground">Valor total</p>
        <p className="text-2xl font-bold text-primary">{formatPrice(amount)}</p>
      </div>

      {/* Payer Info Preview */}
      <div className="bg-muted/30 p-4 rounded-lg space-y-1 text-sm">
        <p><strong>Pagador:</strong> {payerName}</p>
        <p><strong>E-mail:</strong> {payerEmail}</p>
        <p><strong>CPF:</strong> {payerCpf}</p>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGeneratePix}
        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold"
        size="lg"
      >
        <QrCode className="h-5 w-5 mr-2" />
        Gerar código PIX
      </Button>

      {/* Benefits */}
      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>Aprovação instantânea</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>Sem taxas extras</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>100% seguro</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>Disponível 24h</span>
        </div>
      </div>
    </div>
  );
}
