import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronRight, ShoppingCart, Heart, Share2, Truck, Shield, CreditCard, Zap, Clock, Home } from "lucide-react";
import { useCategoryBreadcrumb } from "@/hooks/useCategoryBreadcrumb";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";
import { ProductSchema } from "@/components/ProductSchema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Tabs removed - using sections instead
import { VariantSelector } from "@/components/VariantSelector";
import { ProductGallery } from "@/components/ProductGallery";
import { ShippingCalculator } from "@/components/ShippingCalculator";
import { ExpressCheckoutButton } from "@/components/ExpressCheckoutButton";
import { RelatedProducts } from "@/components/RelatedProducts";
import { MobileProductBar } from "@/components/MobileProductBar";
import { useProduct } from "@/hooks/useProducts";
import { useProductReviews } from "@/hooks/useProductReviews";
import { useCart } from "@/contexts/CartContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { getAttributeEntries, formatAttributesString, formatAttributeLabel } from "@/lib/formatAttributes";
import { sanitizeHTML } from "@/lib/sanitize";
import type { Variant } from "@/types/database";

// Backorder config - can be moved to store_settings later
const ALLOW_BACKORDER = true;

function ProductDetailSkeleton() {
  return (
    <div className="container-custom py-8">
      <Skeleton className="h-6 w-48 mb-6" />
      <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Gallery skeleton */}
        <div className="lg:col-span-5">
          <Skeleton className="aspect-square rounded-xl" />
        </div>
        {/* Info skeleton */}
        <div className="lg:col-span-4 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        {/* Buy box skeleton */}
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  const { data, isLoading, error } = useProduct(slug || "");
  const { addItem, openCart } = useCart();
  const { breadcrumb: categoryBreadcrumb } = useCategoryBreadcrumb(data?.product?.category_id);
  const { data: reviewsData } = useProductReviews(data?.product?.id);

  // IMPORTANT: hooks must run before any conditional returns.
  // Keep breadcrumb schema stable across loading/error/data states.
  const breadcrumbItems = useMemo(() => {
    const items = [{ name: "Início", url: "/" }];
    const product = data?.product;

    if (!product) return items;

    if (categoryBreadcrumb.length > 0) {
      categoryBreadcrumb.forEach((cat) => {
        items.push({ name: cat.name, url: `/categoria/${cat.slug}` });
      });
    } else if (product.category) {
      items.push({
        name: product.category,
        url: `/categoria/${product.category.toLowerCase().replace(/\s+/g, "-")}`,
      });
    }

    items.push({ name: product.title, url: `/produto/${product.slug}` });
    return items;
  }, [categoryBreadcrumb, data?.product]);

  // Set initial variant when data loads
  useEffect(() => {
    if (data?.variants && data.variants.length > 0 && !selectedVariant) {
      setSelectedVariant(data.variants[0]);
    }
  }, [data?.variants, selectedVariant]);

  const handleAddToCart = async () => {
    if (!selectedVariant || !data?.product) {
      toast.error("Selecione uma variação do produto");
      return;
    }
    
    const isOutOfStock = selectedVariant.stock_level <= 0;
    const isBackorder = isOutOfStock && ALLOW_BACKORDER;
    
    if (isOutOfStock && !ALLOW_BACKORDER) {
      toast.error("Produto sem estoque");
      return;
    }

    setIsAddingToCart(true);
    
    addItem(data.product, selectedVariant, quantity);
    
    const attrsStr = formatAttributesString(selectedVariant.attrs);
    
    if (isBackorder) {
      toast.success(`${quantity}x ${data.product.title} encomendado`, {
        description: "Este item está sob encomenda e será enviado em até 7 dias úteis",
      });
    } else {
      toast.success(`${quantity}x ${data.product.title} adicionado ao carrinho`, {
        description: attrsStr || selectedVariant.sku,
      });
    }
    
    openCart();
    setIsAddingToCart(false);
  };

  const handleBuyNow = async () => {
    if (!selectedVariant || !data?.product) {
      toast.error("Selecione uma variação do produto");
      return;
    }
    
    const isOutOfStock = selectedVariant.stock_level <= 0;
    const isBackorder = isOutOfStock && ALLOW_BACKORDER;
    
    if (isOutOfStock && !ALLOW_BACKORDER) {
      toast.error("Produto sem estoque");
      return;
    }

    setIsBuyingNow(true);
    
    addItem(data.product, selectedVariant, quantity);
    
    if (isBackorder) {
      toast.success("Encomenda adicionada! Redirecionando para checkout...");
    } else {
      toast.success("Produto adicionado! Redirecionando para checkout...");
    }
    
    navigate("/checkout");
  };

  // Extract data safely for hooks that need to run unconditionally
  const product = data?.product;
  const variants = data?.variants || [];
  const galleryImages = data?.galleryImages || [];

  // Build technical specs from product.technical_specs + variant attrs
  // MUST be before conditional returns to satisfy Rules of Hooks
  const technicalSpecs = useMemo(() => {
    if (!product) return [];
    const specs: Array<{ key: string; value: string }> = [];
    
    // Check if product has dedicated technical_specs field (JSONB)
    const productAny = product as unknown as { technical_specs?: Array<{ key: string; value: string }> };
    const dedicatedSpecs = productAny.technical_specs;
    
    if (dedicatedSpecs && Array.isArray(dedicatedSpecs)) {
      specs.push(...dedicatedSpecs);
    }
    
    return specs;
  }, [product]);

  // Variant-level attributes (for the variant selector display)
  const specEntries = selectedVariant 
    ? getAttributeEntries(selectedVariant.attrs)
    : [];
    
  // Combine product-level specs and variant attrs for display
  const allSpecsForDisplay = useMemo(() => {
    const combined: Array<{ label: string; value: string }> = [];
    
    // Add product technical specs
    technicalSpecs.forEach(spec => {
      combined.push({ label: spec.key, value: spec.value });
    });
    
    // Add variant attributes
    specEntries.forEach(([key, value]) => {
      combined.push({ label: formatAttributeLabel(key), value });
    });
    
    return combined;
  }, [technicalSpecs, specEntries]);

  // --- CONDITIONAL RETURNS START HERE (after all hooks) ---
  
  if (isLoading) {
    return (
      <Layout>
        <ProductDetailSkeleton />
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="container-custom py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Produto não encontrado</h1>
          <p className="text-muted-foreground mb-6">O produto que você está procurando não existe.</p>
          <Button asChild className="btn-primary">
            <Link to="/">Voltar para a Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  // --- AFTER CONDITIONAL RETURNS: product is guaranteed to exist ---
  const finalPrice = product.promotional_price ?? (product.base_price + (selectedVariant?.price_modifier || 0));
  const originalPrice = product.promotional_price ? product.base_price : null;
  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(finalPrice);
  const formattedOriginalPrice = originalPrice ? new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(originalPrice) : null;

  // Backorder logic
  const isOutOfStock = selectedVariant && selectedVariant.stock_level <= 0;
  const isBackorder = isOutOfStock && ALLOW_BACKORDER;
  const canPurchase = selectedVariant && (selectedVariant.stock_level > 0 || ALLOW_BACKORDER);

  const productImage = product.image_url || "https://reidasbombasoficial.com.br/og-image.png";
  const productDescription = product.description || `${product.title} - Peças e equipamentos para postos de combustível.`;

  return (
    <Layout>
      <SEO 
        title={product.title}
        description={productDescription}
        image={productImage}
        url={`/produto/${product.slug}`}
        type="product"
        product={{
          price: finalPrice,
          currency: "BRL",
          availability: selectedVariant && selectedVariant.stock_level > 0 ? "in stock" : "out of stock"
        }}
      />
      <BreadcrumbSchema items={breadcrumbItems} />
      <ProductSchema 
        product={product}
        selectedVariant={selectedVariant}
        variants={variants}
        galleryImages={galleryImages}
        rating={reviewsData?.rating}
        reviews={reviewsData?.reviews}
      />

      <div className="container-custom py-4 lg:py-8">
        {/* Breadcrumb with Category Hierarchy */}
        <nav className="mb-4 lg:mb-6 animate-fade-in">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <li>
              <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                <Home className="h-3.5 w-3.5" />
                <span>Início</span>
              </Link>
            </li>
            <ChevronRight className="h-3.5 w-3.5" />
            {categoryBreadcrumb.length > 0 ? (
              categoryBreadcrumb.map((cat, index) => (
                <React.Fragment key={cat.id}>
                  <li>
                    <Link 
                      to={`/categoria/${cat.slug}`} 
                      className="hover:text-primary transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                  <ChevronRight className="h-3.5 w-3.5" />
                </React.Fragment>
              ))
            ) : product.category ? (
              <>
                <li>
                  <Link 
                    to={`/categoria/${product.category.toLowerCase().replace(/\s+/g, '-')}`} 
                    className="hover:text-primary transition-colors"
                  >
                    {product.category}
                  </Link>
                </li>
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            ) : null}
            <li className="text-foreground font-medium truncate max-w-[200px]">
              {product.title}
            </li>
          </ol>
        </nav>

        {/* 3-Column Layout for Desktop, 1-Column for Mobile */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Column 1: Image Gallery (col-span-5) */}
          <div className="lg:col-span-5 animate-fade-in">
            <ProductGallery
              mainImage={product.image_url}
              galleryImages={galleryImages}
              selectedVariant={selectedVariant}
              productTitle={product.title}
              category={product.category}
            />
          </div>

          {/* Column 2: Product Information (col-span-4) */}
          <div className="lg:col-span-4 animate-fade-in-up space-y-4">
            {/* SKU */}
            {selectedVariant && (
              <p className="text-xs text-muted-foreground">
                SKU: <span className="font-mono text-foreground">{selectedVariant.sku}</span>
              </p>
            )}

            {/* Title */}
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground leading-tight">
              {product.title}
            </h1>

            {/* Short Description - limited to 4 lines with ellipsis */}
            {product.description && (
              <div 
                className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none line-clamp-4"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(product.description) }}
              />
            )}

            {/* Benefits - Compact version for info column */}
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center gap-2.5 text-sm">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                <p className="font-medium text-foreground text-sm">Frete Grátis acima de R$ 500</p>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <p className="font-medium text-foreground text-sm">Garantia de Fábrica com NF</p>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <p className="font-medium text-foreground text-sm">Até 12x sem juros no cartão</p>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="pt-4 border-t border-border">
              <label className="block text-sm font-medium text-foreground mb-2">
                Quantidade
              </label>
              <div className="inline-flex items-center border border-border rounded-lg bg-card">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2.5 text-foreground hover:bg-muted transition-colors font-medium"
                >
                  −
                </button>
                <span className="px-5 py-2.5 font-bold text-foreground min-w-[50px] text-center border-x border-border">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2.5 text-foreground hover:bg-muted transition-colors font-medium"
                >
                  +
                </button>
              </div>
            </div>

            {/* Shipping Calculator */}
            <div className="pt-4 border-t border-border">
              <ShippingCalculator productId={product.id} quantity={quantity} />
            </div>
          </div>

          {/* Column 3: Buy Box (col-span-3) */}
          <div className="lg:col-span-3 animate-fade-in-up">
            <Card className="sticky top-24 shadow-lg border-border">
              <CardContent className="p-4 lg:p-5 space-y-4">
                {/* Price */}
                <div className="space-y-1">
                  {formattedOriginalPrice && (
                    <p className="text-sm text-muted-foreground line-through">
                      {formattedOriginalPrice}
                    </p>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl lg:text-3xl font-black text-primary">{formattedPrice}</span>
                    {formattedOriginalPrice && (
                      <Badge variant="destructive" className="text-xs">
                        OFERTA
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ou 12x de{" "}
                    <span className="font-medium text-foreground">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(finalPrice / 12)}
                    </span>{" "}
                    sem juros
                  </p>
                </div>

                {/* Stock Status */}
                {selectedVariant && (
                  <div>
                    {selectedVariant.stock_level > 0 ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        {selectedVariant.stock_level} em estoque
                      </Badge>
                    ) : ALLOW_BACKORDER ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                        Sob encomenda
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Sem estoque</Badge>
                    )}
                  </div>
                )}

                {/* Variant Selector */}
                {variants.length > 1 && (
                  <div className="pt-2 border-t border-border">
                    <VariantSelector
                      variants={variants}
                      selectedVariant={selectedVariant}
                      onSelect={setSelectedVariant}
                    />
                  </div>
                )}

                {/* Backorder Alert */}
                {isBackorder && (
                  <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800 py-2">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
                      Produto <strong>sob encomenda</strong>. Envio em até <strong>7 dias úteis</strong>.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    size="lg"
                    className={`w-full h-12 text-sm font-bold ${isBackorder ? "bg-amber-600 hover:bg-amber-700" : "btn-primary"}`}
                    onClick={handleAddToCart}
                    disabled={!canPurchase || isAddingToCart}
                  >
                    {isBackorder ? (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        {isAddingToCart ? "Adicionando..." : "Encomendar"}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {isAddingToCart ? "Adicionando..." : "Adicionar ao Carrinho"}
                      </>
                    )}
                  </Button>
                  <Button
                    size="lg"
                    className={`w-full h-12 text-sm font-bold ${isBackorder ? "bg-amber-700 hover:bg-amber-800 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`}
                    onClick={handleBuyNow}
                    disabled={!canPurchase || isBuyingNow}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {isBuyingNow ? "Redirecionando..." : (isBackorder ? "Encomendar Agora" : "Comprar Agora")}
                  </Button>
                  
                  {/* Express Checkout */}
                  <ExpressCheckoutButton
                    onAddToCart={() => {
                      if (selectedVariant && data?.product) {
                        addItem(data.product, selectedVariant, quantity);
                      }
                    }}
                    className="w-full"
                  />
                </div>

                {/* Wishlist & Share */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1 h-9 text-xs">
                    <Heart className="h-3.5 w-3.5 mr-1" />
                    Favoritar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-9 text-xs">
                    <Share2 className="h-3.5 w-3.5 mr-1" />
                    Compartilhar
                  </Button>
                </div>

              </CardContent>
            </Card>
          </div>
        </div>

        {/* Full Description & Technical Specs Section (Below the fold) */}
        <div className="mt-10 lg:mt-16 animate-fade-in space-y-10">
          {/* Description Section */}
          <section>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground pb-3 mb-6 border-b-2 border-primary">
              Descrição do Produto
            </h2>
            <div className="max-w-4xl">
              {product.description ? (
                <div 
                  className="prose prose-sm lg:prose-base max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(product.description) }}
                />
              ) : (
                <p className="text-muted-foreground">Nenhuma descrição disponível para este produto.</p>
              )}
            </div>
          </section>

          {/* Technical Specifications Section - CSS Grid Table */}
          <section itemScope itemType="https://schema.org/ProductSpecification">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground pb-3 mb-6 border-b-2 border-primary">
              Especificações Técnicas
            </h2>
            <div className="max-w-3xl">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                {/* SKU/Modelo - Always show */}
                {selectedVariant && (
                  <div className="p-4 border-b border-border">
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Modelo/SKU
                    </dt>
                    <dd className="font-bold font-mono text-foreground" itemProp="sku">
                      {selectedVariant.sku}
                    </dd>
                  </div>
                )}

                {/* Dynamic Specs from product + variant */}
                {allSpecsForDisplay.length > 0 ? (
                  <table className="w-full">
                    <tbody>
                      {allSpecsForDisplay.map((spec, idx) => (
                        <tr key={`${spec.label}-${idx}`} className={idx % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                          <td className="px-4 py-3 text-sm font-medium text-muted-foreground border-r border-border w-1/3">
                            {spec.label}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-foreground" itemProp="value">
                            {spec.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">
                    Especificações detalhadas disponíveis sob consulta.
                  </div>
                )}
              </div>
              
              {/* INMETRO/ANP Compliance Badge */}
              <div className="mt-4 flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-200 text-sm">
                    Equipamento em Conformidade
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Certificado INMETRO • Portarias ANP • Garantia de Fábrica
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Related Products Section */}
        <RelatedProducts 
          currentProductId={product.id} 
          categoryId={product.category_id}
          category={product.category}
        />
      </div>

      {/* Mobile Product Buy Bar */}
      {isMobile && (
        <MobileProductBar
          price={finalPrice}
          originalPrice={originalPrice || undefined}
          onBuyNow={handleBuyNow}
          isBackorder={isBackorder || false}
          isLoading={isBuyingNow}
        />
      )}
    </Layout>
  );
}
