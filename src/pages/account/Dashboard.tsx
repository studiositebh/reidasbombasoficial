import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, MapPin, MessageCircle, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings, getWhatsAppUrl } from "@/hooks/useStoreSettings";
import { WHATSAPP_MESSAGES } from "@/lib/constants";

interface LastOrder {
  id: string;
  status: string;
  created_at: string;
  total_amount: number;
}

interface DefaultAddress {
  id: string;
  label: string;
  street: string;
  number: string;
  city: string;
  state: string;
}

// WhatsApp URL is now fetched dynamically from useStoreSettings

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  paid: { label: "Pago", color: "bg-green-100 text-green-800" },
  shipped: { label: "Enviado", color: "bg-blue-100 text-blue-800" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

export default function AccountDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [defaultAddress, setDefaultAddress] = useState<DefaultAddress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: settings } = useStoreSettings();
  
  const whatsappUrl = getWhatsAppUrl(settings?.whatsappUrl || "", WHATSAPP_MESSAGES.help);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();

        setProfile(profileData);

        // Fetch last order
        const { data: orderData } = await supabase
          .from("orders")
          .select("id, status, created_at, total_amount")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        setLastOrder(orderData);

        // Fetch default address
        const { data: addressData } = await supabase
          .from("addresses")
          .select("id, label, street, number, city, state")
          .eq("user_id", user.id)
          .eq("is_default", true)
          .single();

        setDefaultAddress(addressData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Cliente";

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, <span className="text-primary">{firstName}</span>!
        </h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo(a) à sua área de cliente. Gerencie seus pedidos e informações.
        </p>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Last Order Card */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Package className="h-5 w-5 text-primary" />
              Último Pedido
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : lastOrder ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={statusLabels[lastOrder.status]?.color || "bg-gray-100"}>
                    {statusLabels[lastOrder.status]?.label || lastOrder.status}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">
                    {formatPrice(lastOrder.total_amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatDate(lastOrder.created_at)}
                </div>
                <Link to="/account/orders">
                  <Button variant="outline" size="sm" className="w-full mt-2 border-primary text-primary hover:bg-primary/10">
                    Ver Todos os Pedidos
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">Você ainda não fez nenhum pedido.</p>
                <Link to="/">
                  <Button size="sm" className="btn-primary">Ver Produtos</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Default Address Card */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              Endereço Padrão
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : defaultAddress ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm text-foreground">{defaultAddress.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {defaultAddress.street}, {defaultAddress.number}<br />
                  {defaultAddress.city} - {defaultAddress.state}
                </p>
                <Link to="/account/addresses">
                  <Button variant="outline" size="sm" className="w-full mt-2 border-primary text-primary hover:bg-primary/10">
                    Gerenciar Endereços
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">Nenhum endereço cadastrado.</p>
                <Link to="/account/addresses">
                  <Button size="sm" className="btn-primary">Adicionar Endereço</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Action - WhatsApp Support */}
      <Card className="border-primary/30 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Precisa de ajuda?</p>
                <p className="text-sm text-muted-foreground">Fale conosco pelo WhatsApp</p>
              </div>
            </div>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Falar com Suporte
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
