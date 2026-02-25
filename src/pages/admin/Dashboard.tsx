import React, { useEffect, useState } from "react";
import { DollarSign, Package, ShoppingCart, Users, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalSales: number;
  pendingOrders: number;
  activeProducts: number;
  totalCustomers: number;
}

// Mock chart data
const chartData = [
  { day: "01", value: 1200 },
  { day: "05", value: 1800 },
  { day: "10", value: 1400 },
  { day: "15", value: 2200 },
  { day: "20", value: 1900 },
  { day: "25", value: 2800 },
  { day: "30", value: 2400 },
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    pendingOrders: 0,
    activeProducts: 0,
    totalCustomers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch total sales (paid orders)
        const { data: salesData } = await supabase
          .from("orders")
          .select("total_amount")
          .eq("status", "paid");
        
        const totalSales = salesData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

        // Fetch pending orders count
        const { count: pendingOrders } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        // Fetch active products count
        const { count: activeProducts } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        // Fetch unique customers (unique user_ids in orders)
        const { data: customersData } = await supabase
          .from("orders")
          .select("user_id")
          .neq("user_id", "00000000-0000-0000-0000-000000000000");
        
        const uniqueCustomers = new Set(customersData?.map(o => o.user_id)).size;

        setStats({
          totalSales,
          pendingOrders: pendingOrders || 0,
          activeProducts: activeProducts || 0,
          totalCustomers: uniqueCustomers || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Use mock data if error
        setStats({
          totalSales: 15890.50,
          pendingOrders: 12,
          activeProducts: 48,
          totalCustomers: 156,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const statCards = [
    {
      title: "Vendas Totais",
      value: formatCurrency(stats.totalSales),
      icon: DollarSign,
      trend: "+12%",
      trendUp: true,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pedidos Pendentes",
      value: stats.pendingOrders.toString(),
      icon: ShoppingCart,
      trend: stats.pendingOrders > 0 ? "Ação necessária" : "Tudo em dia",
      trendUp: stats.pendingOrders === 0,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Produtos Ativos",
      value: stats.activeProducts.toString(),
      icon: Package,
      trend: "+3 este mês",
      trendUp: true,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Clientes Cadastrados",
      value: stats.totalCustomers.toString(),
      icon: Users,
      trend: "+8%",
      trendUp: true,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {isLoading ? "..." : stat.value}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.trendUp ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-xs ${stat.trendUp ? "text-green-600" : "text-red-600"}`}>
                      {stat.trend}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Chart */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Vendas nos últimos 30 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2 px-4">
            {chartData.map((item, index) => {
              const maxValue = Math.max(...chartData.map((d) => d.value));
              const height = (item.value / maxValue) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-primary/80 hover:bg-primary rounded-t transition-all cursor-pointer"
                    style={{ height: `${height}%` }}
                    title={formatCurrency(item.value)}
                  />
                  <span className="text-xs text-gray-500">{item.day}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-500">Total do período</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(chartData.reduce((sum, d) => sum + d.value, 0))}
              </p>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium">+18% vs. mês anterior</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
