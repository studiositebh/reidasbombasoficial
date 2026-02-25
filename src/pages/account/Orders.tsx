import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Package, ShoppingCart, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  variant: {
    id: string;
    sku: string;
    attrs: Record<string, string | number>;
    product: {
      id: string;
      title: string;
      image_url: string | null;
      base_price: number;
    };
  };
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  tracking_token: string | null;
  shipping_address: {
    name?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
  } | null;
  metadata: {
    shipping_cost?: number;
    shipping_name?: string;
    tracking_code?: string;
    carrier?: string;
  } | null;
  order_items: OrderItem[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  paid: { label: "Pago", color: "bg-green-100 text-green-800 border-green-300" },
  shipped: { label: "Enviado", color: "bg-blue-100 text-blue-800 border-blue-300" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-300" },
};

export default function AccountOrders() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            id,
            status,
            total_amount,
            created_at,
            tracking_token,
            shipping_address,
            metadata,
            order_items (
              id,
              quantity,
              unit_price,
              variant:variants (
                id,
                sku,
                attrs,
                product:products (
                  id,
                  title,
                  image_url,
                  base_price
                )
              )
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setOrders((data as unknown as Order[]) || []);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("Erro ao carregar pedidos");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
  }, [user]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const formatOrderId = (id: string) => id.slice(0, 8).toUpperCase();

  const handleBuyAgain = async (order: Order) => {
    setIsAddingToCart(true);
    try {
      for (const item of order.order_items) {
        if (item.variant?.product) {
          const { data: productData } = await supabase
            .from("products")
            .select("*")
            .eq("id", item.variant.product.id)
            .single();

          const { data: variantData } = await supabase
            .from("variants")
            .select("*")
            .eq("id", item.variant.id)
            .single();

          if (productData && variantData) {
            addItem(productData, variantData, item.quantity);
          }
        }
      }
      toast.success("Itens adicionados ao carrinho!");
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error adding items to cart:", error);
      toast.error("Erro ao adicionar itens ao carrinho");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const formatVariantAttrs = (attrs: Record<string, string | number>) => {
    if (!attrs || typeof attrs !== "object") return "";
    return Object.entries(attrs)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" | ");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Meus Pedidos</h1>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
              <div className="mt-3 flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Meus Pedidos</h1>

      {orders.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">Nenhum pedido encontrado</p>
            <p className="text-sm text-muted-foreground">Você ainda não fez nenhum pedido.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium text-foreground">
                        #{formatOrderId(order.id)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={statusLabels[order.status]?.color || "bg-gray-100"}>
                      {statusLabels[order.status]?.label || order.status}
                    </Badge>
                    <span className="font-bold text-foreground">
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {order.order_items.length} {order.order_items.length === 1 ? "item" : "itens"}
                  </p>
                  <div className="flex items-center gap-2">
                    {order.tracking_token && order.status === "shipped" && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="border-green-600 text-green-600 hover:bg-green-50"
                      >
                        <Link to={`/rastrear-envio?token=${order.tracking_token}`}>
                          <Truck className="h-4 w-4 mr-2" />
                          Rastrear
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                      className="border-primary text-primary hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Pedido #{selectedOrder && formatOrderId(selectedOrder.id)}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <Badge className={statusLabels[selectedOrder.status]?.color || "bg-gray-100"}>
                  {statusLabels[selectedOrder.status]?.label || selectedOrder.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDate(selectedOrder.created_at)}
                </span>
              </div>

              {/* Tracking Info */}
              {selectedOrder.tracking_token && selectedOrder.status === "shipped" && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Pedido Enviado</p>
                        {selectedOrder.metadata?.carrier && (
                          <p className="text-sm text-green-700">
                            Transportadora: {selectedOrder.metadata.carrier}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      asChild
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Link to={`/rastrear-envio?token=${selectedOrder.tracking_token}`}>
                        Rastrear Envio
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">Itens do Pedido</h3>
                <div className="space-y-3">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="h-16 w-16 rounded-md bg-muted overflow-hidden flex-shrink-0">
                        {item.variant?.product?.image_url ? (
                          <img
                            src={item.variant.product.image_url}
                            alt={item.variant.product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {item.variant?.product?.title || "Produto"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.variant?.sku}
                        </p>
                        {item.variant?.attrs && (
                          <p className="text-xs text-muted-foreground">
                            {formatVariantAttrs(item.variant.attrs)}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium text-foreground">
                          {formatPrice(item.unit_price)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Qtd: {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shipping_address && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Endereço de Entrega</h3>
                  <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{selectedOrder.shipping_address.name}</p>
                    <p>
                      {selectedOrder.shipping_address.street}, {selectedOrder.shipping_address.number}
                      {selectedOrder.shipping_address.complement && ` - ${selectedOrder.shipping_address.complement}`}
                    </p>
                    <p>
                      {selectedOrder.shipping_address.neighborhood} - {selectedOrder.shipping_address.city}/{selectedOrder.shipping_address.state}
                    </p>
                    <p>CEP: {selectedOrder.shipping_address.cep}</p>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Resumo Financeiro</h3>
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">
                      {formatPrice(
                        selectedOrder.order_items.reduce(
                          (acc, item) => acc + item.unit_price * item.quantity,
                          0
                        )
                      )}
                    </span>
                  </div>
                  {selectedOrder.metadata?.shipping_cost && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Frete ({selectedOrder.metadata.shipping_name || "Padrão"})
                      </span>
                      <span className="text-foreground">
                        {formatPrice(selectedOrder.metadata.shipping_cost)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span className="text-foreground">Total</span>
                    <span className="text-primary">{formatPrice(selectedOrder.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Buy Again Button */}
              <Button
                onClick={() => handleBuyAgain(selectedOrder)}
                disabled={isAddingToCart}
                className="w-full btn-primary"
              >
                {isAddingToCart ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Comprar Novamente
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
