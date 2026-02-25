import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product, Variant } from "@/types/database";

// Flag to use mock data when tables don't exist
const USE_MOCK_ON_ERROR = true;

export interface ProductWithVariants extends Product {
  variants?: Variant[];
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async (): Promise<ProductWithVariants[]> => {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (productsError) {
        console.warn("Products table error:", productsError.message);
        if (USE_MOCK_ON_ERROR) {
          return [];
        }
        throw productsError;
      }

      if (!productsData || productsData.length === 0) {
        return [];
      }

      // Fetch all variants for these products
      const productIds = productsData.map((p) => p.id);
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

      // Map database columns to our interface with variants
      return productsData.map((p) => ({
        ...p,
        variants: variantsByProduct[p.id] || [],
      })) as ProductWithVariants[];
    },
  });
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number | null;
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async (): Promise<{ product: Product; variants: Variant[]; galleryImages: ProductImage[] } | null> => {
      // Fetch product by slug
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (productError) {
        console.warn("Product fetch error:", productError.message);
        if (USE_MOCK_ON_ERROR) {
          return null;
        }
        throw productError;
      }

      if (!productData) {
        return null;
      }

      // Fetch variants and gallery images in parallel
      const [variantsResult, imagesResult] = await Promise.all([
        supabase
          .from("variants")
          .select("*")
          .eq("product_id", productData.id)
          .eq("is_active", true),
        supabase
          .from("product_images")
          .select("*")
          .eq("product_id", productData.id)
          .order("sort_order", { ascending: true }),
      ]);

      if (variantsResult.error) {
        console.warn("Variants fetch error:", variantsResult.error.message);
      }

      if (imagesResult.error) {
        console.warn("Product images fetch error:", imagesResult.error.message);
      }

      return {
        product: productData as Product,
        variants: (variantsResult.data || []) as Variant[],
        galleryImages: (imagesResult.data || []) as ProductImage[],
      };
    },
    enabled: !!slug,
  });
}

export function useDecrementStock() {
  return async (variantId: string, quantity: number) => {
    const { data, error } = await supabase.rpc("decrement_stock", {
      p_variant_id: variantId,
      p_quantity: quantity,
    });

    if (error) {
      console.error("Decrement stock error:", error);
      throw error;
    }

    return data as {
      success: boolean;
      error?: string;
      new_stock?: number;
      available?: number;
    };
  };
}
