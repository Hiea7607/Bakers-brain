import React, { useState, useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

// ==========================================
// DEFAULT DEMO DATA (Used if localStorage is empty)
// ==========================================
const DEFAULT_PRODUCTS = [
  { code: "C1", name: "Chocolate 1 lb", price: 900, cost: 600, status: "Active" },
  { code: "C2", name: "Chocolate 2 lb", price: 1500, cost: 1000, status: "Active" },
  { code: "P1", name: "Chicken Patty", price: 80, cost: 55, status: "Active" },
  { code: "P2", name: "Vanilla Cupcake", price: 70, cost: 45, status: "Active" },
  { code: "B1", name: "Brownie", price: 120, cost: 80, status: "Active" },
];

const DEFAULT_INVENTORY = [
  { code: "ING01", name: "Whipping Cream", unit: "Litre", stock: 0.5, minimum: 1.0 },
  { code: "ING02", name: "Butter", unit: "kg", stock: 0.3, minimum: 1.0 },
  { code: "ING03", name: "Milk", unit: "Litre", stock: 0.8, minimum: 1.0 },
  { code: "ING04", name: "Chocolate Compound", unit: "kg", stock: 0.4, minimum: 1.0 },
  { code: "ING05", name: "Maida (Flour)", unit: "kg", stock: 1.2, minimum: 10.0 },
  { code: "ING06", name: "Sugar", unit: "kg", stock: 1.5, minimum: 5.0 },
  { code: "ING07", name: "Cocoa Powder", unit: "kg", stock: 0.2, minimum: 0.5 },
  { code: "ING08", name: "Vanilla Essence", unit: "ml", stock: 50, minimum: 100 },
];

const DEFAULT_RECIPES = {
  C1: { ING01: 0.2, ING02: 0.1, ING04: 0.15, ING05: 0.2, ING06: 0.2, ING07: 0.05 },
  C2: { ING01: 0.4, ING02: 0.2, ING04: 0.3, ING05: 0.4, ING06: 0.4, ING07: 0.1 },
  P1: { ING02: 0.05, ING05: 0.1 },
  P2: { ING02: 0.03, ING05: 0.05, ING06: 0.04, ING08: 5 },
  B1: { ING02: 0.04, ING04: 0.08, ING05: 0.05, ING06: 0.05, ING07: 0.03 },
};

const DEFAULT_ORDERS = [
  {
    id: "BB-1012",
    date: new Date().toISOString(),
    customer: "Hiea",
    phone: "01766123456",
    productCode: "C1",
    productName: "Chocolate 1 lb",
    quantity: 3,
    unitPrice: 900,
    total: 2700,
    cost: 1800,
    profit: 900,
    location: "Mirpur, Dhaka",
    deliveryDate: "Today 5:00 PM",
    payment: "bKash Paid",
    status: "Pending",
  },
  {
    id: "BB-1011",
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
    customer: "Karim",
    phone: "01811987654",
    productCode: "P1",
    productName: "Chicken Patty",
    quantity: 10,
    unitPrice: 80,
    total: 800,
    cost: 550,
    profit: 250,
    location: "Mohammadpur, Dhaka",
    deliveryDate: "Today 4:00 PM",
    payment: "Cash on Delivery",
    status: "Paid",
  },
  {
    id: "BB-1010",
    date: new Date(Date.now() - 3600000 * 5).toISOString(),
    customer: "Fatema",
    phone: "01911555444",
    productCode: "P2",
    productName: "Vanilla Cupcake",
    quantity: 12,
    unitPrice: 70,
    total: 840,
    cost: 540,
    profit: 300,
    location: "Dhanmondi, Dhaka",
    deliveryDate: "Tomorrow 12:00 PM",
    payment: "Pending",
    status: "Pending",
  },
];

const DEFAULT_PURCHASES = [
  {
    id: "PUR-0001",
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    code: "ING02",
    name: "Butter",
    quantity: 5,
    unit: "kg",
    unitPrice: 750,
    totalCost: 3750,
    source: "Kawran Bazar Wholesale",
    notes: "Aarong salted butter",
  },
];

type Product = {
  code: string;
  name: string;
  price: number;
  cost: number;
  status: string;
};

type InventoryItem = {
  code: string;
  name: string;
  unit: string;
  stock: number;
  minimum: number;
};

type Recipes = Record<string, Record<string, number>>;

type Order = {
  id: string;
  date: string;
  customer: string;
  phone: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  cost: number;
  profit: number;
  location: string;
  deliveryDate: string;
  payment: string;
  status: string;
  isNewCustomer?: boolean;
};

type Purchase = {
  id: string;
  date: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  source: string;
  notes: string;
};

type ParsedOrder = Omit<Order, "id" | "date" | "status">;

// Helper to load/save state with localStorage
function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem("bakers_brain_" + key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("bakers_brain_" + key, JSON.stringify(state));
    } catch (err) {
      console.error("Failed to save to localStorage", err);
    }
  }, [key, state]);

  return [state, setState];
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BakersBrainApp />
    </QueryClientProvider>
  );
}

function BakersBrainApp() {
  // Navigation State
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [showDrawer, setShowDrawer] = useState(false);

  // Core Data States
  const [products, setProducts] = usePersistentState<Product[]>("products", DEFAULT_PRODUCTS);
  const [inventory, setInventory] = usePersistentState<InventoryItem[]>("inventory", DEFAULT_INVENTORY);
  const [recipes, setRecipes] = usePersistentState<Recipes>("recipes", DEFAULT_RECIPES);
  const [orders, setOrders] = usePersistentState<Order[]>("orders", DEFAULT_ORDERS);
  const [purchases, setPurchases] = usePersistentState<Purchase[]>("purchases", DEFAULT_PURCHASES);
  const [nextOrderId, setNextOrderId] = usePersistentState<number>("next_order_id", 1013);
  const [nextPurchaseId, setNextPurchaseId] = usePersistentState<number>("next_purchase_id", 2);

  // Quick Order Parser States
  const [rawMessage, setRawMessage] = useState(
    "Customer: Hiea\nPhone: 01766XXXXXX\nProduct: Chocolate 1 lb\nQuantity: 3\nPrice: 2700\nDelivery: Tomorrow 5 PM\nLocation: Mirpur, Dhaka\nPayment: bKash Paid"
  );
  const [parsedOrder, setParsedOrder] = useState<ParsedOrder | null>(null);

  // New Product Form States
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdCode, setNewProdCode] = useState("");
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCost, setNewProdCost] = useState("");

  // New Ingredient / Purchase States
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [newIngCode, setNewIngCode] = useState("");
  const [newIngName, setNewIngName] = useState("");
  const [newIngUnit, setNewIngUnit] = useState("kg");
  const [newIngStock, setNewIngStock] = useState("");
  const [newIngMinimum, setNewIngMinimum] = useState("1");
  const [newIngPrice, setNewIngPrice] = useState("");
  const [newIngSource, setNewIngSource] = useState("");
  const [newIngNotes, setNewIngNotes] = useState("");

  // Order List Filters
  const [orderFilter, setOrderFilter] = useState("All");

  // Recipe Builder Temp States
  const [selectedIngCode, setSelectedIngCode] = useState("");
  const [selectedIngQty, setSelectedIngQty] = useState("");

  // Calculated Dashboard Stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(
      (o) => new Date(o.date).toDateString() === today
    );

    const todaySales = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const todayCost = todayOrders.reduce((sum, o) => sum + (o.cost || 0), 0);
    const todayProfit = todaySales - todayCost;

    const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalCost = orders.reduce((sum, o) => sum + (o.cost || 0), 0);
    const totalProfit = totalSales - totalCost;

    const pendingOrders = orders.filter((o) => o.status === "Pending").length;
    const lowStockCount = inventory.filter((i) => i.stock <= i.minimum).length;

    return {
      todaySales,
      todayProfit,
      todayOrdersCount: todayOrders.length,
      totalOrdersCount: orders.length,
      totalSales,
      totalProfit,
      pendingOrders,
      lowStockCount,
    };
  }, [orders, inventory]);

  // ==========================================
  // HANDLERS
  // ==========================================

  // Process WhatsApp message
  function handleProcessMessage() {
    if (!rawMessage.trim()) {
      alert("Please paste an order message.");
      return;
    }

    const lines = rawMessage.split("\n");
    const getVal = (prefix: string) => {
      const line = lines.find((l) =>
        l.toLowerCase().trim().startsWith(prefix.toLowerCase())
      );
      return line ? line.split(":").slice(1).join(":").trim() || "" : "";
    };

    const customer = getVal("Customer") || getVal("Name") || "Customer";
    const phone = getVal("Phone") || getVal("Mobile") || "-";
    const productName = getVal("Product") || getVal("Item") || "";
    const qtyStr = getVal("Quantity") || getVal("Qty") || "1";
    const priceStr = getVal("Price") || getVal("Total") || "";
    const delivery = getVal("Delivery") || "Today";
    const location = getVal("Location") || getVal("Address") || "Dhaka";
    const payment = getVal("Payment") || "Cash";

    const qty = parseInt(qtyStr, 10) || 1;

    // Match product
    const matched = products.find(
      (p) =>
        p.name.toLowerCase().includes(productName.toLowerCase()) ||
        p.code.toLowerCase() === productName.toLowerCase()
    ) || products[0];

    const unitPrice = matched ? matched.price : parseInt(priceStr, 10) || 0;
    const total = parseInt(priceStr, 10) || unitPrice * qty;
    const cost = (matched ? matched.cost : unitPrice * 0.6) * qty;

    setParsedOrder({
      customer,
      phone,
      productCode: matched ? matched.code : "CUSTOM",
      productName: matched ? matched.name : productName || "Custom Cake",
      quantity: qty,
      unitPrice,
      total,
      cost,
      profit: total - cost,
      deliveryDate: delivery,
      location,
      payment,
      isNewCustomer: !orders.some((o) => o.customer.toLowerCase() === customer.toLowerCase()),
    });
  }

  // Save parsed order & deduct recipe inventory
  function handleSaveOrder() {
    if (!parsedOrder) return;

    const orderId = "BB-" + nextOrderId;
    const newOrder = {
      id: orderId,
      date: new Date().toISOString(),
      ...parsedOrder,
      status: parsedOrder.payment.toLowerCase().includes("paid") ? "Paid" : "Pending",
    };

    // Deduct raw materials based on recipe
    const recipe = recipes[parsedOrder.productCode];
    if (recipe) {
      setInventory((prev) =>
        prev.map((item) => {
          const used = (recipe[item.code] || 0) * parsedOrder.quantity;
          return {
            ...item,
            stock: Math.max(0, parseFloat((item.stock - used).toFixed(3))),
          };
        })
      );
    }

    setOrders([newOrder, ...orders]);
    setNextOrderId((id) => id + 1);
    setParsedOrder(null);
    setRawMessage("");
    alert(`Order saved successfully! ID: ${orderId}`);
    setCurrentPage("orders");
  }

  // Add Product
  function handleAddProduct() {
    if (!newProdCode || !newProdName || !newProdPrice) {
      alert("Please fill Code, Name, and Price.");
      return;
    }

    const newProd = {
      code: newProdCode.toUpperCase().trim(),
      name: newProdName.trim(),
      price: Number(newProdPrice),
      cost: Number(newProdCost) || Math.round(Number(newProdPrice) * 0.6),
      status: "Active",
    };

    setProducts([...products, newProd]);
    setNewProdCode("");
    setNewProdName("");
    setNewProdPrice("");
    setNewProdCost("");
    setShowAddProduct(false);
  }

  // Save Purchase & Add Inventory Stock
  function handleSavePurchase() {
    if (!newIngCode || !newIngName || !newIngStock || !newIngPrice) {
      alert("Please fill code, name, quantity, and unit price.");
      return;
    }

    const qty = Number(newIngStock);
    const unitPrice = Number(newIngPrice);
    const totalCost = qty * unitPrice;
    const purId = "PUR-" + String(nextPurchaseId).padStart(4, "0");

    const newPurchase = {
      id: purId,
      date: new Date().toISOString(),
      code: newIngCode.toUpperCase().trim(),
      name: newIngName.trim(),
      quantity: qty,
      unit: newIngUnit,
      unitPrice,
      totalCost,
      source: newIngSource || "Local Market",
      notes: newIngNotes,
    };

    setPurchases([newPurchase, ...purchases]);
    setNextPurchaseId((id) => id + 1);

    // Update inventory
    setInventory((prev) => {
      const exists = prev.find((i) => i.code === newPurchase.code);
      if (exists) {
        return prev.map((i) =>
          i.code === newPurchase.code
            ? { ...i, stock: parseFloat((i.stock + qty).toFixed(3)) }
            : i
        );
      }
      return [
        ...prev,
        {
          code: newPurchase.code,
          name: newPurchase.name,
          unit: newPurchase.unit,
          stock: qty,
          minimum: Number(newIngMinimum) || 1,
        },
      ];
    });

    setNewIngCode("");
    setNewIngName("");
    setNewIngStock("");
    setNewIngPrice("");
    setNewIngSource("");
    setNewIngNotes("");
    setShowAddIngredient(false);
    alert(`Purchase recorded and stock added! ID: ${purId}`);
  }

  // Recipe Ingredient handlers
  function handleAddRecipeIngredient(productCode: string) {
    if (!selectedIngCode || !selectedIngQty || Number(selectedIngQty) <= 0) {
      alert("Select an ingredient and enter a valid quantity.");
      return;
    }

    setRecipes((prev) => ({
      ...prev,
      [productCode]: {
        ...(prev[productCode] || {}),
        [selectedIngCode]: Number(selectedIngQty),
      },
    }));

    setSelectedIngCode("");
    setSelectedIngQty("");
  }

  function handleRemoveRecipeIngredient(productCode: string, ingCode: string) {
    setRecipes((prev) => {
      const updated = { ...(prev[productCode] || {}) };
      delete updated[ingCode];
      return { ...prev, [productCode]: updated };
    });
  }

  // Backup / Restore
  function exportDatabaseJSON() {
    const data = {
      products,
      inventory,
      recipes,
      orders,
      purchases,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bakers_brain_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  function exportOrdersCSV() {
    const headers = "ID,Date,Customer,Phone,Product,Qty,Total,Profit,Status,Payment\n";
    const rows = orders
      .map(
        (o) =>
          `"${o.id}","${o.date.slice(0, 10)}","${o.customer}","${o.phone}","${o.productName}",${o.quantity},${o.total},${o.profit},"${o.status}","${o.payment}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // ==========================================
  // RENDER VIEWS
  // ==========================================

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-between shadow-2xl relative pb-20 font-sans">
      {/* Top Header */}
      <header className="bg-rose-600 text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDrawer(true)}
            className="p-1 hover:bg-rose-700 rounded-md transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
              <span>🍰</span> Baker's Brain
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats.lowStockCount > 0 && (
            <span
              onClick={() => setCurrentPage("inventory")}
              className="cursor-pointer bg-yellow-400 text-rose-950 font-extrabold text-xs px-2 py-0.5 rounded-full shadow"
              title="Low Stock Alert"
            >
              ⚠️ {stats.lowStockCount} Low
            </span>
          )}
        </div>
      </header>

      {/* Drawer Menu */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setShowDrawer(false)}
          ></div>
          <div className="relative bg-white w-72 h-full shadow-2xl p-5 flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🧁</span>
                  <div>
                    <h2 className="font-bold text-gray-800">Baker's Brain</h2>
                    <p className="text-xs text-gray-500">Smart Bakery Management</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {[
                  { id: "dashboard", label: "Dashboard", icon: "📊" },
                  { id: "neworder", label: "New Order (Quick)", icon: "⚡" },
                  { id: "orders", label: "Orders Manager", icon: "📦" },
                  { id: "products", label: "Products Catalog", icon: "🎂" },
                  { id: "inventory", label: "Raw Ingredients", icon: "🥣" },
                  { id: "purchases", label: "Purchase History", icon: "🧾" },
                  { id: "reports", label: "Reports & Analytics", icon: "📈" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPage(item.id);
                      setShowDrawer(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      currentPage === item.id
                        ? "bg-rose-50 text-rose-600 font-bold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="mt-6 pt-4 border-t space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3">
                  Data & Backup
                </p>
                <button
                  onClick={exportDatabaseJSON}
                  className="w-full text-left text-xs text-gray-600 hover:bg-gray-100 px-3 py-2 rounded flex items-center gap-2"
                >
                  💾 Export JSON Backup
                </button>
                <button
                  onClick={exportOrdersCSV}
                  className="w-full text-left text-xs text-gray-600 hover:bg-gray-100 px-3 py-2 rounded flex items-center gap-2"
                >
                  📑 Download Orders (CSV)
                </button>
              </div>
            </div>

            <div className="pt-4 border-t text-center text-xs text-gray-400">
              Offline First • V1.0.0
            </div>
          </div>
        </div>
      )}

      {/* Main Screen Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        {/* ================= DASHBOARD ================= */}
        {currentPage === "dashboard" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Today's Overview</h2>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => setCurrentPage("neworder")}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
              >
                + New Order
              </button>
            </div>

            {/* Top Cards: Sales & Profit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Today's Sales</p>
                <p className="text-2xl font-black text-gray-900 mt-1">৳ {stats.todaySales}</p>
                <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">
                  {stats.todayOrdersCount} Orders Today
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Today's Profit</p>
                <p className="text-2xl font-black text-rose-600 mt-1">৳ {stats.todayProfit}</p>
                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                  Net Estimated
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div
                onClick={() => setCurrentPage("orders")}
                className="bg-white p-3 rounded-xl shadow-xs border border-gray-100 cursor-pointer hover:border-rose-300 transition"
              >
                <p className="text-xs text-gray-500">Pending Orders</p>
                <p className="text-xl font-bold text-amber-600">{stats.pendingOrders}</p>
              </div>
              <div
                onClick={() => setCurrentPage("inventory")}
                className="bg-white p-3 rounded-xl shadow-xs border border-gray-100 cursor-pointer hover:border-rose-300 transition"
              >
                <p className="text-xs text-gray-500">Low Stock Items</p>
                <p className="text-xl font-bold text-red-500">{stats.lowStockCount}</p>
              </div>
            </div>

            {/* Attention Needed Section */}
            {(stats.lowStockCount > 0 || stats.pendingOrders > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚠️</span> Attention Needed
                </h3>
                {stats.lowStockCount > 0 && (
                  <div
                    onClick={() => setCurrentPage("inventory")}
                    className="flex justify-between items-center text-xs text-amber-800 cursor-pointer font-medium hover:underline"
                  >
                    <span>Running low on {stats.lowStockCount} raw ingredients</span>
                    <span className="font-bold">View Inventory ›</span>
                  </div>
                )}
                {stats.pendingOrders > 0 && (
                  <div
                    onClick={() => setCurrentPage("orders")}
                    className="flex justify-between items-center text-xs text-amber-800 cursor-pointer font-medium hover:underline"
                  >
                    <span>{stats.pendingOrders} orders awaiting delivery/payment</span>
                    <span className="font-bold">View Orders ›</span>
                  </div>
                )}
              </div>
            )}

            {/* Monthly Summary */}
            <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800 text-sm">All-Time Performance</h3>
                <span className="text-xs text-gray-400">{orders.length} total orders</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="border-r border-gray-100">
                  <p className="text-xs text-gray-500">Total Sales</p>
                  <p className="text-lg font-bold text-gray-800">৳ {stats.totalSales}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Profit</p>
                  <p className="text-lg font-bold text-green-600">৳ {stats.totalProfit}</p>
                </div>
              </div>
            </div>

            {/* Recent Orders Preview */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-sm">Recent Orders</h3>
                <button
                  onClick={() => setCurrentPage("orders")}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  View All
                </button>
              </div>

              {orders.slice(0, 3).map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{order.customer}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          order.status === "Paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {order.productName} × {order.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-gray-900">৳ {order.total}</p>
                    <p className="text-[10px] text-gray-400">{order.deliveryDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= QUICK ORDER (WHATSAPP PARSER) ================= */}
        {currentPage === "neworder" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Quick Order Processor</h2>
            <p className="text-xs text-gray-500">
              Paste customer chat from WhatsApp, Messenger, or phone message.
            </p>

            {/* Step 1: Paste Text */}
            <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100">
              <label className="block text-xs font-bold text-gray-700 mb-2">
                1. Paste Order Message
              </label>
              <textarea
                value={rawMessage}
                onChange={(e) => setRawMessage(e.target.value)}
                rows={7}
                placeholder="Customer: Name&#10;Phone: 017...&#10;Product: Chocolate Cake&#10;Quantity: 2&#10;Price: 3000"
                className="w-full text-xs p-3 border rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden font-mono bg-gray-50"
              />
              <button
                onClick={handleProcessMessage}
                className="w-full mt-3 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg text-sm transition shadow"
              >
                ⚡ PROCESS MESSAGE
              </button>
            </div>

            {/* Step 2: Review Card */}
            {parsedOrder && (
              <div className="bg-white p-4 rounded-xl shadow-md border-2 border-rose-500 space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-sm text-gray-800">2. Review Processed Order</h3>
                  {parsedOrder.isNewCustomer && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                      ✨ New Customer
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Customer:</span>
                    <p className="font-bold text-gray-800">{parsedOrder.customer}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Phone:</span>
                    <p className="font-bold text-gray-800">{parsedOrder.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Product:</span>
                    <p className="font-bold text-gray-800">{parsedOrder.productName}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Quantity:</span>
                    <p className="font-bold text-gray-800">{parsedOrder.quantity}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Price:</span>
                    <p className="font-bold text-rose-600 text-sm">৳ {parsedOrder.total}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Est. Profit:</span>
                    <p className="font-bold text-green-600 text-sm">৳ {parsedOrder.profit}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Delivery:</span>
                    <p className="font-semibold text-gray-700">{parsedOrder.deliveryDate}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Location:</span>
                    <p className="font-semibold text-gray-700">{parsedOrder.location}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setParsedOrder(null)}
                    className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveOrder}
                    className="w-2/3 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg text-xs shadow"
                  >
                    ✓ CONFIRM & SAVE ORDER
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= ORDERS LIST ================= */}
        {currentPage === "orders" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Orders ({orders.length})</h2>
              <button
                onClick={() => setCurrentPage("neworder")}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow"
              >
                + New Order
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-gray-200 p-1 rounded-xl text-xs font-bold text-gray-600">
              {["All", "Pending", "Paid", "Today"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setOrderFilter(tab)}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    orderFilter === tab
                      ? "bg-white text-rose-600 shadow-xs"
                      : "hover:text-gray-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Orders Cards */}
            <div className="space-y-3">
              {orders
                .filter((o) => {
                  if (orderFilter === "Pending") return o.status === "Pending";
                  if (orderFilter === "Paid") return o.status === "Paid";
                  if (orderFilter === "Today") {
                    return (
                      new Date(o.date).toDateString() === new Date().toDateString()
                    );
                  }
                  return true;
                })
                .map((order) => (
                  <div
                    key={order.id}
                    className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-2.5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-rose-600">
                            {order.id}
                          </span>
                          <span className="font-bold text-sm text-gray-900">
                            {order.customer}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{order.phone}</p>
                      </div>
                      <button
                        onClick={() => {
                          setOrders((prev) =>
                            prev.map((o) =>
                              o.id === order.id
                                ? {
                                    ...o,
                                    status: o.status === "Paid" ? "Pending" : "Paid",
                                  }
                                : o
                            )
                          );
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full font-bold transition ${
                          order.status === "Paid"
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                      >
                        {order.status}
                      </button>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1 text-gray-700">
                      <div className="flex justify-between font-medium">
                        <span>
                          🍰 {order.productName} × {order.quantity}
                        </span>
                        <span className="font-bold text-gray-900">৳ {order.total}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-500">
                        <span>📍 {order.location || "Local Delivery"}</span>
                        <span>⏰ {order.deliveryDate}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-gray-400">
                        Profit: <strong className="text-green-600">৳{order.profit}</strong>
                      </span>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete order ${order.id}?`)) {
                            setOrders(orders.filter((o) => o.id !== order.id));
                          }
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ================= PRODUCTS ================= */}
        {currentPage === "products" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                Products Catalog ({products.length})
              </h2>
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow"
              >
                + Add Product
              </button>
            </div>

            {/* Add Product Modal */}
            {showAddProduct && (
              <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 space-y-3">
                <h3 className="font-bold text-sm text-gray-800">Add New Bakery Product</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Product Code (e.g. C3)"
                    value={newProdCode}
                    onChange={(e) => setNewProdCode(e.target.value)}
                    className="border p-2 rounded text-xs"
                  />
                  <input
                    placeholder="Product Name"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className="border p-2 rounded text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Selling Price (৳)"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="border p-2 rounded text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Estimated Cost (৳)"
                    value={newProdCost}
                    onChange={(e) => setNewProdCost(e.target.value)}
                    className="border p-2 rounded text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddProduct}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-xs font-bold"
                  >
                    Save Product
                  </button>
                  <button
                    onClick={() => setShowAddProduct(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Product Cards */}
            <div className="space-y-3">
              {products.map((product) => {
                const profit = product.price - product.cost;
                const margin = Math.round((profit / product.price) * 100) || 0;

                return (
                  <div
                    key={product.code}
                    className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono font-bold text-rose-600">
                          {product.code}
                        </span>
                        <h3 className="font-bold text-gray-900 text-sm">{product.name}</h3>
                      </div>
                      <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                        {product.status || "Active"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-lg text-center">
                      <div>
                        <span className="text-[10px] text-gray-400">Sell Price</span>
                        <p className="font-bold text-xs text-gray-800">৳ {product.price}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400">Unit Cost</span>
                        <p className="font-bold text-xs text-gray-800">৳ {product.cost}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400">Profit</span>
                        <p className="font-bold text-xs text-green-600">
                          ৳ {profit} ({margin}%)
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <button
                        onClick={() => setCurrentPage("recipe-" + product.code)}
                        className="bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                      >
                        🥣 Edit Recipe
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${product.name}?`)) {
                            setProducts(products.filter((p) => p.code !== product.code));
                          }
                        }}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= RECIPE BUILDER ================= */}
        {currentPage.startsWith("recipe-") && (() => {
          const prodCode = currentPage.replace("recipe-", "");
          const product = products.find((p) => p.code === prodCode);
          const recipe = recipes[prodCode] || {};
          const recipeEntries = Object.entries(recipe);

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    Recipe: {product?.name || prodCode}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Raw ingredient quantities needed to bake 1 unit.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentPage("products")}
                  className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg"
                >
                  Back
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-3">
                <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                  Ingredient Breakdown
                </h3>

                {recipeEntries.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    No ingredients added to this recipe yet.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {recipeEntries.map(([ingCode, qty]) => {
                      const ing = inventory.find((i) => i.code === ingCode);
                      return (
                        <div
                          key={ingCode}
                          className="py-2.5 flex justify-between items-center text-xs"
                        >
                          <div>
                            <p className="font-bold text-gray-800">
                              {ing?.name || ingCode}
                            </p>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {ingCode}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-700">
                              {qty} {ing?.unit || "units"}
                            </span>
                            <button
                              onClick={() => handleRemoveRecipeIngredient(prodCode, ingCode)}
                              className="text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5 rounded"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Ingredient to Recipe */}
                <div className="mt-4 pt-3 border-t space-y-2">
                  <h4 className="text-xs font-bold text-gray-800">Add Ingredient</h4>
                  <div className="flex gap-2">
                    <select
                      value={selectedIngCode}
                      onChange={(e) => setSelectedIngCode(e.target.value)}
                      className="border p-2 rounded text-xs flex-1 bg-gray-50"
                    >
                      <option value="">Select Raw Material</option>
                      {inventory
                        .filter((i) => !(i.code in recipe))
                        .map((i) => (
                          <option key={i.code} value={i.code}>
                            {i.name} ({i.unit})
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Qty"
                      value={selectedIngQty}
                      onChange={(e) => setSelectedIngQty(e.target.value)}
                      className="border p-2 rounded text-xs w-20"
                    />
                  </div>
                  <button
                    onClick={() => handleAddRecipeIngredient(prodCode)}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded text-xs transition"
                  >
                    + Add to Recipe
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ================= INVENTORY / RAW MATERIALS ================= */}
        {currentPage === "inventory" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                Raw Ingredients ({inventory.length})
              </h2>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCurrentPage("purchases")}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg"
                >
                  Purchases
                </button>
                <button
                  onClick={() => setShowAddIngredient(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow"
                >
                  + Add/Buy
                </button>
              </div>
            </div>

            {/* Record Purchase / Add Ingredient Modal */}
            {showAddIngredient && (
              <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 space-y-3">
                <h3 className="font-bold text-sm text-gray-800">
                  Record Ingredient Purchase
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Code (e.g. ING09)"
                    value={newIngCode}
                    onChange={(e) => setNewIngCode(e.target.value)}
                    className="border p-2 rounded text-xs"
                  />
                  <input
                    placeholder="Ingredient Name"
                    value={newIngName}
                    onChange={(e) => setNewIngName(e.target.value)}
                    className="border p-2 rounded text-xs"
                  />
                  <input
                    placeholder="Unit (kg, Litre, pcs)"
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value)}
                    className="border p-2 rounded text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Purchase Quantity"
                    value={newIngStock}
                    onChange={(e) => setNewIngStock(e.target.value)}
                    className="border p-2 rounded text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Unit Price (৳)"
                    value={newIngPrice}
                    onChange={(e) => setNewIngPrice(e.target.value)}
                    className="border p-2 rounded text-xs"
                  />
                  <input
                    placeholder="Supplier / Market"
                    value={newIngSource}
                    onChange={(e) => setNewIngSource(e.target.value)}
                    className="border p-2 rounded text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePurchase}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-xs font-bold"
                  >
                    Save & Add Stock
                  </button>
                  <button
                    onClick={() => setShowAddIngredient(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Inventory List */}
            <div className="space-y-3">
              {inventory.map((item) => {
                const isLow = item.stock <= item.minimum;
                return (
                  <div
                    key={item.code}
                    className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-400">
                          {item.code}
                        </span>
                        <h3 className="font-bold text-sm text-gray-900">{item.name}</h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Min threshold: {item.minimum} {item.unit}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isLow
                            ? "bg-red-100 text-red-700 animate-pulse"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {isLow ? "LOW STOCK" : "GOOD"}
                      </span>
                      <p className="font-black text-sm text-gray-900 mt-1">
                        {item.stock} {item.unit}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= PURCHASE HISTORY ================= */}
        {currentPage === "purchases" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                Purchase History ({purchases.length})
              </h2>
              <button
                onClick={() => setCurrentPage("inventory")}
                className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg"
              >
                Back to Inventory
              </button>
            </div>

            <div className="space-y-3">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-teal-600">
                      {p.id}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(p.date).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">
                        {p.name} ({p.code})
                      </h4>
                      <p className="text-xs text-gray-500">Source: {p.source}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-gray-900">৳ {p.totalCost}</p>
                      <p className="text-xs text-gray-400">
                        {p.quantity} {p.unit} × ৳{p.unitPrice}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= REPORTS ================= */}
        {currentPage === "reports" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Reports & Analytics</h2>
              <button
                onClick={exportOrdersCSV}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow"
              >
                📥 Export CSV
              </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100">
                <p className="text-xs text-gray-400 font-medium">Lifetime Sales</p>
                <p className="text-xl font-bold text-gray-900 mt-1">৳ {stats.totalSales}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100">
                <p className="text-xs text-gray-400 font-medium">Lifetime Profit</p>
                <p className="text-xl font-bold text-green-600 mt-1">৳ {stats.totalProfit}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100">
                <p className="text-xs text-gray-400 font-medium">Total Orders</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stats.totalOrdersCount}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100">
                <p className="text-xs text-gray-400 font-medium">Avg. Order Value</p>
                <p className="text-xl font-bold text-purple-600 mt-1">
                  ৳{" "}
                  {stats.totalOrdersCount
                    ? Math.round(stats.totalSales / stats.totalOrdersCount)
                    : 0}
                </p>
              </div>
            </div>

            {/* Top Products Distribution */}
            <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-3">
              <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                Top Selling Products
              </h3>
              <div className="space-y-2">
                {products.map((prod) => {
                  const productSales = orders
                    .filter((o) => o.productCode === prod.code)
                    .reduce((sum, o) => sum + o.quantity, 0);

                  const maxUnits = Math.max(
                    ...products.map((p) =>
                      orders
                        .filter((o) => o.productCode === p.code)
                        .reduce((sum, o) => sum + o.quantity, 0)
                    ),
                    1
                  );
                  const barWidth = Math.round((productSales / maxUnits) * 100);

                  return (
                    <div key={prod.code} className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-800">{prod.name}</span>
                        <span className="font-bold text-gray-600">
                          {productSales} sold
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= BOTTOM NAVIGATION BAR ================= */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 py-2 flex justify-between items-center z-40 shadow-lg">
        {/* Dashboard */}
        <button
          onClick={() => setCurrentPage("dashboard")}
          className={`flex flex-col items-center gap-1 transition ${
            currentPage === "dashboard" ? "text-rose-600 font-bold" : "text-gray-400"
          }`}
        >
          <span className="text-lg">🏠</span>
          <span className="text-[10px]">Dashboard</span>
        </button>

        {/* Orders */}
        <button
          onClick={() => setCurrentPage("orders")}
          className={`flex flex-col items-center gap-1 transition ${
            currentPage === "orders" ? "text-rose-600 font-bold" : "text-gray-400"
          }`}
        >
          <span className="text-lg">📋</span>
          <span className="text-[10px]">Orders</span>
        </button>

        {/* Floating Center (+) Action Button */}
        <button
          onClick={() => setCurrentPage("neworder")}
          className="bg-rose-600 hover:bg-rose-700 text-white w-12 h-12 rounded-full flex items-center justify-center -mt-6 shadow-lg border-4 border-white transition transform active:scale-95"
          title="New Order"
        >
          <span className="text-2xl font-bold">+</span>
        </button>

        {/* Products */}
        <button
          onClick={() => setCurrentPage("products")}
          className={`flex flex-col items-center gap-1 transition ${
            currentPage === "products" || currentPage.startsWith("recipe-")
              ? "text-rose-600 font-bold"
              : "text-gray-400"
          }`}
        >
          <span className="text-lg">🎂</span>
          <span className="text-[10px]">Products</span>
        </button>

        {/* Reports */}
        <button
          onClick={() => setCurrentPage("reports")}
          className={`flex flex-col items-center gap-1 transition ${
            currentPage === "reports" ? "text-rose-600 font-bold" : "text-gray-400"
          }`}
        >
          <span className="text-lg">📊</span>
          <span className="text-[10px]">Reports</span>
        </button>
      </nav>
    </div>
  );
}