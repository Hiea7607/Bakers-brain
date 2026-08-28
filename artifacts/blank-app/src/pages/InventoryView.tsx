import React, { useState } from "react";
import { useBakery, InventoryItem, Purchase } from "../context/BakeryContext";

export const InventoryView: React.FC = () => {
  const { inventory, purchases, savePurchase, deleteInventoryItem } = useBakery();

  // Modal / Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<InventoryItem | null>(null);

  // Form Fields for new purchase / ingredient
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [minimum, setMinimum] = useState("2");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  const handleOpenAdd = (existingItem?: InventoryItem) => {
    if (existingItem) {
      setCode(existingItem.code);
      setName(existingItem.name);
      setUnit(existingItem.unit);
      setMinimum(String(existingItem.minimum));
    } else {
      setCode(`ING0${inventory.length + 1}`);
      setName("");
      setUnit("kg");
      setMinimum("2");
    }
    setQuantity("");
    setUnitPrice("");
    setSource("");
    setNotes("");
    setShowAddModal(true);
  };

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !quantity || !unitPrice) {
      alert("Please fill in Code, Name, Quantity, and Unit Price.");
      return;
    }

    savePurchase(
      {
        code: code.toUpperCase().trim(),
        name: name.trim(),
        unit,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        source: source.trim() || "Wholesale Market",
        notes: notes.trim(),
      },
      parseFloat(minimum) || 1
    );

    setShowAddModal(false);
  };

  // Filter purchases for selected single ingredient
  const ingredientPurchases: Purchase[] = selectedIngredient
    ? purchases.filter((p) => p.code === selectedIngredient.code)
    : [];

  const totalSpentOnItem = ingredientPurchases.reduce((sum, p) => sum + p.totalCost, 0);
  const totalPurchasedQty = ingredientPurchases.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">5. Ingredients (Stock)</h2>
          <p className="text-[11px] text-gray-500">Tap any ingredient to view its purchase history & average rate</p>
        </div>
        <button
          onClick={() => handleOpenAdd()}
          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
        >
          + Add Purchase
        </button>
      </div>

      {/* Inventory List */}
      <div className="space-y-2.5">
        {inventory.length === 0 ? (
          <div className="bg-white p-8 rounded-xl text-center text-gray-400 text-xs border border-gray-100">
            No ingredients in stock. Tap <strong>+ Add Purchase</strong> or preload sample data.
          </div>
        ) : (
          inventory.map((item) => {
            const isLowStock = item.stock <= item.minimum;

            return (
              <div
                key={item.code}
                onClick={() => setSelectedIngredient(item)}
                className={`bg-white p-3.5 rounded-xl shadow-xs border cursor-pointer hover:border-rose-300 transition flex items-center justify-between ${
                  isLowStock ? "border-rose-200 bg-rose-50/20" : "border-gray-100"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {item.code}
                    </span>
                    <h3 className="font-bold text-sm text-gray-900">{item.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    Weighted Avg Cost: <strong className="text-gray-900">৳ {item.unitCost} / {item.unit}</strong>
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-sm font-black text-gray-900">
                    {item.stock} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                      isLowStock ? "bg-rose-100 text-rose-700" : "bg-green-100 text-green-700"
                    }`}
                  >
                    {isLowStock ? "LOW STOCK" : "IN STOCK"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Single-Ingredient Purchase History Drill-Down Modal */}
      {selectedIngredient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 shadow-2xl space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start border-b pb-2">
              <div>
                <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  {selectedIngredient.code}
                </span>
                <h3 className="font-bold text-base text-gray-900 mt-1">{selectedIngredient.name} Purchase History</h3>
              </div>
              <button
                onClick={() => setSelectedIngredient(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-xl text-center text-xs">
              <div>
                <span className="text-[10px] text-gray-400 block">Current Stock</span>
                <span className="font-bold text-gray-800">{selectedIngredient.stock} {selectedIngredient.unit}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Weighted Avg Rate</span>
                <span className="font-bold text-rose-600">৳ {selectedIngredient.unitCost}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Total Spent</span>
                <span className="font-bold text-gray-800">৳ {totalSpentOnItem}</span>
              </div>
            </div>

            {/* Individual Purchase Rows */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Purchase Batches</p>
              {ingredientPurchases.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No logged purchase records for this item.</p>
              ) : (
                ingredientPurchases.map((pur) => (
                  <div key={pur.id} className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold text-gray-800">
                      <span>+{pur.quantity} {pur.unit} @ ৳{pur.unitPrice}/{pur.unit}</span>
                      <span className="text-gray-900">৳ {pur.totalCost}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>Source: {pur.source || "Market"}</span>
                      <span>{new Date(pur.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 border-t flex gap-2">
              <button
                onClick={() => {
                  const target = selectedIngredient;
                  setSelectedIngredient(null);
                  handleOpenAdd(target);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg text-xs"
              >
                + Restock / Buy Batch
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Delete ${selectedIngredient.name}?`)) {
                    deleteInventoryItem(selectedIngredient.code);
                    setSelectedIngredient(null);
                  }
                }}
                className="bg-red-50 text-red-600 font-bold px-3 py-2 rounded-lg text-xs hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Purchase Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePurchase}
            className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-3"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-gray-800">Record Purchase / Stock</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-500">Ingredient Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Butter"
                  className="w-full border rounded-lg p-2 mt-0.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g., 3"
                    className="w-full border rounded-lg p-2 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Unit (kg/litre/pcs)</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="kg"
                    className="w-full border rounded-lg p-2 mt-0.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500">Batch Rate / Unit Price (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="e.g., 150"
                  className="w-full border rounded-lg p-2 mt-0.5"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500">Supplier / Source</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., New Market Wholesale"
                  className="w-full border rounded-lg p-2 mt-0.5"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-md transition"
            >
              SAVE PURCHASE BATCH
            </button>
          </form>
        </div>
      )}
    </div>
  );
};