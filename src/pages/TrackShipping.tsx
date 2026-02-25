import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Package, Truck, CheckCircle2, Clock, MapPin, AlertCircle, MessageCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { WHATSAPP_MESSAGES, STORE_DEFAULTS } from "@/lib/constants";

interface TrackingEvent {
  date: string;
  time: string;
  location: string;
  status: string;
  description: string;
}

interface CorreiosTrackingData {
  success: boolean;
  tracking_code: string;
  carrier: string;
  events: TrackingEvent[];
  delivered: boolean;
  error?: string;
}

interface OrderTrackingData {
  order_id: string;
  tracking_code: string | null;
  carrier: string | null;
  status: string;
  events: TrackingEvent[];
  estimated_delivery: string | null;
  correios_events: TrackingEvent[];
  correios_delivered: boolean;
  correios_error: string | null;
}

// WhatsApp number is now fetched dynamically from useStoreSettings

// Status mapping for visual display
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Aguardando Pagamento", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  paid: { label: "Pagamento Confirmado", color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
  processing: { label: "Em Preparação", color: "bg-purple-100 text-purple-800", icon: Package },
  shipped: { label: "Enviado", color: "bg-green-100 text-green-800", icon: Truck },
  delivered: { label: "Entregue", color: "bg-green-600 text-white", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800", icon: AlertCircle },
};

export default function TrackShipping() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCorreios, setIsLoadingCorreios] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderTrackingData | null>(null);
  const { data: settings } = useStoreSettings();

  // Auto-search if token is in URL
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setSearchQuery(token);
      handleSearchWithToken(token);
    }
  }, [searchParams]);

  const handleSearchWithToken = async (token: string) => {
    setIsLoading(true);
    setError(null);
    setOrderData(null);
    
    try {
      // Search by tracking_token (order tracking code)
      const { data, error: fetchError } = await supabase.functions.invoke("track-order", {
        body: { token },
      });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      if (data?.order) {
        const order = data.order;
        const metadata = order.metadata || {};
        const trackingCode = metadata.tracking_code || null;
        const carrier = metadata.carrier || metadata.shipping_option?.company || null;
        
        // Build tracking data from order
        const trackingData: OrderTrackingData = {
          order_id: order.id,
          tracking_code: trackingCode,
          carrier,
          status: order.status,
          estimated_delivery: metadata.estimated_delivery || null,
          events: buildTrackingEvents(order),
          correios_events: [],
          correios_delivered: false,
          correios_error: null,
        };

        setOrderData(trackingData);

        // If there's a tracking code, fetch Correios data
        if (trackingCode) {
          fetchCorreiosTracking(trackingCode, carrier, trackingData);
        }
      } else {
        setError("Pedido não encontrado. Verifique o código e tente novamente.");
      }
    } catch (err) {
      console.error("Track error:", err);
      setError("Erro ao buscar pedido. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCorreiosTracking = async (
    trackingCode: string, 
    carrier: string | null,
    currentData: OrderTrackingData
  ) => {
    setIsLoadingCorreios(true);
    
    try {
      const { data, error: correiosError } = await supabase.functions.invoke<CorreiosTrackingData>(
        "track-correios",
        {
          body: { tracking_code: trackingCode, carrier: carrier || "Correios" },
        }
      );

      if (correiosError) {
        console.error("Correios tracking error:", correiosError);
        setOrderData({
          ...currentData,
          correios_error: "Não foi possível obter atualizações da transportadora",
        });
        return;
      }

      if (data) {
        setOrderData({
          ...currentData,
          correios_events: data.events || [],
          correios_delivered: data.delivered || false,
          correios_error: data.success ? null : (data.error || null),
        });
      }
    } catch (err) {
      console.error("Correios fetch error:", err);
      setOrderData({
        ...currentData,
        correios_error: "Erro ao buscar rastreamento",
      });
    } finally {
      setIsLoadingCorreios(false);
    }
  };

  const refreshCorreiosTracking = () => {
    if (orderData?.tracking_code) {
      fetchCorreiosTracking(orderData.tracking_code, orderData.carrier, orderData);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const query = searchQuery.trim();
    if (!query) {
      setError("Digite o código do pedido ou código de rastreio");
      return;
    }

    await handleSearchWithToken(query);
  };

  // Build timeline events based on order status
  const buildTrackingEvents = (order: any): TrackingEvent[] => {
    const events: TrackingEvent[] = [];
    const createdAt = new Date(order.created_at);
    const updatedAt = new Date(order.updated_at);

    // Order created event
    events.push({
      date: createdAt.toLocaleDateString("pt-BR"),
      time: createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      location: "Sistema",
      status: "Pedido Recebido",
      description: "Seu pedido foi recebido e está aguardando confirmação de pagamento.",
    });

    // Add status-based events
    if (["paid", "processing", "shipped", "delivered"].includes(order.status)) {
      events.push({
        date: updatedAt.toLocaleDateString("pt-BR"),
        time: updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        location: "Sistema",
        status: "Pagamento Confirmado",
        description: "Pagamento aprovado. Preparando seu pedido.",
      });
    }

    if (["processing", "shipped", "delivered"].includes(order.status)) {
      events.push({
        date: updatedAt.toLocaleDateString("pt-BR"),
        time: updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        location: "Centro de Distribuição",
        status: "Em Preparação",
        description: "Seu pedido está sendo preparado para envio.",
      });
    }

    if (["shipped", "delivered"].includes(order.status)) {
      events.push({
        date: updatedAt.toLocaleDateString("pt-BR"),
        time: updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        location: "Transportadora",
        status: "Enviado",
        description: "Pedido coletado pela transportadora.",
      });
    }

    if (order.status === "delivered") {
      events.push({
        date: updatedAt.toLocaleDateString("pt-BR"),
        time: updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        location: "Destino",
        status: "Entregue",
        description: "Pedido entregue com sucesso!",
      });
    }

    return events.reverse(); // Most recent first
  };

  const statusConfig = orderData ? STATUS_CONFIG[orderData.status] || STATUS_CONFIG.pending : null;
  const StatusIcon = statusConfig?.icon || Package;

  const handleWhatsApp = () => {
    const message = WHATSAPP_MESSAGES.tracking(orderData?.order_id);
    const whatsappNumber = settings?.whatsappRaw || STORE_DEFAULTS.whatsappRaw;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <Layout>
      <SEO
        title="Rastrear Pedido"
        description="Acompanhe o status do seu pedido em tempo real."
      />

      <div className="container-custom py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Rastreie seu Pedido
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Digite o código de rastreamento que você recebeu por e-mail para acompanhar seu pedido.
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-xl mx-auto mb-12">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Digite o código de rastreamento"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setError(null);
                }}
                className="h-14 pl-12 text-lg"
              />
            </div>
            <Button
              type="submit"
              className="btn-primary h-14 px-8"
              disabled={isLoading}
            >
              {isLoading ? "Buscando..." : "Rastrear"}
            </Button>
          </form>
          
          {error && (
            <p className="text-sm text-destructive mt-3 text-center">{error}</p>
          )}
        </div>

        {/* Results */}
        {orderData && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            {/* Status Card */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Pedido</p>
                    <p className="font-mono text-lg font-bold text-foreground">
                      #{orderData.order_id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <Badge className={`${statusConfig?.color} flex items-center gap-1.5 px-3 py-1`}>
                    <StatusIcon className="h-4 w-4" />
                    {statusConfig?.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {orderData.carrier && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Transportadora:</span>{" "}
                      <span className="font-medium text-foreground">{orderData.carrier}</span>
                    </span>
                    {orderData.tracking_code && (
                      <>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-sm">
                          <span className="text-muted-foreground">Código:</span>{" "}
                          <span className="font-mono font-medium text-foreground">
                            {orderData.tracking_code}
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                )}

                {orderData.estimated_delivery && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Previsão de entrega:{" "}
                    <span className="font-medium text-foreground">
                      {orderData.estimated_delivery}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Correios Real-Time Tracking */}
            {orderData.tracking_code && (
              <Card className="bg-card border-border border-2 border-blue-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Truck className="h-5 w-5 text-blue-600" />
                        Rastreamento {orderData.carrier || "Correios"}
                      </CardTitle>
                      <CardDescription>
                        Código: <span className="font-mono font-medium">{orderData.tracking_code}</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshCorreiosTracking}
                        disabled={isLoadingCorreios}
                        className="gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingCorreios ? 'animate-spin' : ''}`} />
                        Atualizar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a
                          href={`https://www.linkcorreios.com.br/${orderData.tracking_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Ver no Site
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingCorreios ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-4">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : orderData.correios_error ? (
                    <div className="text-center py-6">
                      <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{orderData.correios_error}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Tente novamente ou consulte diretamente no site dos Correios.
                      </p>
                    </div>
                  ) : orderData.correios_events.length > 0 ? (
                    <div className="relative">
                      {orderData.correios_delivered && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-700">Entrega realizada com sucesso!</span>
                        </div>
                      )}
                      
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-200" />

                      {/* Events */}
                      <div className="space-y-4">
                        {orderData.correios_events.map((event, index) => (
                          <div key={index} className="relative flex gap-4">
                            {/* Dot */}
                            <div
                              className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                index === 0
                                  ? "bg-blue-600 text-white"
                                  : "bg-blue-100 border-2 border-blue-300"
                              }`}
                            >
                              {event.status === "Entregue" ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : event.status === "Em Trânsito" || event.status === "Saiu para Entrega" ? (
                                <Truck className="h-4 w-4" />
                              ) : (
                                <Package className="h-4 w-4" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pb-2">
                              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                                <h4 className={`font-semibold ${index === 0 ? "text-blue-600" : "text-foreground"}`}>
                                  {event.status}
                                </h4>
                                <span className="text-xs text-muted-foreground">
                                  {event.date} às {event.time}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {event.description}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{event.location}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Aguardando informações da transportadora...
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Internal Timeline */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Histórico do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                  {/* Events */}
                  <div className="space-y-6">
                    {orderData.events.map((event, index) => (
                      <div key={index} className="relative flex gap-4">
                        {/* Dot */}
                        <div
                          className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                            index === 0
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted border-2 border-border"
                          }`}
                        >
                          {index === 0 ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-2">
                          <div className="flex items-center justify-between mb-1">
                            <h4
                              className={`font-semibold ${
                                index === 0 ? "text-primary" : "text-foreground"
                              }`}
                            >
                              {event.status}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {event.date} às {event.time}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{event.location}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="bg-muted/30 border-primary/20">
              <CardContent className="py-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <h3 className="font-semibold text-foreground mb-1">
                      Precisa de ajuda?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Entre em contato com nosso suporte para tirar dúvidas
                    </p>
                  </div>
                  <Button
                    onClick={handleWhatsApp}
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Falar no WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Initial State / Empty */}
        {!orderData && !error && !isLoading && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">
                  Acompanhe sua entrega
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Use o código de rastreamento enviado por e-mail após a confirmação do seu pedido.
                  Você também pode encontrar o código na área "Meus Pedidos" da sua conta.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
