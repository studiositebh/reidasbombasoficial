import React, { useState, useMemo } from "react";
import type { Product, Variant } from "@/types/database";

interface ProductWithVariants extends Product {
  variants?: Variant[];
}

export function useSearch(products: ProductWithVariants[], categoryFilter?: string) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const searchTerm = query.toLowerCase().trim();

    // First, filter by category if provided
    let filtered = products;
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter((product) => {
        // Match by category_id (UUID) or category slug/name
        if (product.category_id === categoryFilter) return true;
        if (product.category?.toLowerCase() === categoryFilter.toLowerCase()) return true;
        return false;
      });
    }

    // If no search term, return empty (only show results when searching)
    if (!searchTerm) {
      return [];
    }

    return filtered.filter((product) => {
      // Search in title
      if (product.title.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Search in description
      if (product.description?.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Search in category
      if (product.category?.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Search in metadata
      if (product.metadata) {
        const metadataStr = JSON.stringify(product.metadata).toLowerCase();
        if (metadataStr.includes(searchTerm)) {
          return true;
        }
      }

      // Search in variants attrs (e.g., "3/4", "vermelho", "5 metros")
      if (product.variants) {
        for (const variant of product.variants) {
          // Search in SKU
          if (variant.sku.toLowerCase().includes(searchTerm)) {
            return true;
          }

          // Search in attrs JSONB
          const attrsStr = JSON.stringify(variant.attrs).toLowerCase();
          if (attrsStr.includes(searchTerm)) {
            return true;
          }
        }
      }

      return false;
    });
  }, [products, query, categoryFilter]);

  return {
    query,
    setQuery,
    results,
  };
}
