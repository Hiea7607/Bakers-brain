import React, { useState, useEffect } from "react";
import { useBakery } from "../context/BakeryContext";
import { supabase } from "../lib/supabaseClient";

export const RecipeBuilderView: React.FC<{ productCode: string; onBack: () => void }> = ({
  productCode,
  onBack,
}) => {
  const { products, ingredients } = useBakery();

  // Find the exact product so we can use its unbreakable UUID
  const product = products.find((p) => p.code === productCode);

  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [selectedIngId, setSelectedIngId] = useState("");
  const [selectedIngQty, setSelectedIngQty] = useState("");

  // 1. Fetch recipes using UUID to permanently prevent ghost data
  const fetchRecipe = async () => {
    if (!product?.id) return;
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .eq("product_id", product.id); // No more ghost data!

    if (data) setRecipeItems(data);
  };

  useEffect(() => {
    fetchRecipe();
  }, [product?.id]);

  // 2. Save using BOTH UUIDs and Text Codes (The Bridge Strategy)
  const handleAdd = async () => {
    if (!selectedIngId || !selectedIngQty || Number(selectedIngQty) <= 0) {
      alert("Select an ingredient and enter a valid quantity.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const ing = ingredients.find(i => i.id === selectedIngId);

    if (!product?.id || !ing?.id || !user) {
      alert("Error: Missing UUIDs. Make sure your database is generating IDs.");
      return;
    }

    // Prevent duplicates by deleting any existing row for this exact combo first
    await supabase
      .from("recipes")
      .delete()
      .eq("product_id", product.id)
      .eq("ingredient_id", ing.id);

    // Insert the new recipe row linking BOTH systems
    const { error } = await supabase.from("recipes").insert([{
      product_id: product.id,
      product_code: product.code, // Saves code so the Order Builder doesn't crash
      ingredient_id: ing.id,
      ingredient_code: ing.code,  // Saves code so the Order Builder doesn't crash
      quantity: Number(selectedIngQty),
      user_id: user.id
    }]);

    if (error) {
      alert("Failed to save recipe: " + error.message);
      return;
    }

    setSelectedIngId("");
    setSelectedIngQty("");
    fetchRecipe(); // Instantly refresh the list
  };

  // 3. Remove using the database's unique recipe row ID
  const handleRemove = async (recipeId: string) => {
    await supabase.from("recipes").delete().eq("id", recipeId);
    fetchRecipe();
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

        {recipeItems.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No ingredients added to this recipe yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recipeItems.map((item) => {
              // Now we find the ingredient using the UUID!
              const ing = ingredients.find((i) => i.id === item.ingredient_id);
              return (
                <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-gray-800">{ing?.name || item.ingredient_code}</p>
                    <span className="text-[10px] text-gray-400 font-mono">{item.ingredient_code}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-700">
                      {item.quantity} {ing?.unit || "units"}
                    </span>
                    <button
                      onClick={() => handleRemove(item.id)}
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
              value={selectedIngId}
              onChange={(e) => setSelectedIngId(e.target.value)}
              className="border p-2 rounded text-xs flex-1 bg-gray-50"
            >
              <option value="">Select Raw Material</option>
              {ingredients
                // Hides ingredients that are already in the recipe using UUIDs!
                .filter((i) => !recipeItems.some(r => r.ingredient_id === i.id))
                .map((i) => (
                  <option key={i.id} value={i.id}>
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