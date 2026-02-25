import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Clock, Package, ArrowRight, QrCode, MessageCircle, Copy, Check, CreditCard, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentPolling } from "@/hooks/usePaymentPolling";
import { WHATSAPP_MESSAGES, STORE_DEFAULTS } from "@/lib/constants";

export default function OrderPending() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");
  const { clearCart } = useCart();
  const [order, setOrder] = useState<{
    id: string;
    total_amount: number;
    payment_method: string | null;
  } | null>(null);
  const [storeSettings, setStoreSettings] = useState<{
    whatsapp: string | null;
    cnpj: string | null;
    email: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Payment polling
  const { status, isPolling, isApproved } = usePaymentPolling({
    orderId,
    enabled: !!orderId,
    intervalMs: 10000, // Check every 10 seconds on pending page
    onApproved: () => {
      toast.success("Pagamento confirmado!", {
        description: "Seu pedido foi aprovado e está sendo processado.",
      });
      setTimeout(() => {
        navigate(`/pedido-confirmado?order_id=${orderId}`);
      }, 2000);
    },
  });

  // Clear cart when order is created (even if pending)
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  // Fetch order and store settings
  useEffect(() => {
    const fetchData = async () => {
      if (orderId) {
        const { data: orderData } = await supabase
          .from("orders")
          .select("id, total_amount, payment_method")
          .eq("id", orderId)
          .single();
        
        if (orderData) {
          setOrder(orderData);
        }
      }

      const { data: settings } = await supabase
        .from("store_settings")
        .select("whatsapp, cnpj, email")
        .limit(1)
        .single();
      
      if (settings) {
        setStoreSettings(settings);
      }
    };

    fetchData();
  }, [orderId]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  const orderNumber = orderId?.slice(0, 8).toUpperCase() || "---";

  const whatsappMessage = WHATSAPP_MESSAGES.order(orderNumber);

  const whatsappNumber = storeSettings?.whatsapp?.replace(/\D/g, "") || STORE_DEFAULTS.whatsappRaw;
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  const pixKey = storeSettings?.cnpj || storeSettings?.email || "00.000.000/0001-00";

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 3000);
  };

  const isPix = order?.payment_method?.toLowerCase() === "pix";
  const isBoleto = order?.payment_method?.toLowerCase() === "boleto" || 
                   order?.payment_method?.toLowerCase() === "ticket";

  // Show success state if payment is approved
  if (isApproved) {
    return (
      <Layout>
        <div className="container-custom py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-6">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Pagamento Confirmado!
              </h1>
              <p className="text-lg text-muted-foreground">
                Seu pedido foi aprovado e está sendo processado.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Redirecionando...</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-custom py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Pending Animation */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-amber-100 mb-6">
              <Clock className="h-12 w-12 text-amber-600 animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Pedido #{orderNumber} Recebido!
            </h1>
            <p className="text-lg text-muted-foreground">
              Seu pedido foi criado e está aguardando a confirmação do pagamento.
            </p>
          </div>

          {/* Polling Status */}
          {isPolling && (
            <Card className="mb-6 border-primary bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Verificando status do pagamento automaticamente...
                  </span>
                </div>
                {status?.message && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {status.message}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Order Summary Card */}
          <Card className="mb-6 border-amber-200 bg-amber-50/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-foreground">Resumo do Pedido</span>
                </div>
              </div>
              <div className="space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Número do Pedido:</span>
                  <span className="font-mono font-semibold">{orderNumber}</span>
                </div>
                {order && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor Total:</span>
                      <span className="font-semibold text-amber-600">
                        {formatPrice(order.total_amount)}
                      </span>
                    </div>
                    {order.payment_method && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Forma de Pagamento:</span>
                        <span className="font-medium capitalize">{order.payment_method}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* PIX Payment Instructions */}
          <Card className="mb-6 border-2 border-primary bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <QrCode className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-bold text-foreground">
                  {isPix ? "Pague via PIX" : "Chave PIX para Pagamento"}
                </h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Copie a chave abaixo e realize o pagamento pelo app do seu banco:
              </p>
              <div className="flex items-center gap-2 bg-background rounded-lg border-2 border-primary/30 p-4 mb-4">
                <code className="flex-1 text-lg font-mono text-foreground break-all font-bold">
                  {pixKey}
                </code>
                <Button
                  variant="default"
                  size="lg"
                  onClick={handleCopyPix}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5 mr-2" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
              {order && (
                <div className="bg-amber-100 border border-amber-300 rounded-lg p-3">
                  <p className="font-semibold text-amber-800">
                    Valor a pagar: {formatPrice(order.total_amount)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* WhatsApp CTA */}
          <Card className="mb-6 border-2 border-green-500 bg-gradient-to-r from-green-50 to-green-100">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-3">
                🚀 Agilize seu Atendimento
              </h2>
              <p className="text-muted-foreground mb-4">
                Envie o comprovante de pagamento para nosso WhatsApp e liberamos seu pedido imediatamente!
              </p>
              <Button 
                asChild 
                size="lg" 
                className="w-full h-14 bg-[#25D366] hover:bg-[#128C7E] text-white text-lg font-bold shadow-lg"
              >
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-6 w-6" />
                  Enviar Comprovante no WhatsApp
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Boleto/Card Info */}
          {(isBoleto || (!isPix && !isBoleto)) && (
            <Card className="mb-6 border-muted bg-muted/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    {isBoleto ? "Pagamento via Boleto" : "Outras Formas de Pagamento"}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  {isBoleto
                    ? "O boleto pode levar até 3 dias úteis para ser compensado. Após a confirmação, seu pedido será processado."
                    : "Um de nossos consultores entrará em contato para confirmar os dados de faturamento e finalizar seu pedido."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Important Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
            <p className="text-amber-800">
              <strong>⚠️ Importante:</strong> Seu pedido será processado assim que 
              identificarmos o pagamento. Você receberá um e-mail de confirmação.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline" size="lg">
              <Link to="/account/orders">
                Ver Meus Pedidos
              </Link>
            </Button>
            <Button asChild className="btn-primary" size="lg">
              <Link to="/">
                <span>Continuar Comprando</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
