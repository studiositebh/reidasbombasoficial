import React from "react";
import { Helmet } from "react-helmet-async";
import type { Product, Variant } from "@/types/database";
import type { ProductRating, ProductReview } from "@/hooks/useProductReviews";

const SITE_URL = "https://reidasbombas.lovable.app";

interface ProductSchemaProps {
  product: Product;
  selectedVariant: Variant | null;
  variants: Variant[];
  galleryImages?: Array<{ image_url: string; alt_text?: string | null }>;
  rating?: ProductRating;
  reviews?: ProductReview[];
}

/**
 * ProductSchema - Generates complete JSON-LD Product schema for SEO
 * Includes offers (price, availability, seller) and aggregateRating for rich results
 */
export function ProductSchema({ product, selectedVariant, variants, galleryImages, rating, reviews }: ProductSchemaProps) {
  const finalPrice = product.promotional_price ?? (product.base_price + (selectedVariant?.price_modifier || 0));
  const originalPrice = product.promotional_price ? product.base_price : null;
  
  // Determine availability based on all variants
  const totalStock = variants.reduce((sum, v) => sum + (v.stock_level || 0), 0);
  const hasStock = selectedVariant ? selectedVariant.stock_level > 0 : totalStock > 0;
  
  // Get all product images
  const images: string[] = [];
  if (product.image_url) images.push(product.image_url);
  if (galleryImages) {
    galleryImages.forEach(img => {
      if (img.image_url && !images.includes(img.image_url)) {
        images.push(img.image_url);
      }
    });
  }
  // Add variant image if exists
  if (selectedVariant?.image_url && !images.includes(selectedVariant.image_url)) {
    images.push(selectedVariant.image_url);
  }
  
  // Use default image if none available
  if (images.length === 0) {
    images.push(`${SITE_URL}/og-image.png`);
  }
  
  // Generate product description (strip HTML tags)
  const plainDescription = product.description 
    ? product.description.replace(/<[^>]*>/g, '').substring(0, 500)
    : `${product.title} - Peças e equipamentos para postos de combustível. Rei das Bombas.`;

  // Build offers array for all variants or single offer
  const offers = variants.length > 1 
    ? variants.map(variant => ({
        "@type": "Offer",
        "url": `${SITE_URL}/produto/${product.slug}`,
        "priceCurrency": "BRL",
        "price": variant.price ?? (product.promotional_price ?? product.base_price + (variant.price_modifier || 0)),
        "priceValidUntil": product.promotion_expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        "availability": variant.stock_level > 0 
          ? "https://schema.org/InStock" 
          : "https://schema.org/PreOrder",
        "itemCondition": "https://schema.org/NewCondition",
        "sku": variant.sku,
        "seller": {
          "@type": "Organization",
          "name": "Rei das Bombas"
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "BR"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 1,
              "maxValue": 3,
              "unitCode": "d"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": 3,
              "maxValue": 15,
              "unitCode": "d"
            }
          }
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "BR",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
          "merchantReturnDays": 7,
          "returnMethod": "https://schema.org/ReturnByMail",
          "returnFees": "https://schema.org/FreeReturn"
        }
      }))
    : [{
        "@type": "Offer",
        "url": `${SITE_URL}/produto/${product.slug}`,
        "priceCurrency": "BRL",
        "price": finalPrice,
        "priceValidUntil": product.promotion_expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        "availability": hasStock 
          ? "https://schema.org/InStock" 
          : "https://schema.org/PreOrder",
        "itemCondition": "https://schema.org/NewCondition",
        "sku": selectedVariant?.sku || product.slug,
        "seller": {
          "@type": "Organization",
          "name": "Rei das Bombas"
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "BR"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 1,
              "maxValue": 3,
              "unitCode": "d"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": 3,
              "maxValue": 15,
              "unitCode": "d"
            }
          }
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "BR",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
          "merchantReturnDays": 7,
          "returnMethod": "https://schema.org/ReturnByMail",
          "returnFees": "https://schema.org/FreeReturn"
        }
      }];

  // Build the complete Product schema
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_URL}/produto/${product.slug}#product`,
    "name": product.title,
    "description": plainDescription,
    "url": `${SITE_URL}/produto/${product.slug}`,
    "image": images,
    "sku": selectedVariant?.sku || product.slug,
    "mpn": selectedVariant?.ean_gtin || selectedVariant?.sku || undefined,
    "gtin": selectedVariant?.ean_gtin || undefined,
    "brand": {
      "@type": "Brand",
      "name": "Rei das Bombas"
    },
    "manufacturer": {
      "@type": "Organization",
      "name": "Rei das Bombas",
      "url": SITE_URL
    },
    "category": product.category || "Equipamentos para Postos",
    // AggregateRating - real data from database (only include if reviews exist)
    ...(rating && rating.reviewCount > 0 ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": rating.averageRating.toFixed(1),
        "reviewCount": rating.reviewCount.toString(),
        "bestRating": "5",
        "worstRating": "1"
      }
    } : {}),
    // Real reviews from database (only include if reviews exist)
    ...(reviews && reviews.length > 0 ? {
      "review": reviews.slice(0, 5).map(review => ({
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": review.rating.toString(),
          "bestRating": "5"
        },
        "author": {
          "@type": "Person",
          "name": review.reviewer_name || "Cliente Verificado"
        },
        "reviewBody": review.content || review.title || "Avaliação positiva",
        "datePublished": review.created_at.split("T")[0]
      }))
    } : {}),
    // Offers
    "offers": variants.length > 1 
      ? {
          "@type": "AggregateOffer",
          "lowPrice": Math.min(...variants.map(v => v.price ?? (product.base_price + (v.price_modifier || 0)))),
          "highPrice": Math.max(...variants.map(v => v.price ?? (product.base_price + (v.price_modifier || 0)))),
          "priceCurrency": "BRL",
          "offerCount": variants.length,
          "offers": offers
        }
      : offers[0],
    // Additional properties for B2B industrial products
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "Garantia",
        "value": "Garantia de Fábrica"
      },
      {
        "@type": "PropertyValue",
        "name": "Certificação",
        "value": "INMETRO / ANP"
      }
    ]
  };

  // Remove undefined fields
  const cleanSchema = JSON.parse(JSON.stringify(schema));

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(cleanSchema)}
      </script>
    </Helmet>
  );
}
