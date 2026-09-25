import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export type IngredientItem = {
  code: string; name: string; unit: string; stock: number; minimum: number; unit_cost: number;
};

export type Product = {
  code: string; name: string; price: number; cost: number; status: "Active" | "Inactive";
  vat_rate?: number; profit_margin?: number; shelf_life_days?: number;
};

export type Purchase = {
  id: string; date: string; code: string; name: string; quantity: number; unit: string;
  unit_price: number; total_cost: number; source: string; notes: string;
};

export type Order = {
  id: string; date: string; time: string; customer: string; phone: string;
  product_code: string; product_name: string; quantity: number; unit_price: number;
  total: number; advance_paid: number; pending_payment: number; cost: number;
  profit: number; location: string; delivery_date: string; payment_method: string;
  status: "Pending" | "Paid" | "Completed"; is_new_customer: number;
};

export type ParsedOrderItem = {
  productCode: string; productName: string; quantity: number; unitPrice: number; cost: number;
};

export type ParsedOrder = {
  customer: string; phone: string; email?: string; items: ParsedOrderItem[];
  subtotal: number; deliveryCharge: number; vatAmount: number; total: number;
  advancePaid: number; pendingPayment: number; cost: number; profit: number;
  location: string; deliveryDate: string; paymentMethod: string; isWalkIn?: boolean;
};

export type CustomerSummary = {
  name: string; phone: string; totalOrders: number; totalSpent: number;
  totalProfit: number; lastOrderDate: string; favoriteProduct: string;
  avgOrderValue: number; tier: "Best" | "Medium" | "Regular"; address: string;
};

export type ShelfItem = {
  id: string; product_code: string; product_name: string; quantity: number;
  cost: number; price: number; batch_date: string; expiry_date: string;
};

export type WasteLog = {
  id: string; date: string; product_code: string; product_name: string;
  quantity: number; total_loss: number;
};

export type ShopSettings = {
  id?: string; user_id?: string; currency_symbol: string; default_tax_rate: number;
  target_margin: number; shop_name: string; shop_address: string; shop_phone: string;
};

interface BakeryContextType {
  products: Product[]; ingredients : IngredientItem[]; orders: Order[]; purchases: Purchase[];
  customers: CustomerSummary[]; shelfStock: ShelfItem[]; wasteLogs: WasteLog[];
  shopSettings: ShopSettings | null; stats: any; 
  fetchData: () => Promise<void>;
  updateShopSettings: (updates: Partial<ShopSettings>) => Promise<void>;
  addProduct: (product: any) => Promise<void>; deleteProduct: (code: string) => Promise<void>;
  deleteIngredientItem: (code: string) => Promise<void>; deleteOrder: (id: string) => Promise<void>;
  deductIngredientItem: (code: string, quantity: number, reason: string) => Promise<void>;
  savePurchase: (purchase: any, minimum?: number) => Promise<void>;
  attachRecipeItem: (productCode: string, ingredientCode: string, quantity: number) => Promise<void>;
  createOrder: (parsed: ParsedOrder) => Promise<string>;
  markOrderCompleted: (orderId: string) => Promise<void>;
  logWaste: (shelfItemId: string, quantity: number) => Promise<void>;
  exportOrdersCSV: () => void; exportDatabaseJSON: () => void;
}

const BakeryContext = createContext<BakeryContextType | null>(null);

// THE UNIVERSAL DATE TRANSLATOR
// Converts "26/09/2026", "Today", or random formats into "26 Sep 2026"
export const standardizeDateString = (dateStr: string) => {
  if (!dateStr || dateStr.toLowerCase() === "today") {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
  }
  let dateObj = new Date(dateStr);

  // Catch DD/MM/YYYY formats and convert to real Date object before formatting
  const parts = dateStr.split('/');
  if (parts.length === 3) {
     const day = parseInt(parts[0], 10);
     const month = parseInt(parts[1], 10) - 1; // JS Months are 0-indexed
     let year = parseInt(parts[2], 10);
     if (year < 100) year += 2000;
     dateObj = new Date(year, month, day);
  }

  if (isNaN(dateObj.getTime())) return dateStr; // Fallback if completely unreadable
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(dateObj);
};

export const BakeryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [shelfStock, setShelfStock] = useState<ShelfItem[]>([]);
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const [pRes, iRes, oRes, purRes] = await Promise.all([
        supabase.from("products").select("*").eq("user_id", user.id).eq("is_deleted", false).order("name", { ascending: true }),
        supabase.from("ingredients").select("*").eq("user_id", user.id).eq("is_deleted", false).neq("status", 'archived').order("name", { ascending: true }),
        supabase.from("orders").select("*").eq("user_id", user.id).eq("is_deleted", false).order("date", { ascending: false }),
        supabase.from("purchases").select("*").eq("user_id", user.id).order("date", { ascending: false })
      ]);

      if (pRes.data) setProducts(pRes.data as Product[]);
      if (iRes.data) setIngredients(iRes.data as IngredientItem[]);
      if (oRes.data) setOrders(oRes.data as Order[]);
      if (purRes.data) setPurchases(purRes.data as Purchase[]);

      const { data: setRes } = await supabase.from("shop_settings").select("*").eq("user_id", user.id).limit(1);

      if (setRes && setRes.length > 0) {
        setShopSettings(setRes[0] as ShopSettings);
      } else {
        const defaultSettings = { user_id: user.id, currency_symbol: '৳', default_tax_rate: 0, target_margin: 20, shop_name: 'My Bakery', shop_address: '', shop_phone: '' };
        const { data: newSettings } = await supabase.from("shop_settings").upsert([defaultSettings], { onConflict: 'user_id' }).select().limit(1);
        if (newSettings && newSettings.length > 0) setShopSettings(newSettings[0] as ShopSettings);
      }

      const { data: sData } = await supabase.from("shelf_stock").select("*").eq("user_id", user.id).gt("quantity", 0).order("expiry_date", { ascending: true });
      if (sData) setShelfStock(sData as ShelfItem[]);
      const { data: wData } = await supabase.from("waste_logs").select("*").eq("user_id", user.id).order("date", { ascending: false });
      if (wData) setWasteLogs(wData as WasteLog[]);

    } catch (err) {
      console.error("Cloud fetch error:", err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateShopSettings = async (updates: Partial<ShopSettings>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const merged = { ...shopSettings, ...updates, user_id: user.id };
    await supabase.from("shop_settings").upsert(merged, { onConflict: 'user_id' });
    setShopSettings(prev => prev ? { ...prev, ...updates } : null);
  };

  const addProduct = async (product: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newProduct = { ...product, cost: 0, status: "Active", user_id: user.id };
    setProducts((prev) => [...prev, newProduct as Product]);
    await supabase.from("products").insert([newProduct]);
  };

  const deleteProduct = async (code: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. CLEANUP GHOST DATA: Delete all recipe rows linked to this product first
    await supabase.from("recipes").delete().eq("product_code", code).eq("user_id", user.id);

    // 2. Delete the actual product
    const { error } = await supabase.from("products").delete().eq("code", code).eq("user_id", user.id);

    if (!error) {
      setProducts((prev) => prev.filter((p) => p.code !== code));
    }
  };

  const deleteIngredientItem = async (code: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("ingredients").update({ status: 'archived', is_deleted: true }).eq("code", code).eq("user_id", user.id);
    setIngredients((prev) => prev.filter((item) => item.code !== code));
  };

  const deleteOrder = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("orders").update({ is_deleted: true }).eq("id", id).eq("user_id", user.id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const deductIngredientItem = async (code: string, quantity: number, _reason: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const currentItem = ingredients.find((i) => i.code === code);
    if (!currentItem) return;
    const newStock = Math.max(0, parseFloat((currentItem.stock - quantity).toFixed(3)));
    setIngredients((prev) => prev.map((item) => (item.code === code ? { ...item, stock: newStock } : item)));
    await supabase.from("ingredients").update({ stock: newStock }).eq("code", code).eq("user_id", user.id);
  };

  const savePurchase = async (purchase: any, minimum = 2) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const totalCost = purchase.quantity * purchase.unit_price;
    const purId = `PUR-${Date.now().toString().slice(-6)}`;
    const newPur = { id: purId, date: new Date().toISOString(), total_cost: totalCost, user_id: user.id, ...purchase };

    const updatedPurchases = [newPur, ...purchases];
    setPurchases(updatedPurchases);

    const itemPurchases = updatedPurchases.filter((p) => p.code === purchase.code);
    const totalSpent = itemPurchases.reduce((acc, p) => acc + (p.total_cost || 0), 0);
    const totalQty = itemPurchases.reduce((acc, p) => acc + p.quantity, 0);
    const weightedAvgCost = totalQty > 0 ? parseFloat((totalSpent / totalQty).toFixed(2)) : purchase.unit_price;

    const exists = ingredients.find((i) => i.code === purchase.code);
    const updatedStock = exists ? parseFloat((exists.stock + purchase.quantity).toFixed(3)) : purchase.quantity;

    setIngredients((prev) => {
      if (exists) return prev.map((item) => item.code === purchase.code ? { ...item, stock: updatedStock, unit_cost: weightedAvgCost } : item);
      return [...prev, { code: purchase.code, name: purchase.name, unit: purchase.unit, stock: purchase.quantity, minimum, unit_cost: weightedAvgCost }];
    });

    await supabase.from("ingredients").upsert([{ code: purchase.code, name: purchase.name, unit: purchase.unit, stock: updatedStock, minimum, unit_cost: weightedAvgCost, user_id: user.id, is_deleted: false }]);
    await supabase.from("purchases").insert([newPur]);

    const { data: affectedRecipes } = await supabase.from("recipes").select("product_code").eq("ingredient_code", purchase.code).eq("user_id", user.id);
    if (affectedRecipes && affectedRecipes.length > 0) {
      const productCodes = [...new Set(affectedRecipes.map((r) => r.product_code))];
      for (const pCode of productCodes) {
        const { data: fullRecipe } = await supabase.from("recipes").select("ingredient_code, quantity").eq("product_code", pCode).eq("user_id", user.id);
        if (fullRecipe) {
          let recalculatedCost = 0;
          fullRecipe.forEach((item) => {
            const ingCost = item.ingredient_code === purchase.code ? weightedAvgCost : (ingredients.find((i) => i.code === item.ingredient_code)?.unit_cost || 0);
            recalculatedCost += ingCost * item.quantity;
          });
          const roundedCost = parseFloat(recalculatedCost.toFixed(2));
          await supabase.from("products").update({ cost: roundedCost }).eq("code", pCode).eq("user_id", user.id);
          setProducts((prev) => prev.map((p) => (p.code === pCode ? { ...p, cost: roundedCost } : p)));
        }
      }
    }
  };

  const attachRecipeItem = async (productCode: string, ingredientCode: string, quantity: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("recipes").delete().eq("product_code", productCode).eq("ingredient_code", ingredientCode).eq("user_id", user.id);

    const { error } = await supabase.from("recipes").insert([{ 
      product_code: productCode, ingredient_code: ingredientCode, quantity, user_id: user.id 
    }]);

    if (error) {
      console.error("DB Error saving recipe:", error);
      alert("Database failed to save recipe: " + error.message);
    }
  };

  const logWaste = async (shelfItemId: string, quantity: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const item = shelfStock.find(i => i.id === shelfItemId);
    if (!item) return;
    const remaining = Math.max(0, item.quantity - quantity);
    const lossAmount = item.cost * quantity;
    setShelfStock(prev => prev.map(i => i.id === shelfItemId ? { ...i, quantity: remaining } : i));
    await supabase.from('shelf_stock').update({ quantity: remaining }).eq('id', shelfItemId);
    const newLog = { id: `WST-${Date.now()}`, date: new Date().toISOString(), product_code: item.product_code, product_name: item.product_name, quantity, total_loss: parseFloat(lossAmount.toFixed(2)), user_id: user.id };
    setWasteLogs(prev => [newLog, ...prev]);
    await supabase.from('waste_logs').insert([newLog]);
  };

  const createOrder = async (parsed: ParsedOrder): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const now = new Date();

    const newDeductions: any[] = [];
    // NEW: We will queue up all our database updates here to fire them all at once!
    const dbPromises: Promise<any>[] = []; 

    if (parsed.customer === "Self") {
      const newShelfItems: any[] = [];
      for (const item of parsed.items) {
        const matchedProduct = products.find(p => p.code === item.productCode);
        const expiryDays = matchedProduct?.shelf_life_days || 2;
        const expiryDate = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
        newShelfItems.push({
          id: `SHLF-${Date.now()}-${Math.floor(Math.random() * 1000)}`, product_code: item.productCode, product_name: item.productName,
          quantity: item.quantity, cost: item.cost / item.quantity, price: item.unitPrice, batch_date: now.toISOString(), expiry_date: expiryDate.toISOString(), user_id: user.id
        });
      }
      setShelfStock(prev => [...prev, ...newShelfItems]);
      await supabase.from("shelf_stock").insert(newShelfItems);

      for (const item of parsed.items) {
        const { data: recipeData } = await supabase.from("recipes").select("ingredient_code, quantity").eq("product_code", item.productCode).eq("user_id", user.id);
        if (recipeData && recipeData.length > 0) {
          for (const rItem of recipeData) {
            const deduction = rItem.quantity * item.quantity;
            const currentIng = ingredients.find((i) => i.code === rItem.ingredient_code);
            if (currentIng) {
              const remainingStock = Math.max(0, parseFloat((currentIng.stock - deduction).toFixed(3)));

              // Update React instantly
              setIngredients((prev) => prev.map((ing) => ing.code === rItem.ingredient_code ? { ...ing, stock: remainingStock } : ing));

              // NEW: Queue the database update instead of pausing the loop!
              dbPromises.push(
                supabase.from("ingredients").update({ stock: remainingStock }).eq("code", rItem.ingredient_code).eq("user_id", user.id)
              );

              // LOG THE DEDUCTION
              newDeductions.push({
                product_code: item.productCode,
                product_name: item.productName,
                ingredient_code: rItem.ingredient_code,
                ingredient_name: currentIng.name,
                deducted_quantity: deduction,
                unit: currentIng.unit,
                user_id: user.id
              });
            }
          }
        }
      }

      // NEW: Fire all queued ingredient updates instantly and concurrently!
      if (dbPromises.length > 0) await Promise.all(dbPromises);
      // Bulk insert deductions log
      if (newDeductions.length > 0) await supabase.from("deductions").insert(newDeductions);
      return "SHELF-STOCKED";
    }

    const todayStr = now.toDateString();
    const todayOrdersCount = orders.filter((o) => new Date(o.date).toDateString() === todayStr).length;
    const nextOrderNum = (todayOrdersCount + 1).toString().padStart(2, "0");
    const dayOfMonth = now.getDate().toString().padStart(2, "0");
    const orderId = `BB-${dayOfMonth}#${nextOrderNum}`;

    const isNew = orders.some((o) => o.phone && o.phone === parsed.phone) ? 0 : 1;
    const status = parsed.isWalkIn ? "Completed" : "Pending";
    const newOrders: Order[] = [];
    let remainingAdvance = parsed.advancePaid;

    const finalDeliveryDate = standardizeDateString(parsed.deliveryDate);

    for (let i = 0; i < parsed.items.length; i++) {
      const item = parsed.items[i];
      const itemBaseTotal = item.quantity * item.unitPrice;
      let rowTotal = itemBaseTotal;
      if (i === 0) rowTotal += (parsed.deliveryCharge || 0) + (parsed.vatAmount || 0);

      let rowAdvance = 0;
      if (parsed.isWalkIn) rowAdvance = rowTotal;
      else if (remainingAdvance >= rowTotal) { rowAdvance = rowTotal; remainingAdvance -= rowTotal; } 
      else if (remainingAdvance > 0) { rowAdvance = remainingAdvance; remainingAdvance = 0; }

      const rowPending = parsed.isWalkIn ? 0 : Math.max(0, rowTotal - rowAdvance);
      const rowProfit = rowTotal - item.cost;

      newOrders.push({
        id: orderId, date: now.toISOString(), time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        customer: parsed.customer, phone: parsed.phone, product_code: item.productCode, product_name: item.productName,
        quantity: item.quantity, unit_price: item.unitPrice, total: parseFloat(rowTotal.toFixed(2)), advance_paid: parseFloat(rowAdvance.toFixed(2)),
        pending_payment: parseFloat(rowPending.toFixed(2)), cost: item.cost, profit: parseFloat(rowProfit.toFixed(2)),
        location: parsed.location, delivery_date: finalDeliveryDate, payment_method: parsed.paymentMethod, status, is_new_customer: isNew, user_id: user.id
      } as Order);
    }

    setOrders((prev) => [...newOrders, ...prev]);
    await supabase.from("orders").insert(newOrders);

    if (parsed.isWalkIn) {
      for (const item of parsed.items) {
        let qtyToDeduct = item.quantity;
        const availableBatches = shelfStock.filter(s => s.product_code === item.productCode && s.quantity > 0).sort((a,b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
        for (const batch of availableBatches) {
            if (qtyToDeduct <= 0) break;
            const deductAmount = Math.min(batch.quantity, qtyToDeduct);
            qtyToDeduct -= deductAmount;
            const newQty = batch.quantity - deductAmount;

            setShelfStock(prev => prev.map(s => s.id === batch.id ? { ...s, quantity: newQty } : s));

            // Queue shelf update
            dbPromises.push(
              supabase.from('shelf_stock').update({ quantity: newQty }).eq('id', batch.id)
            );
        }
      }
    } else {
      for (const item of parsed.items) {
        const { data: recipeData } = await supabase.from("recipes").select("ingredient_code, quantity").eq("product_code", item.productCode).eq("user_id", user.id);
        if (recipeData && recipeData.length > 0) {
          for (const rItem of recipeData) {
            const deduction = rItem.quantity * item.quantity;
            const currentIng = ingredients.find((i) => i.code === rItem.ingredient_code);
            if (currentIng) {
              const remainingStock = Math.max(0, parseFloat((currentIng.stock - deduction).toFixed(3)));

              setIngredients((prev) => prev.map((ing) => ing.code === rItem.ingredient_code ? { ...ing, stock: remainingStock } : ing));

              // Queue ingredient update
              dbPromises.push(
                supabase.from("ingredients").update({ stock: remainingStock }).eq("code", rItem.ingredient_code).eq("user_id", user.id)
              );

              // LOG THE DEDUCTION
              newDeductions.push({
                product_code: item.productCode,
                product_name: item.productName,
                ingredient_code: rItem.ingredient_code,
                ingredient_name: currentIng.name,
                deducted_quantity: deduction,
                unit: currentIng.unit,
                user_id: user.id
              });
            }
          }
        }
      }
    }

    // NEW: Fire all queued ingredient and shelf updates concurrently!
    if (dbPromises.length > 0) await Promise.all(dbPromises);
    if (newDeductions.length > 0) await supabase.from("deductions").insert(newDeductions);

    return orderId;
  };

  const markOrderCompleted = async (orderId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "Completed" as const, advance_paid: o.total, pending_payment: 0 } : o));
    await supabase.from("orders").update({ status: "Completed", advance_paid: orders.find(o => o.id === orderId)?.total, pending_payment: 0 }).eq("id", orderId).eq("user_id", user.id);
  };

  const customers = useMemo(() => {
    const map: Record<string, CustomerSummary> = {};
    orders.forEach((o) => {
      const key = o.phone || o.customer;
      if (!map[key]) map[key] = { name: o.customer, phone: o.phone, totalOrders: 0, totalSpent: 0, totalProfit: 0, lastOrderDate: o.date, favoriteProduct: o.product_name, avgOrderValue: 0, tier: "Regular", address: o.location };
      map[key].totalOrders += 1;
      map[key].totalSpent += o.total;
      map[key].totalProfit += o.profit;
      if (new Date(o.date) > new Date(map[key].lastOrderDate)) { map[key].lastOrderDate = o.date; map[key].address = o.location; }
    });
    return Object.values(map).map((c) => {
      const avg = c.totalOrders > 0 ? Math.round(c.totalSpent / c.totalOrders) : 0;
      return { ...c, avgOrderValue: avg, tier: c.totalOrders >= 5 || c.totalSpent >= 5000 ? "Best" : c.totalOrders >= 2 || c.totalSpent >= 2000 ? "Medium" : "Regular" };
    });
  }, [orders]);

  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const getEffectiveDate = (order: Order) => {
      if (!order.delivery_date) return new Date(order.date);

      // Because we now standardize the DB entry to "25 Sep 2026", JS parses this flawlessly as a native Date.
      // We keep a fallback just in case old database entries have "DD/MM/YYYY"
      const parts = order.delivery_date.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        return new Date(year, month, day);
      }

      return new Date(order.delivery_date);
    };

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter((o) => getEffectiveDate(o).toDateString() === todayStr);
    const monthOrders = orders.filter((o) => { const d = getEffectiveDate(o); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; });
    const completedToday = todayOrders.filter((o) => o.status === "Completed");
    const todaySales = completedToday.reduce((sum, o) => sum + (o.total || 0), 0);
    const todayCost = completedToday.reduce((sum, o) => sum + (o.cost || 0), 0);
    const completedMonth = monthOrders.filter((o) => o.status === "Completed");
    const monthlySales = completedMonth.reduce((sum, o) => sum + (o.total || 0), 0);
    const monthlyCost = completedMonth.reduce((sum, o) => sum + (o.cost || 0), 0);
    const monthlyLoss = wasteLogs.filter(w => { const d = new Date(w.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((sum, w) => sum + (w.total_loss || 0), 0);

    const pendingOrders = orders.filter((o) => o.status === "Pending");
    const activePendingOrders = pendingOrders.filter((o) => { const d = new Date(getEffectiveDate(o)); d.setHours(0, 0, 0, 0); return d <= todayMidnight; });
    const pendingPaymentsAmount = activePendingOrders.reduce((sum, o) => sum + (o.pending_payment || 0), 0);

    const productSoldMap: Record<string, number> = {};
    orders.forEach((o) => { productSoldMap[o.product_name] = (productSoldMap[o.product_name] || 0) + o.quantity; });

    let bestSellingProduct = "N/A"; 
    let maxSold = 0; 
    let lowSellingCount = 0;
    let highestMargin = -Infinity;
    let highestMarginProduct = "N/A";

    products.forEach((p) => { 
      const sold = productSoldMap[p.name] || 0; 
      if (sold > maxSold) { maxSold = sold; bestSellingProduct = `${p.name} (${sold} sold)`; } 
      if (sold <= 2) lowSellingCount++; 

      if (p.price > 0) {
         const margin = ((p.price - (p.cost || 0)) / p.price) * 100;
         if (margin > highestMargin) {
             highestMargin = margin;
             highestMarginProduct = `${p.name} (${Math.round(margin)}%)`;
         }
      }
    });

    return {
      todaySales: parseFloat(todaySales.toFixed(2)), todayProfit: parseFloat((todaySales - todayCost).toFixed(2)), todayOrdersCount: todayOrders.length,
      upcomingDeliveriesCount: orders.filter((o) => { const d = new Date(getEffectiveDate(o)); d.setHours(0, 0, 0, 0); return d > todayMidnight; }).length, 
      deliveriesTodayCount: todayOrders.length, pendingPaymentsAmount: parseFloat(pendingPaymentsAmount.toFixed(2)), pendingOrdersCount: pendingOrders.length,
      monthlySales: parseFloat(monthlySales.toFixed(2)), monthlyProfit: parseFloat((monthlySales - monthlyCost).toFixed(2)), monthlyOrdersCount: monthOrders.length,
      monthlyLoss: parseFloat(monthlyLoss.toFixed(2)), newCustomersThisMonth: monthOrders.filter((o) => o.is_new_customer === 1).length,
      newCustomersToday: new Set(orders.filter((o) => new Date(o.date).toDateString() === todayStr && o.is_new_customer === 1).map(o => o.phone)).size,
      lowStockCount: ingredients.filter((i) => i.stock <= i.minimum).length, lowSellingCount, bestSellingProduct: maxSold > 0 ? bestSellingProduct : "None yet",
      mostConsumedIngredient: ingredients [0]?.name ? `${ingredients [0].name}` : "N/A", 
      highestProfitProduct: highestMarginProduct !== "N/A" ? highestMarginProduct : "N/A"
    };
  }, [orders, ingredients, products, wasteLogs]);

  const exportOrdersCSV = () => {}; const exportDatabaseJSON = () => {};

  return (
    <BakeryContext.Provider value={{ products, ingredients, orders, purchases, customers, shelfStock, wasteLogs, shopSettings, stats, fetchData, updateShopSettings, addProduct, deleteProduct, deleteIngredientItem, deleteOrder, deductIngredientItem, savePurchase, attachRecipeItem, createOrder, markOrderCompleted, logWaste, exportOrdersCSV, exportDatabaseJSON }}>
      {children}
    </BakeryContext.Provider>
  );
};

export const useBakery = () => {
  const context = useContext(BakeryContext);
  if (!context) throw new Error("useBakery must be used within a BakeryProvider");
  return context;
};