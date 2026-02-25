import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Package, CheckCircle, Truck, Clock, XCircle, ChevronLeft, AlertCircle, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface OrderItem {
  quantity: number;
  unit_price: number;
  sku: string;
  attrs: Record<string, string>;
  product_title: string;
  product_image: string | null;
}

interface OrderData {
  id: string;
  status: "pending" | "paid" | "shipped" | "cancelled";
  total_amount: number;
  created_at: string;
  updated_at: string;
  shipping_address: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  items?: OrderItem[];
}

const STATUS_CONFIG = {
  pending: {
    label: "Aguardando Pagamento",
    icon: Clock,
    color: "text-amber-500",
    bgColor: "bg-amber-500",
    description: "Seu pedido foi recebido e está aguardando confirmação do pagamento."
  },
  paid: {
    label: "Pagamento Confirmado",
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500",
    description: "Pagamento confirmado! Estamos preparando seu pedido para envio."
  },
  shipped: {
    label: "Enviado",
    icon: Truck,
    color: "text-blue-500",
    bgColor: "bg-blue-500",
    description: "Seu pedido foi enviado e está a caminho do destino."
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500",
    description: "Este pedido foi cancelado."
  }
};

const STATUS_STEPS = ["pending", "paid", "shipped"] as const;

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const [trackingToken, setTrackingToken] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  // Setup realtime subscription when order is found
  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          const newData = payload.new as {
            status: OrderData["status"];
            updated_at: string;
          };
          
          setOrder((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: newData.status,
              updated_at: newData.updated_at,
            };
          });
          
          setLastUpdate(new Date());
          
          // Show toast for status changes
          const config = STATUS_CONFIG[newData.status];
          toast.success(`Status atualizado: ${config.label}`, {
            description: config.description,
          });
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setIsRealtimeConnected(false);
    };
  }, [order?.id]);

  // Auto-search if token is in URL
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setTrackingToken(tokenFromUrl);
      searchOrder(tokenFromUrl);
    }
  }, [searchParams]);

  const searchOrder = async (token: string) => {
    if (!token.trim()) {
      setError("Digite o código de rastreamento");
      return;
    }

    setIsLoading(true);
    setError(null);
    setOrder(null);
    setHasSearched(true);

    try {
      const response = await supabase.functions.invoke("track-order", {
        body: { token: token.trim().toLowerCase() }
      });

      if (response.error) {
        setError("Erro ao buscar pedido. Tente novamente.");
        return;
      }

      const data = response.data;

      if (data.error) {
        setError(data.error);
        return;
      }

      if (!data.order) {
        setError("Pedido não encontrado. Verifique o código e tente novamente.");
        return;
      }

      setOrder(data.order as OrderData);
    } catch (err) {
      setError("Erro ao buscar pedido. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await searchOrder(trackingToken);
  };

  const getStepStatus = (step: typeof STATUS_STEPS[number]) => {
    if (!order) return "inactive";
    if (order.status === "cancelled") return "inactive";
    
    const currentIndex = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number]);
    const stepIndex = STATUS_STEPS.indexOf(step);
    
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "current";
    return "inactive";
  };

  return (
    <Layout>
      <SEO 
        title="Rastrear Pedido" 
        description="Acompanhe o status do seu pedido na Rei das Bombas. Digite o código de rastreamento para ver atualizações em tempo real."
        url="/rastrear"
      />

      <div className="container-custom py-8 lg:py-12">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para a Home
          </Link>
        </nav>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            Rastrear Pedido
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Digite o código de rastreamento enviado no seu e-mail para acompanhar o status.
          </p>
        </div>

        {/* Search Form */}
        <Card className="max-w-xl mx-auto mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Digite o código de rastreamento"
                  value={trackingToken}
                  onChange={(e) => setTrackingToken(e.target.value)}
                  className="pl-10 h-12 font-mono"
                  maxLength={32}
                />
              </div>
              <Button type="submit" className="btn-primary h-12 px-6" disabled={isLoading}>
                {isLoading ? "Buscando..." : "Buscar"}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">
              O código de rastreamento foi enviado para seu e-mail após a compra.
            </p>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <Skeleton className="h-8 w-48 mb-6" />
              <div className="flex gap-4 mb-8">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 flex-1" />
                ))}
              </div>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="max-w-xl mx-auto border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-700 font-medium">{error}</p>
              <p className="text-red-600 text-sm mt-2">
                Verifique o código de rastreamento enviado no e-mail de confirmação do pedido.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Found */}
        {order && !isLoading && (
          <Card className="max-w-2xl mx-auto animate-fade-in">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-lg">Pedido Encontrado!</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-xl font-bold text-primary">{formatPrice(order.total_amount)}</p>
                  </div>
                  {/* Realtime connection indicator */}
                  <Badge 
                    variant={isRealtimeConnected ? "default" : "secondary"} 
                    className={`text-xs ${isRealtimeConnected ? "bg-green-600" : ""}`}
                  >
                    {isRealtimeConnected ? (
                      <>
                        <Wifi className="h-3 w-3 mr-1" />
                        Ao vivo
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3 mr-1" />
                        Offline
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Current Status Banner */}
              <div className={`p-4 rounded-lg mb-6 ${
                order.status === "cancelled" 
                  ? "bg-red-50 border border-red-200" 
                  : "bg-green-50 border border-green-200"
              }`}>
                <div className="flex items-center gap-3">
                  {React.createElement(STATUS_CONFIG[order.status].icon, {
                    className: `h-6 w-6 ${STATUS_CONFIG[order.status].color}`
                  })}
                  <div>
                    <p className={`font-bold ${STATUS_CONFIG[order.status].color}`}>
                      {STATUS_CONFIG[order.status].label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {STATUS_CONFIG[order.status].description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              {order.status !== "cancelled" && (
                <div className="mb-8">
                  <h3 className="font-semibold text-foreground mb-4">Progresso do Pedido</h3>
                  <div className="flex items-center justify-between">
                    {STATUS_STEPS.map((step, index) => {
                      const status = getStepStatus(step);
                      const config = STATUS_CONFIG[step];
                      const Icon = config.icon;
                      
                      return (
                        <React.Fragment key={step}>
                          <div className="flex flex-col items-center text-center">
                            <div className={`
                              w-12 h-12 rounded-full flex items-center justify-center border-2
                              ${status === "completed" ? `${config.bgColor} border-transparent text-white` : ""}
                              ${status === "current" ? `bg-white border-primary text-primary` : ""}
                              ${status === "inactive" ? "bg-gray-100 border-gray-300 text-gray-400" : ""}
                            `}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <p className={`text-xs mt-2 font-medium ${
                              status === "inactive" ? "text-gray-400" : "text-foreground"
                            }`}>
                              {config.label}
                            </p>
                          </div>
                          {index < STATUS_STEPS.length - 1 && (
                            <div className={`flex-1 h-1 mx-2 rounded ${
                              getStepStatus(STATUS_STEPS[index + 1]) !== "inactive" 
                                ? "bg-primary" 
                                : "bg-gray-200"
                            }`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Order Items */}
              {order.items && order.items.length > 0 && (
                <div className="mb-6 pt-6 border-t">
                  <h3 className="font-semibold text-foreground mb-4">Itens do Pedido</h3>
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_title}
                            className="w-14 h-14 object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-muted rounded-md flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{item.product_title}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.sku} • Qtd: {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-foreground">
                          {formatPrice(item.unit_price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Details */}
              <div className="grid md:grid-cols-2 gap-6 pt-6 border-t">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Data do Pedido</h4>
                  <p className="text-muted-foreground">
                    {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Última Atualização</h4>
                  <p className="text-muted-foreground">
                    {format(new Date(order.updated_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {lastUpdate && isRealtimeConnected && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <RefreshCw className="h-3 w-3" />
                      Atualizado em tempo real
                    </p>
                  )}
                </div>
                {order.shipping_address && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Endereço de Entrega</h4>
                    <p className="text-muted-foreground">
                      {order.shipping_address.street}, {order.shipping_address.number}
                      {order.shipping_address.neighborhood && ` - ${order.shipping_address.neighborhood}`}
                      <br />
                      {order.shipping_address.city}/{order.shipping_address.state} - CEP: {order.shipping_address.zip}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Search Yet */}
        {!hasSearched && !isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Digite o código de rastreamento acima para acompanhar seu pedido.
            </p>
          </div>
        )}

        {/* Help Section */}
        <div className="max-w-xl mx-auto mt-12 text-center">
          <h3 className="font-semibold text-foreground mb-3">Precisa de ajuda?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Se você tiver dúvidas sobre seu pedido, entre em contato conosco pelo WhatsApp.
          </p>
          <Button asChild variant="outline" className="btn-outline-gold">
            <a 
              href="https://wa.me/5531942888578?text=Olá, preciso de ajuda com meu pedido."
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar no WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </Layout>
  );
}