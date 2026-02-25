import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Mail,
  Phone,
  Calendar,
  Search,
  RefreshCw,
  Send,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Users,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Lead {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  document: string | null;
  cart_items: unknown[];
  cart_total: number;
  status: string;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  converted_at: string | null;
  order_id: string | null;
  recovery_email_sent_at: string | null;
}

interface CartItem {
  product_id?: string;
  product_title?: string;
  variant_id?: string;
  variant_sku?: string;
  quantity?: number;
  unit_price?: number;
}

export default function Leads() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch leads
  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ["admin-leads", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
  });

  // Send recovery email mutation
  const sendRecoveryEmail = useMutation({
    mutationFn: async (lead: Lead) => {
      const { data, error } = await supabase.functions.invoke("send-cart-recovery", {
        body: {
          email: lead.email,
          name: lead.name,
          link: "https://reidasbombas.lovable.app/checkout",
          lead_id: lead.id,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Email de recuperação enviado!");
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
    },
    onError: (error) => {
      toast.error("Erro ao enviar email", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    },
  });

  // Process all abandoned carts
  const processAbandonedCarts = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("process-abandoned-carts");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Processamento concluído!", {
        description: `${data.results?.success || 0} emails enviados`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
    },
    onError: (error) => {
      toast.error("Erro ao processar", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    },
  });

  // Filter leads by search term
  const filteredLeads = leads?.filter((lead) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      lead.name.toLowerCase().includes(searchLower) ||
      lead.email.toLowerCase().includes(searchLower) ||
      (lead.phone && lead.phone.includes(searchTerm))
    );
  });

  // Calculate stats
  const stats = {
    total: leads?.length || 0,
    abandoned: leads?.filter((l) => l.status === "abandoned").length || 0,
    converted: leads?.filter((l) => l.status === "converted").length || 0,
    pendingEmail: leads?.filter((l) => l.status === "abandoned" && !l.recovery_email_sent_at).length || 0,
    conversionRate: leads?.length
      ? ((leads.filter((l) => l.status === "converted").length / leads.length) * 100).toFixed(1)
      : "0",
  };

  const getStatusBadge = (status: string, recoveryEmailSent: boolean) => {
    if (status === "converted") {
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Convertido</Badge>;
    }
    if (recoveryEmailSent) {
      return <Badge variant="secondary"><Mail className="w-3 h-3 mr-1" /> Email Enviado</Badge>;
    }
    return <Badge variant="destructive"><Clock className="w-3 h-3 mr-1" /> Abandonado</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return "-";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const openWhatsApp = (phone: string | null, name: string) => {
    if (!phone) return;
    const cleaned = phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá ${name.split(" ")[0]}! Vi que você estava finalizando uma compra no Rei das Bombas. Posso ajudar com algo?`
    );
    window.open(`https://wa.me/55${cleaned}?text=${message}`, "_blank");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads - Carrinhos Abandonados</h1>
            <p className="text-muted-foreground">
              Gerencie leads capturados durante o checkout
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button
              onClick={() => processAbandonedCarts.mutate()}
              disabled={processAbandonedCarts.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              {processAbandonedCarts.isPending ? "Enviando..." : "Enviar Emails Pendentes"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Abandonados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                <span className="text-2xl font-bold">{stats.abandoned}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Convertidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.converted}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aguardando Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold">{stats.pendingEmail}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">{stats.conversionRate}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="abandoned">Abandonados</SelectItem>
                  <SelectItem value="converted">Convertidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredLeads && filteredLeads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Valor do Carrinho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-muted-foreground">{lead.email}</div>
                      </TableCell>
                      <TableCell>
                        {lead.phone ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 p-0 h-auto"
                            onClick={() => openWhatsApp(lead.phone, lead.name)}
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            {formatPhone(lead.phone)}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(lead.cart_total)}</div>
                        <div className="text-xs text-muted-foreground">
                          {Array.isArray(lead.cart_items) ? lead.cart_items.length : 0} itens
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(lead.status, !!lead.recovery_email_sent_at)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(lead.created_at), "HH:mm", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {lead.status === "abandoned" && !lead.recovery_email_sent_at && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendRecoveryEmail.mutate(lead)}
                              disabled={sendRecoveryEmail.isPending}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum lead encontrado</p>
                <p className="text-sm">Os leads aparecem aqui quando alguém inicia o checkout</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Detalhes do Lead
              </DialogTitle>
              <DialogDescription>
                Informações completas do carrinho abandonado
              </DialogDescription>
            </DialogHeader>

            {selectedLead && (
              <div className="space-y-6">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nome</label>
                    <p className="font-medium">{selectedLead.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="font-medium">{selectedLead.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                    <p className="font-medium">{formatPhone(selectedLead.phone)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">CPF/CNPJ</label>
                    <p className="font-medium">{selectedLead.document || "-"}</p>
                  </div>
                </div>

                {/* Cart Items */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Itens do Carrinho
                  </label>
                  <div className="border rounded-lg divide-y">
                    {Array.isArray(selectedLead.cart_items) && selectedLead.cart_items.length > 0 ? (
                      selectedLead.cart_items.map((item: CartItem, index: number) => (
                        <div key={index} className="p-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{item.product_title || "Produto"}</p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {item.variant_sku || "-"} | Qtd: {item.quantity || 1}
                            </p>
                          </div>
                          <p className="font-medium">
                            {formatCurrency((item.unit_price || 0) * (item.quantity || 1))}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-muted-foreground">
                        Nenhum item no carrinho
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Total do Carrinho</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(selectedLead.cart_total)}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Histórico
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        Criado em {format(new Date(selectedLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {selectedLead.recovery_email_sent_at && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Mail className="w-4 h-4" />
                        <span>
                          Email enviado em {format(new Date(selectedLead.recovery_email_sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    {selectedLead.converted_at && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          Convertido em {format(new Date(selectedLead.converted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  {selectedLead.phone && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => openWhatsApp(selectedLead.phone, selectedLead.name)}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Chamar no WhatsApp
                    </Button>
                  )}
                  {selectedLead.status === "abandoned" && !selectedLead.recovery_email_sent_at && (
                    <Button
                      className="flex-1"
                      onClick={() => {
                        sendRecoveryEmail.mutate(selectedLead);
                        setIsDetailOpen(false);
                      }}
                      disabled={sendRecoveryEmail.isPending}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Enviar Email de Recuperação
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
