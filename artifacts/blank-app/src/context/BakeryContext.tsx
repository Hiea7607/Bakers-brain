import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export type IngredientItem = {
  id?: string;
  code: string; name: string; unit: string; stock: number; minimum: number; unit_cost: number;
  is_deleted?: boolean;
};

export type Product = {
  id?: string; 
  code: string; name: string; price: number; cost: number; status: "Active" | "Inactive";
  vat_rate?: number; profit_margin?: number; shelf_life_days?: number;
  is_deleted?: boolean;
};

export type Purchase = {
  id: string; date: string; code: string; name: string; quantity: number; unit: string;
  unit_price: number; total_cost: number; source: string; notes: string;
  ingredient_id?: string;
};

export type Order = {
  id: string; product_id?: string; date: string; time: string; customer: string; phone: string;
  product_code: string; product_name: string; quantity: number; unit_price: number;
  total: number; advance_paid: number; pending_payment: number; cost: number;
  profit: number; location: string; delivery_date: string; payment_method: string;
  status: "Pending" | "Paid" | "Completed"; 
  order_type: "Walk-in" | "Online"; 
  is_new_customer: number;
  is_deleted?: boolean; 
};

export type ParsedOrderItem = {
  productCode: string; productName: string; quantity: number; unitPrice: number; cost: number;
};

export type ParsedOrder = {
  customer: string; phone: string; email?: string; items: ParsedOrderItem[];
  subtotal: number; deliveryCharge: number; vatAmount: number; total: number;
  advancePaid: number; pendingPayment: number; cost: number; profit: number;
  location: string; deliveryDate: string; paymentMethod: string; 
  isWalkIn?: boolean; 
  orderType?: "Walk-in" | "Online"; 
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
  products: Product[]; ingredients: IngredientItem[]; orders: Order[]; purchases: Purchase[];
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

export const standardizeDateString = (dateStr: string) => {
  const today = new Date();
  let targetDate = new Date();

  const cleanStr = (dateStr || "").trim().toLowerCase();

  if (!cleanStr || cleanStr === "today") {
    targetDate = today;
  } else if (cleanStr === "tomorrow") {
    targetDate.setDate(today.getDate() + 1);
  } else {
    // Handle formats like 6/10/2026
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
       const day = parseInt(parts[0], 10);
       const month = parseInt(parts[1], 10) - 1;
       let year = parseInt(parts[2], 10);
       if (year < 100) year += 2000;
       targetDate = new Date(year, month, day);
    } else {
       targetDate = new Date(cleanStr);
    }
  }

  // If it's completely invalid, fallback to today
  if (isNaN(targetDate.getTime())) {
    targetDate = today;
  }

  // Output strict Database Format (YYYY-MM-DD)
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
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
        supabase.from("ingredients").select("*").eq("user_id", user.id).eq("is_deleted", false).order("name", { ascending: true }),
        supabase.from("orders").select("*").eq("user_id", user.id).eq("is_deleted", false).order("date", { ascending: false }),
        supabase.from("purchases").select("*").eq("user_id", user.id).order("date", { ascending: false })
      ]);

      if (pRes.data) setProducts(pRes.data as Product[]);
      if (iRes.data) setIngredients(iRes.data as IngredientItem[]);
      if (oRes.data) setOrders(oRes.data as Order[]);
      if (purRes.data) setPurchases(purRes.data as Purchase[]);

      // Fetch Shop Settings & official business name from client_roster table
      const { data: setRes } = await supabase.from("shop_settings").select("*").eq("user_id", user.id).limit(1);
      const { data: rosterRes } = await supabase.from("client_roster").select("business_name").eq("user_id", user.id).limit(1);

      const officialBusinessName = rosterRes && rosterRes.length > 0 ? rosterRes[0].business_name : "Rasel Food Ltd.";

      if (setRes && setRes.length > 0) {
        setShopSettings({ ...setRes[0], shop_name: officialBusinessName } as ShopSettings);
      } else {
        const defaultSettings = { user_id: user.id, currency_symbol: '৳', default_tax_rate: 0, target_margin: 20, shop_name: officialBusinessName, shop_address: '', shop_phone: '' };
        const { data: newSettings } = await supabase.from("shop_settings").upsert([defaultSettings], { onConflict: 'user_id' }).select().limit(1);
        if (newSettings && newSettings.length > 0) setShopSettings({ ...newSettings[0], shop_name: officialBusinessName } as ShopSettings);
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

    const newProduct = { ...product, cost: 0, status: "Active", user_id: user.id, is_deleted: false };

    const { data, error } = await supabase
      .from("products")
      .insert([newProduct])
      .select()
      .single();

    if (error) {
      alert("Database blocked the save: " + error.message);
    } else if (data) {
      setProducts((prev) => [...prev, data]);
    }
  };

  const deleteProduct = async (code: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("products").update({ is_deleted: true }).eq("code", code).eq("user_id", user.id);
    if (!error) setProducts((prev) => prev.filter((p) => p.code !== code));
  };

  const deleteIngredientItem = async (code: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("ingredients").update({ is_deleted: true }).eq("code", code).eq("user_id", user.id);
    if (!error) setIngredients((prev) => prev.filter((item) => item.code !== code));
  };

  const deleteOrder = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ordersToCancel = orders.filter(o => o.id === id);
    if (ordersToCancel.length === 0) return;

    let totalCost = 0;
    let totalAdvance = 0;
    ordersToCancel.forEach(o => {
      totalCost += o.cost;
      totalAdvance += o.advance_paid;
    });

    const financialLoss = Math.max(0, totalCost - totalAdvance);

    const newLog = {
      id: `CANC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString(),
      product_code: "CANCELLED",
      product_name: `Cancelled: ${ordersToCancel[0].customer}`,
      quantity: 1,
      total_loss: parseFloat(financialLoss.toFixed(2)),
      user_id: user.id
    };

    setWasteLogs(prev => [newLog, ...prev]);
    await supabase.from('waste_logs').insert([newLog]);

    await supabase.from("orders").update({ is_deleted: true }).eq("id", id).eq("user_id", user.id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const deductIngredientItem = async (code: string, quantity: number, reason: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentItem = ingredients.find((i) => i.code === code);
    if (!currentItem) return;

    const newStock = Math.max(0, parseFloat((currentItem.stock - quantity).toFixed(3)));

    // 1. Update local stock state and DB
    setIngredients((prev) => prev.map((item) => (item.code === code ? { ...item, stock: newStock } : item)));
    await supabase.from("ingredients").update({ stock: newStock }).eq("code", code).eq("user_id", user.id);

    // 2. Log into deductions table
    const newDeduction = {
      product_code: "MANUAL",
      product_name: "Manual Adjustment",
      ingredient_code: code,
      ingredient_name: currentItem.name,
      deducted_quantity: quantity,
      unit: currentItem.unit,
      type: reason || "Manual Deduction",
      business_name: shopSettings?.shop_name || "Rasel Food Ltd.",
      user_id: user.id
    };
    await supabase.from("deductions").insert([newDeduction]);

    // 3. NEW: Calculate financial loss and log to waste_logs
    const lossAmount = quantity * (currentItem.unit_cost || 0);

    if (lossAmount > 0) {
      const newLog = { 
        id: `WST-ING-${Date.now()}`, 
        date: new Date().toISOString(), 
        product_code: currentItem.code, 
        product_name: `Spilled/Wasted: ${currentItem.name}`, 
        quantity, 
        total_loss: parseFloat(lossAmount.toFixed(2)), 
        user_id: user.id 
      };

      setWasteLogs(prev => [newLog, ...prev]);
      await supabase.from('waste_logs').insert([newLog]);
    }
  };

  const savePurchase = async (purchase: any, minimum = 2) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let currentIngId = "";
    let weightedAvgCost = purchase.unit_price;
    const exists = ingredients.find((i) => i.code === purchase.code);

    if (exists) {
      currentIngId = exists.id!; 
      const updatedStock = parseFloat((exists.stock + purchase.quantity).toFixed(3));
      const itemPurchases = purchases.filter((p) => p.ingredient_id === exists.id);
      const totalSpent = itemPurchases.reduce((acc, p) => acc + (p.total_cost || 0), 0) + (purchase.quantity * purchase.unit_price);
      const totalQty = itemPurchases.reduce((acc, p) => acc + p.quantity, 0) + purchase.quantity;
      weightedAvgCost = totalQty > 0 ? parseFloat((totalSpent / totalQty).toFixed(2)) : purchase.unit_price;
      await supabase.from("ingredients").update({ stock: updatedStock, unit_cost: weightedAvgCost }).eq("id", currentIngId);
    } else {
      const { data: newIng, error } = await supabase.from("ingredients").insert([{
        code: purchase.code, name: purchase.name, unit: purchase.unit, stock: purchase.quantity,
        minimum, unit_cost: purchase.unit_price, user_id: user.id, is_deleted: false
      }]).select().single();
      if (error) return alert("Error creating ingredient: " + error.message);
      if (newIng) currentIngId = newIng.id;
    }

    const totalCost = purchase.quantity * purchase.unit_price;
    const purId = `PUR-${Date.now().toString().slice(-6)}`;
    const newPur = { id: purId, date: new Date().toISOString(), total_cost: totalCost, user_id: user.id, ingredient_id: currentIngId, ...purchase };
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
        }
      }
    }
    await fetchData(); 
  };

  const attachRecipeItem = async (productCode: string, ingredientCode: string, quantity: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("recipes").delete().eq("product_code", productCode).eq("ingredient_code", ingredientCode).eq("user_id", user.id);
    await supabase.from("recipes").insert([{ product_code: productCode, ingredient_code: ingredientCode, quantity, user_id: user.id }]);
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
    const dbPromises: any[] = [];

    // KITCHEN PRODUCTION / SELF ORDER LOGIC
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

      const { error: shelfError } = await supabase.from("shelf_stock").insert(newShelfItems);
      if (shelfError) {
          alert("SUPABASE REJECTED SHELF STOCK: " + shelfError.message);
          console.error("Shelf Error:", shelfError);
          return "ERROR";
      }

      for (const item of parsed.items) {
        const { data: recipeData } = await supabase.from("recipes").select("ingredient_code, quantity").eq("product_code", item.productCode).eq("user_id", user.id);
        if (recipeData && recipeData.length > 0) {
          for (const rItem of recipeData) {
            const deduction = rItem.quantity * item.quantity;
            const currentIng = ingredients.find((i) => i.code === rItem.ingredient_code);
            if (currentIng) {
              const remainingStock = Math.max(0, parseFloat((currentIng.stock - deduction).toFixed(3)));
              setIngredients((prev) => prev.map((ing) => ing.code === rItem.ingredient_code ? { ...ing, stock: remainingStock } : ing));
              dbPromises.push(supabase.from("ingredients").update({ stock: remainingStock }).eq("code", rItem.ingredient_code).eq("user_id", user.id));
              newDeductions.push({
                product_code: item.productCode, 
                product_name: item.productName, 
                ingredient_code: rItem.ingredient_code,
                ingredient_name: currentIng.name, 
                deducted_quantity: deduction, 
                unit: currentIng.unit,
                type: parsed.customer === "Self" ? "Self Order" : "Customer Order",
                business_name: shopSettings?.shop_name || "Rasel Food Ltd.",
                user_id: user.id
              });
            }
          }
        }
      }
      if (dbPromises.length > 0) await Promise.all(dbPromises);
      if (newDeductions.length > 0) await supabase.from("deductions").insert(newDeductions);
      return "SHELF-STOCKED";
    }

    // CUSTOMER ORDER PIPELINE - Meaningful format: R-02#01
    const activeBusinessName = shopSettings?.shop_name || "Rasel Food Ltd.";
    const firstLetter = activeBusinessName.charAt(0).toUpperCase();
    const dayOfMonth = now.getDate().toString().padStart(2, "0");

    const todayStr = now.toDateString();
    const todayOrdersCount = orders.filter((o) => new Date(o.date).toDateString() === todayStr).length;
    const nextSeq = (todayOrdersCount + 1).toString().padStart(2, "0");

    const uniqueHash = Math.floor(10 + Math.random() * 90);
    const orderId = `${firstLetter}-${dayOfMonth}#${nextSeq}-${uniqueHash}`;

    // Only counts as a new customer if a phone number is provided AND it doesn't exist in past orders
    const isNew = (parsed.phone && !orders.some((o) => o.phone === parsed.phone)) ? 1 : 0;

    const actualOrderType = parsed.orderType || (parsed.isWalkIn ? "Walk-in" : "Online");
    const status = actualOrderType === "Walk-in" ? "Completed" : "Pending";

    const newOrders: Order[] = [];
    let remainingAdvance = parsed.advancePaid;
    const finalDeliveryDate = standardizeDateString(parsed.deliveryDate);

    for (let i = 0; i < parsed.items.length; i++) {
      const item = parsed.items[i];
      const matchedProduct = products.find(p => p.code === item.productCode);

      const actualUnitCost = matchedProduct?.cost || 0;
      const actualTotalCost = actualUnitCost * item.quantity;

      const itemBaseTotal = item.quantity * item.unitPrice; // Pure product revenue
      let rowTotal = itemBaseTotal;

      // VAT & Delivery are added to the Grand Total for the customer to pay
      if (i === 0) rowTotal += (parsed.deliveryCharge || 0) + (parsed.vatAmount || 0);

      let rowAdvance = 0;
      if (actualOrderType === "Walk-in") rowAdvance = rowTotal;
      else if (remainingAdvance >= rowTotal) { rowAdvance = rowTotal; remainingAdvance -= rowTotal; } 
      else if (remainingAdvance > 0) { rowAdvance = remainingAdvance; remainingAdvance = 0; }

      const rowPending = actualOrderType === "Walk-in" ? 0 : Math.max(0, rowTotal - rowAdvance);

      // THE FIX: Profit ignores VAT and Delivery. It is strictly Product Revenue - Product Cost.
      const rowProfit = itemBaseTotal - actualTotalCost;

      newOrders.push({
        id: orderId,
        product_id: matchedProduct?.id || null,
        date: now.toISOString(), time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        customer: parsed.customer, phone: parsed.phone, product_code: item.productCode, product_name: item.productName,
        quantity: item.quantity, unit_price: item.unitPrice, 
        total: parseFloat(rowTotal.toFixed(2)), // Customer pays this
        advance_paid: parseFloat(rowAdvance.toFixed(2)),
        pending_payment: parseFloat(rowPending.toFixed(2)), 
        cost: parseFloat(actualTotalCost.toFixed(2)), 
        profit: parseFloat(rowProfit.toFixed(2)), // Pure profit is saved to the database
        location: parsed.location, delivery_date: finalDeliveryDate, payment_method: parsed.paymentMethod, 
        status, 
        order_type: actualOrderType,
        is_new_customer: isNew, user_id: user.id, is_deleted: false
      } as Order);
    }

    setOrders((prev) => [...newOrders, ...prev]);
    const { error: orderError } = await supabase.from("orders").insert(newOrders);
    if (orderError) {
        alert("SUPABASE REJECTED THE ORDER: " + orderError.message);
        console.error("Full Order Error:", orderError);
    }

    // DEDUCT FROM POS SHELF
    for (const item of parsed.items) {
      let qtyToDeduct = item.quantity;
      const availableBatches = shelfStock.filter(s => s.product_code === item.productCode && s.quantity > 0).sort((a,b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
      for (const batch of availableBatches) {
          if (qtyToDeduct <= 0) break;
          const deductAmount = Math.min(batch.quantity, qtyToDeduct);
          qtyToDeduct -= deductAmount;
          const newQty = batch.quantity - deductAmount;
          setShelfStock(prev => prev.map(s => s.id === batch.id ? { ...s, quantity: newQty } : s));
          dbPromises.push(supabase.from('shelf_stock').update({ quantity: newQty }).eq('id', batch.id));
      }
    }

    if (dbPromises.length > 0) await Promise.all(dbPromises);
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
     const todayBaseProfit = completedToday.reduce((sum, o) => sum + (o.profit || 0), 0); // THE FIX: Sum pure profits

     const completedMonth = monthOrders.filter((o) => o.status === "Completed");
     const monthlySales = completedMonth.reduce((sum, o) => sum + (o.total || 0), 0);
     const monthlyBaseProfit = completedMonth.reduce((sum, o) => sum + (o.profit || 0), 0); // THE FIX: Sum pure profits

     const todayLoss = wasteLogs.filter(w => new Date(w.date).toDateString() === todayStr).reduce((sum, w) => sum + (w.total_loss || 0), 0);
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

       if (sold > 0 && sold <= 3) lowSellingCount++; 

       if (p.price > 0) {
          const margin = ((p.price - (p.cost || 0)) / p.price) * 100;
          if (margin > highestMargin) {
              highestMargin = margin;
              highestMarginProduct = `${p.name} (${Math.round(margin)}%)`;
          }
       }
     });

     return {
       todaySales: parseFloat(todaySales.toFixed(2)), 
       todayProfit: parseFloat((todayBaseProfit - todayLoss).toFixed(2)), // THE FIX
       todayOrdersCount: todayOrders.length,
       upcomingDeliveriesCount: orders.filter((o) => { const d = new Date(getEffectiveDate(o)); d.setHours(0, 0, 0, 0); return d > todayMidnight; }).length, 
       deliveriesTodayCount: todayOrders.length, 
       pendingPaymentsAmount: parseFloat(pendingPaymentsAmount.toFixed(2)), 
       pendingOrdersCount: pendingOrders.length,
       monthlySales: parseFloat(monthlySales.toFixed(2)), 
       monthlyProfit: parseFloat((monthlyBaseProfit - monthlyLoss).toFixed(2)), // THE FIX
       monthlyOrdersCount: monthOrders.length,
       monthlyLoss: parseFloat(monthlyLoss.toFixed(2)), 
       newCustomersThisMonth: monthOrders.filter((o) => o.is_new_customer === 1).length,
       newCustomersToday: new Set(orders.filter((o) => new Date(o.date).toDateString() === todayStr && o.is_new_customer === 1).map(o => o.phone)).size,
       lowStockCount: ingredients.filter((i) => i.stock <= i.minimum).length, 
       lowSellingCount, 
       bestSellingProduct: maxSold > 0 ? bestSellingProduct : "None yet",
       mostConsumedIngredient: ingredients[0]?.name ? `${ingredients[0].name}` : "N/A", 
       highestProfitProduct: highestMarginProduct !== "N/A" ? highestMarginProduct : "N/A"
     };
  }, [orders, ingredients, products, wasteLogs]);

  const triggerDownload = (content: string, mimeType: string, filename: string) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Your browser blocked the download. Please try from a different device.");
    }
  };

  const exportOrdersCSV = () => {
    if (orders.length === 0) return alert("No orders available to export today.");
    const headers = ["Order ID", "Date", "Customer", "Phone", "Product", "Quantity", "Total (৳)", "Status", "Delivery Date"];
    const rows = orders.map((o) => {
      const escape = (text: string | number | undefined) => `"${String(text || "").replace(/"/g, '""')}"`;
      return [escape(o.id), escape(new Date(o.date).toLocaleDateString()), escape(o.customer), escape(o.phone), escape(o.product_name), o.quantity, o.total, escape(o.status), escape(o.delivery_date)].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const filename = `Daily_Orders_${new Date().toISOString().split('T')[0]}.csv`;
    triggerDownload(csvContent, "text/csv;charset=utf-8;", filename);
  };

  const exportDatabaseJSON = () => {
    const fullBackup = { exportDate: new Date().toISOString(), shopSettings, stats, products, ingredients, orders, purchases, shelfStock, wasteLogs, customers };
    const jsonString = JSON.stringify(fullBackup, null, 2);
    const filename = `Monthly_Backup_${new Date().toISOString().split('T')[0]}.json`;
    triggerDownload(jsonString, "application/json", filename);
  };

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