import React from "react";
import { Helmet } from "react-helmet-async";

const SITE_URL = "https://reidasbombasoficial.com.br";

export function StoreSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": ["Store", "WholesaleStore", "LocalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    name: "Rei das Bombas Oficial",
    description: "Especialista em Bombas de Combustível, Dispensers de Abastecimento, Bicos e Automação para Postos de Serviços e Frotas Próprias",
    url: SITE_URL,
    logo: `${SITE_URL}/og-image.png`,
    image: `${SITE_URL}/og-image.png`,
    telephone: "+55 31 9428-8578",
    email: "contato@reidasbombas.com.br",
    keywords: "bombas de combustível, gilbarco, wayne, abastecimento industrial, equipamentos para postos",
    priceRange: "$$",
    currenciesAccepted: "BRL",
    paymentAccepted: "Cartão de Crédito, Boleto, Pix",
    address: {
      "@type": "PostalAddress",
      streetAddress: "R. Arlíndo dos Santos, 123",
      addressLocality: "Belo Horizonte",
      addressRegion: "MG",
      postalCode: "31160-640",
      addressCountry: "BR",
      neighborhood: "Palmares"
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "-19.8697",
      longitude: "-43.9297"
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "17:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday", "Sunday"],
        opens: "00:00",
        closes: "00:00"
      }
    ],
    sameAs: [
      "https://www.instagram.com/reidasbombasoficial/",
      "https://www.facebook.com/ReidasBombasOficial",
      "https://www.reclameaqui.com.br/empresa/rei-das-bombas-tudo-para-posto-ltda/"
    ],
    areaServed: {
      "@type": "Country",
      name: "Brasil"
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Catálogo de Equipamentos para Postos",
      itemListElement: [
        {
          "@type": "OfferCatalog",
          name: "Bombas de Abastecimento",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Product",
                name: "Bombas de Combustível"
              }
            }
          ]
        },
        {
          "@type": "OfferCatalog",
          name: "Equipamentos de Pista",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Product",
                name: "Bicos de Abastecimento"
              }
            }
          ]
        },
        {
          "@type": "OfferCatalog",
          name: "Sistemas de Monitoramento",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Product",
                name: "Medidores e Automação"
              }
            }
          ]
        }
      ]
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
