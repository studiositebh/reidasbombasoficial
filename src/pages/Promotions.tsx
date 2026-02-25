import React, { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { ProductCard } from "@/components/ProductCard";
import { ProductGrid } from "@/components/ProductGrid";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { Flame, SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortOption = "discount" | "price-asc" | "price-desc" | "recent";

const Promotions = () => {
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("discount");

  // Filter only products with active promotional_price (not expired)
  const promoProducts = useMemo(() => {
    const now = new Date();
    let filtered = products.filter((p) => {
      if (p.promotional_price === null || p.promotional_price >= p.base_price) return false;
      // Check if promotion has expired
      if (p.promotion_expires_at && new Date(p.promotion_expires_at) < now) return false;
      return true;
    });

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (p) => p.category_id === categoryFilter || p.category === categoryFilter
      );
    }

    // Sort
    switch (sortBy) {
      case "discount":
        filtered.sort((a, b) => {
          const discountA = ((a.base_price - (a.promotional_price || a.base_price)) / a.base_price) * 100;
          const discountB = ((b.base_price - (b.promotional_price || b.base_price)) / b.base_price) * 100;
          return discountB - discountA;
        });
        break;
      case "price-asc":
        filtered.sort((a, b) => (a.promotional_price || a.base_price) - (b.promotional_price || b.base_price));
        break;
      case "price-desc":
        filtered.sort((a, b) => (b.promotional_price || b.base_price) - (a.promotional_price || a.base_price));
        break;
      case "recent":
        filtered.sort((a, b) => new Date(b.updated_at || "").getTime() - new Date(a.updated_at || "").getTime());
        break;
    }

    return filtered;
  }, [products, categoryFilter, sortBy]);

  // Get categories that have promo products
  const availableCategories = useMemo(() => {
    const catIds = new Set(
      products
        .filter((p) => p.promotional_price !== null)
        .map((p) => p.category_id)
        .filter(Boolean)
    );
    return categories.filter((c) => catIds.has(c.id));
  }, [products, categories]);

  return (
    <Layout>
      <SEO
        title="Promoções | Rei das Bombas"
        description="Confira as melhores promoções em peças e equipamentos para postos de combustível. Descontos imperdíveis!"
      />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-sale to-orange-500 py-10 md:py-14">
        <div className="container-custom text-center text-white">
          <Flame className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 animate-pulse" />
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">
            PROMOÇÕES
          </h1>
          <p className="text-lg md:text-xl opacity-90">
            Aproveite os melhores descontos em peças para postos
          </p>
          {promoProducts.length > 0 && (
            <p className="mt-3 text-sm opacity-80">
              {promoProducts.length} produto{promoProducts.length !== 1 ? "s" : ""} em promoção
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-muted border-b border-border">
        <div className="container-custom py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filtrar e ordenar</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border shadow-lg z-[100]">
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border shadow-lg z-[100]">
                  <SelectItem value="discount">Maior Desconto</SelectItem>
                  <SelectItem value="price-asc">Menor Preço</SelectItem>
                  <SelectItem value="price-desc">Maior Preço</SelectItem>
                  <SelectItem value="recent">Mais Recentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container-custom py-8 md:py-12">
        {isLoading ? (
          <ProductGrid products={[]} isLoading={true} />
        ) : promoProducts.length === 0 ? (
          <div className="text-center py-16">
            <Flame className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhuma promoção no momento
            </h2>
            <p className="text-muted-foreground">
              Volte em breve para conferir nossas ofertas especiais!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {promoProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                variants={product.variants}
                showDiscount={true}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Promotions;
