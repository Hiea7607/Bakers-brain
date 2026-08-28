import React, { useState } from "react";
import { useBakery, Product } from "../context/BakeryContext";

export const ProductsView: React.FC = () => {
  const {
    products,
    inventory,
    recipes,
    addProduct,
    deleteProduct,
    addOrUpdateRecipeIngredient,
    removeRecipeIngredient,
  } = useBakery();

  // Modal states
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState<Product | null>(null);

  // New product form
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [targetMargin, setTargetMargin] = useState("40"); // Default 40% margin

  // Recipe edit form
  const [selectedIngCode, setSelectedIngCode] = useState("");
  const [ingQuantity, setIngQuantity] = useState("");

  const handleOpenAdd = () => {
    setCode(`PC0${products.length + 1}`);
    setName("");
    setPrice("");
    setShowAddProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !price) {
      alert("Please fill in SKU Code, Name, and Selling Price.");
      return;
    }

    addProduct({
      code: code.toUpperCase().trim(),
      name: name.trim(),
      price: parseFloat(price),
    });

    setShowAddProductModal(false);
  };

  const handleAddIngredientToRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForRecipe || !selectedIngCode || !ingQuantity) return;

    addOrUpdateRecipeIngredient(
      selectedProductForRecipe.code,
      selectedIngCode,
      parseFloat(ingQuantity)
    );

    setSelectedIngCode("");
    setIngQuantity("");
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">4. Products & Pricing</h2>
          <p className="text-[11px] text-gray-500">Live production costs derived from average ingredient rates</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
        >
          + Add Product
        </button>
      </div>

      {/* Product List */}
      <div className="space-y-3">
        {products.length === 0 ? (
          <div className="bg-white p-8 rounded-xl text-center text-gray-400 text-xs border border-gray-100">
            No products added yet. Tap <strong>+ Add Product</strong> or preload sample data.
          </div>
        ) : (
          products.map((prod) => {
            const currentRecipe = recipes[prod.code] || {};
            const ingredientCount = Object.keys(currentRecipe).length;
            const profitPerUnit = prod.price - prod.cost;
            const currentMargin = prod.price > 0 ? Math.round((profitPerUnit / prod.price) * 100) : 0;

            // Suggested price at 40% margin: Cost / (1 - 0.4)
            const suggestedPrice40 = prod.cost > 0 ? Math.round(prod.cost / 0.6) : prod.price;

            return (
              <div
                key={prod.code}
                className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-3"
              >
                {/* Header Row */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded">
                        {prod.code}
                      </span>
                      <h3 className="font-bold text-sm text-gray-900">{prod.name}</h3>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Recipe: <strong>{ingredientCount} ingredients linked</strong>
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      currentMargin >= 35
                        ? "bg-green-100 text-green-700"
                        : currentMargin > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {currentMargin}% Margin
                  </span>
                </div>

                {/* Pricing & Dynamic Cost Breakdown */}
                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-lg text-center text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Selling Price</span>
                    <span className="font-bold text-gray-900">৳ {prod.price}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Avg Cost</span>
                    <span className="font-bold text-rose-600">৳ {prod.cost}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Net Profit</span>
                    <span className="font-bold text-green-600">৳ {profitPerUnit}</span>
                  </div>
                </div>

                {/* Pricing Decision Advisor */}
                {prod.cost > 0 && (
                  <div className="bg-blue-50/60 border border-blue-100 p-2 rounded-lg flex justify-between items-center text-[11px] text-blue-900">
                    <span>💡 Suggested Price (for 40% margin):</span>
                    <strong className="text-xs">৳ {suggestedPrice40}</strong>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-1 text-xs">
                  <button
                    onClick={() => setSelectedProductForRecipe(prod)}
                    className="bg-gray-800 hover:bg-black text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition flex items-center gap-1"
                  >
                    🥣 Edit Recipe & Raw Materials
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Delete ${prod.name}?`)) deleteProduct(prod.code);
                    }}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Recipe Builder Modal */}
      {selectedProductForRecipe && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 shadow-2xl space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start border-b pb-2">
              <div>
                <span className="text-[10px] font-mono font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded">
                  {selectedProductForRecipe.code}
                </span>
                <h3 className="font-bold text-base text-gray-900 mt-1">
                  Recipe for {selectedProductForRecipe.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProductForRecipe(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Current Recipe Ingredients List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Attached Ingredients
              </p>
              {Object.keys(recipes[selectedProductForRecipe.code] || {}).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  No ingredients added to this recipe yet.
                </p>
              ) : (
                Object.entries(recipes[selectedProductForRecipe.code] || {}).map(
                  ([ingCode, qty]) => {
                    const ing = inventory.find((i) => i.code === ingCode);
                    const lineCost = (ing?.unitCost || 0) * qty;

                    return (
                      <div
                        key={ingCode}
                        className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex justify-between items-center text-xs"
                      >
                        <div>
                          <strong className="text-gray-800">{ing?.name || ingCode}</strong>
                          <span className="text-gray-500 block text-[10px]">
                            {qty} {ing?.unit || "units"} @ ৳{ing?.unitCost || 0}/{ing?.unit || "unit"} (Avg)
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">৳ {lineCost.toFixed(1)}</span>
                          <button
                            onClick={() =>
                              removeRecipeIngredient(selectedProductForRecipe.code, ingCode)
                            }
                            className="text-red-400 hover:text-red-600 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>

            {/* Add Ingredient Form */}
            <form onSubmit={handleAddIngredientToRecipe} className="border-t pt-2 space-y-2">
              <p className="text-[11px] font-bold text-gray-700">+ Add Ingredient to Recipe</p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  required
                  value={selectedIngCode}
                  onChange={(e) => setSelectedIngCode(e.target.value)}
                  className="border rounded-lg p-2 text-xs bg-white text-gray-800"
                >
                  <option value="">Select Ingredient</option>
                  {inventory.map((i) => (
                    <option key={i.code} value={i.code}>
                      {i.name} (৳{i.unitCost}/{i.unit})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  step="0.001"
                  required
                  value={ingQuantity}
                  onChange={(e) => setIngQuantity(e.target.value)}
                  placeholder="Qty (e.g., 0.3)"
                  className="border rounded-lg p-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg text-xs transition"
              >
                + Attach Ingredient
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-3"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-gray-800">Add New Product</h3>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-500">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Chocolate Cupcake"
                  className="w-full border rounded-lg p-2 mt-0.5"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500">SKU / Product Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g., PC03"
                  className="w-full border rounded-lg p-2 mt-0.5 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500">Selling Price (৳)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g., 150"
                  className="w-full border rounded-lg p-2 mt-0.5"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-md transition"
            >
              CREATE PRODUCT
            </button>
          </form>
        </div>
      )}
    </div>
  );
};