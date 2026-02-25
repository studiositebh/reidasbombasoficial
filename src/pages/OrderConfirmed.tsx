import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Package, ArrowRight, MessageCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_MESSAGES, STORE_DEFAULTS } from "@/lib/constants";

export default function OrderConfirmed() {
  const [searchParams] = useSearchParams();
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

  // Clear cart when payment is confirmed
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

  return (
    <Layout>
      <div className="container-custom py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Animation */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-6 animate-bounce-slow">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Pedido #{orderNumber} Recebido!
            </h1>
            <p className="text-lg text-muted-foreground">
              Seu pagamento foi aprovado e seu pedido está sendo processado.
            </p>
          </div>

          {/* Order Summary Card */}
          <Card className="mb-6 border-green-200 bg-green-50/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-green-600" />
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
                      <span className="font-semibold text-green-600">
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

          {/* WhatsApp CTA - Main Action */}
          <Card className="mb-6 border-2 border-green-500 bg-gradient-to-r from-green-50 to-green-100">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-3">
                🚀 Agilize seu Atendimento
              </h2>
              <p className="text-muted-foreground mb-4">
                Envie seu comprovante de pagamento para liberação imediata do pedido.
              </p>
              <Button 
                asChild 
                size="lg" 
                className="w-full h-14 bg-[#25D366] hover:bg-[#128C7E] text-white text-lg font-bold shadow-lg"
              >
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-6 w-6" />
                  Agilizar Atendimento no WhatsApp
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* PIX Key Section */}
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-3">
                💳 Pagou via PIX? Copie nossa chave:
              </h3>
              <div className="flex items-center gap-2 bg-background rounded-lg border p-3">
                <code className="flex-1 text-sm font-mono text-foreground break-all">
                  {pixKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPix}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Após o pagamento, envie o comprovante pelo WhatsApp para liberação imediata.
              </p>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <div className="bg-secondary/50 rounded-xl p-6 mb-8">
            <h2 className="font-semibold text-foreground mb-4">Próximos Passos</h2>
            <ul className="text-left space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  1
                </span>
                <span>
                  Você receberá um e-mail de confirmação com os detalhes do pedido.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  2
                </span>
                <span>
                  Nosso time irá preparar seu pedido para envio.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  3
                </span>
                <span>
                  Você receberá o código de rastreamento assim que o pedido for despachado.
                </span>
              </li>
            </ul>
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
