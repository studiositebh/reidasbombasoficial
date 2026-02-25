import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "./ui/skeleton";
import type { Product, Variant } from "@/types/database";

interface RelatedProductsProps {
  currentProductId: string;
  categoryId?: string | null;
  category?: string | null;
}

interface ProductWithVariants extends Product {
  variants?: Variant[];
}

export function RelatedProducts({ currentProductId, categoryId, category }: RelatedProductsProps) {
  const { data: products, isLoading } = useQuery({
    queryKey: ["related-products", currentProductId, categoryId, category],
    queryFn: async (): Promise<ProductWithVariants[]> => {
      // Build query for related products
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .neq("id", currentProductId)
        .limit(8);

      // Try to match by category_id first, then by category text
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      } else if (category) {
        query = query.eq("category", category);
      }

      const { data: productsData, error } = await query;

      if (error) {
        console.warn("Related products error:", error.message);
        return [];
      }

      // If we don't have enough products from the same category, fetch random ones
      let finalProducts = productsData || [];
      
      if (finalProducts.length < 4) {
        const existingIds = [currentProductId, ...finalProducts.map(p => p.id)];
        const { data: moreProducts } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .not("id", "in", `(${existingIds.join(",")})`)
          .limit(8 - finalProducts.length);
        
        if (moreProducts) {
          finalProducts = [...finalProducts, ...moreProducts];
        }
      }

      if (finalProducts.length === 0) {
        return [];
      }

      // Fetch variants for these products
      const productIds = finalProducts.map((p) => p.id);
      const { data: variantsData } = await supabase
        .from("variants")
        .select("*")
        .in("product_id", productIds)
        .eq("is_active", true);

      // Group variants by product_id
      const variantsByProduct: Record<string, Variant[]> = {};
      (variantsData || []).forEach((v) => {
        if (!variantsByProduct[v.product_id]) {
          variantsByProduct[v.product_id] = [];
        }
        variantsByProduct[v.product_id].push(v as Variant);
      });

      return finalProducts.map((p) => ({
        ...p,
        variants: variantsByProduct[p.id] || [],
      })) as ProductWithVariants[];
    },
    enabled: !!currentProductId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Don't render if no products
  if (!isLoading && (!products || products.length === 0)) {
    return null;
  }

  // Build variants map for ProductCard
  const variants: Record<string, Variant[]> = {};
  (products || []).forEach((p) => {
    if (p.variants) {
      variants[p.id] = p.variants;
    }
  });

  return (
    <section className="py-8 border-t border-border">
      <div className="container-custom">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">
          Clientes Também Compraram
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products?.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                variants={variants[product.id]}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
