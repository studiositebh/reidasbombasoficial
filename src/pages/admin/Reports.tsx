import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, 
  Target, Calendar as CalendarIcon, Download, AlertTriangle, Loader2, Star
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  fetchAnalyticsData,
  fetchLowStock,
  type AnalyticsData,
  type LowStockItem,
} from "@/services/analyticsService";

// Chart colors
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// Date presets
const DATE_PRESETS = [
  { label: "Últimos 7 dias", getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: "Últimos 30 dias", getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: "Este mês", getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: "Mês passado", getValue: () => ({ 
    start: startOfMonth(subMonths(new Date(), 1)), 
    end: endOfMonth(subMonths(new Date(), 1)) 
  })},
  { label: "Este ano", getValue: () => ({ start: startOfYear(new Date()), end: new Date() }) },
];

export default function Reports() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activePreset, setActivePreset] = useState<string>("Últimos 30 dias");

  // Data states
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Calculate previous period for comparison
      const periodDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      const prevEndDate = subDays(dateRange.start, 1);
      const prevStartDate = subDays(dateRange.start, periodDays + 1);

      const status = statusFilter === "all" ? null : statusFilter;

      // Fetch all data in parallel
      const [analytics, lowStockData] = await Promise.all([
        fetchAnalyticsData(
          dateRange.start,
          dateRange.end,
          prevStartDate,
          prevEndDate,
          status
        ),
        fetchLowStock(5),
      ]);

      setAnalyticsData(analytics);
      setLowStock(lowStockData);
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Erro ao carregar dados do relatório");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, statusFilter]);

  const applyPreset = (preset: typeof DATE_PRESETS[0]) => {
    const { start, end } = preset.getValue();
    setDateRange({ start, end });
    setActivePreset(preset.label);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const exportToCSV = () => {
    if (!analyticsData?.topProducts.length) {
      toast.error("Sem dados para exportar");
      return;
    }

    const headers = ["Produto", "SKU", "Qtd Vendida", "Receita", "Estoque Atual"];
    const rows = analyticsData.topProducts.map((p) => [
      p.product_title,
      p.variant_sku,
      p.quantity_sold,
      p.total_revenue.toFixed(2),
      p.current_stock,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-vendas-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Relatório exportado!");
  };

  // Chart data formatting
  const lineChartData = useMemo(() => 
    analyticsData?.dailyRevenue.map((d) => ({
      date: format(new Date(d.date), "dd/MM", { locale: ptBR }),
      fullDate: d.date,
      revenue: d.revenue,
      orders: d.order_count,
    })) || [],
    [analyticsData?.dailyRevenue]
  );

  const barChartData = useMemo(() => 
    analyticsData?.topProducts.slice(0, 5).map((p) => ({
      name: p.product_title.length > 20 
        ? p.product_title.substring(0, 20) + "..." 
        : p.product_title,
      fullName: p.product_title,
      quantity: p.quantity_sold,
    })) || [],
    [analyticsData?.topProducts]
  );

  const revenueChange = analyticsData
    ? calculateChange(analyticsData.summary.total_revenue, analyticsData.previousSummary.total_revenue)
    : 0;

  const ordersChange = analyticsData
    ? calculateChange(analyticsData.summary.total_orders, analyticsData.previousSummary.total_orders)
    : 0;

  const ticketChange = analyticsData
    ? calculateChange(analyticsData.summary.avg_ticket, analyticsData.previousSummary.avg_ticket)
    : 0;

  const renderSkeletonKPIs = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderSkeletonCharts = () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AdminLayout title="Relatórios">
      <div className="space-y-6">
        {/* Control Bar */}
        <Card className="bg-card shadow-sm">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Presets */}
              <div className="flex flex-wrap gap-2">
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    variant={activePreset === preset.label ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {/* Custom Date Range */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {format(dateRange.start, "dd/MM/yyyy")} - {format(dateRange.end, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.start, to: dateRange.end }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ start: range.from, end: range.to });
                          setActivePreset("");
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="paid">Pagos</SelectItem>
                    <SelectItem value="shipped">Enviados</SelectItem>
                  </SelectContent>
                </Select>

                {/* Export */}
                <Button variant="outline" size="sm" onClick={exportToCSV} disabled={isLoading}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <>
            {renderSkeletonKPIs()}
            {renderSkeletonCharts()}
          </>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Receita Total
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(analyticsData?.summary.total_revenue || 0)}
                  </div>
                  <div className={cn(
                    "flex items-center text-xs mt-1",
                    revenueChange >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {revenueChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {revenueChange >= 0 ? "+" : ""}{revenueChange.toFixed(1)}% vs período anterior
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pedidos
                  </CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData?.summary.total_orders || 0}
                  </div>
                  <div className={cn(
                    "flex items-center text-xs mt-1",
                    ordersChange >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {ordersChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {ordersChange >= 0 ? "+" : ""}{ordersChange.toFixed(1)}% vs período anterior
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ticket Médio
                  </CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(analyticsData?.summary.avg_ticket || 0)}
                  </div>
                  <div className={cn(
                    "flex items-center text-xs mt-1",
                    ticketChange >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {ticketChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {ticketChange >= 0 ? "+" : ""}{ticketChange.toFixed(1)}% vs período anterior
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Melhor Dia de Venda
                  </CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {analyticsData?.bestDay ? (
                    <>
                      <div className="text-2xl font-bold">
                        {formatCurrency(analyticsData.bestDay.revenue)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(analyticsData.bestDay.date), "dd 'de' MMMM", { locale: ptBR })}
                      </div>
                    </>
                  ) : (
                    <div className="text-2xl font-bold text-muted-foreground">-</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Revenue Line Chart */}
              <Card className="bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Evolução de Faturamento
                  </CardTitle>
                  <CardDescription>
                    Receita diária no período selecionado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lineChartData.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma venda no período selecionado</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={lineChartData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => 
                            value >= 1000 ? `R$ ${(value / 1000).toFixed(0)}k` : `R$ ${value}`
                          }
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), "Receita"]}
                          labelFormatter={(label) => `Data: ${label}`}
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Top Products Bar Chart */}
              <Card className="bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Top 5 Produtos Mais Vendidos
                  </CardTitle>
                  <CardDescription>
                    Quantidade vendida no período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {barChartData.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma venda no período selecionado</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" fontSize={12} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          fontSize={11} 
                          width={120}
                          tickLine={false}
                        />
                        <Tooltip 
                          formatter={(value: number) => [value, "Quantidade"]}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                          {barChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tables Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top Products Table */}
              <Card className="bg-card shadow-sm">
                <CardHeader>
                  <CardTitle>Ranking de Produtos (Curva ABC)</CardTitle>
                  <CardDescription>
                    Produtos campeões de venda no período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.topProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Sem dados para exibir
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Receita</TableHead>
                          <TableHead className="text-right">Estoque</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analyticsData?.topProducts.slice(0, 10).map((product, index) => (
                          <TableRow key={`${product.product_id}-${product.variant_sku}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                                  {index + 1}
                                </Badge>
                                <div>
                                  <div className="font-medium text-sm">{product.product_title}</div>
                                  <div className="text-xs text-muted-foreground">{product.variant_sku}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {product.quantity_sold}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(product.total_revenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={product.current_stock <= 5 ? "destructive" : "secondary"}>
                                {product.current_stock}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Low Stock Alert */}
              <Card className="bg-card shadow-sm border-destructive/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Reposição Urgente
                  </CardTitle>
                  <CardDescription>
                    Produtos com estoque crítico (≤ 5 unidades)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lowStock.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                        <p>Todos os produtos estão com estoque adequado!</p>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Estoque</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowStock.map((item) => (
                          <TableRow key={`${item.product_id}-${item.variant_sku}`} className="bg-destructive/5">
                            <TableCell className="font-medium">{item.product_title}</TableCell>
                            <TableCell className="text-muted-foreground">{item.variant_sku}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="destructive">{item.stock_level}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
