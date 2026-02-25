import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfDay } from "date-fns";

// Types
export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  variant?: {
    id: string;
    sku: string;
    stock_level: number;
    product_id: string;
    product?: {
      id: string;
      title: string;
      category: string | null;
    };
  };
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  order_count: number;
}

export interface RevenueSummary {
  total_revenue: number;
  total_orders: number;
  avg_ticket: number;
}

export interface TopProduct {
  product_id: string;
  product_title: string;
  variant_sku: string;
  quantity_sold: number;
  total_revenue: number;
  current_stock: number;
}

export interface CategorySales {
  category: string;
  total_revenue: number;
  order_count: number;
  percentage: number;
}

export interface LowStockItem {
  product_id: string;
  product_title: string;
  variant_sku: string;
  variant_attrs: Record<string, string> | null;
  stock_level: number;
  is_active: boolean;
}

export interface BestDay {
  date: string;
  revenue: number;
}

export interface AnalyticsData {
  orders: Order[];
  orderItems: OrderItem[];
  summary: RevenueSummary;
  previousSummary: RevenueSummary;
  dailyRevenue: DailyRevenue[];
  topProducts: TopProduct[];
  categorySales: CategorySales[];
  bestDay: BestDay | null;
}

// Fetch orders within a date range
export async function fetchOrders(
  startDate: Date,
  endDate: Date,
  statusFilter?: string | null
): Promise<Order[]> {
  const formattedStartDate = format(startDate, "yyyy-MM-dd");
  const formattedEndDate = format(endDate, "yyyy-MM-dd") + "T23:59:59";

  // Filter by status if provided
  if (statusFilter && statusFilter !== "all") {
    const { data, error } = await supabase
      .from("orders")
      .select("id, user_id, total_amount, status, created_at")
      .gte("created_at", formattedStartDate)
      .lte("created_at", formattedEndDate)
      .eq("status", statusFilter as "paid" | "shipped" | "pending" | "cancelled");
    if (error) throw error;
    return data || [];
  }

  // Only count paid and shipped orders for analytics
  const { data, error } = await supabase
    .from("orders")
    .select("id, user_id, total_amount, status, created_at")
    .gte("created_at", formattedStartDate)
    .lte("created_at", formattedEndDate)
    .in("status", ["paid", "shipped"]);

  if (error) throw error;
  return data || [];
}

// Fetch order items with product details
export async function fetchOrderItems(orderIds: string[]): Promise<OrderItem[]> {
  if (orderIds.length === 0) return [];

  const { data, error } = await supabase
    .from("order_items")
    .select(`
      id,
      order_id,
      variant_id,
      quantity,
      unit_price,
      variant:variants (
        id,
        sku,
        stock_level,
        product_id,
        product:products (
          id,
          title,
          category
        )
      )
    `)
    .in("order_id", orderIds);

  if (error) throw error;
  
  // Type cast the nested data
  return (data || []).map((item: any) => ({
    ...item,
    variant: item.variant ? {
      ...item.variant,
      product: item.variant.product
    } : undefined
  }));
}

// Fetch low stock items
export async function fetchLowStock(threshold: number = 5): Promise<LowStockItem[]> {
  const { data, error } = await supabase
    .from("variants")
    .select(`
      id,
      sku,
      stock_level,
      attrs,
      is_active,
      product_id,
      product:products (
        id,
        title
      )
    `)
    .lte("stock_level", threshold)
    .eq("is_active", true);

  if (error) throw error;

  return (data || [])
    .filter((item: any) => item.product?.title) // Filter out items without products
    .map((item: any) => ({
      product_id: item.product_id,
      product_title: item.product?.title || "Produto sem nome",
      variant_sku: item.sku,
      variant_attrs: item.attrs as Record<string, string> | null,
      stock_level: item.stock_level,
      is_active: item.is_active,
    }));
}

// Calculate revenue summary from orders
export function calculateRevenueSummary(orders: Order[]): RevenueSummary {
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  const totalOrders = orders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    total_revenue: totalRevenue,
    total_orders: totalOrders,
    avg_ticket: avgTicket,
  };
}

// Calculate daily revenue from orders
export function calculateDailyRevenue(orders: Order[]): DailyRevenue[] {
  const dailyMap = new Map<string, { revenue: number; count: number }>();

  orders.forEach((order) => {
    const date = format(parseISO(order.created_at), "yyyy-MM-dd");
    const existing = dailyMap.get(date) || { revenue: 0, count: 0 };
    dailyMap.set(date, {
      revenue: existing.revenue + Number(order.total_amount),
      count: existing.count + 1,
    });
  });

  return Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      order_count: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Calculate top products from order items
export function calculateTopProducts(orderItems: OrderItem[], limit: number = 10): TopProduct[] {
  const productMap = new Map<string, {
    product_id: string;
    product_title: string;
    variant_sku: string;
    quantity_sold: number;
    total_revenue: number;
    current_stock: number;
  }>();

  orderItems.forEach((item) => {
    if (!item.variant) return;

    const key = `${item.variant.product_id}-${item.variant_id}`;
    const existing = productMap.get(key);

    if (existing) {
      existing.quantity_sold += item.quantity;
      existing.total_revenue += item.quantity * Number(item.unit_price);
    } else {
      productMap.set(key, {
        product_id: item.variant.product_id,
        product_title: item.variant.product?.title || "Produto sem nome",
        variant_sku: item.variant.sku,
        quantity_sold: item.quantity,
        total_revenue: item.quantity * Number(item.unit_price),
        current_stock: item.variant.stock_level,
      });
    }
  });

  return Array.from(productMap.values())
    .sort((a, b) => b.quantity_sold - a.quantity_sold)
    .slice(0, limit);
}

// Calculate sales by category
export function calculateCategorySales(orderItems: OrderItem[]): CategorySales[] {
  const categoryMap = new Map<string, { revenue: number; orderIds: Set<string> }>();

  orderItems.forEach((item) => {
    const category = item.variant?.product?.category || "Sem categoria";
    const existing = categoryMap.get(category) || { revenue: 0, orderIds: new Set() };
    
    existing.revenue += item.quantity * Number(item.unit_price);
    existing.orderIds.add(item.order_id);
    categoryMap.set(category, existing);
  });

  const totalRevenue = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.revenue, 0);

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total_revenue: data.revenue,
      order_count: data.orderIds.size,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue);
}

// Find the best sales day
export function findBestDay(dailyRevenue: DailyRevenue[]): BestDay | null {
  if (dailyRevenue.length === 0) return null;

  const best = dailyRevenue.reduce((max, day) => 
    day.revenue > max.revenue ? day : max
  , dailyRevenue[0]);

  return {
    date: best.date,
    revenue: best.revenue,
  };
}

// Main function to fetch all analytics data
export async function fetchAnalyticsData(
  startDate: Date,
  endDate: Date,
  prevStartDate: Date,
  prevEndDate: Date,
  statusFilter?: string | null
): Promise<AnalyticsData> {
  // Fetch current period orders
  const orders = await fetchOrders(startDate, endDate, statusFilter);
  
  // Fetch previous period orders for comparison
  const previousOrders = await fetchOrders(prevStartDate, prevEndDate, statusFilter);

  // Fetch order items for current period
  const orderIds = orders.map((o) => o.id);
  const orderItems = await fetchOrderItems(orderIds);

  // Calculate all metrics
  const summary = calculateRevenueSummary(orders);
  const previousSummary = calculateRevenueSummary(previousOrders);
  const dailyRevenue = calculateDailyRevenue(orders);
  const topProducts = calculateTopProducts(orderItems);
  const categorySales = calculateCategorySales(orderItems);
  const bestDay = findBestDay(dailyRevenue);

  return {
    orders,
    orderItems,
    summary,
    previousSummary,
    dailyRevenue,
    topProducts,
    categorySales,
    bestDay,
  };
}
