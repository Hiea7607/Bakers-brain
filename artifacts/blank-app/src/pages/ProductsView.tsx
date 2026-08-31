import React, { useState, useEffect } from "react";
import { useBakery, Product } from "../context/BakeryContext";
import { supabase } from "../lib/supabaseClient";

interface RecipeItem {
  product_code: string;
  ingredient_code: string;
  quantity: number;
}

export const ProductsView: React.FC = () => {
  const { products, inventory, addProduct, deleteProduct, attachRecipeItem, fetchData } = useBakery();

  // Add Product Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  // Recipe Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [selectedIngCode, setSelectedIngCode] = useState("");
  const [recipeQty, setRecipeQty] = useState("");
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  // Dynamic Pricing State
  const [editPrice, setEditPrice] = useState("");

  // Load recipe rows from Supabase when opening modal
  useEffect(() => {
    if (!selectedProduct) {
      setRecipeItems([]);
      return;
    }

    setEditPrice(String(selectedProduct.price));

    const loadRecipe = async () => {
      setLoadingRecipe(true);
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("product_code", selectedProduct.code);

      if (!error && data) {
        setRecipeItems(data as RecipeItem[]);
      }
      setLoadingRecipe(false);
    };

    loadRecipe();
  }, [selectedProduct]);

  // 1. Handle Add Product (With Code Protection)
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName || !newPrice) return;

    const formattedCode = newCode.trim().toUpperCase();

    // CODE PROTECTION: Prevent overwriting existing products
    const existingProduct = products.find((p) => p.code === formattedCode);
    if (existingProduct) {
      alert(`Stop! Product code "${formattedCode}" is already in use by "${existingProduct.name}". Please use a unique code.`);
      return;
    }

    await addProduct({
      code: formattedCode,
      name: newName.trim(),
      price: parseFloat(newPrice),
    });

    setNewCode("");
    setNewName("");
    setNewPrice("");
    setShowAddModal(false);
  };

  // 2. Handle Attach Ingredient
  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedIngCode || !recipeQty) return;

    const qty = parseFloat(recipeQty);
    await attachRecipeItem(selectedProduct.code, selectedIngCode, qty);

    setRecipeItems((prev) => {
      const filtered = prev.filter((i) => i.ingredient_code !== selectedIngCode);
      return [...filtered, { product_code: selectedProduct.code, ingredient_code: selectedIngCode, quantity: qty }];
    });

    setSelectedIngCode("");
    setRecipeQty("");
    await fetchData();

    // Update local modal data to reflect new cost
    const targetProduct = products.find((p) => p.code === selectedProduct.code);
    if (targetProduct) setSelectedProduct(targetProduct);
  };

  // 3. Handle Remove Ingredient
  const handleRemoveIngredient = async (ingredientCode: string) => {
    if (!selectedProduct) return;

    await supabase
      .from("recipes")
      .delete()
      .eq("product_code", selectedProduct.code)
      .eq("ingredient_code", ingredientCode);

    setRecipeItems((prev) => prev.filter((i) => i.ingredient_code !== ingredientCode));

    const remainingItems = recipeItems.filter((i) => i.ingredient_code !== ingredientCode);
    const newTotalCost = remainingItems.reduce((acc, item) => {
      const ing = inventory.find((i) => i.code === item.ingredient_code);
      return acc + (ing?.unit_cost || 0) * item.quantity;
    }, 0);

    await supabase
      .from("products")
      .update({ cost: parseFloat(newTotalCost.toFixed(2)) })
      .eq("code", selectedProduct.code);

    await fetchData();

    // Sync local modal state
    setSelectedProduct(prev => prev ? { ...prev, cost: parseFloat(newTotalCost.toFixed(2)) } : null);
  };

  // 4. Recipe-First Pricing Update
  const handleUpdatePrice = async () => {
    if (!selectedProduct) return;
    const newTargetPrice = parseFloat(editPrice);
    if (isNaN(newTargetPrice)) return;

    await supabase
      .from("products")
      .update({ price: newTargetPrice })
      .eq("code", selectedProduct.code);

    setSelectedProduct(prev => prev ? { ...prev, price: newTargetPrice } : null);
    await fetchData();
    alert("Selling price updated successfully!");
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Products & Pricing</h2>
          <p className="text-xs text-gray-500">Manage products, live recipe costs, and profit margins</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition"
        >
          + Add Product
        </button>
      </div>

      {/* Products Grid with Loss Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((p) => {
          const netProfit = p.price - (p.cost || 0);
          const margin = p.price > 0 ? Math.round((netProfit / p.price) * 100) : 0;
          const isLoss = netProfit < 0; // LOSS ALERT TRIGGER

          return (
            <div key={p.code} className={`bg-white rounded-2xl p-5 border shadow-sm space-y-4 transition-all ${isLoss ? 'border-red-400 bg-red-50/20' : 'border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isLoss ? 'bg-red-100 text-red-600' : 'bg-pink-50 text-pink-600'}`}>
                    {p.code}
                  </span>
                  <h3 className="font-bold text-gray-800 text-lg mt-1">{p.name}</h3>
                </div>

                {/* Dynamic Margin Badge */}
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${isLoss ? 'bg-red-500 text-white shadow-sm' : 'bg-green-50 text-green-700'}`}>
                  {isLoss ? '⚠️ LOSS' : `${margin}% Margin`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl text-center">
                <div>
                  <div className="text-xs text-gray-400">Price</div>
                  <div className="text-sm font-bold text-gray-900">৳ {p.price}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Base Cost</div>
                  <div className={`text-sm font-bold ${isLoss ? 'text-red-600' : 'text-pink-600'}`}>৳ {p.cost || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Profit</div>
                  <div className={`text-sm font-bold ${isLoss ? 'text-red-600' : 'text-green-600'}`}>৳ {netProfit.toFixed(2)}</div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setSelectedProduct(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition"
                >
                  🥣 Recipe Builder
                </button>
                <button
                  onClick={() => deleteProduct(p.code)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 1. Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-gray-900">Add New Product</h3>
            <p className="text-xs text-gray-500">Create the product first, then use the Recipe Builder to calculate costs.</p>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <input
                type="text"
                placeholder="Unique Code (e.g. PC01)"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full text-sm border rounded-lg p-2.5 font-mono"
                required
              />
              <input
                type="text"
                placeholder="Product Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full text-sm border rounded-lg p-2.5"
                required
              />
              <input
                type="number"
                placeholder="Initial Draft Price (৳)"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full text-sm border rounded-lg p-2.5"
                required
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2 border rounded-lg text-sm font-medium text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-medium"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Recipe & Pricing Builder Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">

            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Recipe Builder</h3>
                <p className="text-xs text-gray-500">{selectedProduct.name} ({selectedProduct.code})</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
                ✕
              </button>
            </div>

            {/* Live Cost Summary */}
            <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-pink-600 uppercase tracking-wider">Total Base Cost</p>
                <p className="text-2xl font-black text-gray-900">৳ {selectedProduct.cost?.toFixed(2) || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Set Selling Price</p>
                <div className="flex items-center gap-1 mt-1">
                  <input 
                    type="number" 
                    value={editPrice} 
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-20 text-sm font-bold border rounded p-1 text-center bg-white"
                  />
                  <button onClick={handleUpdatePrice} className="bg-gray-900 text-white text-xs font-bold px-2 py-1.5 rounded hover:bg-gray-800">
                    Save
                  </button>
                </div>
              </div>
            </div>

            {/* Current Ingredients List */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Attached Ingredients
              </label>
              {loadingRecipe ? (
                <p className="text-xs text-gray-400 text-center py-4">Loading recipe...</p>
              ) : recipeItems.length === 0 ? (
                <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg text-center border border-dashed">
                  No ingredients added yet. Build the recipe below to see the cost!
                </p>
              ) : (
                <div className="divide-y divide-gray-100 bg-gray-50 rounded-xl p-2 border border-gray-200">
                  {recipeItems.map((item) => {
                    const ing = inventory.find((i) => i.code === item.ingredient_code);
                    const lineCost = (ing?.unit_cost || 0) * item.quantity;
                    return (
                      <div key={item.ingredient_code} className="flex justify-between items-center py-2 px-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-800">{ing?.name || item.ingredient_code}</span>
                          <span className="text-xs text-gray-500 ml-2">({item.quantity} {ing?.unit || "unit"})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-700">৳ {lineCost.toFixed(2)}</span>
                          <button onClick={() => handleRemoveIngredient(item.ingredient_code)} className="text-red-400 hover:text-red-600 text-xs font-bold px-1">
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add New Ingredient Line */}
            <form onSubmit={handleAddIngredient} className="space-y-3 pt-3 border-t">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedIngCode}
                  onChange={(e) => setSelectedIngCode(e.target.value)}
                  className="w-full text-sm border rounded-lg p-2 bg-white"
                  required
                >
                  <option value="">Select Item...</option>
                  {inventory.map((ing) => (
                    <option key={ing.code} value={ing.code}>
                      {ing.name} (৳{ing.unit_cost}/{ing.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.001"
                  placeholder="Qty (e.g. 0.25)"
                  value={recipeQty}
                  onChange={(e) => setRecipeQty(e.target.value)}
                  className="w-full text-sm border rounded-lg p-2"
                  required
                />
              </div>
              <button type="submit" className="w-full py-2 bg-pink-600 text-white rounded-lg font-medium text-sm hover:bg-pink-700 transition">
                + Add to Recipe
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};