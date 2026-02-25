import { ProductCard } from "./ProductCard";
import { SkeletonProductGrid } from "./SkeletonCard";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product, Variant } from "@/types/database";

interface ProductWithVariants extends Product {
  variants?: Variant[];
}

interface ProductGridProps {
  products: ProductWithVariants[];
  variants?: Record<string, Variant[]>;
  isLoading?: boolean;
  title?: string;
  titleId?: string;
  seeAllLink?: string;
  showDiscount?: boolean;
}

export function ProductGrid({ 
  products, 
  variants = {}, 
  isLoading, 
  title,
  titleId,
  seeAllLink,
  showDiscount 
}: ProductGridProps) {
  if (isLoading) {
    return (
      <section className="py-8">
        <div className="container-custom">
          {title && (
            <div className="flex items-center justify-between mb-6">
              <h2 id={titleId} className="text-xl md:text-2xl font-black text-foreground">{title}</h2>
            </div>
          )}
          <SkeletonProductGrid count={8} />
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="py-8">
        <div className="container-custom">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum produto encontrado.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="container-custom">
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 id={titleId} className="text-xl md:text-2xl font-black text-foreground">
              <span className="text-primary" aria-hidden="true">|</span> {title}
            </h2>
            {seeAllLink && (
              <Link 
                to={seeAllLink}
                className="text-sm text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                Ver todos <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {products.map((product, index) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              variants={product.variants || variants[product.id]} 
              showDiscount={showDiscount}
              priority={index < 2} // First 2 products get priority loading for LCP
            />
          ))}
        </div>
      </div>
    </section>
  );
}
