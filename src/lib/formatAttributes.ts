/**
 * Utility functions for safely handling and formatting variant attributes
 * that may come from external sources (Hub) in various formats.
 */

import type { Json } from "@/integrations/supabase/types";

/**
 * Safely extracts the display value from an attribute that might be:
 * - A primitive (string, number)
 * - An object with a 'name' or 'value' property
 * - Null/undefined
 */
export function extractAttributeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Check common property names for display value
    if (obj.name && typeof obj.name === "string") {
      return obj.name;
    }
    if (obj.value && typeof obj.value === "string") {
      return obj.value;
    }
    if (obj.label && typeof obj.label === "string") {
      return obj.label;
    }
    if (obj.title && typeof obj.title === "string") {
      return obj.title;
    }
    // If it has an 'id', try to get the most descriptive field
    if (obj.id !== undefined) {
      for (const key of ["name", "value", "label", "title", "text"]) {
        if (obj[key] && typeof obj[key] === "string") {
          return obj[key] as string;
        }
      }
    }
  }
  
  // Fallback: don't show [object Object]
  return "";
}

/**
 * Safely converts attrs (which may be Json) to a clean Record<string, string>
 * filtering out empty values and properly extracting nested object values.
 */
export function sanitizeAttributes(attrs: Json | undefined | null): Record<string, string> {
  if (!attrs || typeof attrs !== "object" || Array.isArray(attrs)) {
    return {};
  }

  const result: Record<string, string> = {};
  const entries = Object.entries(attrs as Record<string, unknown>);
  
  for (const [key, value] of entries) {
    if (!key || key.startsWith("_")) continue; // Skip internal keys
    
    const extracted = extractAttributeValue(value);
    if (extracted && extracted.trim() !== "") {
      result[key] = extracted;
    }
  }
  
  return result;
}

/**
 * Formats an attribute key for display:
 * - Removes common prefixes (pa_, attribute_, attr_)
 * - Replaces underscores and hyphens with spaces
 * - Capitalizes each word
 * 
 * Examples:
 * - "pa_cor" -> "Cor"
 * - "pa_tamanho-voltagem" -> "Tamanho Voltagem"
 * - "cor" -> "Cor"
 */
export function formatAttributeLabel(key: string): string {
  let cleaned = key.toLowerCase().trim();
  
  // Remove common prefixes
  const prefixes = ["pa_", "attribute_", "attr_"];
  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length);
      break;
    }
  }
  
  // Replace underscores and hyphens with spaces
  cleaned = cleaned.replace(/[_-]/g, " ");
  
  // Capitalize each word
  return cleaned
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Formats attributes into a human-readable string
 * e.g., { "cor": "Azul", "tamanho": "G" } => "Cor: Azul, Tamanho: G"
 */
export function formatAttributesString(attrs: Json | undefined | null): string {
  const sanitized = sanitizeAttributes(attrs);
  
  return Object.entries(sanitized)
    .map(([key, value]) => {
      const displayKey = formatAttributeLabel(key);
      return `${displayKey}: ${value}`;
    })
    .join(", ");
}

/**
 * Get entries for rendering attribute badges
 * Returns array of [key, value] tuples with clean string values
 */
export function getAttributeEntries(attrs: Json | undefined | null, limit?: number): [string, string][] {
  const sanitized = sanitizeAttributes(attrs);
  let entries = Object.entries(sanitized);
  
  if (limit && limit > 0) {
    entries = entries.slice(0, limit);
  }
  
  return entries;
}
