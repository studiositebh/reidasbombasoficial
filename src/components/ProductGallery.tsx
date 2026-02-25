import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Variant } from "@/types/database";

interface ProductImage {
  id: string;
  image_url: string;
  alt_text?: string | null;
  sort_order?: number;
}

interface ProductGalleryProps {
  mainImage: string | null;
  galleryImages: ProductImage[];
  selectedVariant: Variant | null;
  productTitle: string;
  category?: string | null;
}

export function ProductGallery({
  mainImage,
  galleryImages,
  selectedVariant,
  productTitle,
  category,
}: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const thumbsContainerRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Build the complete image list:
  // 1. Variant image (if available) - always first when variant is selected
  // 2. Product main image
  // 3. Gallery images
  const allImages: string[] = React.useMemo(() => {
    const images: string[] = [];

    // Add variant image first if available
    if (selectedVariant?.image_url) {
      images.push(selectedVariant.image_url);
    }

    // Add main product image if different from variant image
    if (mainImage && mainImage !== selectedVariant?.image_url) {
      images.push(mainImage);
    }

    // Add gallery images, excluding duplicates
    galleryImages
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .forEach((img) => {
        if (!images.includes(img.image_url)) {
          images.push(img.image_url);
        }
      });

    // Fallback if no images
    if (images.length === 0) {
      images.push("/placeholder.svg");
    }

    return images;
  }, [mainImage, galleryImages, selectedVariant]);

  // Reset to first image when variant changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedVariant?.id]);

  // Check scroll position for arrow visibility
  const checkScrollPosition = useCallback(() => {
    const container = thumbsContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    setCanScrollUp(scrollTop > 0);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 5);
  }, []);

  // Set up scroll position checking
  useEffect(() => {
    const container = thumbsContainerRef.current;
    if (!container) return;
    
    // Initial check
    checkScrollPosition();
    
    // Check on scroll
    container.addEventListener("scroll", checkScrollPosition);
    
    // Check on resize
    const resizeObserver = new ResizeObserver(checkScrollPosition);
    resizeObserver.observe(container);
    
    return () => {
      container.removeEventListener("scroll", checkScrollPosition);
      resizeObserver.disconnect();
    };
  }, [checkScrollPosition, allImages]);

  const scrollThumbs = (direction: "up" | "down") => {
    const container = thumbsContainerRef.current;
    if (!container) return;
    
    const scrollAmount = 100; // pixels to scroll
    container.scrollBy({
      top: direction === "up" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
    // Scroll the clicked thumbnail into view (centered)
    const thumbElement = thumbRefs.current[index];
    if (thumbElement && thumbsContainerRef.current) {
      thumbElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  const currentImage = allImages[currentIndex];

  return (
    <div className="flex gap-4">
      {/* Thumbnails - Vertical stack on the left (desktop only) with navigation arrows */}
      {allImages.length > 1 && (
        <div className="hidden md:flex flex-col items-center gap-1">
          {/* Up Arrow */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ver mais imagens acima"
            className={cn(
              "h-8 w-8 rounded-full transition-opacity",
              canScrollUp ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => scrollThumbs("up")}
          >
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </Button>
          
          {/* Thumbnails container */}
          <div 
            ref={thumbsContainerRef}
            className="flex flex-col gap-2 max-h-[400px] overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {allImages.map((image, index) => (
              <button
                key={`thumb-${index}`}
                ref={(el) => (thumbRefs.current[index] = el)}
                type="button"
                onClick={() => goToImage(index)}
                className={cn(
                  "relative flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-lg overflow-hidden border-2 transition-all",
                  currentIndex === index
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-border hover:border-primary/50"
                )}
              >
                <img
                  src={image}
                  alt={`${productTitle} - Imagem ${index + 1}`}
                  width={80}
                  height={80}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                {/* Variant indicator */}
                {index === 0 && selectedVariant?.image_url && (
                  <div className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-[10px] text-center py-0.5">
                    Variante
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {/* Down Arrow */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ver mais imagens abaixo"
            className={cn(
              "h-8 w-8 rounded-full transition-opacity",
              canScrollDown ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => scrollThumbs("down")}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* Main Image Container */}
      <div className="flex-1 space-y-4">
        {/* Main Image */}
        <div
          className={cn(
            "relative aspect-square rounded-xl overflow-hidden bg-card border border-border group",
            isZoomed && "cursor-zoom-out",
            !isZoomed && "cursor-zoom-in"
          )}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <img
            src={currentImage}
            alt={`${productTitle}${category ? ` - ${category}` : ''} - Certificado INMETRO - Rei das Bombas`}
            title={`${productTitle}${category ? ` - ${category}` : ''} - Equipamento Certificado INMETRO para Postos de Combustível`}
            width={600}
            height={600}
            loading="eager"
            decoding="async"
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              isZoomed && "scale-150"
            )}
            style={{ aspectRatio: "1/1" }}
          />

          {/* Category Badge */}
          {category && (
            <Badge className="absolute top-4 left-4 premium-badge">
              {category}
            </Badge>
          )}

          {/* Zoom indicator */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/50 text-white p-2 rounded-lg">
              <ZoomIn className="h-5 w-5" />
            </div>
          </div>

          {/* Navigation Arrows - Only show if more than 1 image */}
          {allImages.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ver imagem anterior do produto"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ver próxima imagem do produto"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </>
          )}

          {/* Image Counter */}
          {allImages.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
              {currentIndex + 1} / {allImages.length}
            </div>
          )}
        </div>

        {/* Thumbnails for mobile - horizontal scroll below main image - hidden scrollbar */}
        {allImages.length > 1 && (
          <div className="flex md:hidden gap-2 overflow-x-auto pb-2 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {allImages.map((image, index) => (
              <button
                key={`thumb-mobile-${index}`}
                type="button"
                onClick={() => goToImage(index)}
                className={cn(
                  "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                  currentIndex === index
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-border hover:border-primary/50"
                )}
              >
                <img
                  src={image}
                  alt={`${productTitle} - Imagem ${index + 1}`}
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Dot indicators for mobile */}
        {allImages.length > 1 && allImages.length <= 6 && (
          <div className="flex justify-center gap-2 md:hidden">
            {allImages.map((_, index) => (
              <button
                key={`dot-${index}`}
                type="button"
                onClick={() => goToImage(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  currentIndex === index
                    ? "bg-primary w-4"
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
