import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Eye, ChevronDown, ShoppingCart, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { refreshOrderStatuses } from "@/services/hubSyncService";
import type { Json } from "@/integrations/supabase/types";

interface Order {
  id: string;
  user_id: string;
  status: "pending" | "paid" | "shipped" | "cancelled";
  total_amount: number;
  created_at: string;
  shipping_address: Json;
  metadata: Json;
  payment_method: string | null;
}


const statusConfig = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  paid: { label: "Pago", color: "bg-green-100 text-green-700 border-green-200" },
  shipped: { label: "Enviado", color: "bg-blue-100 text-blue-700 border-blue-200" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200" },
};

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data as Order[]) || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSyncWithHub = async () => {
    setIsSyncing(true);
    toast.info("Sincronizando pedidos com o Hub...");

    try {
      const result = await refreshOrderStatuses();
      
      if (result.success) {
        toast.success(result.message);
        if (result.updated > 0) {
          // Refresh orders list if any were updated
          await fetchOrders();
        }
      } else {
        toast.error(result.message);
      }

      if (result.errors && result.errors.length > 0) {
        console.warn("Sync errors:", result.errors);
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Erro ao sincronizar com o Hub");
    } finally {
      setIsSyncing(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      toast.success(`Status atualizado para ${statusConfig[newStatus].label}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDate = (date: string) =>
    format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  const formatOrderId = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

const getCustomerName = (shippingAddress: Json, metadata: Json) => {
    if (typeof shippingAddress === "object" && shippingAddress !== null && "name" in shippingAddress) {
      return (shippingAddress as { name: string }).name;
    }
    if (typeof metadata === "object" && metadata !== null && "buyer_email" in metadata) {
      return (metadata as { buyer_email: string }).buyer_email;
    }
    return "N/A";
  };

  const getCustomerEmail = (metadata: Json) => {
    if (typeof metadata === "object" && metadata !== null && "buyer_email" in metadata) {
      return (metadata as { buyer_email: string }).buyer_email;
    }
    return "N/A";
  };

  const getShippingAddress = (address: Json) => {
    if (typeof address === "object" && address !== null) {
      const addr = address as Record<string, string>;
      return `${addr.street || ""}, ${addr.number || ""} - ${addr.city || ""}/${addr.state || ""}`;
    }
    return "N/A";
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCustomerName(o.shipping_address, o.metadata).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCustomerEmail(o.metadata).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Pedidos">
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900">Gestão de Pedidos</CardTitle>
            <Button
              onClick={handleSyncWithHub}
              disabled={isSyncing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Sincronizando..." : "Atualizar do Hub"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por ID, nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhum pedido encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID do Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-medium">
                        <button
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                          className="text-foreground hover:text-primary hover:underline transition-colors"
                        >
                          {formatOrderId(order.id)}
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                          className="text-sm text-foreground hover:text-primary hover:underline transition-colors font-medium text-left"
                        >
                          {getCustomerName(order.shipping_address, order.metadata)}
                        </button>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{formatDate(order.created_at)}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(order.total_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                              <Badge className={`${statusConfig[order.status].color} border`}>
                                {statusConfig[order.status].label}
                              </Badge>
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="bg-white">
                            {(Object.keys(statusConfig) as Order["status"][]).map((status) => (
                              <DropdownMenuItem
                                key={status}
                                onClick={() => updateOrderStatus(order.id, status)}
                                className="cursor-pointer"
                              >
                                <Badge className={`${statusConfig[status].color} border mr-2`}>
                                  {statusConfig[status].label}
                                </Badge>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
