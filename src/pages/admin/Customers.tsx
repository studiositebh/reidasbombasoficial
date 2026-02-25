import { useState, useEffect } from "react";
import { Search, Users, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Customer {
  email: string;
  name: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  lastOrder: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const { data: orders, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Group orders by customer email
        const customerMap = new Map<string, Customer>();

        for (const order of orders || []) {
          const metadata = order.metadata as { buyer_email?: string } | null;
          const shippingAddress = order.shipping_address as { name?: string; phone?: string } | null;
          
          const email = metadata?.buyer_email || "N/A";
          const name = shippingAddress?.name || "N/A";
          const phone = shippingAddress?.phone || "N/A";

          if (customerMap.has(email)) {
            const existing = customerMap.get(email)!;
            existing.ordersCount += 1;
            existing.totalSpent += Number(order.total_amount);
            if (new Date(order.created_at!) > new Date(existing.lastOrder)) {
              existing.lastOrder = order.created_at!;
            }
          } else {
            customerMap.set(email, {
              email,
              name,
              phone,
              ordersCount: 1,
              totalSpent: Number(order.total_amount),
              lastOrder: order.created_at!,
            });
          }
        }

        setCustomers(Array.from(customerMap.values()));
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCustomers();
  }, []);

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDate = (date: string) =>
    format(new Date(date), "dd/MM/yyyy", { locale: ptBR });

  const filteredCustomers = customers.filter(
    (c) =>
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Clientes">
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou email..."
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
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-center">Pedidos</TableHead>
                    <TableHead className="text-right">Total Gasto</TableHead>
                    <TableHead>Último Pedido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.email}>
                      <TableCell>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                          {customer.phone !== "N/A" && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                          {customer.ordersCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(customer.totalSpent)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDate(customer.lastOrder)}
                        </span>
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
