import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Zap, ArrowRight, Flame } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import type { Product, Variant } from "@/types/database";

interface ProductWithVariants extends Product {
  variants?: Variant[];
}

interface FlashSalesSectionProps {
  products: ProductWithVariants[];
  isLoading?: boolean;
}

export function FlashSalesSection({ products, isLoading }: FlashSalesSectionProps) {
  // Get top 5 products with highest discount percentage that haven't expired
  const flashSaleProducts = useMemo(() => {
    const now = new Date();
    return products
      .filter((p) => {
        if (p.promotional_price === null || p.promotional_price >= p.base_price) return false;
        // Check if promotion has expired
        if (p.promotion_expires_at && new Date(p.promotion_expires_at) < now) return false;
        return true;
      })
      .map((p) => ({
        ...p,
        discountPercent: Math.round(
          ((p.base_price - (p.promotional_price || p.base_price)) / p.base_price) * 100
        ),
      }))
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, 5);
  }, [products]);

  // Find the nearest expiration date among flash sale products
  const nearestExpiration = useMemo(() => {
    const expirations = flashSaleProducts
      .filter((p) => p.promotion_expires_at)
      .map((p) => new Date(p.promotion_expires_at!))
      .filter((d) => d > new Date())
      .sort((a, b) => a.getTime() - b.getTime());
    return expirations.length > 0 ? expirations[0] : null;
  }, [flashSaleProducts]);

  if (isLoading) {
    return (
      <section className="py-10 bg-gradient-to-r from-sale to-orange-500">
        <div className="container-custom">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Zap className="h-8 w-8 text-white animate-pulse" />
            <h2 className="text-2xl md:text-3xl font-black text-white">
              Promoções Relâmpago
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (flashSaleProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-10 bg-gradient-to-r from-sale to-orange-500 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-4 left-[10%] animate-pulse">
          <Flame className="h-6 w-6 text-yellow-300/30" />
        </div>
        <div className="absolute top-8 right-[15%] animate-pulse delay-100">
          <Zap className="h-8 w-8 text-yellow-300/20" />
        </div>
        <div className="absolute bottom-6 left-[20%] animate-pulse delay-200">
          <Flame className="h-5 w-5 text-yellow-300/25" />
        </div>
        <div className="absolute bottom-4 right-[25%] animate-pulse delay-300">
          <Zap className="h-6 w-6 text-yellow-300/30" />
        </div>
      </div>

      <div className="container-custom relative z-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full animate-pulse">
              <Zap className="h-7 w-7 md:h-8 md:w-8 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Promoções Relâmpago
              </h2>
              <p className="text-white/80 text-sm md:text-base">
                Os maiores descontos da loja!
              </p>
            </div>
          </div>

          {/* Countdown Timer - uses nearest expiration or defaults to midnight */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <CountdownTimer 
              targetDate={nearestExpiration || undefined} 
              variant="light" 
            />
            <Link
              to="/promocoes"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-sale font-bold rounded-full hover:bg-yellow-50 transition-all shadow-lg hover-scale"
            >
              Ver Todas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {flashSaleProducts.map((product) => (
            <div key={product.id} className="relative">
              {/* Extra discount badge - improved contrast */}
              <div className="absolute -top-2 -left-2 z-20 bg-yellow-400 text-gray-900 text-xs font-black px-2.5 py-1.5 rounded-full shadow-lg">
                -{product.discountPercent}%
              </div>
              <ProductCard
                product={product}
                variants={product.variants}
                showDiscount={true}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
