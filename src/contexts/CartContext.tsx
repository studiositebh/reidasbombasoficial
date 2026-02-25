import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import type { Variant, Product } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CartItem {
  product: Product;
  variant: Variant;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, variant: Variant, quantity: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  openCart: () => void;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "rei-das-bombas-cart";

export function CartProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const isSyncing = useRef(false);
  const hasLoadedFromDb = useRef(false);

  // Load cart from localStorage (for anonymous users or initial load)
  const loadFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as CartItem[];
      }
    } catch (err) {
      console.error("Error loading cart from localStorage:", err);
    }
    return [];
  }, []);

  // Save cart to localStorage
  const saveToLocalStorage = useCallback((cartItems: CartItem[]) => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (err) {
      console.error("Error saving cart to localStorage:", err);
    }
  }, []);

  // Load cart from database for logged-in users
  const loadFromDatabase = useCallback(async (userId: string): Promise<CartItem[]> => {
    try {
      const { data: cartData, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          variant_id,
          product_id,
          quantity,
          variants!inner (
            id,
            sku,
            attrs,
            price_modifier,
            stock_level,
            image_url,
            is_active
          ),
          products!inner (
            id,
            title,
            slug,
            base_price,
            promotional_price,
            image_url,
            description,
            is_active
          )
        `)
        .eq("user_id", userId);

      if (error) {
        console.error("Error loading cart from database:", error);
        return [];
      }

      if (!cartData) return [];

      return cartData
        .filter((item) => {
          const variant = item.variants as unknown as Variant;
          const product = item.products as unknown as Product;
          return variant?.is_active && product?.is_active;
        })
        .map((item) => ({
          product: item.products as unknown as Product,
          variant: item.variants as unknown as Variant,
          quantity: item.quantity,
        }));
    } catch (err) {
      console.error("Error loading cart from database:", err);
      return [];
    }
  }, []);

  // Sync cart to database
  const syncToDatabase = useCallback(async (userId: string, cartItems: CartItem[]) => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    try {
      // Delete all current cart items for this user
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      // Insert new cart items
      if (cartItems.length > 0) {
        const inserts = cartItems.map((item) => ({
          user_id: userId,
          variant_id: item.variant.id,
          product_id: item.product.id,
          quantity: item.quantity,
        }));

        const { error } = await supabase
          .from("cart_items")
          .insert(inserts);

        if (error) {
          console.error("Error syncing cart to database:", error);
        }
      }
    } catch (err) {
      console.error("Error syncing cart to database:", err);
    } finally {
      isSyncing.current = false;
    }
  }, []);

  // Merge localStorage cart with database cart
  const mergeAndLoad = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const localCart = loadFromLocalStorage();
      const dbCart = await loadFromDatabase(userId);

      // Merge: DB items take priority, but add local items not in DB
      const mergedMap = new Map<string, CartItem>();

      // Add DB items first
      dbCart.forEach((item) => {
        mergedMap.set(item.variant.id, item);
      });

      // Add local items that aren't in DB (or merge quantities)
      localCart.forEach((item) => {
        const existing = mergedMap.get(item.variant.id);
        if (existing) {
          // Merge quantities
          mergedMap.set(item.variant.id, {
            ...existing,
            quantity: existing.quantity + item.quantity,
          });
        } else {
          mergedMap.set(item.variant.id, item);
        }
      });

      const mergedCart = Array.from(mergedMap.values());
      setItems(mergedCart);

      // Sync merged cart to database
      if (mergedCart.length > 0 || localCart.length > 0) {
        await syncToDatabase(userId, mergedCart);
      }

      // Clear localStorage after successful merge
      localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setIsLoading(false);
      hasLoadedFromDb.current = true;
    }
  }, [loadFromLocalStorage, loadFromDatabase, syncToDatabase]);

  // Initial load based on auth state
  useEffect(() => {
    if (user?.id) {
      // User is logged in - load from DB and merge with localStorage
      if (!hasLoadedFromDb.current) {
        mergeAndLoad(user.id);
      }
    } else {
      // Anonymous user - load from localStorage
      hasLoadedFromDb.current = false;
      const localCart = loadFromLocalStorage();
      setItems(localCart);
    }
  }, [user?.id, mergeAndLoad, loadFromLocalStorage]);

  // Sync changes to database or localStorage
  useEffect(() => {
    // Skip initial render and loading state
    if (isLoading) return;

    if (user?.id && hasLoadedFromDb.current) {
      // Sync to database for logged-in users
      syncToDatabase(user.id, items);
    } else if (!user?.id) {
      // Save to localStorage for anonymous users
      saveToLocalStorage(items);
    }
  }, [items, user?.id, isLoading, syncToDatabase, saveToLocalStorage]);

  const addItem = (product: Product, variant: Variant, quantity: number) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.variant.id === variant.id);
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      
      return [...prev, { product, variant, quantity }];
    });
  };

  const removeItem = (variantId: string) => {
    setItems((prev) => prev.filter((item) => item.variant.id !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }
    
    setItems((prev) =>
      prev.map((item) =>
        item.variant.id === variantId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const openCart = () => {
    setCartOpen(true);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce((sum, item) => {
    const price = item.product.base_price + (item.variant.price_modifier || 0);
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        isCartOpen,
        setCartOpen,
        openCart,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
