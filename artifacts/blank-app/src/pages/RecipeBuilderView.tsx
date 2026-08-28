import React, { useState } from "react";
import { useBakery } from "../context/BakeryContext";

export const RecipeBuilderView: React.FC<{ productCode: string; onBack: () => void }> = ({
  productCode,
  onBack,
}) => {
  const { products, inventory, recipes, addOrUpdateRecipeIngredient, removeRecipeIngredient } = useBakery();
  const [selectedIngCode, setSelectedIngCode] = useState("");
  const [selectedIngQty, setSelectedIngQty] = useState("");

  const product = products.find((p) => p.code === productCode);
  const recipe = recipes[productCode] || {};
  const recipeEntries = Object.entries(recipe);

  const handleAdd = () => {
    if (!selectedIngCode || !selectedIngQty || Number(selectedIngQty) <= 0) {
      alert("Select an ingredient and enter a valid quantity.");
      return;
    }
    addOrUpdateRecipeIngredient(productCode, selectedIngCode, Number(selectedIngQty));
    setSelectedIngCode("");
    setSelectedIngQty("");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Recipe: {product?.name || productCode}</h2>
          <p className="text-xs text-gray-500">Raw ingredient quantities needed to bake 1 unit.</p>
        </div>
        <button onClick={onBack} className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg">
          Back
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-3">
        <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Ingredient Breakdown</h3>

        {recipeEntries.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No ingredients added to this recipe yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recipeEntries.map(([ingCode, qty]) => {
              const ing = inventory.find((i) => i.code === ingCode);
              return (
                <div key={ingCode} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-gray-800">{ing?.name || ingCode}</p>
                    <span className="text-[10px] text-gray-400 font-mono">{ingCode}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-700">
                      {qty} {ing?.unit || "units"}
                    </span>
                    <button
                      onClick={() => removeRecipeIngredient(productCode, ingCode)}
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
            onClick={handleAdd}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded text-xs transition"
          >
            + Add to Recipe
          </button>
        </div>
      </div>
    </div>
  );
};