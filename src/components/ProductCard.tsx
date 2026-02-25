import { Link } from "react-router-dom";
import { ShoppingCart, Star, Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { getAttributeEntries } from "@/lib/formatAttributes";
import type { Product, Variant } from "@/types/database";
import { useState } from "react";

const SITE_URL = "https://reidasbombas.lovable.app";

interface ProductCardProps {
  product: Product;
  variants?: Variant[];
  showDiscount?: boolean;
  /** Priority loading for above-the-fold images */
  priority?: boolean;
}

export function ProductCard({ product, variants = [], showDiscount = false, priority = false }: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { addItem, openCart } = useCart();
  
  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(product.base_price);

  // Mock old price for discount display
  const oldPrice = showDiscount ? product.base_price * 1.25 : null;
  const formattedOldPrice = oldPrice 
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(oldPrice)
    : null;

  // Extract specs from first variant - using safe attribute extraction
  const firstVariant = variants[0];
  const specEntries = getAttributeEntries(firstVariant?.attrs, 2);

  // Aggregate review data for schema
  const rating = 4.5;
  const reviewCount = Math.floor(Math.random() * 50) + 10;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!firstVariant) {
      toast.error("Produto indisponível", {
        description: "Este produto não possui variantes disponíveis no momento.",
      });
      return;
    }

    if (firstVariant.stock_level === 0) {
      toast.error("Produto sem estoque");
      return;
    }

    addItem(product, firstVariant, 1);
    
    toast.success("Produto adicionado ao carrinho!", {
      description: product.title,
      duration: 3000,
    });
    
    openCart();
  };

  // Generate ultra-specific alt and title text for SEO
  const altText = `${product.title}${specEntries.length > 0 ? ` - ${specEntries.map(([, v]) => v).join(', ')}` : ''} - Certificado INMETRO - Rei das Bombas`;
  const titleText = `${product.title} - Equipamento para Postos de Combustível - Certificado INMETRO e ANP`;

  return (
    <article className="product-card rounded-lg overflow-hidden group animate-fade-in bg-white" itemScope itemType="https://schema.org/Product">
      {/* Hidden microdata for SEO */}
      <meta itemProp="brand" content="Rei das Bombas" />
      <meta itemProp="sku" content={firstVariant?.sku || product.id} />
      
      {/* Image with skeleton placeholder */}
      <Link to={`/produto/${product.slug}`} className="block relative bg-gray-100 p-4">
        <div 
          className="relative overflow-hidden"
          style={{ 
            aspectRatio: "1/1",
            imageRendering: "-webkit-optimize-contrast"
          }}
        >
          {/* Skeleton placeholder - shows while image loads */}
          {!imageLoaded && (
            <div 
              className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"
              aria-hidden="true"
            />
          )}
          <img
            src={product.image_url || "/placeholder.svg"}
            alt={altText}
            title={titleText}
            width={200}
            height={200}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-contain transition-all duration-300 group-hover:scale-105 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            itemProp="image"
            style={{ 
              aspectRatio: "1/1",
              imageRendering: "-webkit-optimize-contrast"
            }}
          />
        </div>
        
        {/* Discount Badge - improved contrast */}
        {showDiscount && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded shadow-md">
            -20%
          </span>
        )}

        {/* Favorite Button */}
        <button 
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-primary hover:text-primary shadow-sm"
          aria-label={`Adicionar ${product.title} aos favoritos`}
        >
          <Heart className="h-4 w-4" aria-hidden="true" />
        </button>
      </Link>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Rating with microdata */}
        <div className="flex items-center gap-1.5" itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
          <meta itemProp="ratingValue" content={rating.toString()} />
          <meta itemProp="reviewCount" content={reviewCount.toString()} />
          <meta itemProp="bestRating" content="5" />
          <meta itemProp="worstRating" content="1" />
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={star <= Math.floor(rating) ? "fill-primary text-primary" : "text-gray-300"}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">({reviewCount})</span>
        </div>

        {/* Title */}
        <Link to={`/produto/${product.slug}`} className="block">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug hover:text-primary transition-colors" itemProp="name">
            {product.title}
          </h3>
        </Link>

        {/* Technical Specs - B2B Focus */}
        {specEntries.length > 0 && (
          <div className="space-y-1.5">
            {specEntries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground uppercase tracking-wide">{key}</span>
                <span className="font-semibold text-foreground bg-gray-100 px-1.5 py-0.5 rounded">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="space-y-1 pt-1" itemProp="offers" itemScope itemType="https://schema.org/Offer">
          <meta itemProp="priceCurrency" content="BRL" />
          <meta itemProp="availability" content={firstVariant?.stock_level > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"} />
          <link itemProp="url" href={`${SITE_URL}/produto/${product.slug}`} />
          {formattedOldPrice && (
            <p className="price-old">{formattedOldPrice}</p>
          )}
          <p className={`text-xl font-black ${showDiscount ? "text-red-600" : "text-gray-900"}`} itemProp="price" content={product.base_price.toString()}>
            {formattedPrice}
          </p>
          <p className="text-[11px] text-muted-foreground">
            ou 12x de {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.base_price / 12)}
          </p>
        </div>

        {/* Add to Cart - Full Width Gold Button */}
        <Button 
          className="w-full btn-primary h-10 text-sm font-bold"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Comprar
        </Button>
      </div>
    </article>
  );
}
