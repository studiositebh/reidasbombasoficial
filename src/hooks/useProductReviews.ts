import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  content: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  reviewer_name: string | null;
  created_at: string;
}

export interface ProductRating {
  averageRating: number;
  reviewCount: number;
  ratingDistribution: Record<string, number>;
}

export interface ReviewsWithRating {
  reviews: ProductReview[];
  rating: ProductRating;
}

/**
 * Hook to fetch product reviews and aggregate rating
 */
export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async (): Promise<ReviewsWithRating> => {
      if (!productId) {
        return {
          reviews: [],
          rating: { averageRating: 0, reviewCount: 0, ratingDistribution: {} },
        };
      }

      // Fetch reviews and rating in parallel
      const [reviewsResult, ratingResult] = await Promise.all([
        supabase
          .from("product_reviews")
          .select("*")
          .eq("product_id", productId)
          .eq("is_approved", true)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.rpc("get_product_rating", { p_product_id: productId }),
      ]);

      if (reviewsResult.error) {
        console.warn("Reviews fetch error:", reviewsResult.error.message);
      }

      if (ratingResult.error) {
        console.warn("Rating fetch error:", ratingResult.error.message);
      }

      const ratingData = ratingResult.data?.[0] || {
        average_rating: 0,
        review_count: 0,
        rating_distribution: {},
      };

      return {
        reviews: (reviewsResult.data || []) as ProductReview[],
        rating: {
          averageRating: Number(ratingData.average_rating) || 0,
          reviewCount: Number(ratingData.review_count) || 0,
          ratingDistribution: (ratingData.rating_distribution as Record<string, number>) || {},
        },
      };
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
