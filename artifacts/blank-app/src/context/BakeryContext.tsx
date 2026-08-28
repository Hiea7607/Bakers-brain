import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";

const API_BASE = "http://localhost:8000/api";

export type InventoryItem = {
  code: string;
  name: string;
  unit: string;
  stock: number;
  minimum: number;
  unit_cost: number;
};

export type Product = {
  code: string;
  name: string;
  price: number;
  cost: number;
  status: "Active" | "Inactive";
};

export type Purchase = {
  id: string;
  date: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_cost: number;
  source: string;
  notes: string;
};

export type Order = {
  id: string;
  date: string;
  time: string;
  customer: string;
  phone: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  advance_paid: number;
  pending_payment: number;
  cost: number;
  profit: number;
  location: string;
  delivery_date: string;
  payment_method: string;
  status: "Pending" | "Paid";
  is_new_customer: number;
};

export type ParsedOrder = {
  customer: string;
  phone: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  advancePaid: number;
  pendingPayment: number;
  cost: number;
  profit: number;
  location: string;
  deliveryDate: string;
  paymentMethod: string;
};

export type CustomerSummary = {
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  totalProfit: number;
  lastOrderDate: string;
  favoriteProduct: string;
  avgOrderValue: number;
  tier: "Best" | "Medium" | "Regular";
  address: string;
};

interface BakeryContextType {
  products: Product[];
  inventory: InventoryItem[];
  orders: Order[];
  purchases: Purchase[];
  customers: CustomerSummary[];
  stats: {
    todaySales: number;
    todayProfit: number;
    todayOrdersCount: number;
    deliveriesTodayCount: number;
    pendingPaymentsAmount: number;
    pendingOrdersCount: number;
    monthlySales: number;
    monthlyProfit: number;
    monthlyOrdersCount: number;
    newCustomersThisMonth: number;
    lowStockCount: number;
    lowSellingCount: number;
    bestSellingProduct: string;
    mostConsumedIngredient: string;
    highestProfitProduct: string;
  };
  fetchData: () => Promise<void>;
  addProduct: (product: { code: string; name: string; price: number }) => Promise<void>;
  savePurchase: (purchase: Omit<Purchase, "id" | "date" | "total_cost">, minimum?: number) => Promise<void>;
  attachRecipeItem: (productCode: string, ingredientCode: string, quantity: number) => Promise<void>;
  createOrder: (parsed: ParsedOrder) => Promise<string>;
  markOrderPaid: (orderId: string) => Promise<void>;
  exportOrdersCSV: () => void;
  exportDatabaseJSON: () => void;
}

const BakeryContext = createContext<BakeryContextType | null>(null);

export const BakeryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [prodsRes, invRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/ingredients`),
        fetch(`${API_BASE}/orders`),
      ]);

      if (prodsRes.ok) setProducts(await prodsRes.json());
      if (invRes.ok) setInventory(await invRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
    } catch (err) {
      console.error("Failed to fetch data from backend:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addProduct = async (product: { code: string; name: string; price: number }) => {
    await fetch(`${API_BASE}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
    fetchData();
  };

  const savePurchase = async (purchase: Omit<Purchase, "id" | "date" | "total_cost">, minimum = 2) => {
    await fetch(`${API_BASE}/purchases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...purchase, minimum }),
    });
    fetchData();
  };

  const attachRecipeItem = async (productCode: string, ingredientCode: string, quantity: number) => {
    await fetch(`${API_BASE}/recipes/${productCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredient_code: ingredientCode, quantity }),
    });
    fetchData();
  };

  const createOrder = async (parsed: ParsedOrder): Promise<string> => {
    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: parsed.customer,
        phone: parsed.phone,
        product_code: parsed.productCode,
        product_name: parsed.productName,
        quantity: parsed.quantity,
        unit_price: parsed.unitPrice,
        total: parsed.total,
        advance_paid: parsed.advancePaid,
        pending_payment: parsed.pendingPayment,
        cost: parsed.cost,
        profit: parsed.profit,
        location: parsed.location,
        delivery_date: parsed.deliveryDate,
        payment_method: parsed.paymentMethod,
      }),
    });
    const data = await res.json();
    fetchData();
    return data.order_id;
  };

  const markOrderPaid = async (orderId: string) => {
    await fetch(`${API_BASE}/orders/${orderId}/mark-paid`, { method: "POST" });
    fetchData();
  };

  const customers = useMemo(() => {
    const map: Record<string, CustomerSummary> = {};

    orders.forEach((o) => {
      const key = o.phone || o.customer;
      if (!map[key]) {
        map[key] = {
          name: o.customer,
          phone: o.phone,
          totalOrders: 0,
          totalSpent: 0,
          totalProfit: 0,
          lastOrderDate: o.date,
          favoriteProduct: o.product_name,
          avgOrderValue: 0,
          tier: "Regular",
          address: o.location,
        };
      }
      map[key].totalOrders += 1;
      map[key].totalSpent += o.total;
      map[key].totalProfit += o.profit;
      if (new Date(o.date) > new Date(map[key].lastOrderDate)) {
        map[key].lastOrderDate = o.date;
        map[key].address = o.location;
      }
    });

    return Object.values(map).map((c) => {
      const avg = c.totalOrders > 0 ? Math.round(c.totalSpent / c.totalOrders) : 0;
      let tier: "Best" | "Medium" | "Regular" = "Regular";
      if (c.totalOrders >= 5 || c.totalSpent >= 5000) tier = "Best";
      else if (c.totalOrders >= 2 || c.totalSpent >= 2000) tier = "Medium";
      return { ...c, avgOrderValue: avg, tier };
    });
  }, [orders]);

  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const todayOrders = orders.filter((o) => new Date(o.date).toDateString() === todayStr);
    const monthOrders = orders.filter((o) => {
      const d = new Date(o.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const paidToday = todayOrders.filter((o) => o.status === "Paid");
    const todaySales = paidToday.reduce((sum, o) => sum + (o.total || 0), 0);
    const todayCost = paidToday.reduce((sum, o) => sum + (o.cost || 0), 0);

    const paidMonth = monthOrders.filter((o) => o.status === "Paid");
    const monthlySales = paidMonth.reduce((sum, o) => sum + (o.total || 0), 0);
    const monthlyCost = paidMonth.reduce((sum, o) => sum + (o.cost || 0), 0);

    const pendingOrders = orders.filter((o) => o.status === "Pending");
    const pendingPaymentsAmount = pendingOrders.reduce((sum, o) => sum + (o.pending_payment || 0), 0);

    const deliveriesTodayCount = orders.filter(
      (o) => o.delivery_date.toLowerCase().includes("today") || new Date(o.date).toDateString() === todayStr
    ).length;

    const lowStockCount = inventory.filter((i) => i.stock <= i.minimum).length;

    const productSoldMap: Record<string, number> = {};
    orders.forEach((o) => {
      productSoldMap[o.product_name] = (productSoldMap[o.product_name] || 0) + o.quantity;
    });

    let bestSellingProduct = "N/A";
    let maxSold = 0;
    let lowSellingCount = 0;

    products.forEach((p) => {
      const sold = productSoldMap[p.name] || 0;
      if (sold > maxSold) {
        maxSold = sold;
        bestSellingProduct = `${p.name} (${sold} sold)`;
      }
      if (sold <= 2) lowSellingCount++;
    });

    let highestProfitProduct = "N/A";
    let maxMargin = 0;
    products.forEach((p) => {
      const margin = p.price > 0 ? (p.price - p.cost) / p.price : 0;
      if (margin > maxMargin) {
        maxMargin = margin;
        highestProfitProduct = `${p.name} (${Math.round(margin * 100)}%)`;
      }
    });

    return {
      todaySales,
      todayProfit: todaySales - todayCost,
      todayOrdersCount: todayOrders.length,
      deliveriesTodayCount,
      pendingPaymentsAmount,
      pendingOrdersCount: pendingOrders.length,
      monthlySales,
      monthlyProfit: monthlySales - monthlyCost,
      monthlyOrdersCount: monthOrders.length,
      newCustomersThisMonth: monthOrders.filter((o) => o.is_new_customer === 1).length,
      lowStockCount,
      lowSellingCount,
      bestSellingProduct: maxSold > 0 ? bestSellingProduct : "None yet",
      mostConsumedIngredient: inventory[0]?.name ? `${inventory[0].name}` : "N/A",
      highestProfitProduct,
    };
  }, [orders, inventory, products]);

  const exportOrdersCSV = () => {
    const headers = "ID,Date,Time,Customer,Phone,Product,Qty,Total,Advance,PendingDue,Profit,Status,Address\n";
    const rows = orders
      .map(
        (o) =>
          `"${o.id}","${o.date.slice(0, 10)}","${o.time}","${o.customer}","${o.phone}","${o.product_name}",${o.quantity},${o.total},${o.advance_paid},${o.pending_payment},${o.profit},"${o.status}","${o.location}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportDatabaseJSON = () => {
    const data = { products, inventory, orders, purchases, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bakers_brain_cloud_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <BakeryContext.Provider
      value={{
        products,
        inventory,
        orders,
        purchases,
        customers,
        stats,
        fetchData,
        addProduct,
        savePurchase,
        attachRecipeItem,
        createOrder,
        markOrderPaid,
        exportOrdersCSV,
        exportDatabaseJSON,
      }}
    >
      {children}
    </BakeryContext.Provider>
  );
};

export const useBakery = () => {
  const context = useContext(BakeryContext);
  if (!context) throw new Error("useBakery must be used within a BakeryProvider");
  return context;
};