import React from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { StoreSchema } from "@/components/StoreSchema";
import { HeroBanner } from "@/components/HeroBanner";
import { QuickCategories } from "@/components/QuickCategories";
import { TrustBar } from "@/components/TrustBar";
import { ProductGrid } from "@/components/ProductGrid";
import { FlashSalesSection } from "@/components/FlashSalesSection";
import { CertificationBanner } from "@/components/CertificationBanner";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";
import { SuccessCasesSection } from "@/components/SuccessCasesSection";
import { useProducts } from "@/hooks/useProducts";
import { Phone, MessageCircle } from "lucide-react";
import type { Variant } from "@/types/database";
import { useStoreSettings, getWhatsAppUrl } from "@/hooks/useStoreSettings";
import { WHATSAPP_MESSAGES, STORE_DEFAULTS } from "@/lib/constants";

const Index = () => {
  const { data: productsWithVariants, isLoading, error } = useProducts();
  const { data: settings } = useStoreSettings();
  
  const whatsappUrl = getWhatsAppUrl(settings?.whatsappUrl || "", WHATSAPP_MESSAGES.default);

  // Use fetched data or empty array
  const products = productsWithVariants || [];
  
  const variants: Record<string, Variant[]> = {};
  products.forEach((p) => {
    if (p.variants) {
      variants[p.id] = p.variants;
    }
  });

  // Split products for different sections
  const featuredProducts = products.slice(0, 10);
  const bestSellers = [...products].reverse().slice(0, 10);
  const saleProducts = products.slice(10, 20);

  return (
    <Layout>
      <SEO />
      <StoreSchema />

      {/* Hero Banner */}
      <HeroBanner />

      {/* Quick Categories Icons */}
      <QuickCategories />

      {/* Trust Bar */}
      <TrustBar />

      {/* Flash Sales - Top 5 Discounts */}
      <FlashSalesSection products={products} isLoading={isLoading} />


      {/* Gold Divider */}
      <div className="gold-divider" aria-hidden="true" />

      {/* Error Banner */}
      {error && (
        <div className="container-custom py-4">
          <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg text-center text-sm" role="alert">
            ⚠️ Usando dados de demonstração.{" "}
            <a href="/admin-setup" className="underline font-semibold text-primary">
              Configurar banco de dados →
            </a>
          </div>
        </div>
      )}

      {/* SECTION: Bombas de Abastecimento */}
      <section aria-labelledby="bombas-heading">
        <ProductGrid
          title="Bombas de Abastecimento"
          titleId="bombas-heading"
          products={featuredProducts}
          variants={variants}
          isLoading={isLoading}
          seeAllLink="/categoria/acessorios-para-bomba"
        />
      </section>

      {/* Gold Divider */}
      <div className="gold-divider" aria-hidden="true" />

      {/* SECTION: Equipamentos de Pista */}
      <section aria-labelledby="equipamentos-heading">
        <ProductGrid
          title="Equipamentos de Pista"
          titleId="equipamentos-heading"
          products={bestSellers}
          variants={variants}
          isLoading={isLoading}
          seeAllLink="/categoria/bico-abastecimento"
        />
      </section>

      {/* Gold Divider */}
      <div className="gold-divider" aria-hidden="true" />

      {/* SECTION: Sistemas de Monitoramento */}
      <section aria-labelledby="sistemas-heading">
        <ProductGrid
          title="Sistemas de Monitoramento"
          titleId="sistemas-heading"
          products={saleProducts}
          variants={variants}
          isLoading={isLoading}
          showDiscount={true}
          seeAllLink="/promocoes"
        />
      </section>

      {/* Success Cases - B2B Authority */}
      <SuccessCasesSection />

      {/* Certification Banner - E-E-A-T Trust Signal */}
      <CertificationBanner />

      {/* CTA Section - Solicitar Orçamento */}
      <section className="py-12 bg-gray-50" aria-labelledby="cta-heading">
        <div className="container-custom">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 id="cta-heading" className="text-2xl md:text-3xl font-black text-gray-900">
                  Precisa de <span className="text-primary">Orçamento</span>?
                </h2>
                <p className="mt-3 text-gray-600">
                  Nossa equipe técnica está pronta para ajudar você a encontrar as peças certas para sua operação.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 md:justify-end">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-4 bg-green-600 text-white font-bold hover:bg-green-700 transition-all rounded-lg text-base shadow-md active:scale-95"
                  aria-label="Solicitar orçamento via WhatsApp"
                >
                  <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />
                  WhatsApp
                </a>
                <a
                  href={`tel:+55${settings?.whatsappRaw || STORE_DEFAULTS.whatsappRaw}`}
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-colors rounded-lg text-base active:scale-95"
                  aria-label="Ligar para solicitar orçamento"
                >
                  <Phone className="mr-2 h-5 w-5" aria-hidden="true" />
                  Ligar Agora
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp CTA */}
      <WhatsAppFloatingButton />
    </Layout>
  );
};

export default Index;
