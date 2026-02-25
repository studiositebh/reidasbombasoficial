import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number | null;
  product_count?: number;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories-with-products"],
    queryFn: async () => {
      // Fetch categories with product count using RPC or manual join
      const { data: categories, error: catError } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (catError) throw catError;

      // Fetch product counts per category
      const { data: productCounts, error: countError } = await supabase
        .from("products")
        .select("category_id")
        .eq("is_active", true);

      if (countError) throw countError;

      // Count products per category
      const countMap = new Map<string, number>();
      productCounts?.forEach((p) => {
        if (p.category_id) {
          countMap.set(p.category_id, (countMap.get(p.category_id) || 0) + 1);
        }
      });

      // Filter categories that have products and add count
      const categoriesWithProducts = categories
        ?.filter((cat) => countMap.has(cat.id))
        .map((cat) => ({
          ...cat,
          product_count: countMap.get(cat.id) || 0,
        })) as Category[];

      return categoriesWithProducts;
    },
  });
}
