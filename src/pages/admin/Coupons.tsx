import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Ticket, Search, Percent, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value: number | null;
  max_discount: number | null;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const formatPrice = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
};

export default function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons(data as Coupon[] || []);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast.error("Erro ao carregar cupons");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const resetForm = () => {
    setCode("");
    setDescription("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinOrderValue("");
    setMaxDiscount("");
    setMaxUses("");
    setValidFrom("");
    setValidUntil("");
    setIsActive(true);
  };

  const openDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCode(coupon.code);
      setDescription(coupon.description || "");
      setDiscountType(coupon.discount_type);
      setDiscountValue(coupon.discount_value.toString());
      setMinOrderValue(coupon.min_order_value?.toString() || "");
      setMaxDiscount(coupon.max_discount?.toString() || "");
      setMaxUses(coupon.max_uses?.toString() || "");
      setValidFrom(coupon.valid_from ? coupon.valid_from.split("T")[0] : "");
      setValidUntil(coupon.valid_until ? coupon.valid_until.split("T")[0] : "");
      setIsActive(coupon.is_active);
    } else {
      setEditingCoupon(null);
      resetForm();
      // Set default valid_from to today
      setValidFrom(new Date().toISOString().split("T")[0]);
    }
    setDialogOpen(true);
  };

  const saveCoupon = async () => {
    if (!code.trim()) {
      toast.error("Código do cupom é obrigatório");
      return;
    }

    if (!discountValue || parseFloat(discountValue) <= 0) {
      toast.error("Valor do desconto é obrigatório");
      return;
    }

    if (discountType === "percentage" && parseFloat(discountValue) > 100) {
      toast.error("Desconto percentual não pode ser maior que 100%");
      return;
    }

    setIsSaving(true);
    try {
      const couponData = {
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_order_value: minOrderValue ? parseFloat(minOrderValue) : null,
        max_discount: maxDiscount ? parseFloat(maxDiscount) : null,
        max_uses: maxUses ? parseInt(maxUses) : null,
        valid_from: validFrom || new Date().toISOString(),
        valid_until: validUntil || null,
        is_active: isActive,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from("coupons")
          .update(couponData)
          .eq("id", editingCoupon.id);

        if (error) throw error;
        toast.success("Cupom atualizado!");
      } else {
        const { error } = await supabase
          .from("coupons")
          .insert(couponData);

        if (error) throw error;
        toast.success("Cupom criado!");
      }

      setDialogOpen(false);
      fetchCoupons();
    } catch (error: any) {
      console.error("Error saving coupon:", error);
      if (error.code === "23505") {
        toast.error("Já existe um cupom com esse código");
      } else {
        toast.error("Erro ao salvar cupom");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCoupon = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Cupom excluído");
      fetchCoupons();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Erro ao excluir cupom");
    } finally {
      setDeleteId(null);
    }
  };

  const toggleCouponStatus = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);

      if (error) throw error;

      toast.success(coupon.is_active ? "Cupom desativado" : "Cupom ativado");
      fetchCoupons();
    } catch (error) {
      console.error("Error toggling coupon status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const filteredCoupons = coupons.filter(
    (coupon) =>
      coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coupon.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.is_active) {
      return { label: "Inativo", color: "bg-gray-100 text-gray-700" };
    }

    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    
    if (now < validFrom) {
      return { label: "Agendado", color: "bg-blue-100 text-blue-700" };
    }

    if (coupon.valid_until) {
      const validUntil = new Date(coupon.valid_until);
      if (now > validUntil) {
        return { label: "Expirado", color: "bg-red-100 text-red-700" };
      }
    }

    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      return { label: "Esgotado", color: "bg-orange-100 text-orange-700" };
    }

    return { label: "Ativo", color: "bg-green-100 text-green-700" };
  };

  return (
    <AdminLayout title="Cupons">
      <Card className="bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Cupons de Desconto
          </CardTitle>
          <Button onClick={() => openDialog()} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Novo Cupom
          </Button>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {searchQuery ? "Nenhum cupom encontrado" : "Nenhum cupom cadastrado"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="text-center">Usos</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoupons.map((coupon) => {
                    const status = getCouponStatus(coupon);
                    return (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <div>
                            <span className="font-mono font-bold text-primary">
                              {coupon.code}
                            </span>
                            {coupon.description && (
                              <p className="text-sm text-gray-500 mt-0.5">
                                {coupon.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {coupon.discount_type === "percentage" ? (
                              <>
                                <Percent className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{coupon.discount_value}%</span>
                              </>
                            ) : (
                              <>
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{formatPrice(coupon.discount_value)}</span>
                              </>
                            )}
                          </div>
                          {coupon.min_order_value && coupon.min_order_value > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Mín: {formatPrice(coupon.min_order_value)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{formatDate(coupon.valid_from)}</p>
                            {coupon.valid_until && (
                              <p className="text-gray-500">até {formatDate(coupon.valid_until)}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">{coupon.current_uses}</span>
                          {coupon.max_uses && (
                            <span className="text-gray-500">/{coupon.max_uses}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={status.color}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Switch
                              checked={coupon.is_active}
                              onCheckedChange={() => toggleCouponStatus(coupon)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDialog(coupon)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setDeleteId(coupon.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coupon Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? "Editar Cupom" : "Novo Cupom"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="PROMO10"
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <span className="text-sm text-gray-600">
                    {isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Desconto de 10% para novos clientes"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Desconto *</Label>
                <Select
                  value={discountType}
                  onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  Valor do Desconto *
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  min="0"
                  step={discountType === "percentage" ? "1" : "0.01"}
                  max={discountType === "percentage" ? "100" : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "10" : "50.00"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minOrderValue">Valor Mínimo do Pedido</Label>
                <Input
                  id="minOrderValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  placeholder="100.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDiscount">
                  Desconto Máximo (R$)
                  {discountType === "percentage" && (
                    <span className="text-xs text-gray-500 ml-1">(cap)</span>
                  )}
                </Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  placeholder="50.00"
                  disabled={discountType === "fixed"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Válido a partir de *</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">Válido até</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxUses">Limite de Usos</Label>
              <Input
                id="maxUses"
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Ilimitado"
              />
              <p className="text-xs text-gray-500">
                Deixe em branco para uso ilimitado
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCoupon} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cupom</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cupom? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCoupon} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
