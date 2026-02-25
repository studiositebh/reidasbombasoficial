import { useMemo } from "react";
import { useCategories, Category } from "./useCategories";

export interface CategoryBreadcrumbItem {
  id: string;
  name: string;
  slug: string;
}

/**
 * Build a breadcrumb path from a category up to its root parent
 * Example: ["Bombas", "Bicos de Combustível"]
 */
export function useCategoryBreadcrumb(categoryId: string | null | undefined) {
  const { data: categories, isLoading } = useCategories();

  const breadcrumb = useMemo(() => {
    if (!categoryId || !categories || categories.length === 0) {
      return [];
    }

    const categoryMap = new Map<string, Category>();
    categories.forEach((cat) => categoryMap.set(cat.id, cat));

    const path: CategoryBreadcrumbItem[] = [];
    let currentId: string | null = categoryId;

    // Traverse up the tree (max 10 levels to prevent infinite loops)
    let safety = 0;
    while (currentId && safety < 10) {
      const cat = categoryMap.get(currentId);
      if (!cat) break;

      path.unshift({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
      });

      currentId = cat.parent_id;
      safety++;
    }

    return path;
  }, [categoryId, categories]);

  return { breadcrumb, isLoading };
}
