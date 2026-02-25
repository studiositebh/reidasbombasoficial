import { useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { 
  LayoutDashboard, Package, MapPin, UserCircle, LogOut, CreditCard 
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Visão Geral", href: "/account", icon: LayoutDashboard },
  { label: "Meus Pedidos", href: "/account/orders", icon: Package },
  { label: "Endereços", href: "/account/addresses", icon: MapPin },
  { label: "Cartões Salvos", href: "/account/cards", icon: CreditCard },
  { label: "Dados Pessoais", href: "/account/profile", icon: UserCircle },
];

export function AccountLayout() {
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container-custom py-8">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="bg-card border border-border rounded-lg p-4 sticky top-24">
              <h2 className="text-lg font-bold text-foreground mb-4 px-2">Minha Conta</h2>
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
                >
                  <LogOut className="h-5 w-5" />
                  Sair
                </button>
              </nav>
            </div>
          </aside>

          {/* Mobile Navigation */}
          <div className="lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:border-primary"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-card border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
