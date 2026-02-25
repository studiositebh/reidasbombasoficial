import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, Package, ChevronLeft, ChevronRight, RefreshCw, Eye, EyeOff, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { importProductsFromHub, notifyHubProductStatus } from "@/services/hubSyncService";
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { ProductWithVariants, Variant } from "@/types/database";

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

interface ProductWithCategory extends ProductWithVariants {
  categoryName?: string | null;
}

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toggleProduct, setToggleProduct] = useState<ProductWithVariants | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const fetchProducts = async () => {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          categories:category_id (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      const { data: variantsData, error: variantsError } = await supabase
        .from("variants")
        .select("*");

      if (variantsError) throw variantsError;

      const productsWithVariants: ProductWithCategory[] = (productsData || []).map((product) => {
        const productVariants = (variantsData || []).filter((v) => v.product_id === product.id);
        const totalStock = productVariants.reduce((sum, v) => sum + (v.stock_level ?? 0), 0);
        const categoryData = product.categories as { id: string; name: string } | null;
        return { 
          ...product, 
          variants: productVariants, 
          totalStock,
          categoryName: categoryData?.name || null,
          is_active: product.is_active ?? true
        };
      });

      setProducts(productsWithVariants);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEdit = (product: ProductWithVariants) => {
    navigate(`/admin/products/${product.id}/edit`);
  };

  const handleDelete = async () => {
    if (!deleteProductId) return;

    try {
      await supabase.from("variants").delete().eq("product_id", deleteProductId);
      const { error } = await supabase.from("products").delete().eq("id", deleteProductId);
      
      if (error) throw error;

      toast.success("Produto excluído com sucesso");
      setProducts(products.filter((p) => p.id !== deleteProductId));
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Erro ao excluir produto");
    } finally {
      setDeleteProductId(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  const handleSyncFromHub = async () => {
    setIsSyncing(true);
    try {
      const result = await importProductsFromHub();
      
      if (result.success) {
        toast.success(result.message);
        fetchProducts(); // Refresh products list
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Erro ao sincronizar com o marketplace");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleActive = async (syncWithHub: boolean) => {
    if (!toggleProduct) return;
    setIsToggling(true);

    try {
      const newStatus = !toggleProduct.is_active;

      // 1. Update locally in Supabase
      const { error } = await supabase
        .from("products")
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq("id", toggleProduct.id);

      if (error) throw error;

      // 2. If marked to sync with Hub AND is deactivating
      if (syncWithHub && !newStatus) {
        const sku = toggleProduct.variants[0]?.sku || toggleProduct.slug;
        const hubResult = await notifyHubProductStatus(sku, false);
        if (!hubResult) {
          toast.warning("Produto desativado localmente, mas não foi possível notificar o Marketplace");
        }
      }

      // 3. Update local state
      setProducts(prev => prev.map(p => 
        p.id === toggleProduct.id ? { ...p, is_active: newStatus } : p
      ));

      toast.success(newStatus ? "Produto ativado!" : "Produto desativado!");
    } catch (error) {
      console.error("Error toggling product:", error);
      toast.error("Erro ao alterar status do produto");
    } finally {
      setIsToggling(false);
      setToggleProduct(null);
    }
  };

  const filteredProducts = useMemo(() => 
    products.filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [products, searchQuery]
  );

  // Pagination calculations
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  return (
    <AdminLayout title="Produtos">
      <Card className="bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-gray-900">Catálogo de Produtos</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleSyncFromHub}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar com Marketplace
                </>
              )}
            </Button>
            <Button onClick={() => navigate("/admin/products/new")} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Foto</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Preço Base</TableHead>
                    <TableHead className="text-center">Estoque Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                          <img
                            src={product.image_url || "/placeholder.svg"}
                            alt={product.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p 
                            className="font-medium text-gray-900 cursor-pointer hover:text-primary hover:underline"
                            onClick={() => handleEdit(product)}
                          >
                            {product.title}
                          </p>
                          <p className="text-xs text-gray-500">{product.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{product.categoryName || "-"}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(product.base_price)}
                      </TableCell>
                      <TableCell className="text-center">
                        <HoverCard openDelay={200} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all ${
                                product.totalStock > 10
                                  ? "bg-green-100 text-green-700"
                                  : product.totalStock > 0
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {product.totalStock} un.
                            </span>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80 p-0" align="center">
                            <div className="p-3 border-b bg-muted/30">
                              <p className="text-sm font-medium">Variantes ({product.variants.length})</p>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                              {product.variants.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  Nenhuma variante cadastrada
                                </div>
                              ) : (
                                <div className="divide-y">
                                  {product.variants.slice(0, 6).map((variant: Variant) => (
                                    <div key={variant.id} className="flex items-center gap-3 p-2 hover:bg-muted/30">
                                      <div className="w-10 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                                        <img
                                          src={variant.image_url || product.image_url || "/placeholder.svg"}
                                          alt={variant.sku}
                                          className="w-full h-full object-contain"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{variant.sku}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          {Object.entries(variant.attrs as Record<string, string>).slice(0, 2).map(([key, value]) => (
                                            <span key={key} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                                              {value}
                                            </span>
                                          ))}
                                        </div>
                                                      </div>
                                                      <div className="text-right flex-shrink-0">
                                                        <span className={`text-xs font-medium ${
                                                          (variant.stock_level ?? 0) > 5 ? "text-green-600" :
                                                          (variant.stock_level ?? 0) > 0 ? "text-yellow-600" : "text-red-600"
                                                        }`}>
                                                          {variant.stock_level ?? 0} un.
                                                        </span>
                                                      </div>
                                    </div>
                                  ))}
                                  {product.variants.length > 6 && (
                                    <div className="p-2 text-center text-xs text-muted-foreground bg-muted/20">
                                      +{product.variants.length - 6} mais variantes
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            product.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {product.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ver no site"
                            onClick={() => {
                              const productUrl = `${window.location.origin}/produto/${product.slug}`;
                              window.open(productUrl, '_blank');
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={product.is_active ? "text-yellow-600 hover:text-yellow-700" : "text-green-600 hover:text-green-700"}
                            onClick={() => setToggleProduct(product)}
                            title={product.is_active ? "Desativar" : "Ativar"}
                          >
                            {product.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeleteProductId(product.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {!isLoading && filteredProducts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Exibindo</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option.toString()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>
                  de {totalItems} {totalItems === 1 ? "produto" : "produtos"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages || 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <ChevronLeft className="h-4 w-4 -ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4 -ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Product Dialog */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
              Todas as variantes associadas também serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Active Dialog */}
      <AlertDialog open={!!toggleProduct} onOpenChange={() => setToggleProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleProduct?.is_active ? "Desativar Produto" : "Ativar Produto"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleProduct?.is_active 
                ? "Este produto pode estar sincronizado com o Marketplace. Deseja desativá-lo em ambos os lugares?"
                : `Deseja ativar o produto "${toggleProduct?.title}" novamente?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {toggleProduct?.is_active ? (
            <div className="flex flex-col gap-2 py-4">
              <Button 
                variant="outline" 
                onClick={() => handleToggleActive(false)}
                disabled={isToggling}
              >
                {isToggling ? "Processando..." : "Apenas nesta loja"}
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleToggleActive(true)}
                disabled={isToggling}
              >
                {isToggling ? "Processando..." : "Nesta loja E no Marketplace"}
              </Button>
            </div>
          ) : (
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isToggling}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleToggleActive(false)}
                disabled={isToggling}
              >
                {isToggling ? "Ativando..." : "Ativar Produto"}
              </AlertDialogAction>
            </AlertDialogFooter>
          )}

          {toggleProduct?.is_active && (
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isToggling}>Cancelar</AlertDialogCancel>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
