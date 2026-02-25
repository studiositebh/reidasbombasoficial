import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Grid3X3, Search, User, ShoppingCart, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onOpenCart: () => void;
  onOpenSearch: () => void;
}

export function MobileBottomNav({ onOpenCart, onOpenSearch }: MobileBottomNavProps) {
  const location = useLocation();
  const { totalItems } = useCart();
  const { data: categories = [] } = useCategories();
  const [showCategories, setShowCategories] = useState(false);

  const mainCategories = categories.filter(c => !c.parent_id).slice(0, 8);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Categories Overlay */}
      {showCategories && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setShowCategories(false)} 
          />
          <div className="absolute bottom-16 left-0 right-0 bg-card rounded-t-2xl p-4 animate-fade-in-up safe-area-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Categorias</h3>
              <button 
                onClick={() => setShowCategories(false)}
                className="p-1 hover:bg-muted rounded-full"
                aria-label="Fechar menu de categorias"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {mainCategories.map((category) => (
                <Link
                  key={category.id}
                  to={`/categoria/${category.slug}`}
                  className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm font-medium hover:bg-accent transition-colors"
                  onClick={() => setShowCategories(false)}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Navegação principal mobile">
        <Link 
          to="/" 
          className={cn(
            "mobile-nav-item",
            isActive("/") && "text-primary"
          )}
          aria-label="Ir para página inicial"
          aria-current={isActive("/") ? "page" : undefined}
        >
          <Home className="h-5 w-5" aria-hidden="true" />
          <span>Início</span>
        </Link>

        <button 
          onClick={() => setShowCategories(true)}
          className="mobile-nav-item"
          aria-label="Abrir menu de categorias"
          aria-expanded={showCategories}
        >
          <Grid3X3 className="h-5 w-5" aria-hidden="true" />
          <span>Categorias</span>
        </button>

        <button 
          onClick={onOpenSearch}
          className="mobile-nav-item"
          aria-label="Abrir campo de busca"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
          <span>Buscar</span>
        </button>

        <Link 
          to="/account" 
          className={cn(
            "mobile-nav-item",
            isActive("/account") && "text-primary"
          )}
          aria-label="Acessar minha conta"
          aria-current={isActive("/account") ? "page" : undefined}
        >
          <User className="h-5 w-5" aria-hidden="true" />
          <span>Conta</span>
        </Link>

        <button 
          onClick={onOpenCart}
          className="mobile-nav-item relative"
          aria-label={`Abrir carrinho de compras${totalItems > 0 ? ` com ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}` : ''}`}
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center font-bold" aria-hidden="true">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </div>
          <span>Carrinho</span>
        </button>
      </nav>
    </>
  );
}
