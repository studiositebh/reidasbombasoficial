import { useState } from "react";
import { Trash2, Upload, X, ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import type { Attribute, AttributeValue } from "@/types/database";

interface VariantRow {
  id?: string;
  sku: string;
  stock_level: number;
  price_modifier: number;
  price: number | null;
  ean_gtin: string | null;
  is_active: boolean;
  image_url: string | null;
  attrs: Record<string, string>;
  imageFile?: File;
}

interface VariantCardProps {
  variant: VariantRow;
  index: number;
  attributes: (Attribute & { values: AttributeValue[] })[];
  onUpdate: (field: keyof VariantRow, value: any) => void;
  onRemove: () => void;
  onImageChange: (file: File) => void;
  onImageRemove: () => void;
}

export function VariantCard({
  variant,
  index,
  attributes,
  onUpdate,
  onRemove,
  onImageChange,
  onImageRemove,
}: VariantCardProps) {
  const [useSpecificPrice, setUseSpecificPrice] = useState(variant.price !== null);

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageChange(file);
    }
  };

  const handlePriceToggle = (checked: boolean) => {
    setUseSpecificPrice(checked);
    if (!checked) {
      onUpdate("price", null);
    }
  };

  // Get color meta_value for attribute badges
  const getColorForValue = (attrSlug: string, value: string): string | null => {
    const attr = attributes.find(a => a.slug === attrSlug || a.slug === attrSlug.toLowerCase());
    if (!attr) return null;
    const attrValue = attr.values.find(v => v.value === value || v.value.toLowerCase() === value.toLowerCase());
    return attrValue?.meta_value || null;
  };

  // Format attribute key for display (capitalize first letter, handle underscores)
  const formatAttributeKey = (key: string): string => {
    if (!key) return "";
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Ensure value is always a string for display
  const formatAttributeValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      // Handle nested objects - extract label or value
      const obj = value as Record<string, unknown>;
      if (obj.label) return String(obj.label);
      if (obj.value) return String(obj.value);
      if (obj.name) return String(obj.name);
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <Card className="bg-card border shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Header: Badges + Delete */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(variant.attrs || {})
              .filter(([key, value]) => key && value != null && value !== "")
              .map(([key, value]) => {
                const displayValue = formatAttributeValue(value);
                const color = getColorForValue(String(key), displayValue);
                const displayKey = formatAttributeKey(String(key));
                return (
                  <Badge
                    key={String(key)}
                    variant="secondary"
                    className="flex items-center gap-1.5 px-2 py-1"
                  >
                    {color && (
                      <span
                        className="w-3 h-3 rounded-full border border-border flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    )}
                    <span className="text-xs text-muted-foreground">{displayKey}:</span>
                    <span className="text-xs font-medium">{displayValue}</span>
                  </Badge>
                );
              })}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Image Upload Section */}
        <div className="flex gap-4">
          <div className="relative flex-shrink-0">
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageInput}
              />
              <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors">
                {variant.image_url ? (
                  <img
                    src={variant.image_url}
                    alt="Variante"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Upload className="h-5 w-5 mx-auto" />
                    <span className="text-[10px]">Foto</span>
                  </div>
                )}
              </div>
            </label>
            {variant.image_url && (
              <button
                type="button"
                onClick={onImageRemove}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Foto desta Variação</p>
            <p>Adicione uma imagem específica para esta variação.</p>
          </div>
        </div>

        {/* Fields Grid */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Estoque *</Label>
            <Input
              type="number"
              min="0"
              value={variant.stock_level}
              onChange={(e) => onUpdate("stock_level", parseInt(e.target.value) || 0)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SKU *</Label>
            <Input
              value={variant.sku}
              onChange={(e) => onUpdate("sku", e.target.value)}
              className="h-9 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">EAN/GTIN</Label>
            <Input
              value={variant.ean_gtin || ""}
              onChange={(e) => onUpdate("ean_gtin", e.target.value || null)}
              placeholder="789012345678"
              className="h-9 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mod. Preço (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={variant.price_modifier}
              onChange={(e) => onUpdate("price_modifier", parseFloat(e.target.value) || 0)}
              className="h-9"
              disabled={useSpecificPrice}
            />
          </div>
        </div>

        {/* Specific Price Section */}
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`use-price-${index}`}
              checked={useSpecificPrice}
              onCheckedChange={handlePriceToggle}
            />
            <Label htmlFor={`use-price-${index}`} className="text-xs cursor-pointer">
              Usar preço específico (ignora modificador)
            </Label>
          </div>
          {useSpecificPrice && (
            <div className="space-y-1.5">
              <Label className="text-xs">Preço Específico (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={variant.price || ""}
                onChange={(e) => onUpdate("price", parseFloat(e.target.value) || null)}
                placeholder="199.90"
                className="h-9 max-w-[150px]"
              />
            </div>
          )}
        </div>

        {/* Active Switch */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Switch
              id={`active-${index}`}
              checked={variant.is_active}
              onCheckedChange={(checked) => onUpdate("is_active", checked)}
            />
            <Label htmlFor={`active-${index}`} className="text-sm cursor-pointer">
              Variação ativa
            </Label>
          </div>
          <span className="text-xs text-muted-foreground">
            Variação #{index + 1}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
