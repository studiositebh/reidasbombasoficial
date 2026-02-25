import { ReactNode, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Header, HeaderRef } from "./Header";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { useCart } from "@/contexts/CartContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const headerRef = useRef<HeaderRef>(null);
  const { setCartOpen } = useCart();
  
  // Check if we're on a product page
  const isProductPage = location.pathname.startsWith("/produto/");

  const handleOpenCart = () => {
    setCartOpen(true);
  };

  const handleOpenSearch = () => {
    headerRef.current?.focusSearch();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header ref={headerRef} />
      <main className={`flex-1 ${isMobile ? "mobile-content-padding" : ""}`}>
        {children}
      </main>
      <Footer />
      
      {/* Mobile Bottom Navigation - shown on non-product pages */}
      {isMobile && !isProductPage && (
        <MobileBottomNav 
          onOpenCart={handleOpenCart} 
          onOpenSearch={handleOpenSearch} 
        />
      )}
    </div>
  );
}
