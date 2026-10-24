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
  email?: string;
  customer_email?: string;
  delivery_charge?: number;
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
  customer_id: string;
  name: string; phone: string; email: string; totalOrders: number; totalSpent: number;
  totalPaid: number; totalDue: number;
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
  target_margin: number; business_name: string; address: string; mobile_number: string;
};

interface BakeryContextType {
  products: Product[]; ingredients: IngredientItem[]; allIngredients: IngredientItem[];
  orders: Order[]; purchases: Purchase[];
  customers: CustomerSummary[]; shelfStock: ShelfItem[]; wasteLogs: WasteLog[];
  shopSettings: ShopSettings | null; stats: any; 
  fetchData: () => Promise<void>;
  updateShopSettings: (updates: Partial<ShopSettings>) => Promise<void>;
  addProduct: (product: any) => Promise<void>; deleteProduct: (code: string) => Promise<void>;
  deleteIngredientItem: (code: string) => Promise<void>; deleteOrder: (id: string) => Promise<void>;
  deductIngredientItem: (code: string, quantity: number, reason: string) => Promise<void>;
  savePurchase: (purchase: any, minimum?: number) => Promise<void>;
  deletePurchase: (purchaseId: string) => Promise<void>;
  getNextIngredientCode: () => string;
  attachRecipeItem: (productCode: string, ingredientCode: string, quantity: number) => Promise<void>;
  createOrder: (parsed: ParsedOrder) => Promise<string>;
  markOrderCompleted: (orderId: string) => Promise<string>;
  logWaste: (shelfItemId: string, quantity: number) => Promise<void>;
  exportOrdersCSV: () => void; exportMonthlyCSV: () => Promise<void>;
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
    const parts = cleanStr.split(/[/-]/); 
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

  if (isNaN(targetDate.getTime())) {
    targetDate = today;
  }

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
};

const getActiveUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const BakeryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [allIngredients, setAllIngredients] = useState<IngredientItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rawPurchases, setRawPurchases] = useState<Purchase[]>([]);
  const [shelfStock, setShelfStock] = useState<ShelfItem[]>([]);
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([]);
  const [recipesList, setRecipesList] = useState<{ product_code: string; ingredient_code: string; quantity: number }[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);

  const ingredients = useMemo(
    () => allIngredients.filter((i) => !i.is_deleted),
    [allIngredients]
  );

  const purchases = useMemo(() => {
    const activeCodes = new Set(ingredients.map((i) => i.code));
    return rawPurchases.filter((p) => activeCodes.has(p.code));
  }, [rawPurchases, ingredients]);

  const getNextIngredientCode = useCallback(() => {
    let highestNum = 0;
    allIngredients.forEach((i) => {
      if (i.code && i.code.startsWith("ING")) {
        const num = parseInt(i.code.replace("ING", ""), 10);
        if (!isNaN(num) && num > highestNum) highestNum = num;
      }
    });
    rawPurchases.forEach((p) => {
      if (p.code && p.code.startsWith("ING")) {
        const num = parseInt(p.code.replace("ING", ""), 10);
        if (!isNaN(num) && num > highestNum) highestNum = num;
      }
    });
    return `ING${String(highestNum + 1).padStart(2, "0")}`;
  }, [allIngredients, rawPurchases]);

  const fetchData = useCallback(async () => {
    try {
      const user = await getActiveUser();
      if (!user) return;

      const INITIAL_ORDER_LIMIT = 200;
      const [pRes, iRes, oRes, setRes, rosterRes, recRes] = await Promise.all([
        supabase.from("products").select("*").eq("user_id", user.id).eq("is_deleted", false).order("name", { ascending: true }),
        supabase.from("ingredients").select("*").eq("user_id", user.id).order("name", { ascending: true }),
        supabase.from("orders").select("*").eq("user_id", user.id).eq("is_deleted", false).order("date", { ascending: false }).limit(INITIAL_ORDER_LIMIT),
        supabase.from("shop_settings").select("*").eq("user_id", user.id).limit(1),
        supabase.from("client_roster").select("business_name").eq("user_id", user.id).limit(1),
        supabase.from("recipes").select("product_code, ingredient_code, quantity").eq("user_id", user.id)
      ]);

      if (pRes.data) setProducts(pRes.data as Product[]);
      if (iRes.data) setAllIngredients(iRes.data as IngredientItem[]);
      if (oRes.data) setOrders(oRes.data as Order[]);
      if (recRes.data) setRecipesList(recRes.data);

      const officialBusinessName = rosterRes.data && rosterRes.data.length > 0 ? rosterRes.data[0].business_name : "Rasel Food Ltd.";

      if (setRes.data && setRes.data.length > 0) {
        setShopSettings({ ...setRes.data[0], business_name: officialBusinessName } as ShopSettings);
      } else {
        const defaultSettings = { user_id: user.id, currency_symbol: '৳', default_tax_rate: 0, target_margin: 20, business_name: officialBusinessName, address: '', mobile_number: '' };
        supabase.from("shop_settings").upsert([defaultSettings], { onConflict: 'user_id' }).select().limit(1).then(({ data: newSettings }) => {
          if (newSettings && newSettings.length > 0) setShopSettings({ ...newSettings[0], business_name: officialBusinessName } as ShopSettings);
        });
      }

      Promise.all([
        supabase.from("shelf_stock").select("*").eq("user_id", user.id).gt("quantity", 0).order("expiry_date", { ascending: true }),
        supabase.from("waste_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }),
        supabase.from("purchases").select("*").eq("user_id", user.id).order("date", { ascending: false }),
        oRes.data && oRes.data.length === INITIAL_ORDER_LIMIT
          ? supabase.from("orders").select("*").eq("user_id", user.id).eq("is_deleted", false).order("date", { ascending: false }).range(INITIAL_ORDER_LIMIT, 2000)
          : Promise.resolve({ data: null })
      ]).then(([sRes, wRes, purRes, olderOrdersRes]) => {
        if (sRes.data) setShelfStock(sRes.data as ShelfItem[]);
        if (wRes.data) setWasteLogs(wRes.data as WasteLog[]);
        if (purRes.data) setRawPurchases(purRes.data as Purchase[]);
        if (olderOrdersRes.data && olderOrdersRes.data.length > 0) {
          setOrders(prev => {
            const existingIds = new Set(prev.map(o => `${o.id}-${o.product_code}`));
            const uniqueOlder = (olderOrdersRes.data as Order[]).filter(o => !existingIds.has(`${o.id}-${o.product_code}`));
            return [...prev, ...uniqueOlder];
          });
        }
      });

    } catch (err) {
      console.error("Cloud fetch error:", err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const recalculateAffectedProducts = async (userId: string, ingCode: string, newIngUnitCost: number) => {
    const { data: affectedRecipes } = await supabase
      .from("recipes")
      .select("product_code")
      .eq("ingredient_code", ingCode)
      .eq("user_id", userId);

    if (affectedRecipes && affectedRecipes.length > 0) {
      const productCodes = [...new Set(affectedRecipes.map((r) => r.product_code))];
      for (const pCode of productCodes) {
        const { data: fullRecipe } = await supabase
          .from("recipes")
          .select("ingredient_code, quantity")
          .eq("product_code", pCode)
          .eq("user_id", userId);

        if (fullRecipe) {
          let recalculatedCost = 0;
          fullRecipe.forEach((item) => {
            const ingCost =
              item.ingredient_code === ingCode
                ? newIngUnitCost
                : allIngredients.find((i) => i.code === item.ingredient_code)?.unit_cost || 0;
            recalculatedCost += ingCost * item.quantity;
          });
          const roundedCost = parseFloat(recalculatedCost.toFixed(2));
          await supabase.from("products").update({ cost: roundedCost }).eq("code", pCode).eq("user_id", userId);
        }
      }
    }
  };

  const updateShopSettings = async (updates: Partial<ShopSettings>) => {
    const user = await getActiveUser();
    if (!user) return;
    const merged = { ...shopSettings, ...updates, user_id: user.id };
    await supabase.from("shop_settings").upsert(merged, { onConflict: 'user_id' });
    setShopSettings(prev => prev ? { ...prev, ...updates } : null);
  };

  const addProduct = async (product: any) => {
    const user = await getActiveUser();
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
    const user = await getActiveUser();
    if (!user) return;
    const { error } = await supabase.from("products").update({ is_deleted: true }).eq("code", code).eq("user_id", user.id);
    if (!error) setProducts((prev) => prev.filter((p) => p.code !== code));
  };

  const deleteIngredientItem = async (code: string) => {
    const user = await getActiveUser();
    if (!user) return;
    const { error } = await supabase
      .from("ingredients")
      .update({ is_deleted: true, stock: 0 })
      .eq("code", code)
      .eq("user_id", user.id);
    if (!error) {
      setAllIngredients((prev) =>
        prev.map((item) => (item.code === code ? { ...item, is_deleted: true, stock: 0 } : item))
      );
    }
  };

  const deleteOrder = async (id: string) => {
    const user = await getActiveUser();
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
    const user = await getActiveUser();
    if (!user) return;

    const currentItem = ingredients.find((i) => i.code === code);
    if (!currentItem) return;

    const newStock = Math.max(0, parseFloat((currentItem.stock - quantity).toFixed(3)));

    setAllIngredients((prev) => prev.map((item) => (item.code === code ? { ...item, stock: newStock } : item)));
    await supabase.from("ingredients").update({ stock: newStock }).eq("code", code).eq("user_id", user.id);

    const newDeduction = {
      product_code: "MANUAL",
      product_name: "Manual Adjustment",
      ingredient_code: code,
      ingredient_name: currentItem.name,
      deducted_quantity: quantity,
      unit: currentItem.unit,
      type: reason || "Manual Deduction",
      business_name: shopSettings?.business_name || "Rasel Food Ltd.",
      user_id: user.id
    };
    await supabase.from("deductions").insert([newDeduction]);

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
    const user = await getActiveUser();
    if (!user) return;

    const cleanName = (purchase.name || "").trim().toLowerCase();
    const matchedByCode = allIngredients.find((i) => i.code === purchase.code);
    const matchedByName = allIngredients.find((i) => i.name.trim().toLowerCase() === cleanName);

    if (matchedByCode && matchedByCode.name.trim().toLowerCase() !== cleanName) {
      alert(`Code ${purchase.code} is permanently locked to "${matchedByCode.name}". Please use a different code for "${purchase.name}".`);
      return;
    }

    const existingIng = matchedByCode || matchedByName;
    const finalCode = existingIng ? existingIng.code : purchase.code;
    const finalName = existingIng ? existingIng.name : purchase.name.trim();

    let currentIngId = "";
    let weightedAvgCost = purchase.unit_price;

    if (existingIng) {
      currentIngId = existingIng.id!;
      const baseStock = existingIng.is_deleted ? 0 : (existingIng.stock || 0);
      const updatedStock = parseFloat((baseStock + purchase.quantity).toFixed(3));

      const itemPurchases = rawPurchases.filter((p) => p.code === finalCode);
      const totalSpent = itemPurchases.reduce((acc, p) => acc + (p.total_cost || 0), 0) + (purchase.quantity * purchase.unit_price);
      const totalQty = itemPurchases.reduce((acc, p) => acc + (p.quantity || 0), 0) + purchase.quantity;
      weightedAvgCost = totalQty > 0 ? parseFloat((totalSpent / totalQty).toFixed(2)) : purchase.unit_price;

      await supabase
        .from("ingredients")
        .update({
          stock: updatedStock,
          unit_cost: weightedAvgCost,
          minimum,
          unit: purchase.unit || existingIng.unit,
          is_deleted: false
        })
        .eq("id", currentIngId);
    } else {
      const { data: newIng, error } = await supabase
        .from("ingredients")
        .insert([{
          code: finalCode,
          name: finalName,
          unit: purchase.unit,
          stock: purchase.quantity,
          minimum,
          unit_cost: purchase.unit_price,
          user_id: user.id,
          is_deleted: false
        }])
        .select()
        .single();
      if (error) return alert("Error creating ingredient: " + error.message);
      if (newIng) currentIngId = newIng.id;
    }

    const totalCost = parseFloat((purchase.quantity * purchase.unit_price).toFixed(2));
    const purId = `PUR-${Date.now().toString().slice(-6)}`;
    const newPur = {
      id: purId,
      date: new Date().toISOString(),
      total_cost: totalCost,
      user_id: user.id,
      ingredient_id: currentIngId,
      ...purchase,
       source: (purchase.source || "").trim(),
      code: finalCode,
      name: finalName
    };
    await supabase.from("purchases").insert([newPur]);

    await recalculateAffectedProducts(user.id, finalCode, weightedAvgCost);
    await fetchData();
  };

  const deletePurchase = async (purchaseId: string) => {
    const user = await getActiveUser();
    if (!user) return;

    const targetPur = rawPurchases.find((p) => p.id === purchaseId);
    if (!targetPur) return;

    const { error: delError } = await supabase
      .from("purchases")
      .delete()
      .eq("id", purchaseId)
      .eq("user_id", user.id);

    if (delError) {
      alert("Failed to delete purchase record: " + delError.message);
      return;
    }

    const remainingForIng = rawPurchases.filter(
      (p) => p.id !== purchaseId && p.code === targetPur.code
    );

    const targetIng = allIngredients.find((i) => i.code === targetPur.code);
    if (targetIng) {
      const updatedStock = Math.max(0, parseFloat(((targetIng.stock || 0) - (targetPur.quantity || 0)).toFixed(3)));
      const totalSpent = remainingForIng.reduce((acc, p) => acc + (p.total_cost || 0), 0);
      const totalQty = remainingForIng.reduce((acc, p) => acc + (p.quantity || 0), 0);
      const newAvgCost = totalQty > 0 ? parseFloat((totalSpent / totalQty).toFixed(2)) : 0;

      await supabase
        .from("ingredients")
        .update({ stock: updatedStock, unit_cost: newAvgCost })
        .eq("code", targetPur.code)
        .eq("user_id", user.id);

      await recalculateAffectedProducts(user.id, targetPur.code, newAvgCost);
    }

    setRawPurchases((prev) => prev.filter((p) => p.id !== purchaseId));
    await fetchData();
  };

  const attachRecipeItem = async (productCode: string, ingredientCode: string, quantity: number) => {
    const user = await getActiveUser();
    if (!user) return;
    await supabase.from("recipes").delete().eq("product_code", productCode).eq("ingredient_code", ingredientCode).eq("user_id", user.id);
    await supabase.from("recipes").insert([{ product_code: productCode, ingredient_code: ingredientCode, quantity, user_id: user.id }]);
    setRecipesList(prev => [
      ...prev.filter(r => !(r.product_code === productCode && r.ingredient_code === ingredientCode)),
      { product_code: productCode, ingredient_code: ingredientCode, quantity }
    ]);
  };

  const logWaste = async (shelfItemId: string, quantity: number) => {
    const user = await getActiveUser();
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
    const user = await getActiveUser();
    if (!user) throw new Error("Unauthorized");
    const now = new Date();
    const newDeductions: any[] = [];
    const dbPromises: any[] = [];

    // Track cumulative ingredient deductions across all items in this order
    const liveStockMap: Record<string, number> = {};
    ingredients.forEach(ing => { liveStockMap[ing.code] = ing.stock; });

    const deductRawIngredientsByRecipe = async (productCode: string, productName: string, qtyToMake: number, orderReason: string) => {
      if (qtyToMake <= 0) return;
      const { data: recipeData } = await supabase
        .from("recipes")
        .select("ingredient_code, quantity")
        .eq("product_code", productCode)
        .eq("user_id", user.id);

      if (recipeData && recipeData.length > 0) {
        for (const rItem of recipeData) {
          const deduction = parseFloat((rItem.quantity * qtyToMake).toFixed(3));
          const currentIng = ingredients.find((i) => i.code === rItem.ingredient_code);
          if (currentIng && deduction > 0) {
            const baseStock = liveStockMap[rItem.ingredient_code] ?? currentIng.stock;
            const remainingStock = Math.max(0, parseFloat((baseStock - deduction).toFixed(3)));
            liveStockMap[rItem.ingredient_code] = remainingStock;

            setAllIngredients((prev) =>
              prev.map((ing) => ing.code === rItem.ingredient_code ? { ...ing, stock: remainingStock } : ing)
            );
            dbPromises.push(
              supabase.from("ingredients").update({ stock: remainingStock }).eq("code", rItem.ingredient_code).eq("user_id", user.id)
            );
            newDeductions.push({
              product_code: productCode,
              product_name: productName,
              ingredient_code: rItem.ingredient_code,
              ingredient_name: currentIng.name,
              deducted_quantity: deduction,
              unit: currentIng.unit,
              type: orderReason,
              business_name: shopSettings?.business_name || "Rasel Food Ltd.",
              user_id: user.id
            });
          }
        }
      }
    };

    if (parsed.customer === "Self") {
      const newShelfItems: any[] = [];
      for (const item of parsed.items) {
        const matchedProduct = products.find(p => p.code === item.productCode);
        const expiryDays = matchedProduct?.shelf_life_days || 2;
        const expiryDate = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
        const batchUnitCost = matchedProduct?.cost || 0;

        newShelfItems.push({
          id: `SHLF-${Date.now()}-${Math.floor(Math.random() * 1000)}`, 
          product_code: item.productCode, 
          product_name: item.productName,
          quantity: item.quantity, 
          cost: batchUnitCost, 
          price: item.unitPrice, 
          batch_date: now.toISOString(), 
          expiry_date: expiryDate.toISOString(), 
          user_id: user.id
        });
      }
      setShelfStock(prev => [...prev, ...newShelfItems]);

      const { error: shelfError } = await supabase.from("shelf_stock").insert(newShelfItems);
      if (shelfError) {
        alert("SUPABASE REJECTED SHELF STOCK: " + shelfError.message);
        return "ERROR";
      }

      for (const item of parsed.items) {
        await deductRawIngredientsByRecipe(item.productCode, item.productName, item.quantity, "Self Order");
      }
      if (dbPromises.length > 0) await Promise.all(dbPromises);
      if (newDeductions.length > 0) await supabase.from("deductions").insert(newDeductions);
      return "SHELF-STOCKED";
    }

    const activeBusinessName = shopSettings?.business_name || "Rasel Food Ltd.";
    const firstLetter = activeBusinessName.charAt(0).toUpperCase();
    const dayOfMonth = now.getDate().toString().padStart(2, "0");

    // Count UNIQUE Order IDs today so multi-product orders don't skip sequence numbers (#01, #02, #03)
    const todayStr = now.toDateString();
    const uniqueTodayOrderIds = new Set(
      orders.filter((o) => new Date(o.date).toDateString() === todayStr).map((o) => o.id)
    );
    const nextSeq = (uniqueTodayOrderIds.size + 1).toString().padStart(2, "0");

    const uniqueHash = Math.floor(10 + Math.random() * 90);
    const orderId = `${firstLetter}-${dayOfMonth}#${nextSeq}-${uniqueHash}`;

    const isNew = (parsed.phone && !orders.some((o) => o.phone === parsed.phone)) ? 1 : 0;

    const actualOrderType = parsed.orderType || (parsed.isWalkIn ? "Walk-in" : "Online");
    // Rule: Order is Completed when Pending Due == 0 (or Walk-in)
    const isFullyPaidAtBooking = actualOrderType === "Walk-in" || (parsed.pendingPayment !== undefined && parsed.pendingPayment <= 0);
    const status: "Completed" | "Pending" = isFullyPaidAtBooking ? "Completed" : "Pending";

    const newOrders: Order[] = [];
    let remainingAdvance = isFullyPaidAtBooking ? parsed.total : parsed.advancePaid;
    const finalDeliveryDate = standardizeDateString(parsed.deliveryDate);

    for (let i = 0; i < parsed.items.length; i++) {
      const item = parsed.items[i];
      const matchedProduct = products.find(p => p.code === item.productCode);

      // 1. Check Display Shelf Stock first (FIFO)
      let totalBatchCost = 0;
      let qtyToDeduct = item.quantity;
      const availableBatches = shelfStock
        .filter(s => s.product_code === item.productCode && s.quantity > 0)
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

      for (const batch of availableBatches) {
        if (qtyToDeduct <= 0) break;
        const deductAmount = Math.min(batch.quantity, qtyToDeduct);
        qtyToDeduct -= deductAmount;
        totalBatchCost += deductAmount * (batch.cost || 0);

        const newQty = batch.quantity - deductAmount;
        setShelfStock(prev => prev.map(s => s.id === batch.id ? { ...s, quantity: newQty } : s));
        dbPromises.push(supabase.from('shelf_stock').update({ quantity: newQty }).eq('id', batch.id));
      }

      // 2. If not on shelf (qtyToDeduct > 0), use catalog recipe cost AND immediately deduct raw ingredients!
      if (qtyToDeduct > 0) {
        const fallbackUnitCost = matchedProduct?.cost || 0;
        totalBatchCost += qtyToDeduct * fallbackUnitCost;
        await deductRawIngredientsByRecipe(item.productCode, item.productName, qtyToDeduct, "Customer Order");
      }

      const itemBaseTotal = item.quantity * item.unitPrice;
      let rowTotal = itemBaseTotal;

      if (i === 0) rowTotal += (parsed.deliveryCharge || 0) + (parsed.vatAmount || 0);

      let rowAdvance = 0;
      if (isFullyPaidAtBooking) {
        rowAdvance = rowTotal;
      } else if (remainingAdvance >= rowTotal) {
        rowAdvance = rowTotal;
        remainingAdvance -= rowTotal;
      } else if (remainingAdvance > 0) {
        rowAdvance = remainingAdvance;
        remainingAdvance = 0;
      }

      const rowPending = isFullyPaidAtBooking ? 0 : Math.max(0, rowTotal - rowAdvance);
      const rowProfit = itemBaseTotal - totalBatchCost;

      newOrders.push({
        id: orderId,
        product_id: matchedProduct?.id || undefined,
        date: now.toISOString(),
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        customer: parsed.customer,
        phone: parsed.phone,
        email: parsed.email || "",
        customer_email: i === 0 ? (parsed.email || "") : "",
        delivery_charge: i === 0 ? (parsed.deliveryCharge || 0) : 0,
        product_code: item.productCode,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice, 
        total: parseFloat(rowTotal.toFixed(2)),
        advance_paid: parseFloat(rowAdvance.toFixed(2)),
        pending_payment: parseFloat(rowPending.toFixed(2)), 
        cost: parseFloat(totalBatchCost.toFixed(2)), 
        profit: parseFloat(rowProfit.toFixed(2)),
        location: parsed.location,
        delivery_date: finalDeliveryDate,
        payment_method: parsed.paymentMethod, 
        status, 
        order_type: actualOrderType,
        is_new_customer: isNew,
        user_id: user.id,
        is_deleted: false
      } as Order);
    }

    setOrders((prev) => [...newOrders, ...prev]);

    // Save to Supabase (fallback gracefully if `email` column wasn't added yet)
    const { error: orderError } = await supabase.from("orders").insert(newOrders);
    if (orderError) {
      if (orderError.message && orderError.message.toLowerCase().includes("email")) {
        const ordersWithoutEmail = newOrders.map(({ email, ...rest }) => rest);
        const { error: retryErr } = await supabase.from("orders").insert(ordersWithoutEmail);
        if (retryErr) alert("SUPABASE REJECTED THE ORDER: " + retryErr.message);
      } else {
        alert("SUPABASE REJECTED THE ORDER: " + orderError.message);
      }
    }

    if (dbPromises.length > 0) await Promise.all(dbPromises);
    if (newDeductions.length > 0) await supabase.from("deductions").insert(newDeductions);
    return orderId;
  };

  const markOrderCompleted = async (orderId: string) => {
    const user = await getActiveUser();
    if (!user) return orderId;

    const matchingRows = orders.filter((o) => o.id === orderId);

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: "Completed" as const, advance_paid: o.total, pending_payment: 0 }
          : o
      )
    );

    await Promise.all(
      matchingRows.map((row) =>
        supabase
          .from("orders")
          .update({
            status: "Completed",
            advance_paid: row.total,
            pending_payment: 0
          })
          .eq("id", orderId)
          .eq("product_code", row.product_code)
          .eq("user_id", user.id)
      )
    );

    return orderId;
  };

  const customers = useMemo(() => {
    const map: Record<string, CustomerSummary & { orderIds: Set<string>; productCounts: Record<string, number> }> = {};
    let custCounter = 1;

    const chronological = [...orders].reverse();

    chronological.forEach((o) => {
      if (!o.customer || o.customer.toLowerCase() === "self") return;
      const key = (o.phone && o.phone !== "N/A") ? o.phone.trim() : o.customer.trim();

      if (!map[key]) {
        const custId = `CUST-${String(custCounter++).padStart(2, "0")}`;
        map[key] = {
          customer_id: custId,
          name: o.customer,
          phone: o.phone,
          email: o.email || "",
          totalOrders: 0,
          totalSpent: 0,
          totalPaid: 0,
          totalDue: 0,
          totalProfit: 0,
          lastOrderDate: o.date,
          favoriteProduct: o.product_name,
          avgOrderValue: 0,
          tier: "Regular",
          address: o.location,
          orderIds: new Set<string>(),
          productCounts: {}
        };
      }

      map[key].orderIds.add(o.id);
      map[key].totalOrders = map[key].orderIds.size;
      map[key].totalSpent += (o.total || 0);
      map[key].totalPaid += (o.advance_paid || 0);
      map[key].totalDue += (o.pending_payment || 0);
      map[key].totalProfit += (o.profit || 0);
      if (o.email && !map[key].email) map[key].email = o.email;

      map[key].productCounts[o.product_name] = (map[key].productCounts[o.product_name] || 0) + (o.quantity || 0);

      if (new Date(o.date) >= new Date(map[key].lastOrderDate)) {
        map[key].lastOrderDate = o.date;
        if (o.location) map[key].address = o.location;
        if (o.email) map[key].email = o.email;
      }
    });

    return Object.values(map).map(({ orderIds, productCounts, ...c }) => {
      const avg = c.totalOrders > 0 ? Math.round(c.totalSpent / c.totalOrders) : 0;
      let favProd = c.favoriteProduct;
      let maxProdQty = 0;
      Object.entries(productCounts).forEach(([pName, qty]) => {
        if (qty > maxProdQty) {
          maxProdQty = qty;
          favProd = pName;
        }
      });

      return {
        ...c,
        favoriteProduct: favProd,
        avgOrderValue: avg,
        tier: c.totalOrders >= 5 || c.totalSpent >= 5000 ? "Best" : c.totalOrders >= 2 || c.totalSpent >= 2000 ? "Medium" : "Regular"
      };
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
    const todayBaseProfit = completedToday.reduce((sum, o) => sum + (o.profit || 0), 0);

    const completedMonth = monthOrders.filter((o) => o.status === "Completed");
    const monthlySales = completedMonth.reduce((sum, o) => sum + (o.total || 0), 0);
    const monthlyBaseProfit = completedMonth.reduce((sum, o) => sum + (o.profit || 0), 0);

    const todayLoss = wasteLogs.filter(w => new Date(w.date).toDateString() === todayStr).reduce((sum, w) => sum + (w.total_loss || 0), 0);
    const monthlyLoss = wasteLogs.filter(w => { const d = new Date(w.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((sum, w) => sum + (w.total_loss || 0), 0);

    const pendingOrders = orders.filter((o) => o.status === "Pending");
    const activePendingOrders = pendingOrders.filter((o) => { const d = new Date(getEffectiveDate(o)); d.setHours(0, 0, 0, 0); return d <= todayMidnight; });
    const pendingPaymentsAmount = activePendingOrders.reduce((sum, o) => sum + (o.pending_payment || 0), 0);

    const productSoldMap: Record<string, number> = {};
    const productSoldByCode: Record<string, number> = {};
    const monthlyProductSoldMap: Record<string, number> = {};

    orders.forEach((o) => {
      if (o.customer?.toLowerCase() === "self") return;
      productSoldMap[o.product_name] = (productSoldMap[o.product_name] || 0) + o.quantity;
      productSoldByCode[o.product_code] = (productSoldByCode[o.product_code] || 0) + o.quantity;

      const d = getEffectiveDate(o);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        monthlyProductSoldMap[o.product_name] = (monthlyProductSoldMap[o.product_name] || 0) + o.quantity;
      }
    });

    let bestSellingProduct = "N/A"; 
    let maxSold = 0; 
    let highestMargin = -Infinity;
    let highestMarginProduct = "N/A";

    products.forEach((p) => { 
      const totalSoldAllTime = productSoldMap[p.name] || 0;

      if (totalSoldAllTime > maxSold) { 
        maxSold = totalSoldAllTime; 
        bestSellingProduct = `${p.name} (${totalSoldAllTime} sold)`; 
      } 

      if (p.price > 0) {
         const margin = ((p.price - (p.cost || 0)) / p.price) * 100;
         if (margin > highestMargin) {
             highestMargin = margin;
             highestMarginProduct = `${p.name} (${Math.round(margin)}%)`;
         }
      }
    });

    // Low-selling products (selling fewer than 3 units this month < 3)
    const lowSellingProducts: string[] = [];
    products.forEach((p) => { 
      const sold = monthlyProductSoldMap[p.name] || productSoldByCode[p.code] || 0; 
      if (sold < 3) {
        lowSellingProducts.push(`${p.name} (${sold} sold)`);
      }
    });

    // Calculate true Most Consumed Ingredient from recipes * units sold
    const ingConsumedMap: Record<string, number> = {};
    recipesList.forEach((r) => {
      const totalProdSold = productSoldByCode[r.product_code] || 0;
      if (totalProdSold > 0) {
        ingConsumedMap[r.ingredient_code] = (ingConsumedMap[r.ingredient_code] || 0) + (r.quantity * totalProdSold);
      }
    });

    let mostConsumedIngredient = ingredients[0]?.name ? `${ingredients[0].name}` : "N/A";
    let maxConsumedQty = 0;
    ingredients.forEach((ing) => {
      const usedQty = ingConsumedMap[ing.code] || 0;
      if (usedQty > maxConsumedQty) {
        maxConsumedQty = usedQty;
        mostConsumedIngredient = `${ing.name} (${parseFloat(usedQty.toFixed(2))} ${ing.unit})`;
      }
    });

    return {
      todaySales: parseFloat(todaySales.toFixed(2)), 
      todayProfit: parseFloat((todayBaseProfit - todayLoss).toFixed(2)), 
      todayOrdersCount: new Set(todayOrders.map(o => o.id)).size,
      upcomingDeliveriesCount: new Set(orders.filter((o) => { 
        const d = new Date(getEffectiveDate(o)); d.setHours(0, 0, 0, 0); return d > todayMidnight; 
      }).map(o => o.id)).size, 
      deliveriesTodayCount: new Set(todayOrders.map(o => o.id)).size, 
      pendingPaymentsAmount: parseFloat(pendingPaymentsAmount.toFixed(2)), 
      pendingOrdersCount: new Set(pendingOrders.map(o => o.id)).size,
      monthlySales: parseFloat(monthlySales.toFixed(2)), 
      monthlyProfit: parseFloat((monthlyBaseProfit - monthlyLoss).toFixed(2)), 
      monthlyOrdersCount: new Set(monthOrders.map(o => { const d = getEffectiveDate(o); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).map(o => o.id)).size,
      monthlyLoss: parseFloat(monthlyLoss.toFixed(2)), 
      newCustomersThisMonth: new Set(monthOrders.filter((o) => o.is_new_customer === 1).map(o => o.phone)).size,
      newCustomersToday: new Set(orders.filter((o) => new Date(o.date).toDateString() === todayStr && o.is_new_customer === 1).map(o => o.phone)).size,
      lowStockCount: ingredients.filter((i) => i.stock <= i.minimum).length, 
      lowSellingCount: lowSellingProducts.length, 
      lowSellingProducts, 
      bestSellingProduct: maxSold > 0 ? bestSellingProduct : "None yet",
      mostConsumedIngredient, 
      highestProfitProduct: highestMarginProduct !== "N/A" ? highestMarginProduct : "N/A"
    };
  }, [orders, ingredients, products, wasteLogs, recipesList]);

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
      alert("Your browser blocked the download.");
    }
  };

  const buildGroupedOrdersForCSV = (rawOrderRows: any[]) => {
    const map: Record<string, any> = {};
    (rawOrderRows || []).forEach((o) => {
      if ((o.customer || "").toLowerCase() === "self") return;
      if (!map[o.id]) {
        map[o.id] = {
          id: o.id,
          date: o.date,
          customer: o.customer,
          phone: o.phone || "",
          email: o.email || "",
          itemsList: [] as string[],
          quantity: 0,
          subtotal: 0,
          total: 0,
          advance_paid: 0,
          pending_payment: 0,
          payment_method: o.payment_method || "Cash",
          cost: 0,
          profit: 0,
          status: o.status,
          delivery_date: o.delivery_date
        };
      }
      map[o.id].itemsList.push(`${o.quantity}x ${o.product_name}`);
      map[o.id].quantity += Number(o.quantity || 0);
      map[o.id].subtotal += Number(o.quantity || 0) * Number(o.unit_price || 0);
      map[o.id].total += Number(o.total || 0);
      map[o.id].advance_paid += Number(o.advance_paid || 0);
      map[o.id].pending_payment += Number(o.pending_payment || 0);
      map[o.id].cost += Number(o.cost || 0);
      map[o.id].profit += Number(o.profit || 0);
    });

    return Object.values(map).map((g: any) => ({
      ...g,
      product_name: g.itemsList.join(" | "),
      delivery_charge: Math.max(0, parseFloat((g.total - g.subtotal).toFixed(2)))
    }));
  };

  const exportOrdersCSV = async () => {
    try {
      const user = await getActiveUser();
      if (!user) return alert("You must be logged in to export data.");

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const startIso = todayStart.toISOString();

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const endIso = todayEnd.toISOString();

      const yyyy = todayStart.getFullYear();
      const mm = String(todayStart.getMonth() + 1).padStart(2, '0');
      const dd = String(todayStart.getDate()).padStart(2, '0');
      const localToday = `${yyyy}-${mm}-${dd}`;

      const [
        { data: oData }, { data: pData }, { data: iData }, { data: purData },
        { data: rData }, { data: sData }, { data: wData }, { data: dData }
      ] = await Promise.all([
        supabase.from("orders").select("*").eq("user_id", user.id).eq("is_deleted", false).gte("date", startIso).lte("date", endIso),
        supabase.from("products").select("*").eq("user_id", user.id).eq("is_deleted", false),
        supabase.from("ingredients").select("*").eq("user_id", user.id).eq("is_deleted", false),
        supabase.from("purchases").select("*").eq("user_id", user.id).gte("date", startIso).lte("date", endIso).order("date", { ascending: false }),
        supabase.from("recipes").select("*").eq("user_id", user.id),
        supabase.from("shelf_stock").select("*").eq("user_id", user.id),
        supabase.from("waste_logs").select("*").eq("user_id", user.id).gte("date", startIso).lte("date", endIso),
        supabase.from("deductions").select("*").eq("user_id", user.id).gte("created_at", startIso).lte("created_at", endIso)
      ]);

      const activeIngCodes = new Set((iData || []).map((i: any) => i.code));
      const activePurData = (purData || []).filter((p: any) => activeIngCodes.has(p.code));
      const groupedOrdersForExport = buildGroupedOrdersForCSV(oData || []);

      let csvContent = `Daily Business Backup for Disaster Recovery\n`;
      csvContent += `Backup Date:,${localToday}\n`;
      csvContent += `Business:,${shopSettings?.business_name || "Rasel Food Ltd."}\n\n`;

      const generateTableCSV = (title: string, data: any[], headers: string[], keys: string[]) => {
        if (!data || data.length === 0) return `--- ${title} ---\nNo data recorded today.\n\n`;
        let section = `--- ${title} ---\n`;
        section += headers.join(",") + "\n";
        data.forEach(row => {
          const rowData = keys.map(k => {
            const val = row[k];
            if (k.includes('date') || k === 'created_at') return `"${val ? new Date(val).toLocaleDateString() : ""}"`;
            return `"${String(val ?? "").replace(/"/g, '""')}"`;
          });
          section += rowData.join(",") + "\n";
        });
        return section + "\n";
      };

      csvContent += generateTableCSV("TODAY'S ORDERS (1 ROW PER ORDER)", groupedOrdersForExport,
        ["Order ID", "Date", "Customer", "Phone", "Email", "Products", "Total Qty", "Subtotal (৳)", "Delivery (৳)", "Grand Total (৳)", "Advance Paid (৳)", "Pending Due (৳)", "Payment Method", "Cost (৳)", "Profit (৳)", "Status", "Delivery Date"],
        ["id", "date", "customer", "phone", "email", "product_name", "quantity", "subtotal", "delivery_charge", "total", "advance_paid", "pending_payment", "payment_method", "cost", "profit", "status", "delivery_date"]
      );

      csvContent += generateTableCSV("TODAY'S PURCHASES", activePurData,
        ["Date", "Ingredient Code", "Ingredient Name", "Qty Added", "Unit Price (৳)", "Total Cost (৳)", "Source"],
        ["date", "code", "name", "quantity", "unit_price", "total_cost", "source"]
      );

      csvContent += generateTableCSV("TODAY'S WASTE & LOSS", wData || [],
        ["Date", "Product Code", "Product Name", "Qty Wasted", "Total Financial Loss (৳)"],
        ["date", "product_code", "product_name", "quantity", "total_loss"]
      );

      csvContent += generateTableCSV("TODAY'S MANUAL DEDUCTIONS", dData || [],
        ["Date", "Product Name", "Ingredient Name", "Qty Deducted", "Reason"],
        ["created_at", "product_name", "ingredient_name", "deducted_quantity", "type"]
      );

      csvContent += generateTableCSV("CURRENT RAW INGREDIENTS STOCK", iData || [],
        ["Code", "Name", "Current Stock", "Unit", "Avg Unit Cost (৳)"],
        ["code", "name", "stock", "unit", "unit_cost"]
      );

      csvContent += generateTableCSV("CURRENT SHELF STOCK (FINISHED GOODS)", sData || [],
        ["Product Code", "Product Name", "Qty Available", "Batch Date", "Best Before (Expiry Date)"],
        ["product_code", "product_name", "quantity", "batch_date", "expiry_date"]
      );

      csvContent += generateTableCSV("CURRENT PRODUCTS CATALOG", pData || [],
        ["Code", "Name", "Selling Price (৳)", "Cost (৳)", "Status"],
        ["code", "name", "price", "cost", "status"]
      );

      csvContent += generateTableCSV("CURRENT RECIPES / FORMULAS", rData || [],
        ["Finished Product Code", "Raw Ingredient Code", "Quantity Required"],
        ["product_code", "ingredient_code", "quantity"]
      );

      const filename = `Daily_Report_${localToday}.csv`;
      triggerDownload(csvContent, "text/csv;charset=utf-8;", filename);

    } catch (error) {
      console.error("Master Backup failed:", error);
    }
  };

  const exportMonthlyCSV = async () => {
    try {
      const user = await getActiveUser();
      if (!user) return alert("You must be logged in to export data.");

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      const startIso = monthStart.toISOString();

      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      todayEnd.setHours(23, 59, 59, 999);
      const endIso = todayEnd.toISOString();

      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const monthYear = `${yyyy}-${mm}`;

      const [
        { data: oData }, { data: pData }, { data: iData }, { data: purData },
        { data: rData }, { data: sData }, { data: wData }, { data: dData }
      ] = await Promise.all([
        supabase.from("orders").select("*").eq("user_id", user.id).eq("is_deleted", false).gte("date", startIso).lte("date", endIso),
        supabase.from("products").select("*").eq("user_id", user.id).eq("is_deleted", false),
        supabase.from("ingredients").select("*").eq("user_id", user.id).eq("is_deleted", false),
        supabase.from("purchases").select("*").eq("user_id", user.id).gte("date", startIso).lte("date", endIso).order("date", { ascending: false }),
        supabase.from("recipes").select("*").eq("user_id", user.id),
        supabase.from("shelf_stock").select("*").eq("user_id", user.id),
        supabase.from("waste_logs").select("*").eq("user_id", user.id).gte("date", startIso).lte("date", endIso),
        supabase.from("deductions").select("*").eq("user_id", user.id).gte("created_at", startIso).lte("created_at", endIso)
      ]);

      const activeIngCodes = new Set((iData || []).map((i: any) => i.code));
      const activePurData = (purData || []).filter((p: any) => activeIngCodes.has(p.code));
      const groupedOrdersForExport = buildGroupedOrdersForCSV(oData || []);

      let csvContent = `Monthly Business Backup for Disaster Recovery\n`;
      csvContent += `Billing Month:,${monthYear}\n`;
      csvContent += `Business:,${shopSettings?.business_name || "Rasel Food Ltd."}\n\n`;

      const generateTableCSV = (title: string, data: any[], headers: string[], keys: string[]) => {
        if (!data || data.length === 0) return `--- ${title} ---\nNo data recorded this month.\n\n`;
        let section = `--- ${title} ---\n`;
        section += headers.join(",") + "\n";
        data.forEach(row => {
          const rowData = keys.map(k => {
            const val = row[k];
            if (k.includes('date') || k === 'created_at') return `"${val ? new Date(val).toLocaleDateString() : ""}"`;
            return `"${String(val ?? "").replace(/"/g, '""')}"`;
          });
          section += rowData.join(",") + "\n";
        });
        return section + "\n";
      };

      csvContent += generateTableCSV("THIS MONTH'S ORDERS (1 ROW PER ORDER)", groupedOrdersForExport,
        ["Order ID", "Date", "Customer", "Phone", "Email", "Products", "Total Qty", "Subtotal (৳)", "Delivery (৳)", "Grand Total (৳)", "Advance Paid (৳)", "Pending Due (৳)", "Payment Method", "Cost (৳)", "Profit (৳)", "Status", "Delivery Date"],
        ["id", "date", "customer", "phone", "email", "product_name", "quantity", "subtotal", "delivery_charge", "total", "advance_paid", "pending_payment", "payment_method", "cost", "profit", "status", "delivery_date"]
      );

      csvContent += generateTableCSV("THIS MONTH'S PURCHASES", activePurData,
        ["Date", "Ingredient Code", "Ingredient Name", "Qty Added", "Unit Price (৳)", "Total Cost (৳)", "Source"],
        ["date", "code", "name", "quantity", "unit_price", "total_cost", "source"]
      );

      csvContent += generateTableCSV("THIS MONTH'S WASTE & LOSS", wData || [],
        ["Date", "Product Code", "Product Name", "Qty Wasted", "Total Financial Loss (৳)"],
        ["date", "product_code", "product_name", "quantity", "total_loss"]
      );

      csvContent += generateTableCSV("THIS MONTH'S MANUAL DEDUCTIONS", dData || [],
        ["Date", "Product Name", "Ingredient Name", "Qty Deducted", "Reason"],
        ["created_at", "product_name", "ingredient_name", "deducted_quantity", "type"]
      );

      csvContent += generateTableCSV("CURRENT RAW INGREDIENTS STOCK", iData || [],
        ["Code", "Name", "Current Stock", "Unit", "Avg Unit Cost (৳)"],
        ["code", "name", "stock", "unit", "unit_cost"]
      );

      csvContent += generateTableCSV("CURRENT SHELF STOCK (FINISHED GOODS)", sData || [],
        ["Product Code", "Product Name", "Qty Available", "Batch Date", "Best Before (Expiry Date)"],
        ["product_code", "product_name", "quantity", "batch_date", "expiry_date"]
      );

      csvContent += generateTableCSV("CURRENT PRODUCTS CATALOG", pData || [],
        ["Code", "Name", "Selling Price (৳)", "Cost (৳)", "Status"],
        ["code", "name", "price", "cost", "status"]
      );

      csvContent += generateTableCSV("CURRENT RECIPES / FORMULAS", rData || [],
        ["Finished Product Code", "Raw Ingredient Code", "Quantity Required"],
        ["product_code", "ingredient_code", "quantity"]
      );

      const filename = `Monthly_Report_${monthYear}.csv`;
      triggerDownload(csvContent, "text/csv;charset=utf-8;", filename);

    } catch (error) {
      console.error("Monthly Backup failed:", error);
    }
  };

  return (
    <BakeryContext.Provider value={{ products, ingredients, allIngredients, orders, purchases, customers, shelfStock, wasteLogs, shopSettings, stats, fetchData, updateShopSettings, addProduct, deleteProduct, deleteIngredientItem, deleteOrder, deductIngredientItem, savePurchase, deletePurchase, getNextIngredientCode, attachRecipeItem, createOrder, markOrderCompleted, logWaste, exportOrdersCSV, exportMonthlyCSV }}>
      {children}
    </BakeryContext.Provider>
  );
};

export const useBakery = () => {
  const context = useContext(BakeryContext);
  if (!context) throw new Error("useBakery must be used within a BakeryProvider");
  return context;
};