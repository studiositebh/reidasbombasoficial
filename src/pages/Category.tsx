import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { SlidersHorizontal, X, Home, ChevronRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryBreadcrumb } from "@/hooks/useCategoryBreadcrumb";
import { extractAttributeValue } from "@/lib/formatAttributes";
import type { Variant } from "@/types/database";

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("relevance");

  const { data: productsWithVariants, isLoading: isLoadingProducts } = useProducts();
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();

  const currentCategory = categories.find((c) => c.slug === slug);
  const categoryName = currentCategory?.name || slug || "Produtos";

  const { breadcrumb: categoryHierarchy } = useCategoryBreadcrumb(currentCategory?.id);

  const breadcrumbItems = useMemo(() => {
    const items = [{ name: "Início", url: "/" }];
    if (categoryHierarchy.length > 0) {
      categoryHierarchy.forEach((cat) => {
        items.push({ name: cat.name, url: `/categoria/${cat.slug}` });
      });
    }
    if (currentCategory && !categoryHierarchy.find(c => c.id === currentCategory.id)) {
      items.push({ name: categoryName, url: `/categoria/${slug}` });
    }
    return items;
  }, [categoryHierarchy, currentCategory, categoryName, slug]);

  const products = useMemo(() => {
    if (!productsWithVariants || !currentCategory) return [];
    return productsWithVariants.filter((p) => p.category_id === currentCategory.id);
  }, [productsWithVariants, currentCategory]);

  const variants: Record<string, Variant[]> = {};
  products.forEach((p) => {
    if (p.variants) {
      variants[p.id] = p.variants;
    }
  });

  // Extract dynamic filter options with product counts
  const filterOptions = useMemo(() => {
    const brands = new Map<string, number>();
    const sizes = new Map<string, number>();

    products.forEach((product) => {
      const productBrands = new Set<string>();
      const productSizes = new Set<string>();

      product.variants?.forEach((variant) => {
        if (variant.attrs && typeof variant.attrs === "object") {
          const attrs = variant.attrs as Record<string, unknown>;

          const brandKeys = ["marca", "brand", "fabricante", "manufacturer"];
          brandKeys.forEach((key) => {
            if (attrs[key]) {
              const value = extractAttributeValue(attrs[key]);
              if (value && value !== "[object Object]") productBrands.add(value);
            }
          });

          const sizeKeys = ["tamanho", "size", "medida", "bitola", "diametro", "polegada", "polegadas"];
          sizeKeys.forEach((key) => {
            if (attrs[key]) {
              const value = extractAttributeValue(attrs[key]);
              if (value && value !== "[object Object]") productSizes.add(value);
            }
          });
        }
      });

      productBrands.forEach((b) => brands.set(b, (brands.get(b) || 0) + 1));
      productSizes.forEach((s) => sizes.set(s, (sizes.get(s) || 0) + 1));
    });

    return {
      brands: Array.from(brands.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      sizes: Array.from(sizes.entries()).sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [products]);

  // Apply filters and sorting
  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const price = product.promotional_price ?? product.base_price;
      if (price < priceRange[0] || price > priceRange[1]) return false;

      if (selectedBrands.length > 0) {
        const productBrands = new Set<string>();
        product.variants?.forEach((variant) => {
          if (variant.attrs && typeof variant.attrs === "object") {
            const attrs = variant.attrs as Record<string, unknown>;
            const brandKeys = ["marca", "brand", "fabricante", "manufacturer"];
            brandKeys.forEach((key) => {
              if (attrs[key]) {
                const value = extractAttributeValue(attrs[key]);
                if (value) productBrands.add(value);
              }
            });
          }
        });
        if (!selectedBrands.some((b) => productBrands.has(b))) return false;
      }

      if (selectedSizes.length > 0) {
        const productSizes = new Set<string>();
        product.variants?.forEach((variant) => {
          if (variant.attrs && typeof variant.attrs === "object") {
            const attrs = variant.attrs as Record<string, unknown>;
            const sizeKeys = ["tamanho", "size", "medida", "bitola", "diametro", "polegada", "polegadas"];
            sizeKeys.forEach((key) => {
              if (attrs[key]) {
                const value = extractAttributeValue(attrs[key]);
                if (value) productSizes.add(value);
              }
            });
          }
        });
        if (!selectedSizes.some((s) => productSizes.has(s))) return false;
      }

      return true;
    });

    // Sort
    switch (sortBy) {
      case "price-asc":
        result = [...result].sort((a, b) => (a.promotional_price ?? a.base_price) - (b.promotional_price ?? b.base_price));
        break;
      case "price-desc":
        result = [...result].sort((a, b) => (b.promotional_price ?? b.base_price) - (a.promotional_price ?? a.base_price));
        break;
      case "name-asc":
        result = [...result].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "name-desc":
        result = [...result].sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "newest":
        result = [...result].sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime());
        break;
    }

    return result;
  }, [products, priceRange, selectedBrands, selectedSizes, sortBy]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const clearFilters = () => {
    setPriceRange([0, 5000]);
    setSelectedBrands([]);
    setSelectedSizes([]);
    setSortBy("relevance");
  };

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedSizes.length > 0 ||
    priceRange[0] > 0 ||
    priceRange[1] < 5000;

  const isLoading = isLoadingProducts || isLoadingCategories;

  return (
    <Layout>
      <SEO
        title={categoryName}
        description={`Compre ${categoryName} para postos de combustível. Equipamentos industriais com qualidade e entrega rápida.`}
        url={`/categoria/${slug}`}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="container-custom py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 animate-fade-in" aria-label="Navegação de categorias">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <li>
              <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                <Home className="h-3.5 w-3.5" />
                <span>Início</span>
              </Link>
            </li>
            {categoryHierarchy.map((cat) => (
              <React.Fragment key={cat.id}>
                <ChevronRight className="h-3.5 w-3.5" />
                <li>
                  <Link to={`/categoria/${cat.slug}`} className="hover:text-primary transition-colors">
                    {cat.name}
                  </Link>
                </li>
              </React.Fragment>
            ))}
            {currentCategory && !categoryHierarchy.find(c => c.id === currentCategory.id) && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <li className="text-foreground font-medium">{categoryName}</li>
              </>
            )}
          </ol>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-primary rounded-full" />
            <h1 className="text-2xl md:text-3xl font-black text-foreground">{categoryName}</h1>
          </div>
          <Button
            variant="outline"
            className="lg:hidden btn-outline-gold"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside
            className={`${
              showFilters ? "fixed inset-0 z-50 bg-background p-6 overflow-y-auto" : "hidden"
            } lg:block lg:relative lg:w-64 shrink-0`}
          >
            {/* Mobile Close Button */}
            <div className="flex items-center justify-between mb-6 lg:hidden">
              <h2 className="text-lg font-bold text-foreground">Filtros</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="w-full text-muted-foreground">
                  Limpar Filtros
                </Button>
              )}

              {/* Category Filter */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-bold text-foreground text-sm mb-4">Categorias</h3>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/categoria/${cat.slug}`}
                      className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                        cat.slug === slug
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {cat.name}
                      <span className="text-xs ml-1 opacity-60">({cat.product_count ?? 0})</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-bold text-foreground text-sm mb-4">Faixa de Preço</h3>
                <Slider value={priceRange} onValueChange={setPriceRange} max={5000} step={50} className="mb-3" />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>R$ {priceRange[0]}</span>
                  <span>R$ {priceRange[1]}</span>
                </div>
              </div>

              {/* Brand Filter */}
              {filterOptions.brands.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-bold text-foreground text-sm mb-4">Marca</h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {filterOptions.brands.map(([brand, count]) => (
                      <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                        <Checkbox checked={selectedBrands.includes(brand)} onCheckedChange={() => toggleBrand(brand)} />
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">
                          {brand}
                        </span>
                        <span className="text-xs text-muted-foreground opacity-60">({count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Filter */}
              {filterOptions.sizes.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-bold text-foreground text-sm mb-4">Tamanho / Medida</h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {filterOptions.sizes.map(([size, count]) => (
                      <label key={size} className="flex items-center gap-3 cursor-pointer group">
                        <Checkbox checked={selectedSizes.includes(size)} onCheckedChange={() => toggleSize(size)} />
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">
                          {size}
                        </span>
                        <span className="text-xs text-muted-foreground opacity-60">({count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply Button - Mobile */}
              <Button className="w-full btn-primary lg:hidden" onClick={() => setShowFilters(false)}>
                Aplicar Filtros
              </Button>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : !currentCategory ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg mb-4">Categoria não encontrada.</p>
                <Button asChild className="btn-primary">
                  <Link to="/">Ver Todos os Produtos</Link>
                </Button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg mb-4">
                  {hasActiveFilters
                    ? "Nenhum produto encontrado com os filtros selecionados."
                    : "Nenhum produto encontrado nesta categoria."}
                </p>
                {hasActiveFilters ? (
                  <Button onClick={clearFilters} variant="outline">Limpar Filtros</Button>
                ) : (
                  <Button asChild className="btn-primary">
                    <Link to="/">Ver Todos os Produtos</Link>
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Sort Bar */}
                <div className="flex items-center justify-between mb-4 gap-4">
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""}{" "}
                    encontrado{filteredProducts.length !== 1 ? "s" : ""}
                  </p>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Mais relevantes</SelectItem>
                      <SelectItem value="price-asc">Menor preço</SelectItem>
                      <SelectItem value="price-desc">Maior preço</SelectItem>
                      <SelectItem value="name-asc">Nome A-Z</SelectItem>
                      <SelectItem value="name-desc">Nome Z-A</SelectItem>
                      <SelectItem value="newest">Mais recentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} variants={variants[product.id] || []} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
