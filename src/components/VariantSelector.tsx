import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { sanitizeAttributes, formatAttributeLabel } from "@/lib/formatAttributes";
import { useAttributeColors } from "@/hooks/useAttributeColors";
import type { Variant } from "@/types/database";

interface VariantSelectorProps {
  variants: Variant[];
  selectedVariant: Variant | null;
  onSelect: (variant: Variant) => void;
}

// Fallback color map for common colors (Portuguese and English)
const COLOR_MAP: Record<string, string> = {
  // Portuguese
  "preto": "#000000",
  "branco": "#FFFFFF",
  "branca": "#FFFFFF",
  "azul": "#2563EB",
  "azul claro": "#60A5FA",
  "azul escuro": "#1E40AF",
  "azul marinho": "#1E3A5F",
  "vermelho": "#DC2626",
  "verde": "#16A34A",
  "verde claro": "#4ADE80",
  "verde escuro": "#166534",
  "amarelo": "#EAB308",
  "amarela": "#EAB308",
  "laranja": "#EA580C",
  "rosa": "#EC4899",
  "roxo": "#9333EA",
  "marrom": "#92400E",
  "cinza": "#6B7280",
  "cinza claro": "#D1D5DB",
  "cinza escuro": "#374151",
  "bege": "#D4A574",
  "dourado": "#CA8A04",
  "prata": "#A1A1AA",
  "transparente": "transparent",
  "natural": "#E5D3B3",
  "creme": "#FFFDD0",
  "vinho": "#722F37",
  "bordô": "#800020",
  "turquesa": "#40E0D0",
  "coral": "#FF7F50",
  "salmão": "#FA8072",
  "lilás": "#C8A2C8",
  "lavanda": "#E6E6FA",
  "nude": "#E3BC9A",
  "caramelo": "#FFD59A",
  "chocolate": "#7B3F00",
  "grafite": "#383838",
  "chumbo": "#36454F",
  "off-white": "#FAF9F6",
  "off white": "#FAF9F6",
  // English fallbacks
  "black": "#000000",
  "white": "#FFFFFF",
  "blue": "#2563EB",
  "red": "#DC2626",
  "green": "#16A34A",
  "yellow": "#EAB308",
  "orange": "#EA580C",
  "pink": "#EC4899",
  "purple": "#9333EA",
  "brown": "#92400E",
  "gray": "#6B7280",
  "grey": "#6B7280",
  "gold": "#CA8A04",
  "silver": "#A1A1AA",
};

// Check if an attribute key is a color attribute (including WooCommerce prefixes)
const isColorAttribute = (key: string): boolean => {
  const normalizedKey = key.toLowerCase().trim();
  return (
    normalizedKey === "cor" || 
    normalizedKey === "color" || 
    normalizedKey === "cores" || 
    normalizedKey === "colors" ||
    normalizedKey === "pa_cor" ||      // WooCommerce prefix
    normalizedKey === "pa_color" ||    // WooCommerce prefix
    normalizedKey.endsWith("_cor") ||  // Any prefix ending with _cor
    normalizedKey.endsWith("_color")   // Any prefix ending with _color
  );
};

// Helper to safely access attrs as a record using the sanitization helper
const getAttrs = (variant: Variant): Record<string, string> => {
  return sanitizeAttributes(variant.attrs);
};

// Find a variant that matches a specific attribute value
const findVariantWithAttr = (variants: Variant[], key: string, value: string): Variant | undefined => {
  return variants.find((v) => {
    const attrs = getAttrs(v);
    return attrs[key] === value;
  });
};

export function VariantSelector({ variants, selectedVariant, onSelect }: VariantSelectorProps) {
  // Fetch hex codes from database
  const { data: dbColorMap } = useAttributeColors();

  // Get CSS color from color name - prioritize database, then fallback to static map
  const getColorFromName = (colorName: string): string | null => {
    const normalized = colorName.toLowerCase().trim();
    // First check database hex codes
    if (dbColorMap && dbColorMap.has(normalized)) {
      return dbColorMap.get(normalized) || null;
    }
    // Fallback to static color map
    return COLOR_MAP[normalized] || null;
  };

  // Extract unique attribute keys from all variants
  const attributeKeys = useMemo(() => {
    const keys = new Set<string>();
    variants.forEach((v) => {
      const attrs = getAttrs(v);
      Object.keys(attrs).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [variants]);

  // Get unique values for each attribute
  const attributeValues = useMemo(() => {
    const values: Record<string, Set<string>> = {};
    attributeKeys.forEach((key) => {
      values[key] = new Set();
      variants.forEach((v) => {
        const attrs = getAttrs(v);
        if (attrs[key] !== undefined && attrs[key] !== "") {
          values[key].add(attrs[key]);
        }
      });
    });
    return values;
  }, [variants, attributeKeys]);

  // Track selected values for each attribute
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>(() => {
    // Initialize with the first variant's attributes or empty
    if (selectedVariant) {
      return { ...getAttrs(selectedVariant) };
    }
    if (variants.length > 0) {
      return { ...getAttrs(variants[0]) };
    }
    return {};
  });

  // Find variant matching selected attributes
  const findMatchingVariant = (attrs: Record<string, string>): Variant | undefined => {
    return variants.find((v) => {
      const vAttrs = getAttrs(v);
      return Object.entries(attrs).every(([key, value]) => vAttrs[key] === value);
    });
  };

  // Check if a specific attribute value is available
  const isValueAvailable = (key: string, value: string): boolean => {
    const testAttrs = { ...selectedAttrs, [key]: value };
    return !!findMatchingVariant(testAttrs);
  };

  // Handle attribute selection
  const handleSelect = (key: string, value: string) => {
    const newAttrs = { ...selectedAttrs, [key]: value };
    setSelectedAttrs(newAttrs);
    
    const matchingVariant = findMatchingVariant(newAttrs);
    if (matchingVariant) {
      onSelect(matchingVariant);
    }
  };

  // Format attribute key for display - use the shared formatter
  const formatKey = formatAttributeLabel;

  // Render a color swatch
  const renderColorSwatch = (
    key: string,
    value: string,
    isSelected: boolean,
    isAvailable: boolean,
    outOfStock: boolean
  ) => {
    const cssColor = getColorFromName(value);
    const variant = findVariantWithAttr(variants, key, value);
    const hasImage = variant?.image_url;

    // Use image if available, otherwise use color
    if (hasImage) {
      return (
        <button
          key={`${key}-${value}`}
          type="button"
          disabled={!isAvailable || outOfStock}
          onClick={() => handleSelect(key, value)}
          className={cn(
            "relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all",
            isSelected && "ring-2 ring-primary ring-offset-2 border-primary",
            !isSelected && "border-gray-300 hover:border-gray-400",
            !isAvailable && "opacity-40 cursor-not-allowed",
            outOfStock && "opacity-40"
          )}
          title={value}
        >
          <img
            src={variant.image_url!}
            alt={value}
            className="w-full h-full object-cover"
          />
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-0.5 bg-red-500 rotate-45 absolute" />
            </div>
          )}
        </button>
      );
    }

    if (cssColor) {
      const isWhite = cssColor === "#FFFFFF" || cssColor === "#FAF9F6";
      const isTransparent = cssColor === "transparent";

      return (
        <button
          key={`${key}-${value}`}
          type="button"
          disabled={!isAvailable || outOfStock}
          onClick={() => handleSelect(key, value)}
          className={cn(
            "relative w-10 h-10 rounded-full border-2 transition-all",
            isSelected && "ring-2 ring-primary ring-offset-2 border-primary",
            !isSelected && isWhite && "border-gray-300",
            !isSelected && !isWhite && "border-transparent",
            !isAvailable && "opacity-40 cursor-not-allowed",
            outOfStock && "opacity-40",
            isTransparent && "bg-gradient-to-br from-gray-100 to-gray-300"
          )}
          style={{
            backgroundColor: isTransparent ? undefined : cssColor,
            boxShadow: isSelected ? undefined : "inset 0 0 0 1px rgba(0,0,0,0.1)",
          }}
          title={value}
        >
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-0.5 bg-red-500 rotate-45 absolute" />
            </div>
          )}
        </button>
      );
    }

    // Fallback to regular button if no color mapping
    return null;
  };

  // Render a regular attribute button
  const renderAttributeButton = (
    key: string,
    value: string,
    isSelected: boolean,
    isAvailable: boolean,
    outOfStock: boolean
  ) => {
    return (
      <Button
        key={`${key}-${value}`}
        type="button"
        variant={isSelected ? "default" : "outline"}
        size="sm"
        disabled={!isAvailable || outOfStock}
        onClick={() => handleSelect(key, value)}
        className={cn(
          "min-w-[60px] transition-all",
          isSelected && "ring-2 ring-primary ring-offset-2",
          !isAvailable && "opacity-50 cursor-not-allowed",
          outOfStock && "line-through opacity-50"
        )}
      >
        {String(value)}
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      {attributeKeys.map((key) => {
        const isColor = isColorAttribute(key);

        return (
          <div key={key}>
            <label className="block text-sm font-medium text-foreground mb-3">
              {formatKey(key)}:{" "}
              <span className="text-muted-foreground font-normal">
                {selectedAttrs[key]}
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {Array.from(attributeValues[key]).map((value) => {
                const isSelected = selectedAttrs[key] === value;
                const isAvailable = isValueAvailable(key, value);
                const matchingVariant = findMatchingVariant({ ...selectedAttrs, [key]: value });
                const outOfStock = matchingVariant ? matchingVariant.stock_level === 0 : false;

                if (isColor) {
                  const swatch = renderColorSwatch(key, value, isSelected, isAvailable, outOfStock);
                  if (swatch) return swatch;
                }

                return renderAttributeButton(key, value, isSelected, isAvailable, outOfStock);
              })}
            </div>
          </div>
        );
      })}

      {/* Stock Status */}
      {selectedVariant && (
        <div className="pt-2">
          {selectedVariant.stock_level > 0 ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {selectedVariant.stock_level} em estoque
            </Badge>
          ) : (
            <Badge variant="destructive">Sem estoque</Badge>
          )}
        </div>
      )}
    </div>
  );
}
