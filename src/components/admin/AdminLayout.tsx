import React, { ReactNode, useEffect, useState, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Package, ShoppingCart, Users, LogOut, Menu, X, ChevronRight,
  FolderTree, Layers, UserCog, ChevronDown, Store, BarChart3, Ticket, CreditCard, Link2,
  RefreshCw, AlertTriangle, UserPlus, Tag, MessageSquare, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, type RolePermissions } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import logo from "@/assets/logo-admin.png";

const LOADING_TIMEOUT_MS = 25000;

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  permission?: string; // Permission key from useUserRole
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

// All menu items with their required permissions
const allMenuSections: MenuSection[] = [
  {
    title: "CATÁLOGO",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/admin", permission: "canViewDashboard" },
      { icon: Package, label: "Produtos", href: "/admin/products", permission: "canViewProducts" },
      { icon: Tag, label: "Promoções", href: "/admin/promotions", permission: "canViewPromotions" },
      { icon: FolderTree, label: "Categorias", href: "/admin/categories", permission: "canViewCategories" },
      { icon: Layers, label: "Atributos", href: "/admin/attributes", permission: "canViewAttributes" },
    ],
  },
  {
    title: "VENDAS",
    items: [
      { icon: ShoppingCart, label: "Pedidos", href: "/admin/orders", permission: "canViewOrders" },
      { icon: Users, label: "Clientes", href: "/admin/customers", permission: "canViewCustomers" },
      { icon: UserPlus, label: "Leads", href: "/admin/leads", permission: "canViewLeads" },
      { icon: MessageSquare, label: "Avaliações", href: "/admin/reviews", permission: "canViewReviews" },
      { icon: Ticket, label: "Cupons", href: "/admin/coupons", permission: "canViewCoupons" },
      { icon: BarChart3, label: "Relatórios", href: "/admin/reports", permission: "canViewReports" },
    ],
  },
  {
    title: "CONTEÚDO",
    items: [
      { icon: FileText, label: "Blog", href: "/admin/blog", permission: "canViewBlog" },
    ],
  },
  {
    title: "SISTEMA",
    items: [
      { icon: UserCog, label: "Usuários do Time", href: "/admin/users", permission: "canViewUsers" },
      { icon: CreditCard, label: "Pagamentos", href: "/admin/payments", permission: "canViewPayments" },
      { icon: Link2, label: "Marketplace", href: "/admin/marketplace", permission: "canViewMarketplace" },
      { icon: Store, label: "Configurações", href: "/admin/settings", permission: "canViewSettings" },
    ],
  },
];

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(["CATÁLOGO", "VENDAS", "CONTEÚDO", "SISTEMA"]);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading, isAdminLoading, isAdminVerified, signOut, checkAdminRole } = useAuth();
  const { role, isLoading: roleLoading, hasPermission } = useUserRole();

  // Filter menu sections based on user permissions
  const filteredMenuSections = useMemo(() => {
    if (roleLoading || !role) return [];
    
    return allMenuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (!item.permission) return true;
          return hasPermission(item.permission as keyof RolePermissions);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [role, roleLoading, hasPermission]);

  // Check if user has ANY access to admin panel
  const hasAnyAccess = useMemo(() => {
    if (!role) return false;
    return filteredMenuSections.some((s) => s.items.length > 0);
  }, [role, filteredMenuSections]);

  // Timeout to prevent infinite loading
  useEffect(() => {
    const stillLoading = isLoading || isAdminLoading || roleLoading;
    
    if (stillLoading && !loadingTimedOut) {
      timeoutRef.current = setTimeout(() => {
        console.log("[AdminLayout] Loading timeout reached");
        setLoadingTimedOut(true);
      }, LOADING_TIMEOUT_MS);
    } else if (!stillLoading) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoadingTimedOut(false);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, isAdminLoading, roleLoading, loadingTimedOut]);

  useEffect(() => {
    if (isLoading || isAdminLoading || roleLoading) {
      console.log("[AdminLayout] Still loading, waiting...", { isLoading, isAdminLoading, roleLoading, user: user?.email });
      return;
    }
    
    const redirectTimer = setTimeout(() => {
      console.log("[AdminLayout] Evaluating redirect:", { user: user?.email, isAdmin, isAdminVerified, role, hasAnyAccess });
      
      if (!user) {
        console.log("[AdminLayout] No user after loading complete, redirecting to login");
        navigate("/login");
      } else if (role && hasAnyAccess) {
        // User has a role and can see at least one menu item
        console.log("[AdminLayout] User has role and access, allowing");
      } else if (!role) {
        // No role = no access to admin panel
        console.log("[AdminLayout] User has no role, redirecting to home");
        navigate("/");
      } else if (!hasAnyAccess) {
        // Has role but no permissions for any menu item
        console.log("[AdminLayout] User has role but no access, redirecting to home");
        navigate("/");
      }
    }, 300);
    
    return () => clearTimeout(redirectTimer);
  }, [isLoading, isAdminLoading, roleLoading, user, isAdmin, isAdminVerified, role, hasAnyAccess, navigate]);

  const handleLogout = async () => {
    console.log("[AdminLayout] handleLogout triggered");
    
    if (!user) {
      console.log("[AdminLayout] handleLogout called but no user, ignoring");
      return;
    }
    
    try {
      await signOut();
    } catch (err) {
      console.error("[AdminLayout] signOut error:", err);
    }
    navigate("/logout");
  };

  const handleRetry = async () => {
    console.log("[AdminLayout] handleRetry triggered");
    setIsRetrying(true);
    setLoadingTimedOut(false);
    try {
      await checkAdminRole();
    } catch (err) {
      console.error("[AdminLayout] retry error:", err);
    } finally {
      setIsRetrying(false);
    }
  };

  const toggleSection = (sectionTitle: string) => {
    setOpenSections(prev =>
      prev.includes(sectionTitle)
        ? prev.filter(s => s !== sectionTitle)
        : [...prev, sectionTitle]
    );
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(href);
  };

  // Timeout screen with recovery options
  if (loadingTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 relative z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center space-y-4 pointer-events-auto relative z-50">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">
            Não foi possível carregar
          </h2>
          <p className="text-gray-600">
            A verificação de permissões está demorando mais que o esperado. 
            Isso pode ser um problema temporário de conexão.
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <Button 
              type="button"
              onClick={handleRetry} 
              disabled={isRetrying}
              className="w-full pointer-events-auto"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Tentando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </>
              )}
            </Button>
            <Button 
              type="button"
              variant="outline" 
              onClick={handleLogout}
              className="w-full pointer-events-auto"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair e entrar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || isAdminLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f3f4f6]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-[#0a0a0a] text-white transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {sidebarOpen && (
            <Link to="/admin" className="flex items-center">
              <img src={logo} alt="Rei das Bombas" className="h-10 w-auto" />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hidden lg:flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <ChevronRight className={cn("h-5 w-5 transition-transform", !sidebarOpen && "rotate-180")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-2 overflow-y-auto">
          {filteredMenuSections.map((section) => (
            <Collapsible
              key={section.title}
              open={openSections.includes(section.title)}
              onOpenChange={() => sidebarOpen && toggleSection(section.title)}
            >
              {sidebarOpen ? (
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors">
                  <span>{section.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      openSections.includes(section.title) && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
              ) : (
                <div className="h-2" />
              )}

              <CollapsibleContent className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      isActive(item.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
                  </Link>
                ))}
              </CollapsibleContent>

              {/* When collapsed, show items without collapsible behavior */}
              {!sidebarOpen && (
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center justify-center py-2.5 rounded-lg transition-colors",
                        isActive(item.href)
                          ? "bg-primary text-primary-foreground"
                          : "text-gray-400 hover:text-white hover:bg-white/10"
                      )}
                      title={item.label}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  ))}
                </div>
              )}
            </Collapsible>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10 overflow-hidden">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 py-3 w-full rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors overflow-hidden",
              sidebarOpen ? "px-3" : "justify-center"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span className="font-medium truncate">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {title && <h1 className="text-xl font-semibold text-gray-900">{title}</h1>}
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Olá, <strong>{user?.email?.split("@")[0] || "Admin"}</strong>
              {role && <span className="ml-1 text-xs text-muted-foreground">({role})</span>}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
