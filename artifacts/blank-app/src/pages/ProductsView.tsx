import React, { useState, useEffect } from "react";
import { useBakery, Product } from "../context/BakeryContext";
import { supabase } from "../lib/supabaseClient";

interface RecipeItem {
  product_code: string;
  ingredient_code: string;
  quantity: number;
}

export const ProductsView: React.FC = () => {
  const { products, inventory, addProduct, deleteProduct, attachRecipeItem, fetchData, shopSettings, updateShopSettings } = useBakery();

  const [showSettings, setShowSettings] = useState(false);
  const [localTargetMargin, setLocalTargetMargin] = useState(20);
  const [localTaxRate, setLocalTaxRate] = useState(0);
  const [localCurrency, setLocalCurrency] = useState("৳");

  useEffect(() => {
    if (shopSettings) {
      setLocalTargetMargin(shopSettings.target_margin);
      setLocalTaxRate(shopSettings.default_tax_rate);
      setLocalCurrency(shopSettings.currency_symbol);
    }
  }, [shopSettings]);

  const handleSaveSettings = async () => {
    await updateShopSettings({
      target_margin: localTargetMargin,
      default_tax_rate: localTaxRate,
      currency_symbol: localCurrency
    });
    setShowSettings(false);
    alert("Settings saved to the cloud successfully!");
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newUnit, setNewUnit] = useState("pic");
  const [newShelfLife, setNewShelfLife] = useState("2");

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [selectedIngCode, setSelectedIngCode] = useState("");
  const [recipeQty, setRecipeQty] = useState("");
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [editPrice, setEditPrice] = useState("");

  useEffect(() => {
    if (!selectedProduct) { setRecipeItems([]); return; }
    setEditPrice(String(selectedProduct.price));

    const loadRecipe = async () => {
      setLoadingRecipe(true);
      const { data, error } = await supabase.from("recipes").select("*").eq("product_code", selectedProduct.code);
      if (!error && data) setRecipeItems(data as RecipeItem[]);
      setLoadingRecipe(false);
    };
    loadRecipe();
  }, [selectedProduct]);

  const handleOpenAdd = () => {
    const nextNum = products.length + 1;
    const autoCode = `PC${String(nextNum).padStart(2, "0")}`;
    setNewCode(autoCode);
    setNewName("");
    setNewPrice("");
    setNewUnit("pic");
    setNewShelfLife("2");
    setIsEditing(false);
    setShowAddModal(true);
  };

  const handleOpenEdit = (product: Product) => {
    setNewCode(product.code);
    setNewName(product.name);
    setNewPrice(String(product.price));
    setNewUnit((product as any).unit || "pic");
    setNewShelfLife(String(product.shelf_life_days || 2));
    setIsEditing(true);
    setShowAddModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName || !newPrice) return;
    const formattedCode = newCode.trim().toUpperCase();
    const sLife = parseInt(newShelfLife, 10) || 2;

    if (isEditing) {
      await supabase.from("products").update({ name: newName.trim(), price: parseFloat(newPrice), unit: newUnit, shelf_life_days: sLife }).eq("code", formattedCode);
      await fetchData();
      setShowAddModal(false);
      return;
    }

    const existingProduct = products.find((p) => p.code === formattedCode);
    if (existingProduct) return alert(`Product code "${formattedCode}" is in use. Use a unique code.`);

    await addProduct({ code: formattedCode, name: newName.trim(), price: parseFloat(newPrice), unit: newUnit, shelf_life_days: sLife });
    setShowAddModal(false);
  };

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedIngCode || !recipeQty) return;
    const qty = parseFloat(recipeQty);
    await attachRecipeItem(selectedProduct.code, selectedIngCode, qty);

    const newItem = { product_code: selectedProduct.code, ingredient_code: selectedIngCode, quantity: qty };
    const updatedItems = [...recipeItems.filter((i) => i.ingredient_code !== selectedIngCode), newItem];
    setRecipeItems(updatedItems);

    const newTotalCost = updatedItems.reduce((acc, item) => {
      const ing = inventory.find((i) => i.code === item.ingredient_code);
      return acc + (ing?.unit_cost || 0) * item.quantity;
    }, 0);

    await supabase.from("products").update({ cost: parseFloat(newTotalCost.toFixed(2)) }).eq("code", selectedProduct.code);
    setSelectedProduct(prev => prev ? { ...prev, cost: parseFloat(newTotalCost.toFixed(2)) } : null);
    setSelectedIngCode("");
    setRecipeQty("");
    await fetchData();
  };

  const handleRemoveIngredient = async (ingredientCode: string) => {
    if (!selectedProduct) return;
    await supabase.from("recipes").delete().eq("product_code", selectedProduct.code).eq("ingredient_code", ingredientCode);

    const updatedItems = recipeItems.filter((i) => i.ingredient_code !== ingredientCode);
    setRecipeItems(updatedItems);

    const newTotalCost = updatedItems.reduce((acc, item) => {
      const ing = inventory.find((i) => i.code === item.ingredient_code);
      return acc + (ing?.unit_cost || 0) * item.quantity;
    }, 0);

    await supabase.from("products").update({ cost: parseFloat(newTotalCost.toFixed(2)) }).eq("code", selectedProduct.code);
    setSelectedProduct(prev => prev ? { ...prev, cost: parseFloat(newTotalCost.toFixed(2)) } : null);
    await fetchData();
  };

  const handleUpdatePrice = async () => {
    if (!selectedProduct) return;
    const newTargetPrice = parseFloat(editPrice);
    if (isNaN(newTargetPrice)) return;
    await supabase.from("products").update({ price: newTargetPrice }).eq("code", selectedProduct.code);
    setSelectedProduct(prev => prev ? { ...prev, price: newTargetPrice } : null);
    await fetchData();
    alert("Selling price updated successfully!");
  };

  const filteredProducts = products.filter((p) => (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || (p.code || "").toLowerCase().includes(searchQuery.toLowerCase()));

  const CURRENCY = shopSettings?.currency_symbol || "৳";
  const TARGET_MARGIN = shopSettings?.target_margin || 20;

  return (
    <div className="fixed top-[60px] bottom-[70px] left-0 right-0 flex flex-col w-full max-w-md mx-auto bg-gray-50 z-10">

      {/* --- PINNED HEADER --- */}
      <div className="flex-none bg-gray-50 px-4 pt-4 pb-2 z-20">
        <div className="flex justify-between items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Products Catalog</h2>
            <p className="text-xs text-gray-500">Manage recipes and pricing</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="bg-white border border-gray-200 hover:border-pink-300 text-gray-700 text-lg p-2 rounded-xl shadow-sm transition flex items-center justify-center h-[42px] w-[42px]"
            >
              ⚙️
            </button>
            <button onClick={handleOpenAdd} className="bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition h-[42px] whitespace-nowrap">
              + Add
            </button>
          </div>
        </div>

        <div className="relative mt-4">
          <input type="text" placeholder="🔍 Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500 shadow-sm" />
        </div>
      </div>

      {/* --- SCROLLABLE CARDS CONTAINER --- */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        {filteredProducts.length === 0 ? (
          <div className="bg-white p-8 rounded-[20px] text-center text-gray-400 text-xs border border-gray-100 shadow-sm">
            {products.length === 0 ? (<>No products available. Tap <strong>+ Add</strong>.</>) : (<>No matching products found.</>)}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredProducts.map((p) => {
              const netProfit = p.price - (p.cost || 0);
              const margin = p.price > 0 ? Math.round((netProfit / p.price) * 100) : 0;
              const isBelowTarget = margin < TARGET_MARGIN || netProfit < 0;
              const unitDisplay = (p as any).unit || 'pic';

              return (
                <div key={p.code} className={`bg-white rounded-xl p-3.5 border shadow-sm space-y-2.5 transition-all w-full ${isBelowTarget ? 'border-red-400 bg-red-50/20' : 'border-gray-100'}`}>

                  {/* Ultra-Mobile Friendly Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-2 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{p.code}</span>
                        <span className="text-[9px] font-bold text-amber-600">⏳ {p.shelf_life_days || 2}d</span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm truncate">{p.name}</h3>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-black text-gray-900 leading-none">{CURRENCY}{p.price}</div>
                      <div className="text-[9px] text-gray-400 mt-0.5 font-medium">/{unitDisplay}</div>
                    </div>
                  </div>

                  {/* Clean Single-Row Metrics */}
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <div className="text-[10px]">
                      <span className="text-gray-500 font-semibold mr-1">Cost:</span>
                      <span className="font-bold text-gray-900">{CURRENCY}{p.cost || 0}</span>
                    </div>
                    <div className="text-[10px]">
                      <span className="text-gray-500 font-semibold mr-1">Profit:</span>
                      <span className="font-bold text-emerald-600">{CURRENCY}{netProfit.toFixed(2)}</span>
                    </div>
                    <div className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isBelowTarget ? 'bg-red-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                      {margin}%
                    </div>
                  </div>

                  {/* Button Row */}
                  <div className="flex justify-between items-center pt-1">
                    <button onClick={() => setSelectedProduct(p)} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition shadow-sm">
                      🥣 Recipe Builder
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenEdit(p)} className="text-[10px] text-gray-700 font-bold px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Edit</button>
                      <button onClick={() => { if(window.confirm(`Delete ${p.name}?`)) deleteProduct(p.code); }} className="text-[10px] text-red-600 font-bold px-3 py-2 bg-red-50 hover:bg-red-100 rounded-lg transition">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- MOBILE FIXED SETTINGS MODAL --- */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Shop Settings</h4>
                <p className="text-[10px] text-gray-500">Tax, Margin & Currency</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center font-bold">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block mb-1">Target Margin (%)</label>
                <input
                  type="number"
                  value={localTargetMargin}
                  onChange={(e) => setLocalTargetMargin(Number(e.target.value))}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 font-black text-gray-900 focus:outline-none focus:border-pink-400 bg-gray-50 text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Shop Tax Rate (%)</label>
                <input
                  type="number"
                  value={localTaxRate}
                  onChange={(e) => setLocalTaxRate(Number(e.target.value))}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 font-black text-gray-900 focus:outline-none focus:border-blue-400 bg-gray-50 text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={localCurrency}
                  onChange={(e) => setLocalCurrency(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 font-black text-gray-900 focus:outline-none focus:border-emerald-400 bg-gray-50 text-center"
                />
              </div>
              <button onClick={handleSaveSettings} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 mt-2 rounded-xl text-xs shadow-md transition">
                SAVE TO CLOUD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 text-lg border-b pb-2">{isEditing ? "Edit Product" : "Create New Product"}</h3>
            <form onSubmit={handleSaveProduct} className="space-y-4">

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Code</label>
                  <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)} className="w-full text-sm border rounded-lg p-2 font-mono uppercase bg-gray-50 disabled:text-gray-400" required disabled={isEditing} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Product Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full text-sm border rounded-lg p-2" required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-b border-gray-100 pb-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Price ({CURRENCY})</label>
                  <input type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-full text-sm font-black text-gray-900 border border-gray-300 rounded-lg p-2" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Unit</label>
                  <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="w-full text-sm border rounded-lg p-2 bg-white text-gray-800">
                    <option value="pic">pic</option><option value="Ltr">Ltr</option><option value="kg">kg</option><option value="gm">gm</option><option value="box">box</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-600 uppercase">Shelf Life</label>
                  <input type="number" value={newShelfLife} onChange={(e) => setNewShelfLife(e.target.value)} className="w-full text-sm font-bold text-amber-700 border border-amber-200 rounded-lg p-2 bg-amber-50 focus:border-amber-400" min="1" required title="Days before expiring" />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)} className="w-1/3 py-3 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" className="w-2/3 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-bold shadow-md transition">💾 Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RECIPE BUILDER MODAL --- */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Recipe Builder</h3>
                <p className="text-xs text-gray-500">{selectedProduct.name} ({selectedProduct.code})</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
            </div>

            <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-pink-600 uppercase tracking-wider">Total Base Cost</p>
                <p className="text-2xl font-black text-gray-900">{CURRENCY} {selectedProduct.cost?.toFixed(2) || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Selling Price</p>
                <div className="flex items-center gap-1 mt-1">
                  <input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-20 text-sm font-bold border rounded p-1 text-center bg-white" />
                  <button onClick={handleUpdatePrice} className="bg-gray-900 text-white text-xs font-bold px-2 py-1.5 rounded hover:bg-gray-800">Save</button>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Attached Ingredients</label>
              {loadingRecipe ? (
                <p className="text-xs text-gray-400 text-center py-4">Loading recipe...</p>
              ) : recipeItems.length === 0 ? (
                <p className="text-xs text-gray-400 italic bg-gray-50 p-4 rounded-xl text-center border border-dashed border-gray-200">No ingredients added yet.</p>
              ) : (
                <div className="divide-y divide-gray-100 bg-gray-50 rounded-xl p-2 border border-gray-200">
                  {recipeItems.map((item) => {
                    const ing = inventory.find((i) => i.code === item.ingredient_code);
                    const lineCost = (ing?.unit_cost || 0) * item.quantity;
                    return (
                      <div key={item.ingredient_code} className="flex justify-between items-center py-2 px-1 text-sm">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-gray-800 text-xs truncate">{ing?.name || item.ingredient_code}</div>
                          <div className="text-[10px] text-gray-500 font-medium">({item.quantity} {ing?.unit || "unit"})</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-gray-700">{CURRENCY} {lineCost.toFixed(2)}</span>
                          <button onClick={() => handleRemoveIngredient(item.ingredient_code)} className="text-red-400 hover:text-red-600 bg-red-50 rounded-md text-xs font-bold px-2 py-1 transition">✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <form onSubmit={handleAddIngredient} className="space-y-3 pt-4 border-t border-gray-100 mt-2">
              <div className="grid grid-cols-3 gap-2">
                <select value={selectedIngCode} onChange={(e) => setSelectedIngCode(e.target.value)} className="col-span-2 w-full text-xs font-bold border border-gray-300 rounded-xl p-2.5 bg-white text-gray-800" required>
                  <option value="">Select Ingredient...</option>
                  {inventory.map((ing) => (
                    <option key={ing.code} value={ing.code}>{ing.name} ({CURRENCY}{ing.unit_cost}/{ing.unit})</option>
                  ))}
                </select>
                <input type="number" step="0.001" placeholder="Qty" value={recipeQty} onChange={(e) => setRecipeQty(e.target.value)} className="col-span-1 w-full text-xs font-bold border border-gray-300 rounded-xl p-2.5 text-center" required />
              </div>
              <button type="submit" className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-black transition shadow-sm">+ Add to Recipe</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};