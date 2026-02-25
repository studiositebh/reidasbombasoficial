import { createContext, useContext, useState, ReactNode } from "react";

interface ProductData {
  price: number;
  originalPrice?: number;
  onBuyNow: () => void;
  isBackorder?: boolean;
}

interface MobileProductContextType {
  productData: ProductData | null;
  setProductData: (data: ProductData | null) => void;
}

const MobileProductContext = createContext<MobileProductContextType | undefined>(undefined);

export function MobileProductProvider({ children }: { children: ReactNode }) {
  const [productData, setProductData] = useState<ProductData | null>(null);

  return (
    <MobileProductContext.Provider value={{ productData, setProductData }}>
      {children}
    </MobileProductContext.Provider>
  );
}

export function useMobileProduct() {
  const context = useContext(MobileProductContext);
  if (context === undefined) {
    throw new Error("useMobileProduct must be used within a MobileProductProvider");
  }
  return context;
}
