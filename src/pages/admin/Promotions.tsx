import React, { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tag, Percent, Search, Plus, Pencil, Trash2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  title: string;
  slug: string;
  image_url: string | null;
  base_price: number;
  promotional_price: number | null;
  promotion_expires_at: string | null;
  is_active: boolean | null;
}

const formatPrice = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const calculateDiscount = (basePrice: number, promoPrice: number) => {
  return Math.round(((basePrice - promoPrice) / basePrice) * 100);
};

export default function Promotions() {
  const [promotions, setPromotions] = useState<Product[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Form states
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [promotionalPrice, setPromotionalPrice] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, slug, image_url, base_price, promotional_price, promotion_expires_at, is_active")
        .not("promotional_price", "is", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error("Error fetching promotions:", error);
      toast.error("Erro ao carregar promoções");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, slug, image_url, base_price, promotional_price, promotion_expires_at, is_active")
        .is("promotional_price", null)
        .eq("is_active", true)
        .order("title", { ascending: true });

      if (error) throw error;
      setAvailableProducts(data || []);
    } catch (error) {
      console.error("Error fetching available products:", error);
    }
  };

  useEffect(() => {
    fetchPromotions();
    fetchAvailableProducts();
  }, []);

  const filteredPromotions = useMemo(() => {
    if (!searchQuery.trim()) return promotions;
    const query = searchQuery.toLowerCase();
    return promotions.filter((p) =>
      p.title.toLowerCase().includes(query)
    );
  }, [promotions, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const active = promotions.filter((p) => p.is_active).length;
    const totalSavings = promotions.reduce((sum, p) => {
      return sum + (p.base_price - (p.promotional_price || p.base_price));
    }, 0);
    const avgDiscount = promotions.length > 0
      ? promotions.reduce((sum, p) => {
          return sum + calculateDiscount(p.base_price, p.promotional_price || p.base_price);
        }, 0) / promotions.length
      : 0;
    
    return { active, totalSavings, avgDiscount: Math.round(avgDiscount) };
  }, [promotions]);

  const handleAddPromotion = async () => {
    if (!selectedProductId || !promotionalPrice) {
      toast.error("Preencha todos os campos");
      return;
    }

    const price = parseFloat(promotionalPrice.replace(",", "."));
    if (isNaN(price) || price <= 0) {
      toast.error("Preço promocional inválido");
      return;
    }

    const product = availableProducts.find((p) => p.id === selectedProductId);
    if (product && price >= product.base_price) {
      toast.error("Preço promocional deve ser menor que o preço original");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ promotional_price: price })
        .eq("id", selectedProductId);

      if (error) throw error;

      toast.success("Promoção adicionada com sucesso!");
      setIsAddDialogOpen(false);
      setSelectedProductId("");
      setPromotionalPrice("");
      fetchPromotions();
      fetchAvailableProducts();
    } catch (error) {
      console.error("Error adding promotion:", error);
      toast.error("Erro ao adicionar promoção");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPromotion = async () => {
    if (!editingProduct || !promotionalPrice) {
      toast.error("Preencha todos os campos");
      return;
    }

    const price = parseFloat(promotionalPrice.replace(",", "."));
    if (isNaN(price) || price <= 0) {
      toast.error("Preço promocional inválido");
      return;
    }

    if (price >= editingProduct.base_price) {
      toast.error("Preço promocional deve ser menor que o preço original");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ 
          promotional_price: price,
          promotion_expires_at: expirationDate || null 
        })
        .eq("id", editingProduct.id);

      if (error) throw error;

      toast.success("Promoção atualizada com sucesso!");
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      setPromotionalPrice("");
      setExpirationDate("");
      fetchPromotions();
    } catch (error) {
      console.error("Error updating promotion:", error);
      toast.error("Erro ao atualizar promoção");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePromotion = async () => {
    if (!deletingProduct) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ promotional_price: null })
        .eq("id", deletingProduct.id);

      if (error) throw error;

      toast.success("Promoção removida com sucesso!");
      setIsDeleteDialogOpen(false);
      setDeletingProduct(null);
      fetchPromotions();
      fetchAvailableProducts();
    } catch (error) {
      console.error("Error removing promotion:", error);
      toast.error("Erro ao remover promoção");
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setPromotionalPrice(product.promotional_price?.toString() || "");
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    setDeletingProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const selectedProduct = availableProducts.find((p) => p.id === selectedProductId);

  return (
    <AdminLayout title="Promoções">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos em Promoção</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              {promotions.length} total cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Economia Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalSavings)}</div>
            <p className="text-xs text-muted-foreground">
              Desconto acumulado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desconto Médio</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDiscount}%</div>
            <p className="text-xs text-muted-foreground">
              Média de desconto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Gerenciar Promoções</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Promoção
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredPromotions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "Nenhuma promoção encontrada" : "Nenhuma promoção cadastrada"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Imagem</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Preço Original</TableHead>
                    <TableHead className="text-right">Preço Promo</TableHead>
                    <TableHead className="text-center">Desconto</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromotions.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                            <Tag className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {product.title}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground line-through">
                        {formatPrice(product.base_price)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatPrice(product.promotional_price || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          -{calculateDiscount(product.base_price, product.promotional_price || 0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(product)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Promotion Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Promoção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.title} - {formatPrice(product.base_price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <>
                <div className="text-sm text-muted-foreground">
                  Preço Original: <strong>{formatPrice(selectedProduct.base_price)}</strong>
                </div>

                <div className="space-y-2">
                  <Label>Preço Promocional (R$)</Label>
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={promotionalPrice}
                    onChange={(e) => setPromotionalPrice(e.target.value)}
                  />
                </div>

                {promotionalPrice && (
                  <div className="text-sm text-green-600">
                    Desconto: <strong>
                      {calculateDiscount(
                        selectedProduct.base_price,
                        parseFloat(promotionalPrice.replace(",", ".")) || 0
                      )}%
                    </strong>
                    {" • "}
                    Economia: <strong>
                      {formatPrice(
                        selectedProduct.base_price - (parseFloat(promotionalPrice.replace(",", ".")) || 0)
                      )}
                    </strong>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddPromotion} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Promotion Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Promoção</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4 py-4">
              <div className="text-sm">
                <strong>{editingProduct.title}</strong>
              </div>
              <div className="text-sm text-muted-foreground">
                Preço Original: <strong>{formatPrice(editingProduct.base_price)}</strong>
              </div>
              <div className="space-y-2">
                <Label>Preço Promocional (R$)</Label>
                <Input
                  type="text"
                  placeholder="0,00"
                  value={promotionalPrice}
                  onChange={(e) => setPromotionalPrice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Expiração (Opcional)</Label>
                <Input
                  type="datetime-local"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para promoção sem data de expiração
                </p>
              </div>

              {promotionalPrice && (
                <div className="text-sm text-green-600">
                  Desconto: <strong>
                    {calculateDiscount(
                      editingProduct.base_price,
                      parseFloat(promotionalPrice.replace(",", ".")) || 0
                    )}%
                  </strong>
                  {" • "}
                  Economia: <strong>
                    {formatPrice(
                      editingProduct.base_price - (parseFloat(promotionalPrice.replace(",", ".")) || 0)
                    )}
                  </strong>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditPromotion} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Promoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a promoção de{" "}
              <strong>{deletingProduct?.title}</strong>?
              O produto voltará ao preço original.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePromotion} disabled={isSaving}>
              {isSaving ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
