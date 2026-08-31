import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

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
  deleteProduct: (code: string) => Promise<void>;
  deleteInventoryItem: (code: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  deductInventoryItem: (code: string, quantity: number, reason: string) => Promise<void>;
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

  // 1. Fetch All Tables from Supabase Cloud
  const fetchData = useCallback(async () => {
    try {
      const [pRes, iRes, oRes, purRes] = await Promise.all([
        supabase.from("products").select("*").eq("is_deleted", false).order("name", { ascending: true }),
        supabase.from("ingredients").select("*").eq("is_deleted", false).order("name", { ascending: true }),
        supabase.from("orders").select("*").eq("is_deleted", false).order("date", { ascending: false }),
        supabase.from("purchases").select("*").order("date", { ascending: false }),
      ]);

      if (pRes.data) setProducts(pRes.data as Product[]);
      if (iRes.data) setInventory(iRes.data as InventoryItem[]);
      if (oRes.data) setOrders(oRes.data as Order[]);
      if (purRes.data) setPurchases(purRes.data as Purchase[]);
    } catch (err) {
      console.error("Cloud fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Add Product
  const addProduct = async (product: { code: string; name: string; price: number }) => {
    const newProduct: Product = {
      code: product.code.toUpperCase().trim(),
      name: product.name.trim(),
      price: product.price,
      cost: 0,
      status: "Active",
    };

    setProducts((prev) => [...prev, newProduct]);
    await supabase.from("products").insert([newProduct]);
  };

  // 3. Soft Delete Product (With Error Tracking)
  const deleteProduct = async (code: string) => {
    try {
      const { error } = await supabase.from("products").update({ is_deleted: true }).eq("code", code);
      if (error) {
        console.error("Supabase Error:", error);
        alert(`Database refused to delete: ${error.message}`);
        return; 
      }
      setProducts((prev) => prev.filter((p) => p.code !== code));
    } catch (err) {
      console.error("Network Error:", err);
      alert("Failed to connect to the database.");
    }
  };

  // 4. Soft Delete Ingredient (With Error Tracking)
  const deleteInventoryItem = async (code: string) => {
    try {
      const { error } = await supabase.from("ingredients").update({ is_deleted: true }).eq("code", code);
      if (error) {
        console.error("Supabase Error:", error);
        alert(`Database refused to delete: ${error.message}`);
        return; 
      }
      setInventory((prev) => prev.filter((item) => item.code !== code));
      setPurchases((prev) => prev.filter((p) => p.code !== code));
    } catch (err) {
      console.error("Network Error:", err);
      alert("Failed to connect to the database.");
    }
  };

  // 5. Soft Delete Order (With Error Tracking)
  const deleteOrder = async (id: string) => {
    try {
      const { error } = await supabase.from("orders").update({ is_deleted: true }).eq("id", id);
      if (error) {
        console.error("Supabase Error:", error);
        alert(`Database refused to delete: ${error.message}`);
        return; 
      }
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error("Network Error:", err);
      alert("Failed to connect to the database.");
    }
  };

  // 6. Deduct Ingredient (Damage / Waste)
  const deductInventoryItem = async (code: string, quantity: number, _reason: string) => {
    const currentItem = inventory.find((i) => i.code === code);
    if (!currentItem) return;

    const newStock = Math.max(0, parseFloat((currentItem.stock - quantity).toFixed(3)));

    setInventory((prev) =>
      prev.map((item) => (item.code === code ? { ...item, stock: newStock } : item))
    );

    await supabase.from("ingredients").update({ stock: newStock }).eq("code", code);
  };

  // 7. Save Purchase Batch & Recalculate Weighted Average Rate (WAC)
  const savePurchase = async (purchase: Omit<Purchase, "id" | "date" | "total_cost">, minimum = 2) => {
    const totalCost = purchase.quantity * purchase.unit_price;
    const purId = `PUR-${Date.now().toString().slice(-6)}`;
    const newPur: Purchase = {
      id: purId,
      date: new Date().toISOString(),
      total_cost: totalCost,
      ...purchase,
    };

    const updatedPurchases = [newPur, ...purchases];
    setPurchases(updatedPurchases);

    const itemPurchases = updatedPurchases.filter((p) => p.code === purchase.code);
    const totalSpent = itemPurchases.reduce((acc, p) => acc + (p.total_cost || 0), 0);
    const totalQty = itemPurchases.reduce((acc, p) => acc + p.quantity, 0);
    const weightedAvgCost = totalQty > 0 ? parseFloat((totalSpent / totalQty).toFixed(2)) : purchase.unit_price;

    const exists = inventory.find((i) => i.code === purchase.code);
    const updatedStock = exists
      ? parseFloat((exists.stock + purchase.quantity).toFixed(3))
      : purchase.quantity;

    setInventory((prev) => {
      if (exists) {
        return prev.map((item) =>
          item.code === purchase.code
            ? { ...item, stock: updatedStock, unit_cost: weightedAvgCost }
            : item
        );
      }
      return [
        ...prev,
        {
          code: purchase.code,
          name: purchase.name,
          unit: purchase.unit,
          stock: purchase.quantity,
          minimum,
          unit_cost: weightedAvgCost,
        },
      ];
    });

    const { error: stockError } = await supabase.from("ingredients").upsert([
      {
        code: purchase.code,
        name: purchase.name,
        unit: purchase.unit,
        stock: updatedStock,
        minimum,
        unit_cost: weightedAvgCost,
      },
    ]);

    if (stockError) {
      console.error("Stock update blocked:", stockError);
      alert(`Stock Update Error: ${stockError.message}`);
      return; 
    }

    const { error: purchaseError } = await supabase.from("purchases").insert([newPur]);

    if (purchaseError) {
      console.error("Purchase blocked by Supabase:", purchaseError);
      alert(`Database Error: ${purchaseError.message}`);
    }
  };

  // 8. Attach Ingredient to Product Recipe
  const attachRecipeItem = async (productCode: string, ingredientCode: string, quantity: number) => {
    const ingredient = inventory.find((i) => i.code === ingredientCode);
    const lineCost = (ingredient?.unit_cost || 0) * quantity;

    setProducts((prev) =>
      prev.map((p) =>
        p.code === productCode ? { ...p, cost: parseFloat((p.cost + lineCost).toFixed(2)) } : p
      )
    );

    await supabase.from("recipes").upsert([
      {
        product_code: productCode,
        ingredient_code: ingredientCode,
        quantity,
      },
    ]);

    const targetProduct = products.find((p) => p.code === productCode);
    if (targetProduct) {
      await supabase
        .from("products")
        .update({ cost: parseFloat(((targetProduct.cost || 0) + lineCost).toFixed(2)) })
        .eq("code", productCode);
    }
  };

  // 9. Create Order & Auto-Deduct Recipe Stock
  const createOrder = async (parsed: ParsedOrder): Promise<string> => {
    const now = new Date();

    const todayStr = now.toDateString();
    const todayOrdersCount = orders.filter((o) => new Date(o.date).toDateString() === todayStr).length;
    const nextOrderNum = (todayOrdersCount + 1).toString().padStart(2, "0");
    const dayOfMonth = now.getDate().toString().padStart(2, "0");
    const orderId = `BB-${dayOfMonth}#${nextOrderNum}`;

    const isNew = orders.some((o) => o.phone && o.phone === parsed.phone) ? 0 : 1;
    const status = parsed.pendingPayment <= 0 ? "Paid" : "Pending";

    const newOrder: Order = {
      id: orderId,
      date: now.toISOString(),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
      status,
      is_new_customer: isNew,
    };

    setOrders((prev) => [newOrder, ...prev]);
    await supabase.from("orders").insert([newOrder]);

    const { data: recipeData } = await supabase
      .from("recipes")
      .select("ingredient_code, quantity")
      .eq("product_code", parsed.productCode);

    if (recipeData && recipeData.length > 0) {
      for (const item of recipeData) {
        const deduction = item.quantity * parsed.quantity;
        const currentIng = inventory.find((i) => i.code === item.ingredient_code);
        if (currentIng) {
          const remainingStock = Math.max(0, parseFloat((currentIng.stock - deduction).toFixed(3)));
          setInventory((prev) =>
            prev.map((ing) =>
              ing.code === item.ingredient_code ? { ...ing, stock: remainingStock } : ing
            )
          );
          await supabase
            .from("ingredients")
            .update({ stock: remainingStock })
            .eq("code", item.ingredient_code);
        }
      }
    }

    return orderId;
  };

  // 10. Mark Order as Paid
  const markOrderPaid = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: "Paid" as const, advance_paid: o.total, pending_payment: 0 } : o
      )
    );

    const target = orders.find((o) => o.id === orderId);
    if (target) {
      await supabase
        .from("orders")
        .update({ status: "Paid", advance_paid: target.total, pending_payment: 0 })
        .eq("id", orderId);
    }
  };

  // Analytics & CRM Calculations
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

  // Export functions perfectly mapped to your Supabase tables
  const exportOrdersCSV = () => {
    if (orders.length === 0) {
      alert("No orders to export yet!");
      return;
    }
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
        deleteProduct,
        deleteInventoryItem,
        deleteOrder,
        deductInventoryItem,
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