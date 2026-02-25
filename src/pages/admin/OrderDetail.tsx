import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, Package, Truck, CreditCard, MapPin, User, Clock, 
  CheckCircle2, Circle, AlertCircle, XCircle, ChevronDown, Loader2,
  Phone, Mail, FileText, Calendar, Copy, Send, ExternalLink, StickyNote, Save
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface Order {
  id: string;
  user_id: string;
  status: "pending" | "paid" | "shipped" | "cancelled";
  total_amount: number;
  created_at: string;
  updated_at: string;
  shipping_address: Json;
  metadata: Json;
  payment_method: string | null;
  payment_id: string | null;
  tracking_token: string | null;
  supplier_order_id: string | null;
  internal_notes: string | null;
}

interface OrderItem {
  id: string;
  order_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  variant?: {
    id: string;
    sku: string;
    attrs: Json;
    image_url: string | null;
    product?: {
      id: string;
      title: string;
      image_url: string | null;
    };
  };
}

interface StatusStep {
  status: Order["status"];
  label: string;
  icon: React.ElementType;
  description: string;
}

const STATUS_STEPS: StatusStep[] = [
  { status: "pending", label: "Aguardando Pagamento", icon: Clock, description: "Pedido criado, aguardando confirmação do pagamento" },
  { status: "paid", label: "Pagamento Confirmado", icon: CreditCard, description: "Pagamento aprovado, preparando envio" },
  { status: "shipped", label: "Enviado", icon: Truck, description: "Pedido enviado para o endereço de entrega" },
];

const statusConfig = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  paid: { label: "Pago", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  shipped: { label: "Enviado", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Truck },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trackingCode, setTrackingCode] = useState("");
  const [carrier, setCarrier] = useState("");
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [isResendingToHub, setIsResendingToHub] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesChanged, setNotesChanged] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrderData();
    }
  }, [id]);

  const fetchOrderData = async () => {
    try {
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!orderData) {
        toast.error("Pedido não encontrado");
        navigate("/admin/orders");
        return;
      }

      setOrder(orderData as Order);
      
      // Initialize tracking fields from metadata
      const meta = orderData.metadata as Record<string, unknown> || {};
      setTrackingCode(String(meta.tracking_code || ""));
      setCarrier(String(meta.carrier || ""));
      
      // Initialize internal notes
      setInternalNotes(orderData.internal_notes || "");
      setNotesChanged(false);
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          variant_id,
          quantity,
          unit_price,
          variant:variants (
            id,
            sku,
            attrs,
            image_url,
            product:products (
              id,
              title,
              image_url
            )
          )
        `)
        .eq("order_id", id);

      if (itemsError) throw itemsError;
      setOrderItems((itemsData as OrderItem[]) || []);
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Erro ao carregar pedido");
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: Order["status"]) => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", order.id);

      if (error) throw error;

      setOrder({ ...order, status: newStatus });
      toast.success(`Status atualizado para ${statusConfig[newStatus].label}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const saveTrackingInfo = async () => {
    if (!order) return;
    if (!trackingCode.trim() || !carrier.trim()) {
      toast.error("Preencha o código de rastreio e a transportadora");
      return;
    }

    setIsSavingTracking(true);
    try {
      // Get current metadata
      const currentMetadata = (order.metadata as Record<string, unknown>) || {};
      
      // Update metadata with tracking info
      const updatedMetadata = {
        ...currentMetadata,
        tracking_code: trackingCode.trim(),
        carrier: carrier.trim(),
      };

      // Update order with tracking info and set status to shipped
      const { error } = await supabase
        .from("orders")
        .update({
          status: "shipped",
          metadata: updatedMetadata,
        })
        .eq("id", order.id);

      if (error) throw error;

      // Get customer email to send notification
      const buyerEmail = getMetadataValue("buyer_email");
      const buyerName = getMetadataValue("buyer_name");
      
      if (buyerEmail) {
        // Send shipping notification email
        try {
          await supabase.functions.invoke("send-shipping-notification", {
            body: {
              to: buyerEmail,
              order_id: order.id,
              tracking_token: order.tracking_token || order.id,
              tracking_code: trackingCode.trim(),
              carrier: carrier.trim(),
              customer_name: buyerName || undefined,
            },
          });
          toast.success("Código de rastreio salvo e email enviado ao cliente!");
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
          toast.success("Código de rastreio salvo! (Email não enviado - verifique a configuração)");
        }
      } else {
        toast.success("Código de rastreio salvo!");
      }

      // Update local state
      setOrder({
        ...order,
        status: "shipped",
        metadata: updatedMetadata as Json,
      });
    } catch (error) {
      console.error("Error saving tracking info:", error);
      toast.error("Erro ao salvar código de rastreio");
    } finally {
      setIsSavingTracking(false);
    }
  };

  const copyTrackingCode = () => {
    if (trackingCode) {
      navigator.clipboard.writeText(trackingCode);
      toast.success("Código copiado!");
    }
  };

  const handleResendToHub = async () => {
    if (!order) return;
    
    setIsResendingToHub(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-order-to-hub", {
        body: { order_id: order.id, type: "manual_resend" },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Pedido reenviado ao Hub com sucesso!");
        // Refresh order data to get updated supplier_order_id
        await fetchOrderData();
      } else {
        toast.error(data?.error || "Erro ao reenviar pedido ao Hub");
      }
    } catch (error) {
      console.error("Error resending to Hub:", error);
      toast.error("Erro ao reenviar pedido ao Hub");
    } finally {
      setIsResendingToHub(false);
    }
  };

  const saveInternalNotes = async () => {
    if (!order) return;
    
    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ internal_notes: internalNotes.trim() || null })
        .eq("id", order.id);

      if (error) throw error;

      setOrder({ ...order, internal_notes: internalNotes.trim() || null });
      setNotesChanged(false);
      toast.success("Observações salvas!");
    } catch (error) {
      console.error("Error saving internal notes:", error);
      toast.error("Erro ao salvar observações");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleNotesChange = (value: string) => {
    setInternalNotes(value);
    setNotesChanged(value !== (order?.internal_notes || ""));
  };

  const canResendToHub = order && !order.supplier_order_id && order.status === "paid";

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDate = (date: string) =>
    format(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });

  const formatShortDate = (date: string) =>
    format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });

  const formatOrderId = (orderId: string) => `#${orderId.slice(0, 8).toUpperCase()}`;

  const getMetadataValue = (key: string): string => {
    if (order?.metadata && typeof order.metadata === "object" && order.metadata !== null) {
      const meta = order.metadata as Record<string, unknown>;
      return String(meta[key] || "");
    }
    return "";
  };

  const getShippingAddress = (): Record<string, string> => {
    if (order?.shipping_address && typeof order.shipping_address === "object") {
      return order.shipping_address as Record<string, string>;
    }
    return {};
  };

  const getVariantAttributes = (attrs: Json): string => {
    if (typeof attrs === "object" && attrs !== null) {
      const attrObj = attrs as Record<string, string>;
      return Object.entries(attrObj)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" | ");
    }
    return "";
  };

  const getStatusIndex = (status: Order["status"]): number => {
    if (status === "cancelled") return -1;
    return STATUS_STEPS.findIndex((s) => s.status === status);
  };

  const getItemImage = (item: OrderItem): string => {
    return item.variant?.image_url || item.variant?.product?.image_url || "/placeholder.svg";
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const shippingCost = order ? order.total_amount - subtotal : 0;

  if (isLoading) {
    return (
      <AdminLayout title="Detalhes do Pedido">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout title="Pedido não encontrado">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Pedido não encontrado</p>
          <Button asChild className="mt-4">
            <Link to="/admin/orders">Voltar para Pedidos</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);
  const shippingAddress = getShippingAddress();

  return (
    <AdminLayout title={`Pedido ${formatOrderId(order.id)}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/admin/orders")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Pedido {formatOrderId(order.id)}
                <Badge className={`${statusConfig[order.status].color} border ml-2`}>
                  {statusConfig[order.status].label}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Criado em {formatDate(order.created_at)}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Alterar Status
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background">
              {(Object.keys(statusConfig) as Order["status"][]).map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => updateOrderStatus(status)}
                  className="cursor-pointer gap-2"
                  disabled={order.status === status}
                >
                  <Badge className={`${statusConfig[status].color} border`}>
                    {statusConfig[status].label}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Timeline */}
        <Card className="bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Acompanhamento do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.status === "cancelled" ? (
              <div className="flex items-center gap-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <XCircle className="h-10 w-10 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">Pedido Cancelado</p>
                  <p className="text-sm text-muted-foreground">
                    Este pedido foi cancelado e não será processado.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline */}
                <div className="flex items-center justify-between">
                  {STATUS_STEPS.map((step, index) => {
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    const Icon = step.icon;

                    return (
                      <div key={step.status} className="flex-1 relative">
                        <div className="flex flex-col items-center">
                          {/* Circle */}
                          <div
                            className={`
                              w-12 h-12 rounded-full flex items-center justify-center z-10
                              transition-all duration-300
                              ${isCompleted
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                              }
                              ${isCurrent ? "ring-4 ring-primary/20" : ""}
                            `}
                          >
                            {isCompleted && !isCurrent ? (
                              <CheckCircle2 className="h-6 w-6" />
                            ) : (
                              <Icon className="h-6 w-6" />
                            )}
                          </div>

                          {/* Label */}
                          <div className="mt-3 text-center">
                            <p className={`font-medium text-sm ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                              {step.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-[120px]">
                              {step.description}
                            </p>
                          </div>
                        </div>

                        {/* Connector line */}
                        {index < STATUS_STEPS.length - 1 && (
                          <div
                            className={`
                              absolute top-6 left-1/2 w-full h-0.5 -translate-y-1/2
                              ${index < currentStatusIndex ? "bg-primary" : "bg-muted"}
                            `}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items - Full Width */}
        <Card className="bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Itens do Pedido
            </CardTitle>
            <CardDescription>{orderItems.length} item(ns)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Imagem</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-right">Preço Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <img
                        src={getItemImage(item)}
                        alt={item.variant?.product?.title || "Produto"}
                        className="w-16 h-16 object-cover rounded-md border"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.variant?.product?.title || "Produto"}</p>
                        <p className="text-xs text-muted-foreground">SKU: {item.variant?.sku}</p>
                        {item.variant?.attrs && (
                          <p className="text-xs text-muted-foreground">
                            {getVariantAttributes(item.variant.attrs)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatPrice(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(item.quantity * item.unit_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator className="my-4" />

            {/* Order Summary */}
            <div className="flex justify-end">
              <div className="space-y-2 text-sm w-full max-w-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span>{shippingCost > 0 ? formatPrice(shippingCost) : "Grátis"}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid 3 Columns: Customer, Address, Payment */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Customer Info */}
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {getMetadataValue("buyer_name") && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="font-medium">{getMetadataValue("buyer_name")}</span>
                </div>
              )}
              {getMetadataValue("buyer_email") && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="break-all">{getMetadataValue("buyer_email")}</span>
                </div>
              )}
              {getMetadataValue("buyer_phone") && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>{getMetadataValue("buyer_phone")}</span>
                </div>
              )}
              {getMetadataValue("buyer_document") && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>{getMetadataValue("buyer_document")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" />
                Endereço de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {Object.keys(shippingAddress).length > 0 ? (
                <div className="space-y-1">
                  <p className="font-medium">{shippingAddress.name || getMetadataValue("buyer_name")}</p>
                  <p>
                    {shippingAddress.street}
                    {shippingAddress.number && `, ${shippingAddress.number}`}
                  </p>
                  {shippingAddress.complement && <p>{shippingAddress.complement}</p>}
                  <p>
                    {shippingAddress.neighborhood}
                    {shippingAddress.city && ` - ${shippingAddress.city}`}
                    {shippingAddress.state && `/${shippingAddress.state}`}
                  </p>
                  <p className="font-mono text-muted-foreground">{shippingAddress.zip || shippingAddress.cep}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">Endereço não informado</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-primary" />
                Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método</span>
                <span className="font-medium capitalize">
                  {order.payment_method || "Mercado Pago"}
                </span>
              </div>
              {order.payment_id && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">ID Pagamento</span>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{order.payment_id}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge className={`${statusConfig[order.status].color} border`}>
                  {order.status === "paid" || order.status === "shipped" ? "Aprovado" : statusConfig[order.status].label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grid 2 Columns: Tracking and Hub Integration */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Tracking Info */}
          <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Código de Rastreio
              </CardTitle>
              <CardDescription>
                {order.status === "shipped" 
                  ? "Pedido enviado - código salvo"
                  : "Preencha e salve para marcar como enviado"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="carrier">Transportadora</Label>
                  <Input
                    id="carrier"
                    placeholder="Ex: Correios, Jadlog"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    disabled={isSavingTracking}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tracking_code">Código de Rastreio</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tracking_code"
                      placeholder="Ex: BR123456789BR"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                      className="font-mono"
                      disabled={isSavingTracking}
                    />
                    {trackingCode && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyTrackingCode}
                        title="Copiar código"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={saveTrackingInfo}
                  disabled={!trackingCode.trim() || !carrier.trim() || isSavingTracking}
                  className="flex-1 gap-2"
                  variant={order.status === "shipped" ? "outline" : "default"}
                >
                  {isSavingTracking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : order.status === "shipped" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Atualizar Rastreio
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Marcar como Enviado
                    </>
                  )}
                </Button>

                {trackingCode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 gap-2"
                    asChild
                  >
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(trackingCode + " rastreamento")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Rastrear
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Hub Integration */}
          <Card className="border-2 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                Integração Hub
              </CardTitle>
              <CardDescription>
                {order.supplier_order_id 
                  ? `Pedido enviado: ${order.supplier_order_id.slice(0, 8)}...`
                  : "Pedido ainda não enviado ao fornecedor"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.supplier_order_id ? (
                <div className="flex items-center gap-2 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-lg">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Sincronizado com Hub</p>
                    <p className="text-xs opacity-80 font-mono">{order.supplier_order_id}</p>
                  </div>
                </div>
              ) : (
                <>
                  {canResendToHub && (
                    <Button
                      onClick={handleResendToHub}
                      disabled={isResendingToHub}
                      variant="outline"
                      className="w-full gap-2 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                    >
                      {isResendingToHub ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Reenviar ao Hub
                        </>
                      )}
                    </Button>
                  )}
                  {order.status !== "paid" && !order.supplier_order_id && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>Pedido precisa estar com status "Pago" para enviar ao Hub</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Internal Notes - Team Only */}
        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Observações Internas
            </CardTitle>
            <CardDescription>
              Anotações da equipe sobre este pedido (não visível para o cliente)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Adicione observações sobre este pedido..."
              value={internalNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="min-h-[100px] resize-y bg-background"
              disabled={isSavingNotes}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {internalNotes.length > 0 ? `${internalNotes.length} caracteres` : "Nenhuma observação"}
              </p>
              <Button
                onClick={saveInternalNotes}
                disabled={!notesChanged || isSavingNotes}
                size="sm"
                className="gap-2"
                variant={notesChanged ? "default" : "outline"}
              >
                {isSavingNotes ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Observações
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Compact Footer: Dates */}
        <Card className="bg-muted/30 border-dashed shadow-sm">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Criado em: <span className="font-medium text-foreground">{formatShortDate(order.created_at)}</span></span>
              </div>
              <Separator orientation="vertical" className="h-4 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Atualizado em: <span className="font-medium text-foreground">{formatShortDate(order.updated_at)}</span></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
