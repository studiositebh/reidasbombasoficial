import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import Category from "./pages/Category";
import Checkout from "./pages/Checkout";
import OrderConfirmed from "./pages/OrderConfirmed";
import OrderPending from "./pages/OrderPending";
import AdminSetup from "./pages/AdminSetup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import ReturnsPolicy from "./pages/ReturnsPolicy";
import TrackOrder from "./pages/TrackOrder";
import TrackShipping from "./pages/TrackShipping";
import Logout from "./pages/Logout";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import ProductEditor from "./pages/admin/ProductEditor";
import Categories from "./pages/admin/Categories";
import Attributes from "./pages/admin/Attributes";
import Orders from "./pages/admin/Orders";
import OrderDetail from "./pages/admin/OrderDetail";
import Customers from "./pages/admin/Customers";
import Coupons from "./pages/admin/Coupons";
import Users from "./pages/admin/Users";
import StoreSettings from "./pages/admin/StoreSettings";
import Payments from "./pages/admin/Payments";
import Marketplace from "./pages/admin/Marketplace";
import Reports from "./pages/admin/Reports";
import Leads from "./pages/admin/Leads";
import AdminPromotions from "./pages/admin/Promotions";
import AdminReviews from "./pages/admin/Reviews";
import Promotions from "./pages/Promotions";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";
import AboutUs from "./pages/AboutUs";
import Contact from "./pages/Contact";

// Customer Account Pages
import { AccountLayout } from "./components/account/AccountLayout";
import AccountDashboard from "./pages/account/Dashboard";
import AccountOrders from "./pages/account/Orders";
import AccountAddresses from "./pages/account/Addresses";
import AccountProfile from "./pages/account/Profile";
import AccountSavedCards from "./pages/account/SavedCards";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" richColors />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/produto/:slug" element={<ProductDetail />} />
              <Route path="/categoria/:slug" element={<Category />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/pedido-confirmado" element={<OrderConfirmed />} />
              <Route path="/pedido-pendente" element={<OrderPending />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/politica-privacidade" element={<PrivacyPolicy />} />
              <Route path="/termos-uso" element={<TermsOfUse />} />
              <Route path="/trocas-devolucoes" element={<ReturnsPolicy />} />
              <Route path="/rastrear" element={<TrackOrder />} />
              <Route path="/rastrear-envio" element={<TrackShipping />} />
              <Route path="/promocoes" element={<Promotions />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/sobre-nos" element={<AboutUs />} />
              <Route path="/contato" element={<Contact />} />
              <Route path="/logout" element={<Logout />} />
              
              {/* Customer Account Routes */}
              <Route path="/account" element={<AccountLayout />}>
                <Route index element={<AccountDashboard />} />
                <Route path="orders" element={<AccountOrders />} />
                <Route path="addresses" element={<AccountAddresses />} />
                <Route path="cards" element={<AccountSavedCards />} />
                <Route path="profile" element={<AccountProfile />} />
              </Route>
              
              {/* Admin Routes */}
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/products" element={<Products />} />
              <Route path="/admin/products/new" element={<ProductEditor />} />
              <Route path="/admin/products/:id/edit" element={<ProductEditor />} />
              <Route path="/admin/promotions" element={<AdminPromotions />} />
              <Route path="/admin/categories" element={<Categories />} />
              <Route path="/admin/attributes" element={<Attributes />} />
              <Route path="/admin/orders" element={<Orders />} />
              <Route path="/admin/orders/:id" element={<OrderDetail />} />
              <Route path="/admin/customers" element={<Customers />} />
              <Route path="/admin/coupons" element={<Coupons />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/payments" element={<Payments />} />
              <Route path="/admin/marketplace" element={<Marketplace />} />
              <Route path="/admin/settings" element={<StoreSettings />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/leads" element={<Leads />} />
              <Route path="/admin/reviews" element={<AdminReviews />} />
              <Route path="/admin-setup" element={<AdminSetup />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
