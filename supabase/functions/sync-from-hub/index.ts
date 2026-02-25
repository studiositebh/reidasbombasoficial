import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Variant structure from Hub (supports multiple stock field names)
interface HubVariant {
  sku: string;
  stock?: number;
  stock_level?: number;
  stock_quantity?: number;
  qty?: number;
  estoque?: number; // Portuguese field name
  quantity?: number;
  price?: number;
  promotional_price?: number;
  attributes?: Record<string, unknown>;
  image_url?: string;
  ean_gtin?: string;
}

// Helper to extract stock value from variant with fallback logic
function getVariantStock(variant: HubVariant): number {
  // Try all possible stock field names from different APIs
  const stock = variant.stock ?? variant.stock_level ?? variant.stock_quantity ?? 
                variant.qty ?? variant.estoque ?? variant.quantity ?? 0;
  console.log(`[sync] Variant ${variant.sku} stock fields:`, {
    stock: variant.stock,
    stock_level: variant.stock_level,
    stock_quantity: variant.stock_quantity,
    qty: variant.qty,
    estoque: variant.estoque,
    quantity: variant.quantity,
    resolved: stock
  });
  return stock;
}

// Helper to extract stock value from product with fallback logic
function getProductStock(product: HubProduct): number {
  return product.stock ?? (product as unknown as Record<string, unknown>).stock_level as number ?? 
         (product as unknown as Record<string, unknown>).stock_quantity as number ?? 
         (product as unknown as Record<string, unknown>).qty as number ?? 0;
}

// Category object structure from Hub (supports hierarchy)
interface HubCategoryInfo {
  name: string;
  slug?: string;
  parent?: string | HubCategoryInfo; // Parent category name or object
  parent_name?: string;
  parent_slug?: string;
}

interface HubProduct {
  sku: string;
  title: string;
  slug: string;
  description?: string;
  price: number;
  promotional_price?: number;
  stock: number;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  images?: string[];
  attributes?: Record<string, unknown>;
  category_slug?: string;
  // Additional category fields from Hub
  category?: string | HubCategoryInfo; // Category name or object with hierarchy
  categories?: string | string[] | HubCategoryInfo[]; // Array or single category
  // Parent category fields (flat structure from some APIs)
  parent_category?: string;
  parent_category_slug?: string;
  // Multi-variant support
  variants?: HubVariant[];
}

interface HubAttribute {
  id?: string | number;
  name: string;
  slug: string;
  values?: Array<{
    id?: string | number;
    value: string;
    meta_value?: string;
    sort_order?: number;
  }>;
}

interface HubCategory {
  id?: string | number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_slug?: string;
  parent_id?: string | number;
  sort_order?: number;
}

interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  categoriesSynced: number;
  attributesSynced: number;
  attributeValuesHarvested: number;
  errors: string[];
  message: string;
  syncId?: string;
}

// Helper to extract string value from attribute (might be object or primitive)
function extractAttributeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (obj.name) return String(obj.name);
    if (obj.value) return String(obj.value);
    if (obj.label) return String(obj.label);
  }
  return "";
}

// Clean attributes to simple string values
function sanitizeAttributes(attrs: Record<string, unknown> | undefined): Record<string, string> {
  if (!attrs || typeof attrs !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    const extracted = extractAttributeValue(value);
    if (extracted) {
      result[key] = extracted;
    }
  }
  return result;
}

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing dashes
}

// Helper to extract category info from various formats
interface ExtractedCategoryInfo {
  name: string;
  slug?: string;
  parentName?: string;
  parentSlug?: string;
}

function extractCategoryInfo(category: unknown): ExtractedCategoryInfo | null {
  if (!category) return null;
  
  // String - simple category name
  if (typeof category === "string") {
    const trimmed = category.trim();
    return trimmed ? { name: trimmed } : null;
  }
  
  // Object with name property (and possibly parent info)
  if (typeof category === "object" && category !== null) {
    const obj = category as Record<string, unknown>;
    
    if (obj.name && typeof obj.name === "string") {
      const result: ExtractedCategoryInfo = { 
        name: obj.name.trim(),
        slug: typeof obj.slug === "string" ? obj.slug : undefined,
      };
      
      // Check for parent category in various formats
      if (obj.parent) {
        if (typeof obj.parent === "string") {
          result.parentName = obj.parent.trim();
        } else if (typeof obj.parent === "object" && obj.parent !== null) {
          const parent = obj.parent as Record<string, unknown>;
          if (parent.name && typeof parent.name === "string") {
            result.parentName = parent.name.trim();
            result.parentSlug = typeof parent.slug === "string" ? parent.slug : undefined;
          }
        }
      }
      
      // Also check flat parent fields
      if (!result.parentName && obj.parent_name && typeof obj.parent_name === "string") {
        result.parentName = obj.parent_name.trim();
      }
      if (!result.parentSlug && obj.parent_slug && typeof obj.parent_slug === "string") {
        result.parentSlug = obj.parent_slug;
      }
      
      return result.name ? result : null;
    }
  }
  
  return null;
}

// Simple helper for backwards compatibility
function extractCategoryName(category: unknown): string | null {
  const info = extractCategoryInfo(category);
  return info?.name || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Parse optional syncId from request body
  let syncId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    syncId = body.syncId || null;
  } catch {
    // No body or invalid JSON, that's fine
  }

  // Helper to update sync progress
  async function updateProgress(data: Record<string, unknown>) {
    if (!syncId) return;
    try {
      await supabase
        .from("sync_progress")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("sync_id", syncId);
    } catch (e) {
      console.error("Failed to update progress:", e);
    }
  }

  try {
    // Get hub settings
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("hub_url, hub_api_key, hub_auto_update_prices")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    if (settingsError || !settings?.hub_url || !settings?.hub_api_key) {
      await updateProgress({
        status: "error",
        message: "Configurações do Hub não encontradas",
        completed_at: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({
          success: false,
          message: "Configurações do Hub não encontradas. Configure a URL e API Key nas configurações.",
          created: 0,
          updated: 0,
          attributesSynced: 0,
          attributeValuesHarvested: 0,
          errors: [],
          syncId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: SyncResult = {
      success: false,
      created: 0,
      updated: 0,
      categoriesSynced: 0,
      attributesSynced: 0,
      attributeValuesHarvested: 0,
      errors: [],
      message: "",
      syncId: syncId || undefined,
    };

    // Helper to get base URL (remove /marketplace-products if present)
    const baseUrl = settings.hub_url.replace(/\/marketplace-products\/?$/, '');

    // ========== STEP 0: Sync Categories ==========
    await updateProgress({
      current_step: "categories",
      message: "Buscando categorias do Hub...",
      step_progress: 0,
      step_total: 0,
    });

    const categorySlugToId: Map<string, string> = new Map();
    
    try {
      const categoriesUrl = `${baseUrl}/marketplace-categories`;
      console.log("Fetching categories from hub:", categoriesUrl);
      
      const catResponse = await fetch(categoriesUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-seller-key": settings.hub_api_key,
        },
      });

      if (catResponse.ok) {
        const catData = await catResponse.json();
        let hubCategories: HubCategory[] = [];
        
        if (Array.isArray(catData)) {
          hubCategories = catData;
        } else if (catData.data && Array.isArray(catData.data)) {
          hubCategories = catData.data;
        } else if (catData.categories && Array.isArray(catData.categories)) {
          hubCategories = catData.categories;
        }

        console.log(`Found ${hubCategories.length} categories from hub`);
        await updateProgress({
          message: `Processando ${hubCategories.length} categorias...`,
          step_total: hubCategories.length,
        });

        // FIRST PASS: Create/update all categories WITHOUT parent_id
        let catIndex = 0;
        for (const hubCat of hubCategories) {
          if (!hubCat.name || !hubCat.slug) continue;

          const { data: existing } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", hubCat.slug)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("categories")
              .update({
                name: hubCat.name,
                description: hubCat.description || null,
                image_url: hubCat.image_url || null,
                sort_order: hubCat.sort_order || 0,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
            
            categorySlugToId.set(hubCat.slug, existing.id);
          } else {
            const { data: newCat, error: insertErr } = await supabase
              .from("categories")
              .insert({
                name: hubCat.name,
                slug: hubCat.slug,
                description: hubCat.description || null,
                image_url: hubCat.image_url || null,
                sort_order: hubCat.sort_order || 0,
                is_active: true,
              })
              .select("id")
              .single();

            if (!insertErr && newCat) {
              categorySlugToId.set(hubCat.slug, newCat.id);
              result.categoriesSynced++;
            } else {
              console.error(`Failed to create category ${hubCat.slug}:`, insertErr);
            }
          }
          catIndex++;
          if (catIndex % 5 === 0) {
            await updateProgress({
              step_progress: catIndex,
              categories_synced: result.categoriesSynced,
            });
          }
        }

        // SECOND PASS: Update parent_id relationships
        for (const hubCat of hubCategories) {
          if (!hubCat.slug || !hubCat.parent_slug) continue;
          
          const categoryId = categorySlugToId.get(hubCat.slug);
          const parentId = categorySlugToId.get(hubCat.parent_slug);

          if (categoryId && parentId) {
            await supabase
              .from("categories")
              .update({ parent_id: parentId })
              .eq("id", categoryId);
          }
        }

        console.log(`Categories sync complete. New: ${result.categoriesSynced}`);
        await updateProgress({
          step_progress: hubCategories.length,
          categories_synced: result.categoriesSynced,
          message: `${result.categoriesSynced} categorias sincronizadas`,
        });
      } else {
        console.log("Categories endpoint not available or returned error, skipping...");
      }
    } catch (catError) {
      console.log("Categories sync skipped (endpoint may not exist):", catError);
    }

    // Load all categories for product linking
    const { data: allCategories } = await supabase
      .from("categories")
      .select("id, slug");
    
    if (allCategories) {
      for (const cat of allCategories) {
        categorySlugToId.set(cat.slug, cat.id);
      }
    }

    // ========== STEP 1: Sync Attributes ==========
    await updateProgress({
      current_step: "attributes",
      message: "Buscando atributos do Hub...",
      step_progress: 0,
      step_total: 0,
    });

    try {
      const attributesUrl = `${baseUrl}/marketplace-attributes`;
      console.log("Fetching attributes from hub:", attributesUrl);
      
      const attrResponse = await fetch(attributesUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-seller-key": settings.hub_api_key,
        },
      });

      if (attrResponse.ok) {
        const attrData = await attrResponse.json();
        let hubAttributes: HubAttribute[] = [];
        
        if (Array.isArray(attrData)) {
          hubAttributes = attrData;
        } else if (attrData.data && Array.isArray(attrData.data)) {
          hubAttributes = attrData.data;
        } else if (attrData.attributes && Array.isArray(attrData.attributes)) {
          hubAttributes = attrData.attributes;
        }

        console.log(`Found ${hubAttributes.length} attributes from hub`);
        await updateProgress({
          message: `Processando ${hubAttributes.length} atributos...`,
          step_total: hubAttributes.length,
        });

        let attrIndex = 0;
        for (const hubAttr of hubAttributes) {
          if (!hubAttr.name || !hubAttr.slug) continue;

          const { data: existing } = await supabase
            .from("attributes")
            .select("id")
            .eq("slug", hubAttr.slug)
            .maybeSingle();

          let attributeId: string;

          if (existing) {
            attributeId = existing.id;
          } else {
            const { data: newAttr, error: insertErr } = await supabase
              .from("attributes")
              .insert({ name: hubAttr.name, slug: hubAttr.slug })
              .select("id")
              .single();

            if (insertErr || !newAttr) {
              console.error(`Failed to create attribute ${hubAttr.slug}:`, insertErr);
              continue;
            }
            attributeId = newAttr.id;
            result.attributesSynced++;
          }

          // Sync attribute values
          if (hubAttr.values && Array.isArray(hubAttr.values)) {
            for (const val of hubAttr.values) {
              if (!val.value) continue;

              const { data: existingVal } = await supabase
                .from("attribute_values")
                .select("id")
                .eq("attribute_id", attributeId)
                .eq("value", val.value)
                .maybeSingle();

              if (!existingVal) {
                await supabase.from("attribute_values").insert({
                  attribute_id: attributeId,
                  value: val.value,
                  meta_value: val.meta_value || null,
                  sort_order: val.sort_order || 0,
                });
              }
            }
          }
          attrIndex++;
          if (attrIndex % 2 === 0) {
            await updateProgress({
              step_progress: attrIndex,
              attributes_synced: result.attributesSynced,
            });
          }
        }
        await updateProgress({
          step_progress: hubAttributes.length,
          attributes_synced: result.attributesSynced,
          message: `${result.attributesSynced} atributos sincronizados`,
        });
      } else {
        console.log("Attributes endpoint not available or returned error, skipping...");
      }
    } catch (attrError) {
      console.log("Attributes sync skipped (endpoint may not exist):", attrError);
    }

    // ========== STEP 2: Prepare Attribute Maps for Harvesting ==========
    const attributeSlugToId: Map<string, string> = new Map();
    const attributeValues: Map<string, Set<string>> = new Map();

    const { data: existingAttrs } = await supabase
      .from("attributes")
      .select("id, slug, name");
    
    if (existingAttrs) {
      for (const attr of existingAttrs) {
        attributeSlugToId.set(attr.slug, attr.id);
        attributeValues.set(attr.id, new Set());
      }
    }

    const { data: existingValues } = await supabase
      .from("attribute_values")
      .select("attribute_id, value");
    
    if (existingValues) {
      for (const val of existingValues) {
        const set = attributeValues.get(val.attribute_id);
        if (set) {
          set.add(val.value.toLowerCase());
        }
      }
    }

    // Helper function to harvest attribute values from variant attrs
    async function harvestAttributeValue(key: string, value: string): Promise<void> {
      if (!key || !value) return;
      
      const slug = key.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const normalizedValue = String(value).trim();
      
      if (!normalizedValue) return;

      let attributeId: string | undefined = attributeSlugToId.get(slug);

      if (!attributeId) {
        const { data: newAttr, error } = await supabase
          .from("attributes")
          .insert({ name: key, slug: slug })
          .select("id")
          .single();

        if (!error && newAttr) {
          const newId = newAttr.id;
          attributeSlugToId.set(slug, newId);
          attributeValues.set(newId, new Set());
          attributeId = newId;
          result.attributesSynced++;
          console.log(`Created attribute: ${key} (${slug})`);
        } else {
          const { data: existingAttr } = await supabase
            .from("attributes")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();
          
          if (existingAttr) {
            const existingId = existingAttr.id;
            attributeSlugToId.set(slug, existingId);
            attributeValues.set(existingId, new Set());
            attributeId = existingId;
          } else {
            console.error(`Failed to create/find attribute ${key}:`, error);
            return;
          }
        }
      }

      if (!attributeId) return;

      const valuesSet = attributeValues.get(attributeId);
      if (valuesSet && !valuesSet.has(normalizedValue.toLowerCase())) {
        const { error } = await supabase
          .from("attribute_values")
          .insert({
            attribute_id: attributeId,
            value: normalizedValue,
            sort_order: valuesSet.size,
          });

        if (!error) {
          valuesSet.add(normalizedValue.toLowerCase());
          result.attributeValuesHarvested++;
        }
      }
    }

    // ========== STEP 3: Sync Products with Pagination ==========
    // Set initial estimate based on existing product count for better UX
    const { count: existingCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });
    
    // Use existing count as baseline estimate, with minimum of 50
    const initialEstimate = Math.max(existingCount || 50, 50);
    
    await updateProgress({
      current_step: "products",
      message: "Preparando importação de produtos...",
      step_progress: 0,
      step_total: initialEstimate,
    });

    const PAGE_SIZE = 50;
    let currentPage = 1;
    let hasMore = true;
    let totalFetched = 0;
    let estimatedTotal = initialEstimate;

    while (hasMore) {
      const hubUrl = `${baseUrl}/marketplace-products?page=${currentPage}&limit=${PAGE_SIZE}`;
      console.log(`Fetching products page ${currentPage}:`, hubUrl);
      
      await updateProgress({
        message: `Buscando página ${currentPage}...`,
      });

      const hubResponse = await fetch(hubUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-seller-key": settings.hub_api_key,
        },
      });

      if (!hubResponse.ok) {
        const errorText = await hubResponse.text();
        console.error("Hub response error:", hubResponse.status, errorText);
        
        if (currentPage === 1) {
          await updateProgress({
            status: "error",
            message: `Erro ao conectar ao Hub: ${hubResponse.status}`,
            errors: [errorText],
            completed_at: new Date().toISOString(),
          });
          return new Response(
            JSON.stringify({
              success: false,
              message: `Erro ao conectar ao Hub: ${hubResponse.status} ${hubResponse.statusText}`,
              created: 0,
              updated: 0,
              categoriesSynced: result.categoriesSynced,
              attributesSynced: result.attributesSynced,
              attributeValuesHarvested: result.attributeValuesHarvested,
              errors: [errorText],
              syncId,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      const hubData = await hubResponse.json();
      
      let hubProducts: HubProduct[] = [];
      
      if (Array.isArray(hubData)) {
        hubProducts = hubData;
      } else if (hubData.products && Array.isArray(hubData.products)) {
        hubProducts = hubData.products;
      } else if (hubData.data && Array.isArray(hubData.data)) {
        hubProducts = hubData.data;
      }

      // Estimate total on first page
      if (currentPage === 1 && hubProducts.length === PAGE_SIZE) {
        // Rough estimate: assume at least 3-5 pages
        estimatedTotal = PAGE_SIZE * 5;
      } else if (currentPage === 1) {
        estimatedTotal = hubProducts.length;
      }

      console.log(`Page ${currentPage}: Received ${hubProducts.length} products`);
      totalFetched += hubProducts.length;

      await updateProgress({
        step_progress: totalFetched,
        step_total: Math.max(estimatedTotal, totalFetched),
        message: `Processando ${totalFetched} produtos (página ${currentPage})...`,
        products_created: result.created,
        products_updated: result.updated,
      });

      // Process each product
      for (const hubProduct of hubProducts) {
        try {
          if (!hubProduct.title || !hubProduct.slug) {
            result.errors.push(`Produto sem título ou slug válido`);
            continue;
          }

          // Determine if this is a multi-variant product
          const hasMultipleVariants = hubProduct.variants && hubProduct.variants.length > 0;
          
          // Use product-level SKU for single variants, or first variant SKU for lookup
          const primarySku = hasMultipleVariants 
            ? hubProduct.variants![0].sku 
            : hubProduct.sku;

          if (!primarySku) {
            result.errors.push(`Produto ${hubProduct.title} sem SKU válido`);
            continue;
          }

          // Check if product already exists by looking for any variant with matching SKUs
          let existingProductId: string | null = null;
          
          if (hasMultipleVariants) {
            // For multi-variant products, check if any of the variant SKUs already exist
            const variantSkus = hubProduct.variants!.map(v => v.sku).filter(Boolean);
            const { data: existingVariants } = await supabase
              .from("variants")
              .select("id, product_id")
              .in("sku", variantSkus)
              .limit(1);
            
            if (existingVariants && existingVariants.length > 0) {
              existingProductId = existingVariants[0].product_id;
            }
          } else {
            // For single-variant products, use the product SKU
            const { data: existingVariant } = await supabase
              .from("variants")
              .select("id, product_id")
              .eq("sku", primarySku)
              .maybeSingle();
            
            if (existingVariant) {
              existingProductId = existingVariant.product_id;
            }
          }

          // ========== FIND OR CREATE CATEGORY WITH HIERARCHY ==========
          let categoryId: string | null = null;
          
          // Try category_slug first (from Hub's category endpoint)
          if (hubProduct.category_slug) {
            const mappedId = categorySlugToId.get(hubProduct.category_slug);
            if (mappedId) {
              categoryId = mappedId;
            }
          }
          
          // If no category found, try to extract from category/categories fields
          if (!categoryId) {
            let categoryInfo: ExtractedCategoryInfo | null = null;
            
            // Try 'category' field (string or object with hierarchy)
            if (hubProduct.category) {
              categoryInfo = extractCategoryInfo(hubProduct.category);
            }
            
            // Try 'categories' field (array or single value)
            if (!categoryInfo && hubProduct.categories) {
              if (Array.isArray(hubProduct.categories)) {
                if (hubProduct.categories.length > 0) {
                  categoryInfo = extractCategoryInfo(hubProduct.categories[0]);
                }
              } else {
                categoryInfo = extractCategoryInfo(hubProduct.categories);
              }
            }
            
            // Check for flat parent_category fields on product
            if (categoryInfo && !categoryInfo.parentName && hubProduct.parent_category) {
              categoryInfo.parentName = hubProduct.parent_category;
              categoryInfo.parentSlug = hubProduct.parent_category_slug;
            }
            
            // Helper function to find or create a single category
            async function findOrCreateCategory(
              name: string, 
              slug?: string, 
              parentId?: string | null
            ): Promise<string | null> {
              const categorySlug = slug || generateSlug(name);
              
              // Check map first
              let existingCatId = categorySlugToId.get(categorySlug);
              
              if (!existingCatId) {
                // Check database by slug
                const { data: existingCat } = await supabase
                  .from("categories")
                  .select("id")
                  .eq("slug", categorySlug)
                  .maybeSingle();
                
                if (existingCat) {
                  existingCatId = existingCat.id;
                  categorySlugToId.set(categorySlug, existingCat.id);
                }
              }
              
              if (!existingCatId) {
                // Try by name
                const { data: existingByName } = await supabase
                  .from("categories")
                  .select("id, slug")
                  .ilike("name", name)
                  .maybeSingle();
                
                if (existingByName) {
                  existingCatId = existingByName.id;
                  categorySlugToId.set(existingByName.slug, existingByName.id);
                }
              }
              
              if (!existingCatId) {
                // CREATE new category
                console.log(`[sync] Creating category: ${name} (${categorySlug})${parentId ? ` -> parent: ${parentId}` : ''}`);
                const { data: newCat, error: catError } = await supabase
                  .from("categories")
                  .insert({
                    name: name,
                    slug: categorySlug,
                    parent_id: parentId || null,
                    is_active: true,
                  })
                  .select("id")
                  .single();
                
                if (!catError && newCat) {
                  existingCatId = newCat.id;
                  categorySlugToId.set(categorySlug, newCat.id);
                  result.categoriesSynced++;
                  console.log(`[sync] Created category: ${name} -> ${newCat.id}`);
                } else {
                  console.error(`[sync] Failed to create category ${name}:`, catError);
                  return null;
                }
              }
              
              return existingCatId || null;
            }
            
            // Process category with hierarchy
            if (categoryInfo) {
              let parentCategoryId: string | null = null;
              
              // First, create parent category if specified
              if (categoryInfo.parentName) {
                parentCategoryId = await findOrCreateCategory(
                  categoryInfo.parentName,
                  categoryInfo.parentSlug,
                  null // Top-level parent
                );
                
                if (parentCategoryId) {
                  console.log(`[sync] Parent category ready: ${categoryInfo.parentName} -> ${parentCategoryId}`);
                }
              }
              
              // Then create/find the child category with parent link
              categoryId = await findOrCreateCategory(
                categoryInfo.name,
                categoryInfo.slug,
                parentCategoryId
              );
            }
          }

          // Clean product-level attributes for metadata
          const cleanProductAttrs = sanitizeAttributes(hubProduct.attributes);

          const productData = {
            title: hubProduct.title,
            slug: hubProduct.slug,
            description: hubProduct.description || null,
            base_price: hubProduct.price || 0,
            promotional_price: hubProduct.promotional_price || null,
            weight: hubProduct.weight || 1.0,
            width: hubProduct.width || 20,
            height: hubProduct.height || 15,
            length: hubProduct.length || 10,
            image_url: hubProduct.images?.[0] || null,
            category_id: categoryId,
            metadata: cleanProductAttrs && Object.keys(cleanProductAttrs).length > 0 
              ? { hub_attributes: cleanProductAttrs } 
              : {},
            is_active: true,
            updated_at: new Date().toISOString(),
          };

          let productId: string;

          if (existingProductId) {
            // UPDATE existing product
            productId = existingProductId;
            const updateData: Record<string, unknown> = { ...productData };

            if (!settings.hub_auto_update_prices) {
              delete updateData.base_price;
              delete updateData.promotional_price;
            }

            await supabase
              .from("products")
              .update(updateData)
              .eq("id", productId);

            // Handle gallery images
            if (hubProduct.images && hubProduct.images.length > 1) {
              await supabase
                .from("product_images")
                .delete()
                .eq("product_id", productId);

              const galleryImages = hubProduct.images.slice(1).map((url, index) => ({
                product_id: productId,
                image_url: url,
                sort_order: index + 1,
              }));

              await supabase.from("product_images").insert(galleryImages);
            }

            result.updated++;
          } else {
            // CREATE new product
            const { data: newProduct, error: insertError } = await supabase
              .from("products")
              .insert({
                ...productData,
                created_at: new Date().toISOString(),
              })
              .select("id")
              .single();

            if (insertError) {
              result.errors.push(`Produto ${hubProduct.title}: ${insertError.message}`);
              continue;
            }

            productId = newProduct.id;

            // Handle gallery images for new product
            if (hubProduct.images && hubProduct.images.length > 1) {
              const galleryImages = hubProduct.images.slice(1).map((url, index) => ({
                product_id: productId,
                image_url: url,
                sort_order: index + 1,
              }));

              await supabase.from("product_images").insert(galleryImages);
            }

            result.created++;
          }

          // ========== PROCESS VARIANTS ==========
          if (hasMultipleVariants) {
            // Multi-variant product: delete old variants and create new ones
            await supabase
              .from("variants")
              .delete()
              .eq("product_id", productId);

            for (const hubVariant of hubProduct.variants!) {
              if (!hubVariant.sku) {
                result.errors.push(`Variante sem SKU para produto ${hubProduct.title}`);
                continue;
              }

              const cleanVariantAttrs = sanitizeAttributes(hubVariant.attributes);

              // Harvest attribute values for this variant
              for (const [attrKey, attrValue] of Object.entries(cleanVariantAttrs)) {
                await harvestAttributeValue(attrKey, attrValue);
              }

              const variantData = {
                product_id: productId,
                sku: hubVariant.sku,
                stock_level: getVariantStock(hubVariant),
                attrs: cleanVariantAttrs,
                price: hubVariant.price || null,
                price_modifier: 0,
                image_url: hubVariant.image_url || null,
                ean_gtin: hubVariant.ean_gtin || null,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              const { error: variantError } = await supabase
                .from("variants")
                .insert(variantData);

              if (variantError) {
                result.errors.push(`Variante ${hubVariant.sku}: ${variantError.message}`);
              }
            }
          } else {
            // Single-variant product: upsert single variant
            const cleanAttrs = sanitizeAttributes(hubProduct.attributes);

            // Harvest attribute values
            for (const [attrKey, attrValue] of Object.entries(cleanAttrs)) {
              await harvestAttributeValue(attrKey, attrValue);
            }

            // Check if variant exists
            const { data: existingVariant } = await supabase
              .from("variants")
              .select("id")
              .eq("sku", primarySku)
              .maybeSingle();

            if (existingVariant) {
              // Update existing variant
              await supabase
                .from("variants")
                .update({
                  stock_level: getProductStock(hubProduct),
                  attrs: cleanAttrs,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingVariant.id);
            } else {
              // Create new variant
              await supabase.from("variants").insert({
                product_id: productId,
                sku: primarySku,
                stock_level: getProductStock(hubProduct),
                attrs: cleanAttrs,
                price: null,
                price_modifier: 0,
                is_active: true,
              });
            }
          }

        } catch (productError) {
          const errorMsg = productError instanceof Error ? productError.message : "Erro desconhecido";
          result.errors.push(`Produto ${hubProduct.title || hubProduct.sku}: ${errorMsg}`);
        }
      }

      // Update progress after each page
      await updateProgress({
        products_created: result.created,
        products_updated: result.updated,
        attribute_values_harvested: result.attributeValuesHarvested,
      });

      if (hubProducts.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        currentPage++;
        // Update estimate as we learn more
        if (currentPage > 3) {
          estimatedTotal = Math.max(estimatedTotal, totalFetched + PAGE_SIZE);
        }
      }
    }

    // Update last sync timestamp
    await supabase
      .from("store_settings")
      .update({ hub_last_sync_at: new Date().toISOString() })
      .eq("id", "00000000-0000-0000-0000-000000000001");

    result.success = true;
    result.message = `Sincronização concluída: ${result.categoriesSynced} categorias, ${result.attributesSynced} atributos (${result.attributeValuesHarvested} valores colhidos), ${result.created} produtos criados, ${result.updated} atualizados.`;

    if (result.errors.length > 0) {
      result.message += ` ${result.errors.length} erros.`;
    }

    console.log(`Sync complete. Categories: ${result.categoriesSynced}, Attributes: ${result.attributesSynced}, Values harvested: ${result.attributeValuesHarvested}, Total fetched: ${totalFetched}, Created: ${result.created}, Updated: ${result.updated}`);

    // Mark as completed
    await updateProgress({
      status: "completed",
      current_step: "finalizing",
      step_progress: totalFetched,
      step_total: totalFetched,
      message: result.message,
      categories_synced: result.categoriesSynced,
      attributes_synced: result.attributesSynced,
      attribute_values_harvested: result.attributeValuesHarvested,
      products_created: result.created,
      products_updated: result.updated,
      errors: result.errors.slice(0, 50), // Limit stored errors
      completed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Sync error:", error);
    await updateProgress({
      status: "error",
      message: error instanceof Error ? error.message : "Erro ao sincronizar",
      completed_at: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Erro ao sincronizar com o Hub",
        created: 0,
        updated: 0,
        categoriesSynced: 0,
        attributesSynced: 0,
        attributeValuesHarvested: 0,
        errors: [],
        syncId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
