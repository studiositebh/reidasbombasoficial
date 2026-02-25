import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import bannerImage from "@/assets/banner-hero.webp";
import { Button } from "@/components/ui/button";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const banners = [
  {
    id: 1,
    title: "Ofertas em Filtros",
    subtitle: "Até 30% OFF em Filtros Prensa",
    cta: "Ver Ofertas",
    link: "/promocoes",
  },
  {
    id: 2,
    title: "Bicos de Abastecimento",
    subtitle: "Linha completa com garantia de fábrica",
    cta: "Conferir",
    link: "/categoria/bicos",
  },
  {
    id: 3,
    title: "Mangueiras Premium",
    subtitle: "Resistência máxima para sua operação",
    cta: "Ver Mais",
    link: "/categoria/mangueiras",
  },
];

export function HeroBanner() {
  const [currentBanner, setCurrentBanner] = useState(0);
  const { data: settings } = useStoreSettings();

  const nextBanner = () => setCurrentBanner((prev) => (prev + 1) % banners.length);
  const prevBanner = () => setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);

  const banner = banners[currentBanner];

  return (
    <section className="relative hero-priority" aria-label="Banner principal de promoções">
      {/* Banner with Background Image - LCP Priority */}
      <div className="relative min-h-[500px] md:min-h-[550px] overflow-hidden">
        {/* Hero Image with explicit dimensions and priority loading */}
        <img
          src={bannerImage}
          alt="Banner Rei das Bombas - Equipamentos para Postos de Combustível"
          width={1920}
          height={550}
          fetchPriority="high"
          decoding="sync"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ contentVisibility: "auto" }}
        />

        <div className="container-custom relative z-10 py-12 md:py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            {/* Banner Content - Centered */}
            <div className="space-y-4 animate-fade-in text-center max-w-2xl" key={banner.id}>
              <p className="text-primary font-bold text-sm uppercase tracking-wider">
                {banner.subtitle.includes("em Filtros") ? (
                  <>
                    {banner.subtitle.split("em Filtros")[0]}
                    <span className="text-white">em Filtros</span>
                    {banner.subtitle.split("em Filtros")[1]}
                  </>
                ) : (
                  banner.subtitle
                )}
              </p>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight">
                {banner.title.split(" ").map((word, i) => (
                  <span key={i} className={i === 0 ? "text-gold-gradient" : "text-white"}>
                    {word}{" "}
                  </span>
                ))}
              </h1>
              <p className="text-white text-lg max-w-md mx-auto">
                Peças de alta performance para postos de combustível. Envio imediato com Nota Fiscal.
              </p>
              <div className="flex flex-wrap gap-4 pt-4 justify-center">
                <Button asChild className="btn-primary h-12 px-8 text-base">
                  <a href={banner.link}>{banner.cta}</a>
                </Button>
                <Button asChild variant="outline" className="btn-outline-gold h-12 px-8 text-base">
                  <a href={settings?.whatsappUrl || "https://wa.me/553194288578"} target="_blank" rel="noopener noreferrer">
                    Falar com Especialista
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows with aria-labels */}
        <button
          onClick={prevBanner}
          aria-label="Ver banner anterior"
          className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 border border-primary/30 hover:bg-primary/20 flex items-center justify-center transition-all"
        >
          <ChevronLeft className="h-6 w-6 text-primary" aria-hidden="true" />
        </button>
        <button
          onClick={nextBanner}
          aria-label="Ver próximo banner"
          className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 border border-primary/30 hover:bg-primary/20 flex items-center justify-center transition-all"
        >
          <ChevronRight className="h-6 w-6 text-primary" aria-hidden="true" />
        </button>

        {/* Dots with aria-labels */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" role="tablist" aria-label="Navegação do banner">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentBanner(idx)}
              role="tab"
              aria-selected={idx === currentBanner}
              aria-label={`Ir para banner ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${
                idx === currentBanner ? "w-8 bg-primary" : "w-2 bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
