import { useState, useEffect } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import type { Product, Variant } from "@/types/database";

interface ProductWithVariants extends Product {
  variants: Variant[];
}

interface VariantForm {
  id?: string;
  sku: string;
  stock_level: number;
  price_modifier: number;
  is_active: boolean;
  attrs: { key: string; value: string }[];
}

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductWithVariants | null;
  onSuccess: () => void;
  onClose: () => void;
}

export function ProductFormSheet({
  open,
  onOpenChange,
  product,
  onSuccess,
  onClose,
}: ProductFormSheetProps) {
  const isEditing = !!product;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    base_price: 0,
    slug: "",
    image_url: "",
    category: "",
    is_active: true,
    weight: 1,
    width: 20,
    height: 15,
    length: 10,
  });

  const [variants, setVariants] = useState<VariantForm[]>([
    { sku: "", stock_level: 0, price_modifier: 0, is_active: true, attrs: [{ key: "", value: "" }] },
  ]);

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title,
        description: product.description || "",
        base_price: product.base_price,
        slug: product.slug,
        image_url: product.image_url || "",
        category: product.category || "",
        is_active: product.is_active ?? true,
        weight: (product as any).weight || 1,
        width: (product as any).width || 20,
        height: (product as any).height || 15,
        length: (product as any).length || 10,
      });

      if (product.variants.length > 0) {
        setVariants(
          product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            stock_level: v.stock_level,
            price_modifier: v.price_modifier || 0,
            is_active: v.is_active ?? true,
            attrs: Object.entries(v.attrs as Record<string, string>).map(([key, value]) => ({
              key,
              value: String(value),
            })),
          }))
        );
      }
    } else {
      // Reset form for new product
      setFormData({
        title: "",
        description: "",
        base_price: 0,
        slug: "",
        image_url: "",
        category: "",
        is_active: true,
        weight: 1,
        width: 20,
        height: 15,
        length: 10,
      });
      setVariants([
        { sku: "", stock_level: 0, price_modifier: 0, is_active: true, attrs: [{ key: "", value: "" }] },
      ]);
    }
  }, [product, open]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const addVariant = () => {
    setVariants([
      ...variants,
      { sku: "", stock_level: 0, price_modifier: 0, is_active: true, attrs: [{ key: "", value: "" }] },
    ]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof VariantForm, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const addAttribute = (variantIndex: number) => {
    const updated = [...variants];
    updated[variantIndex].attrs.push({ key: "", value: "" });
    setVariants(updated);
  };

  const removeAttribute = (variantIndex: number, attrIndex: number) => {
    const updated = [...variants];
    updated[variantIndex].attrs = updated[variantIndex].attrs.filter((_, i) => i !== attrIndex);
    setVariants(updated);
  };

  const updateAttribute = (
    variantIndex: number,
    attrIndex: number,
    field: "key" | "value",
    value: string
  ) => {
    const updated = [...variants];
    updated[variantIndex].attrs[attrIndex][field] = value;
    setVariants(updated);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.slug) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);

    try {
      let productId = product?.id;

      // Create or update product
      if (isEditing) {
        const { error } = await supabase
          .from("products")
          .update({
            title: formData.title,
            description: formData.description,
            base_price: formData.base_price,
            slug: formData.slug,
            image_url: formData.image_url,
            category: formData.category,
            is_active: formData.is_active,
            weight: formData.weight,
            width: formData.width,
            height: formData.height,
            length: formData.length,
          })
          .eq("id", productId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({
            title: formData.title,
            description: formData.description,
            base_price: formData.base_price,
            slug: formData.slug,
            image_url: formData.image_url,
            category: formData.category,
            is_active: formData.is_active,
            weight: formData.weight,
            width: formData.width,
            height: formData.height,
            length: formData.length,
          })
          .select()
          .single();

        if (error) throw error;
        productId = data.id;
      }

      // Handle variants
      for (const variant of variants) {
        const attrsObj = variant.attrs.reduce(
          (acc, { key, value }) => (key ? { ...acc, [key]: value } : acc),
          {}
        );

        if (variant.id) {
          // Update existing variant
          const { error } = await supabase
            .from("variants")
            .update({
              sku: variant.sku,
              stock_level: variant.stock_level,
              price_modifier: variant.price_modifier,
              is_active: variant.is_active,
              attrs: attrsObj,
            })
            .eq("id", variant.id);

          if (error) throw error;
        } else if (variant.sku) {
          // Create new variant
          const { error } = await supabase.from("variants").insert({
            product_id: productId,
            sku: variant.sku,
            stock_level: variant.stock_level,
            price_modifier: variant.price_modifier,
            is_active: variant.is_active,
            attrs: attrsObj,
          });

          if (error) throw error;
        }
      }

      // Delete removed variants
      if (isEditing && product?.variants) {
        const currentVariantIds = variants.filter((v) => v.id).map((v) => v.id);
        const deletedVariantIds = product.variants
          .filter((v) => !currentVariantIds.includes(v.id))
          .map((v) => v.id);

        if (deletedVariantIds.length > 0) {
          await supabase.from("variants").delete().in("id", deletedVariantIds);
        }
      }

      toast.success(isEditing ? "Produto atualizado!" : "Produto criado!");
      onSuccess();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Erro ao salvar produto");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Editar Produto" : "Novo Produto"}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Informações Básicas</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="title">Nome do Produto *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ex: Bomba Centrífuga Industrial"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL) *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="bomba-centrifuga-industrial"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Bombas"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base_price">Preço Base (R$) *</Label>
                  <Input
                    id="base_price"
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) =>
                      setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">URL da Imagem</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Descrição detalhada do produto..."
                  />
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Produto ativo (visível na loja)</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dimensions for shipping */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Dimensões (para cálculo de frete)</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: parseFloat(e.target.value) || 1 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="width">Largura (cm)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={formData.width}
                    onChange={(e) =>
                      setFormData({ ...formData, width: parseFloat(e.target.value) || 20 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) =>
                      setFormData({ ...formData, height: parseFloat(e.target.value) || 15 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="length">Comp. (cm)</Label>
                  <Input
                    id="length"
                    type="number"
                    value={formData.length}
                    onChange={(e) =>
                      setFormData({ ...formData, length: parseFloat(e.target.value) || 10 })
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Variants */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Variantes</h3>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Variante
                </Button>
              </div>

              {variants.map((variant, vIndex) => (
                <div key={vIndex} className="border rounded-lg p-4 space-y-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-700">
                      Variante {vIndex + 1}
                    </span>
                    {variants.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600"
                        onClick={() => removeVariant(vIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">SKU *</Label>
                      <Input
                        value={variant.sku}
                        onChange={(e) => updateVariant(vIndex, "sku", e.target.value)}
                        placeholder="SKU-001"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Estoque</Label>
                      <Input
                        type="number"
                        value={variant.stock_level}
                        onChange={(e) =>
                          updateVariant(vIndex, "stock_level", parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Modificador de Preço</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variant.price_modifier}
                        onChange={(e) =>
                          updateVariant(vIndex, "price_modifier", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-gray-600">Atributos Técnicos</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => addAttribute(vIndex)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Atributo
                      </Button>
                    </div>

                    {variant.attrs.map((attr, aIndex) => (
                      <div key={aIndex} className="flex items-center gap-2">
                        <Input
                          placeholder="Chave (ex: Entrada)"
                          value={attr.key}
                          onChange={(e) => updateAttribute(vIndex, aIndex, "key", e.target.value)}
                          className="flex-1 h-9 text-sm"
                        />
                        <Input
                          placeholder="Valor (ex: 3/4 pol)"
                          value={attr.value}
                          onChange={(e) => updateAttribute(vIndex, aIndex, "value", e.target.value)}
                          className="flex-1 h-9 text-sm"
                        />
                        {variant.attrs.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => removeAttribute(vIndex, aIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={variant.is_active}
                      onCheckedChange={(checked) => updateVariant(vIndex, "is_active", checked)}
                    />
                    <Label className="text-xs">Variante ativa</Label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex gap-3 pt-4 border-t mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1 btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : isEditing ? "Atualizar" : "Criar Produto"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
