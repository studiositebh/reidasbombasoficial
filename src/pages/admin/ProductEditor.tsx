import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Plus, Upload, Package, Ruler, Layers, Sparkles, Tag, Images, BarChart3, ImageIcon, Trash2, Check, ChevronsUpDown, FileText } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { AdminLayout } from "@/components/admin/AdminLayout";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { SortableGalleryImage } from "@/components/admin/SortableGalleryImage";
import { VariantCard } from "@/components/admin/VariantCard";
import { TechnicalSpecsEditor, type TechnicalSpec } from "@/components/admin/TechnicalSpecsEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { extractAttributeValue } from "@/lib/formatAttributes";
import type { Attribute, AttributeValue, ProductImage } from "@/types/database";

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductFormData {
  title: string;
  slug: string;
  description: string;
  category_id: string | null;
  base_price: number;
  promotional_price: number | null;
  promotion_expires_at: string | null;
  is_active: boolean;
  weight: number;
  width: number;
  height: number;
  length: number;
}

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

interface GalleryImage {
  id: string; // Required for dnd-kit
  image_url: string;
  alt_text: string;
  sort_order: number;
  file?: File;
}

export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const variantGeneratorRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  
  // Gallery images
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  
  // Categories from database
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  
  // Attributes system
  const [attributes, setAttributes] = useState<(Attribute & { values: AttributeValue[] })[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [selectedValues, setSelectedValues] = useState<Record<string, string[]>>({});
  
  // Generated variants
  const [variants, setVariants] = useState<VariantRow[]>([]);
  
  // Technical specifications (product-level)
  const [technicalSpecs, setTechnicalSpecs] = useState<TechnicalSpec[]>([]);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<ProductFormData>({
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      category_id: null,
      base_price: 0,
      promotional_price: null,
      promotion_expires_at: null,
      is_active: true,
      weight: 1,
      width: 20,
      height: 15,
      length: 10,
    }
  });

  const title = watch("title");
  const basePrice = watch("base_price");
  const promotionalPrice = watch("promotional_price");

  // Auto-generate slug from title
  useEffect(() => {
    if (!isEditing && title) {
      const slug = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setValue("slug", slug);
    }
  }, [title, isEditing, setValue]);

  // Fetch attributes and categories
  useEffect(() => {
    const fetchAttributesAndCategories = async () => {
      // Fetch attributes
      const { data: attrs, error: attrsError } = await supabase
        .from("attributes")
        .select("*")
        .order("name");

      if (attrsError) {
        console.error("Error fetching attributes:", attrsError);
        return;
      }

      const { data: values, error: valuesError } = await supabase
        .from("attribute_values")
        .select("*")
        .order("sort_order");

      if (valuesError) {
        console.error("Error fetching attribute values:", valuesError);
        return;
      }

      const attributesWithValues = (attrs || []).map(attr => ({
        ...attr,
        values: (values || []).filter(v => v.attribute_id === attr.id)
      }));

      setAttributes(attributesWithValues);

      // Fetch categories from categories table
      const { data: cats, error: catsError } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (!catsError && cats) {
        setCategories(cats);
      }
    };

    fetchAttributesAndCategories();
  }, []);

  // Fetch product data if editing
  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();

        if (productError) throw productError;

        setValue("title", product.title);
        setValue("slug", product.slug);
        setValue("description", product.description || "");
        setValue("category_id", product.category_id || null);
        setValue("base_price", product.base_price);
        setValue("promotional_price", product.promotional_price ?? null);
        setValue("promotion_expires_at", product.promotion_expires_at ?? null);
        setValue("is_active", product.is_active ?? true);
        setValue("weight", product.weight ?? 1);
        setValue("width", product.width ?? 20);
        setValue("height", product.height ?? 15);
        setValue("length", product.length ?? 10);
        setMainImageUrl(product.image_url);
        
        // Load technical specs (access via 'any' cast since field was added via migration)
        const productAny = product as unknown as { technical_specs?: TechnicalSpec[] };
        if (productAny.technical_specs && Array.isArray(productAny.technical_specs)) {
          setTechnicalSpecs(productAny.technical_specs);
        }

        // Fetch gallery images
        const { data: galleryData, error: galleryError } = await supabase
          .from("product_images")
          .select("*")
          .eq("product_id", id)
          .order("sort_order");

        if (!galleryError && galleryData) {
          setGalleryImages(galleryData.map(img => ({
            id: img.id,
            image_url: img.image_url,
            alt_text: img.alt_text || "",
            sort_order: img.sort_order,
          })));
        }

        // Fetch variants
        const { data: variantsData, error: variantsError } = await supabase
          .from("variants")
          .select("*")
          .eq("product_id", id);

        if (variantsError) throw variantsError;

        if (variantsData && variantsData.length > 0) {
          const loadedVariants: VariantRow[] = variantsData.map(v => ({
            id: v.id,
            sku: v.sku,
            stock_level: v.stock_level,
            price_modifier: v.price_modifier ?? 0,
            price: v.price ?? null,
            ean_gtin: v.ean_gtin ?? null,
            is_active: v.is_active ?? true,
            image_url: v.image_url,
            attrs: (typeof v.attrs === 'object' && v.attrs !== null && !Array.isArray(v.attrs) 
              ? Object.fromEntries(
                  Object.entries(v.attrs as Record<string, unknown>).map(([k, val]) => {
                    // Use extractAttributeValue to properly handle nested objects
                    return [String(k), extractAttributeValue(val)];
                  }).filter(([, val]) => val !== "") // Remove empty values
                ) 
              : {}) as Record<string, string>,
          }));
          setVariants(loadedVariants);

          // Extract selected attributes from existing variants
          const attrKeys = new Set<string>();
          const attrValues: Record<string, Set<string>> = {};
          
          loadedVariants.forEach(v => {
            Object.entries(v.attrs).forEach(([key, value]) => {
              attrKeys.add(key);
              if (!attrValues[key]) attrValues[key] = new Set();
              attrValues[key].add(value);
            });
          });

          setSelectedAttributes(Array.from(attrKeys));
          const selectedValuesObj: Record<string, string[]> = {};
          Object.entries(attrValues).forEach(([key, values]) => {
            selectedValuesObj[key] = Array.from(values);
          });
          setSelectedValues(selectedValuesObj);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Erro ao carregar produto");
        navigate("/admin/products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id, setValue, navigate]);

  const handleAttributeToggle = (attrSlug: string) => {
    setSelectedAttributes(prev => {
      if (prev.includes(attrSlug)) {
        // Remove attribute and its values
        const newSelected = prev.filter(a => a !== attrSlug);
        setSelectedValues(sv => {
          const newSv = { ...sv };
          delete newSv[attrSlug];
          return newSv;
        });
        return newSelected;
      }
      return [...prev, attrSlug];
    });
  };

  const handleValueToggle = (attrSlug: string, value: string) => {
    setSelectedValues(prev => {
      const current = prev[attrSlug] || [];
      if (current.includes(value)) {
        return { ...prev, [attrSlug]: current.filter(v => v !== value) };
      }
      return { ...prev, [attrSlug]: [...current, value] };
    });
  };

  const generateVariants = () => {
    if (selectedAttributes.length === 0) {
      toast.error("Selecione pelo menos um atributo");
      return;
    }

    const hasValues = selectedAttributes.every(attr => 
      selectedValues[attr] && selectedValues[attr].length > 0
    );

    if (!hasValues) {
      toast.error("Selecione valores para todos os atributos");
      return;
    }

    // Generate all combinations
    const combinations: Record<string, string>[] = [];
    
    const generateCombinations = (
      attrs: string[],
      current: Record<string, string>,
      index: number
    ) => {
      if (index === attrs.length) {
        combinations.push({ ...current });
        return;
      }

      const attrSlug = attrs[index];
      const values = selectedValues[attrSlug] || [];

      for (const value of values) {
        current[attrSlug] = value;
        generateCombinations(attrs, current, index + 1);
      }
    };

    generateCombinations(selectedAttributes, {}, 0);

    // Create variant rows
    const newVariants: VariantRow[] = combinations.map((attrs, index) => {
      const skuParts = Object.values(attrs).map(v => 
        v.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "")
      );
      const sku = `SKU-${skuParts.join("-")}-${index + 1}`;

      // Check if variant already exists (for editing)
      const existingVariant = variants.find(v => {
        return Object.entries(attrs).every(([key, value]) => v.attrs[key] === value);
      });

      if (existingVariant) {
        return existingVariant;
      }

      return {
        sku,
        stock_level: 0,
        price_modifier: 0,
        price: null,
        ean_gtin: null,
        is_active: true,
        image_url: null,
        attrs,
      };
    });

    setVariants(newVariants);
    toast.success(`${newVariants.length} variantes geradas`);
  };

  const updateVariant = (index: number, field: keyof VariantRow, value: any) => {
    setVariants(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainImageFile(file);
      setMainImageUrl(URL.createObjectURL(file));
    }
  };

  const handleVariantImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateVariant(index, "imageFile", file);
      updateVariant(index, "image_url", URL.createObjectURL(file));
    }
  };

  const handleGalleryImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: GalleryImage[] = Array.from(files).map((file, index) => ({
      id: `new-${Date.now()}-${index}`, // Generate unique ID for dnd-kit
      image_url: URL.createObjectURL(file),
      alt_text: "",
      sort_order: galleryImages.length + index,
      file,
    }));

    setGalleryImages(prev => [...prev, ...newImages]);
  };

  const removeGalleryImage = (id: string) => {
    setGalleryImages(prev => prev.filter(img => img.id !== id));
  };

  const handleGalleryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setGalleryImages((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("products")
      .upload(path, file, { upsert: true });

    if (error) {
      console.error("Error uploading image:", error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("products")
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const scrollToVariantGenerator = () => {
    variantGeneratorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onSubmit = async (data: ProductFormData) => {
    if (variants.length === 0) {
      toast.error("Adicione pelo menos uma variante");
      return;
    }

    // Validate unique SKUs
    const skus = variants.map(v => v.sku.trim().toLowerCase());
    const duplicateSkus = skus.filter((sku, index) => skus.indexOf(sku) !== index);
    if (duplicateSkus.length > 0) {
      const uniqueDuplicates = [...new Set(duplicateSkus)];
      toast.error(`SKUs duplicados encontrados: ${uniqueDuplicates.join(", ")}`);
      return;
    }

    // Validate promotional price
    if (data.promotional_price !== null && data.promotional_price >= data.base_price) {
      toast.error("O preço promocional deve ser menor que o preço base");
      return;
    }

    setIsSaving(true);
    try {
      // Upload main image if new
      let finalImageUrl = mainImageUrl;
      if (mainImageFile) {
        const path = `main/${Date.now()}-${mainImageFile.name}`;
        finalImageUrl = await uploadImage(mainImageFile, path);
      }

      const productData: Record<string, unknown> = {
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        category_id: data.category_id || null,
        base_price: data.base_price,
        promotional_price: data.promotional_price,
        promotion_expires_at: data.promotional_price ? data.promotion_expires_at : null,
        is_active: data.is_active,
        weight: data.weight,
        width: data.width,
        height: data.height,
        length: data.length,
        image_url: finalImageUrl,
        technical_specs: technicalSpecs.filter(s => s.key.trim() && s.value.trim()),
      };

      let productId = id;

      if (isEditing) {
        const { error } = await supabase
          .from("products")
          .update(productData as any)
          .eq("id", id);

        if (error) throw error;

        // Delete old variants
        await supabase.from("variants").delete().eq("product_id", id);
        
        // Delete old gallery images
        await supabase.from("product_images").delete().eq("product_id", id);
      } else {
        const { data: newProduct, error } = await supabase
          .from("products")
          .insert(productData as any)
          .select()
          .single();

        if (error) throw error;
        productId = newProduct.id;
      }

      // Upload and save gallery images
      for (let i = 0; i < galleryImages.length; i++) {
        const img = galleryImages[i];
        let imageUrl = img.image_url;

        if (img.file) {
          const path = `gallery/${productId}/${Date.now()}-${img.file.name}`;
          imageUrl = await uploadImage(img.file, path) || img.image_url;
        }

        await supabase.from("product_images").insert({
          product_id: productId,
          image_url: imageUrl,
          alt_text: img.alt_text || null,
          sort_order: i,
        });
      }

      // Upload variant images and insert variants
      for (const variant of variants) {
        let variantImageUrl = variant.image_url;
        
        if (variant.imageFile) {
          const path = `variants/${productId}/${Date.now()}-${variant.imageFile.name}`;
          variantImageUrl = await uploadImage(variant.imageFile, path);
        }

        const { error: variantError } = await supabase
          .from("variants")
          .insert({
            product_id: productId,
            sku: variant.sku,
            stock_level: variant.stock_level,
            price_modifier: variant.price_modifier,
            price: variant.price,
            ean_gtin: variant.ean_gtin,
            image_url: variantImageUrl,
            attrs: variant.attrs,
            is_active: variant.is_active,
          });

        if (variantError) {
          // Check for unique constraint violation on SKU
          if (variantError.code === '23505' && variantError.message?.includes('variants_sku_unique')) {
            throw new Error(`SKU_DUPLICATE:${variant.sku}`);
          }
          throw variantError;
        }
      }

      toast.success(isEditing ? "Produto atualizado!" : "Produto criado!");
      navigate("/admin/products");
    } catch (error: any) {
      console.error("Error saving product:", error);
      
      // Handle specific SKU duplicate error
      if (error?.message?.startsWith('SKU_DUPLICATE:')) {
        const duplicateSku = error.message.replace('SKU_DUPLICATE:', '');
        toast.error(`O SKU "${duplicateSku}" já está sendo usado por outro produto. Por favor, escolha um SKU diferente.`);
      } else {
        toast.error("Erro ao salvar produto");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Carregando...">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isEditing ? "Editar Produto" : "Novo Produto"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 -mx-4 lg:-mx-8 px-4 lg:px-8 py-4 bg-[hsl(var(--background))]/95 backdrop-blur-sm border-b mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin/products")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h2 className="text-lg font-semibold text-foreground">
                {isEditing ? "Editar Produto" : "Novo Produto"}
              </h2>
            </div>
            <Button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Produto
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Sidebar - Image (Mobile First) */}
          <div className="order-first lg:order-last space-y-6">
            {/* Main Image */}
            <Card className="bg-card shadow-sm overflow-hidden">
              <CardHeader className="py-3 px-5 bg-muted/50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  Imagem Principal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleMainImageChange}
                  />
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors">
                    {mainImageUrl ? (
                      <img
                        src={mainImageUrl}
                        alt="Product"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Upload className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Clique para enviar</p>
                      </div>
                    )}
                  </div>
                </label>
              </CardContent>
            </Card>

            {/* Quick Add Attributes */}
            <Card className="bg-card shadow-sm overflow-hidden">
              <CardHeader className="py-3 px-5 bg-muted/50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Ação Rápida
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={scrollToVariantGenerator}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Atributos
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Basic Info */}
            <Card className="bg-card shadow-sm overflow-hidden">
              <CardHeader className="py-3 px-5 bg-muted/50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Informações Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Nome do Produto *</Label>
                    <Input
                      id="title"
                      {...register("title", { required: "Nome é obrigatório" })}
                      placeholder="Ex: Bomba Submersa 1CV"
                    />
                    {errors.title && (
                      <p className="text-sm text-red-500">{errors.title.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (URL) *</Label>
                    <Input
                      id="slug"
                      {...register("slug", { required: "Slug é obrigatório" })}
                      placeholder="bomba-submersa-1cv"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Descrição detalhada do produto..."
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Controller
                    name="category_id"
                    control={control}
                    render={({ field }) => {
                      const [open, setOpen] = useState(false);
                      const selectedCategory = categories.find(c => c.id === field.value);
                      
                      return (
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="w-full justify-between font-normal"
                            >
                              {selectedCategory?.name || "Selecione uma categoria"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar categoria..." />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="py-2 text-center text-sm">
                                    Nenhuma categoria encontrada
                                  </div>
                                </CommandEmpty>
                                <CommandGroup>
                                  {categories.map((cat) => (
                                    <CommandItem
                                      key={cat.id}
                                      value={cat.name}
                                      onSelect={() => {
                                        field.onChange(cat.id);
                                        setOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === cat.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {cat.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      );
                    }}
                  />
                </div>

                {/* Pricing Section */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="base_price">Preço Base (R$) *</Label>
                    <Input
                      id="base_price"
                      type="number"
                      step="0.01"
                      {...register("base_price", { 
                        required: "Preço é obrigatório",
                        valueAsNumber: true,
                        min: { value: 0, message: "Preço deve ser positivo" }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promotional_price" className="flex items-center gap-2">
                      Preço Promocional (R$)
                      {promotionalPrice && promotionalPrice < basePrice && (
                        <Badge variant="destructive" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          Promoção
                        </Badge>
                      )}
                    </Label>
                    <Input
                      id="promotional_price"
                      type="number"
                      step="0.01"
                      placeholder="Deixe vazio se não houver"
                      {...register("promotional_price", { 
                        valueAsNumber: true,
                        setValueAs: (v) => v === "" || v === 0 ? null : Number(v),
                      })}
                    />
                    {promotionalPrice && promotionalPrice >= basePrice && (
                      <p className="text-sm text-red-500">Deve ser menor que o preço base</p>
                    )}
                  </div>

                  {/* Promotion Expiration Date */}
                  {promotionalPrice && promotionalPrice < basePrice && (
                    <div className="space-y-2">
                      <Label htmlFor="promotion_expires_at" className="flex items-center gap-2">
                        Data de Expiração
                        <Badge variant="outline" className="text-xs">Opcional</Badge>
                      </Label>
                      <Input
                        id="promotion_expires_at"
                        type="datetime-local"
                        {...register("promotion_expires_at")}
                      />
                      <p className="text-xs text-muted-foreground">
                        Deixe vazio para promoção sem data de expiração
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={watch("is_active")}
                    onCheckedChange={(checked) => setValue("is_active", checked)}
                  />
                  <Label htmlFor="is_active">Produto ativo</Label>
                </div>
              </CardContent>
            </Card>

            {/* Gallery Images */}
            <Card className="bg-card shadow-sm overflow-hidden">
              <CardHeader className="py-3 px-5 bg-muted/50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Images className="h-4 w-4 text-primary" />
                  Galeria de Fotos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleGalleryDragEnd}
                >
                  <SortableContext
                    items={galleryImages.map(img => img.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {galleryImages.map((img, index) => (
                        <SortableGalleryImage
                          key={img.id}
                          id={img.id}
                          imageUrl={img.image_url}
                          altText={img.alt_text}
                          index={index}
                          onRemove={() => removeGalleryImage(img.id)}
                        />
                      ))}
                      
                      {/* Add Image Button */}
                      <label className="cursor-pointer aspect-square border-2 border-dashed border-border hover:border-primary rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleGalleryImageAdd}
                        />
                        <Plus className="h-6 w-6 mb-1" />
                        <span className="text-xs">Adicionar</span>
                      </label>
                    </div>
                  </SortableContext>
                </DndContext>
                <p className="text-xs text-muted-foreground mt-3">
                  Arraste para reordenar. Máximo de 10 imagens.
                </p>
              </CardContent>
            </Card>

            {/* Dimensions */}
            <Card className="bg-card shadow-sm overflow-hidden">
              <CardHeader className="py-3 px-5 bg-muted/50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-primary" />
                  Dimensões e Peso
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      {...register("weight", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="width">Largura (cm)</Label>
                    <Input
                      id="width"
                      type="number"
                      {...register("width", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Altura (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      {...register("height", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="length">Comprimento (cm)</Label>
                    <Input
                      id="length"
                      type="number"
                      {...register("length", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Specifications */}
            <Card className="bg-card shadow-sm overflow-hidden">
              <CardHeader className="py-3 px-5 bg-muted/50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Especificações Técnicas
                  <Badge variant="outline" className="text-xs font-normal">Opcional</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-4">
                  Adicione especificações técnicas do produto que serão exibidas na página de detalhes.
                  Exemplos: Voltagem, Material, Potência, Vazão, etc.
                </p>
                <TechnicalSpecsEditor
                  specs={technicalSpecs}
                  onChange={setTechnicalSpecs}
                />
              </CardContent>
            </Card>

            <Card ref={variantGeneratorRef} className="bg-card shadow-sm overflow-hidden">
              <CardHeader className="py-3 px-5 bg-muted/50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Gerador de Variantes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                {attributes.length === 0 && variants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum atributo cadastrado.</p>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => navigate("/admin/attributes")}
                    >
                      Cadastrar Atributos
                    </Button>
                  </div>
                ) : attributes.length === 0 && variants.length > 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">Este produto possui variantes sincronizadas do Hub.</p>
                    <p className="text-xs mt-1">Você pode editar o estoque e preços das variantes abaixo.</p>
                  </div>
                ) : (
                  <>
                    {/* Attribute Selection */}
                    <div className="space-y-4">
                      <Label>Selecione os Atributos</Label>
                      <div className="flex flex-wrap gap-2">
                        {attributes.map((attr) => (
                          <Button
                            key={attr.id}
                            type="button"
                            variant={selectedAttributes.includes(attr.slug) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAttributeToggle(attr.slug)}
                          >
                            {attr.name}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Value Selection */}
                    {selectedAttributes.map((attrSlug) => {
                      const attr = attributes.find(a => a.slug === attrSlug);
                      if (!attr) return null;

                      return (
                        <div key={attrSlug} className="space-y-2">
                          <Label>{attr.name}</Label>
                          <div className="flex flex-wrap gap-2">
                            {attr.values.map((value) => (
                              <label
                                key={value.id}
                                className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted/50"
                              >
                                <Checkbox
                                  checked={(selectedValues[attrSlug] || []).includes(value.value)}
                                  onCheckedChange={() => handleValueToggle(attrSlug, value.value)}
                                />
                                {value.meta_value && (
                                  <span
                                    className="w-4 h-4 rounded-full border"
                                    style={{ backgroundColor: value.meta_value }}
                                  />
                                )}
                                <span className="text-sm">{value.value}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {selectedAttributes.length > 0 && (
                      <Button type="button" onClick={generateVariants}>
                        <Plus className="h-4 w-4 mr-2" />
                        Gerar Combinações
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Variants Cards */}
            {variants.length > 0 && (
              <div className="space-y-4">
                {/* Statistics Summary */}
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <span className="font-medium">Resumo das Variantes</span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div>
                          <span className="text-muted-foreground">Total: </span>
                          <span className="font-semibold">{variants.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Estoque Total: </span>
                          <span className="font-semibold">
                            {variants.reduce((sum, v) => sum + v.stock_level, 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Menor Preço: </span>
                          <span className="font-semibold text-green-600">
                            R$ {Math.min(...variants.map(v => 
                              v.price ?? (basePrice + v.price_modifier)
                            )).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Maior Preço: </span>
                          <span className="font-semibold">
                            R$ {Math.max(...variants.map(v => 
                              v.price ?? (basePrice + v.price_modifier)
                            )).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Variant Cards Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  {variants.map((variant, index) => (
                    <VariantCard
                      key={variant.id || index}
                      variant={variant}
                      index={index}
                      attributes={attributes}
                      onUpdate={(field, value) => updateVariant(index, field, value)}
                      onRemove={() => removeVariant(index)}
                      onImageChange={(file) => {
                        updateVariant(index, "imageFile", file);
                        updateVariant(index, "image_url", URL.createObjectURL(file));
                      }}
                      onImageRemove={() => {
                        updateVariant(index, "imageFile", undefined);
                        updateVariant(index, "image_url", null);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
