import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ColorMapping {
  value: string;
  hexCode: string | null;
}

export function useAttributeColors() {
  return useQuery({
    queryKey: ["attribute-colors"],
    queryFn: async (): Promise<Map<string, string>> => {
      // Fetch the "Cor" or "Color" attribute and its values with meta_value (hex codes)
      const { data: colorAttrs } = await supabase
        .from("attributes")
        .select("id, slug, name")
        .or("slug.eq.cor,slug.eq.color,name.ilike.%cor%,name.ilike.%color%")
        .limit(5);

      if (!colorAttrs || colorAttrs.length === 0) {
        return new Map();
      }

      const attrIds = colorAttrs.map((a) => a.id);

      // Fetch all values for these color attributes
      const { data: values } = await supabase
        .from("attribute_values")
        .select("value, meta_value")
        .in("attribute_id", attrIds);

      if (!values) {
        return new Map();
      }

      // Build a map of color name (lowercase) -> hex code
      const colorMap = new Map<string, string>();
      for (const val of values) {
        if (val.meta_value && isValidHex(val.meta_value)) {
          colorMap.set(val.value.toLowerCase().trim(), val.meta_value);
        }
      }

      return colorMap;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Validate if string is a valid hex color
function isValidHex(str: string): boolean {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(str);
}
