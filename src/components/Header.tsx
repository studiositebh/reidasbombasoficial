import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Link } from "react-router-dom";
import { 
  Search, ShoppingCart, Phone, Truck, User, Heart,
  MapPin, Package, Fuel, Gauge, 
  Settings, Cog, ChevronDown, type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";
import { useSearch } from "@/hooks/useSearch";
import { useCategories } from "@/hooks/useCategories";
import { SearchResults } from "@/components/SearchResults";
import { CartDrawer } from "@/components/CartDrawer";
import logo from "@/assets/logo.png";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStoreSettings, getWhatsAppUrl } from "@/hooks/useStoreSettings";
import { WHATSAPP_MESSAGES, STORE_DEFAULTS } from "@/lib/constants";

// Agrupamento de categorias para o menu principal
const menuGroups: { label: string; icon: LucideIcon; slugs: string[] }[] = [
  { label: "Abastecimento", icon: Fuel, slugs: ["bicoseacessorios", "filtros-e-elementos-filtrantes"] },
  { label: "Peças e Vedações", icon: Cog, slugs: ["vedacoes-e-diafragmas", "outros-acessorios-bomba"] },
  { label: "Eletrônicos", icon: Settings, slugs: ["eletronicos-e-automacao", "teclado"] },
  { label: "Medição e Análise", icon: Gauge, slugs: ["medicao", "analise-de-combustivel"] },
];

export interface HeaderRef {
  focusSearch: () => void;
}

export const Header = forwardRef<HeaderRef>((_, ref) => {
  const isMobile = useIsMobile();
  const [showResults, setShowResults] = useState(false);
  const [searchCategory, setSearchCategory] = useState("all");
  const [isScrolled, setIsScrolled] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  
  const { totalItems, subtotal, isCartOpen, setCartOpen } = useCart();
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { query, setQuery, results } = useSearch(products, searchCategory);
  const { data: settings } = useStoreSettings();

  const whatsappUrl = getWhatsAppUrl(settings?.whatsappUrl || "", WHATSAPP_MESSAGES.default);

  // Expose focusSearch method for MobileBottomNav
  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      if (mobileSearchInputRef.current) {
        mobileSearchInputRef.current.focus();
        mobileSearchInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
  }));

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideDesktop = desktopSearchRef.current?.contains(target);
      const isInsideMobile = mobileSearchRef.current?.contains(target);
      if (!isInsideDesktop && !isInsideMobile) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowResults(true);
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setQuery("");
  };

  return (
    <>
      {/* TOP BAR - Hidden on mobile */}
      <div className="topbar hidden md:block">
        <div className="container-custom">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 md:gap-6 text-[11px]">
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-green-500 hover:text-green-400 transition-colors"
              >
                <Phone className="h-3 w-3" />
                <span className="font-semibold">WhatsApp: {settings?.whatsapp || STORE_DEFAULTS.whatsapp}</span>
              </a>
              <span className="hidden sm:flex items-center gap-1.5">
                <Truck className="h-3 w-3 text-primary" />
                Frete Grátis acima de R$500
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <Link to="/rastrear" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Package className="h-3 w-3" />
                Rastrear Pedido
              </Link>
              <Link to="/contato" className="hidden md:flex items-center gap-1.5 hover:text-primary transition-colors">
                <MapPin className="h-3 w-3" />
                Nossas Lojas
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN HEADER - Sticky on desktop, scrollable on mobile */}
      <header className={`bg-white z-40 transition-shadow duration-300 ${
        isMobile ? "" : "sticky top-0"
      } ${isScrolled && !isMobile ? "shadow-lg" : "shadow-sm"}`}>
        <div className="container-custom py-3 md:py-4">
          <div className="flex items-center gap-4 md:gap-6 lg:gap-10">
            {/* Logo */}
            <Link to="/" className="shrink-0" aria-label="Ir para a página inicial - Rei das Bombas">
              <img src={logo} alt="Rei das Bombas - Equipamentos para Postos de Combustível" width={160} height={80} className="h-10 md:h-16 lg:h-20 w-auto" />
            </Link>

            {/* MEGA SEARCH BAR - Desktop only */}
            <div className="hidden md:flex flex-1 max-w-3xl" ref={desktopSearchRef}>
              <div className="flex w-full">
                {/* Category Selector - Dynamic */}
                <Select value={searchCategory} onValueChange={setSearchCategory}>
                  <SelectTrigger className="w-[180px] rounded-r-none border-r-0 bg-muted text-xs font-medium h-12 border-border">
                    <SelectValue placeholder="Todas as Categorias" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border shadow-lg z-[100]">
                    <SelectItem value="all">Todas as Categorias</SelectItem>
                    {categories.filter(c => !c.parent_id).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Search Input */}
                <div className="relative flex-1">
                  <Input
                    type="search"
                    placeholder="Buscar por nome, código ou medida (ex: 3/4 pol)"
                    className="rounded-none border-l-0 border-r-0 h-12 text-sm bg-muted border-border placeholder:text-muted-foreground"
                    value={query}
                    onChange={handleSearchChange}
                    onFocus={() => setShowResults(true)}
                  />
                  {showResults && (
                    <SearchResults products={results} query={query} onClose={handleCloseResults} />
                  )}
                </div>

                {/* Search Button */}
                <Button className="btn-primary rounded-l-none h-12 px-6" aria-label="Buscar produtos">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* ACTION BUTTONS - Desktop */}
            <div className="hidden md:flex items-center gap-2 md:gap-3 ml-auto">
              {/* Account */}
              <Link 
                to="/account" 
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded transition-colors"
              >
                <User className="h-5 w-5 text-primary" />
                <div className="hidden lg:block text-left">
                  <p className="text-[10px] text-gray-500">Olá, faça login</p>
                  <p className="text-xs font-semibold text-gray-800">Minha Conta</p>
                </div>
              </Link>

              {/* Favorites */}
              <Link 
                to="/favoritos" 
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded transition-colors"
              >
                <Heart className="h-5 w-5 text-primary" />
                <span className="hidden lg:block text-xs font-semibold text-gray-800">Favoritos</span>
              </Link>

              {/* Cart */}
              <button 
                onClick={() => setCartOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:brightness-110 transition-all shadow-gold"
              >
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center font-bold">
                      {totalItems > 99 ? "99" : totalItems}
                    </span>
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-[10px] opacity-80">Carrinho</p>
                  <p className="text-xs font-bold">{formatPrice(subtotal)}</p>
                </div>
              </button>
            </div>

            {/* Mobile: just show cart */}
            <div className="flex md:hidden items-center ml-auto">
              <button 
                onClick={() => setCartOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded hover:brightness-110 transition-all"
              >
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center font-bold">
                      {totalItems > 9 ? "9+" : totalItems}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Search - Below logo */}
          <div className="md:hidden mt-3" ref={mobileSearchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={mobileSearchInputRef}
                type="search"
                placeholder="Buscar produtos..."
                className="pl-10 h-11 bg-muted border-border"
                value={query}
                onChange={handleSearchChange}
                onFocus={() => setShowResults(true)}
              />
              {showResults && (
                <SearchResults products={results} query={query} onClose={handleCloseResults} />
              )}
            </div>
          </div>
        </div>

        {/* NAVIGATION BAR - Desktop only */}
        <nav className="bg-black hidden md:block">
          <div className="container-custom">
            <div className="flex items-center gap-1">
              {/* Menu com Dropdowns Agrupados */}
              {menuGroups.map((group) => {
                const groupCategories = categories.filter(c => group.slugs.includes(c.slug));
                return (
                  <div key={group.label} className="relative group">
                    <button className="px-4 py-3 text-sm font-medium text-white/80 hover:text-primary transition-colors flex items-center gap-1.5">
                      <group.icon className="h-4 w-4" />
                      {group.label}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {/* Dropdown */}
                    <div className="absolute top-full left-0 hidden group-hover:block bg-white rounded-b-lg shadow-xl z-50 min-w-[220px] border border-border">
                      {groupCategories.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/categoria/${cat.slug}`}
                          className="block px-4 py-3 text-sm text-foreground hover:bg-muted hover:text-primary transition-colors"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {/* Static Promotions Link */}
              <Link
                to="/promocoes"
                className="px-4 py-3 text-sm font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                🔥 Promoções
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Cart Drawer */}
      <CartDrawer open={isCartOpen} onOpenChange={setCartOpen} />
    </>
  );
});

Header.displayName = "Header";
