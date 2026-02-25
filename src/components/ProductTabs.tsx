import { useState } from "react";
import { ProductCard } from "./ProductCard";
import { SkeletonCard } from "./SkeletonCard";
import type { Product, Variant } from "@/types/database";

interface ProductTabsProps {
  products: Product[];
  variants: Record<string, Variant[]>;
  isLoading?: boolean;
}

const tabs = [
  { id: "destaques", label: "Destaques" },
  { id: "vendidos", label: "Mais Vendidos" },
  { id: "ofertas", label: "Ofertas Relâmpago" },
];

export function ProductTabs({ products, variants, isLoading }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState("destaques");

  // Simulate different product lists for each tab
  const getProductsForTab = () => {
    switch (activeTab) {
      case "vendidos":
        return [...products].reverse();
      case "ofertas":
        return products.slice(0, Math.min(products.length, 5));
      default:
        return products;
    }
  };

  const displayProducts = getProductsForTab();
  const showDiscount = activeTab === "ofertas";

  return (
    <section className="py-8">
      <div className="container-custom">
        {/* Tabs Header */}
        <div className="flex items-center justify-between mb-6 border-b border-border">
          <div className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <a 
            href="/produtos" 
            className="text-xs font-semibold text-primary hover:underline hidden md:block"
          >
            Ver Todos →
          </a>
        </div>

        {/* Products Grid - 5 columns on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            displayProducts.slice(0, 10).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                variants={variants[product.id] || []}
                showDiscount={showDiscount}
              />
            ))
          )}
        </div>

        {/* Mobile View All */}
        <a 
          href="/produtos" 
          className="mt-4 flex md:hidden items-center justify-center text-sm font-semibold text-primary hover:underline"
        >
          Ver Todos os Produtos →
        </a>
      </div>
    </section>
  );
}
