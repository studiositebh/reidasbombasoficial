import React from "react";
import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product" | "article";
  product?: {
    price?: number;
    currency?: string;
    availability?: "in stock" | "out of stock";
  };
}

const DEFAULT_TITLE = "Rei das Bombas Oficial | Bombas de Combustível e Equipamentos";
const DEFAULT_DESCRIPTION = "Líder em bombas de combustível, bicos, mangueiras e automação. Qualidade e conformidade INMETRO para seu posto.";
const DEFAULT_IMAGE = "https://reidasbombasoficial.com.br/og-image.png";
const SITE_URL = "https://reidasbombasoficial.com.br";
const DEFAULT_KEYWORDS = "bombas de combustível, gilbarco, wayne, abastecimento industrial, equipamentos para postos, bicos de abastecimento, mangueiras, filtros, INMETRO";

export function SEO({ 
  title, 
  description = DEFAULT_DESCRIPTION, 
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  product
}: SEOProps) {
  const pageTitle = title ? `${title} | Rei das Bombas Oficial` : DEFAULT_TITLE;
  const pageUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const pageDescription = description.length > 160 
    ? description.substring(0, 157) + "..." 
    : description;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={DEFAULT_KEYWORDS} />
      <link rel="canonical" href={pageUrl} />
      
      {/* Robots */}
      <meta name="robots" content="index, follow, max-image-preview:large" />
      
      {/* Mobile Optimization */}
      <meta name="format-detection" content="telephone=yes" />
      <meta name="theme-color" content="#D4AF37" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Rei das Bombas Oficial" />
      <meta property="og:locale" content="pt_BR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={image} />

      {/* Product specific meta tags */}
      {product && (
        <>
          <meta property="product:price:amount" content={product.price?.toString()} />
          <meta property="product:price:currency" content={product.currency || "BRL"} />
          <meta property="product:availability" content={product.availability || "in stock"} />
        </>
      )}
    </Helmet>
  );
}
