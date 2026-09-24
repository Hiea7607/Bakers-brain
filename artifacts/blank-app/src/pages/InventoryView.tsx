import { formatToUniversalDate } from "../lib/dateUtils";
import React, { useState } from "react";
import { useBakery, InventoryItem, Purchase } from "../context/BakeryContext";
import { supabase } from "../lib/supabaseClient";

export const InventoryView: React.FC = () => {
  const { inventory, purchases, savePurchase, deleteInventoryItem, deductInventoryItem, fetchData } = useBakery();

  // Search & Modal State
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<InventoryItem | null>(null);

  // Manual deduction state
  const [showDeductModal, setShowDeductModal] = useState<InventoryItem | null>(null);
  const [deductQty, setDeductQty] = useState("");
  const [deductReason, setDeductReason] = useState("Spillage / Waste");

  // Purchase/Edit Form Fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [minimum, setMinimum] = useState("2");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  // Mode 1: Edit Master Ingredient Details (Name, Unit, Min Alert)
  const handleOpenEditMaster = (item: InventoryItem) => {
    setIsEditing(true);
    setCode(item.code);
    setName(item.name);
    setUnit(item.unit);
    setMinimum(String(item.minimum));
    setQuantity("");
    setUnitPrice("");
    setSource("");
    setNotes("");
    setShowAddModal(true);
  };

  // Mode 2: Add New Purchase / Restock Batch
  const handleOpenAddPurchase = (existingItem?: InventoryItem) => {
    setIsEditing(false);
    if (existingItem) {
      setCode(existingItem.code);
      setName(existingItem.name);
      setUnit(existingItem.unit);
      setMinimum(String(existingItem.minimum));

      const itemPurchases = purchases.filter((p) => p.code === existingItem.code);
      const lastPurchase = itemPurchases[itemPurchases.length - 1]; 

      if (lastPurchase) {
        setUnitPrice(String(lastPurchase.unit_price || existingItem.unit_cost || ""));
        setSource(lastPurchase.source || "");
        setNotes(lastPurchase.notes || "");
      } else {
        setUnitPrice(String(existingItem.unit_cost || ""));
        setSource("");
        setNotes("");
      }
      setQuantity(""); 
    } else {
      const nextNum = inventory.length + 1;
      const autoCode = `ING${String(nextNum).padStart(2, "0")}`;
      setCode(autoCode);
      setName("");
      setUnit("kg");
      setMinimum("2");
      setQuantity("");
      setUnitPrice("");
      setSource("");
      setNotes("");
    }
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const formattedCode = code.toUpperCase().trim();
    const formattedName = name.trim();

    // If editing master info
    if (isEditing) {
      if (!formattedName) {
        alert("Ingredient name cannot be empty.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("ingredients")
        .update({ name: formattedName, unit, minimum: parseFloat(minimum) || 1 })
        .eq("code", formattedCode)
        .eq("user_id", user.id);

      if (error) {
        alert(`Failed to update ingredient: ${error.message}`);
        return;
      }

      await fetchData();
      setShowAddModal(false);
      return;
    }

    // Otherwise, save purchase batch
    if (!formattedCode || !formattedName || quantity === "" || !unitPrice) {
      alert("Please fill in Code, Name, Quantity, and Unit Price.");
      return;
    }

    savePurchase(
      {
        code: formattedCode,
        name: formattedName,
        unit,
        quantity: parseFloat(quantity),
        unit_price: parseFloat(unitPrice),
        source: source.trim() || "Wholesale Market",
        notes: notes.trim(),
      },
      parseFloat(minimum) || 1
    );

    setShowAddModal(false);
  };

  const handleConfirmDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDeductModal || !deductQty) return;

    await deductInventoryItem(showDeductModal.code, parseFloat(deductQty), deductReason);
    setShowDeductModal(null);
    setDeductQty("");
  };

  // Filter inventory based on search query
  const filteredInventory = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ingredientPurchases: Purchase[] = selectedIngredient
    ? purchases.filter((p) => p.code === selectedIngredient.code)
    : [];

  const totalSpentOnItem = ingredientPurchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);

  return (
    <div className="fixed top-[60px] bottom-[70px] left-0 right-0 flex flex-col w-full max-w-md mx-auto bg-gray-50 z-10">

      {/* --- PINNED HEADER CONTAINER --- */}
      <div className="flex-none bg-gray-50 px-4 pt-4 pb-2 z-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Ingredients (Stock)</h2>
            <p className="text-xs text-gray-500">Tap item for history or manage deductions</p>
          </div>
          <button
            onClick={() => handleOpenAddPurchase()}
            className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition whitespace-nowrap"
          >
            + Add Purchase
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mt-4">
          <input
            type="text"
            placeholder="🔍 Search ingredients by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-sm transition"
          />
        </div>
      </div>

      {/* --- SCROLLABLE CARDS CONTAINER --- */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {filteredInventory.length === 0 ? (
          <div className="bg-white p-8 rounded-[20px] text-center text-gray-400 text-xs border border-gray-100 shadow-sm">
            {inventory.length === 0 ? (
              <>No ingredients in stock. Tap <strong>+ Add Purchase</strong>.</>
            ) : (
              <>No matching ingredients found for "{searchQuery}".</>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredInventory.map((item) => {
              const isLowStock = item.stock <= item.minimum;

              return (
                <div key={item.code} className={`bg-white rounded-2xl p-5 border shadow-sm space-y-4 transition-all w-full ${isLowStock ? 'border-rose-300 bg-rose-50/20' : 'border-gray-100'}`}>

                  {/* Header: Code, Name & Status */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${isLowStock ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                        {item.code}
                      </span>
                      <h3 className="font-bold text-gray-800 text-lg mt-1 cursor-pointer" onClick={() => setSelectedIngredient(item)}>{item.name}</h3>
                    </div>
                    <span className={`text-xs font-black px-3 py-1.5 rounded-full ${isLowStock ? 'bg-red-500 text-white shadow-sm' : 'bg-green-50 text-green-700'}`}>
                      {isLowStock ? '⚠️ LOW STOCK' : 'IN STOCK'}
                    </span>
                  </div>

                  {/* Stats Table with .toFixed(3) Precision */}
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl text-center cursor-pointer" onClick={() => setSelectedIngredient(item)}>
                    <div>
                      <div className="text-xs text-gray-400">Stock</div>
                      <div className={`text-sm font-bold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                        {Number(item.stock || 0).toFixed(3)} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Avg Rate</div>
                      <div className="text-sm font-bold text-gray-900">৳ {item.unit_cost}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Min Alert</div>
                      <div className="text-sm font-bold text-gray-900">
                        {Number(item.minimum || 0).toFixed(3)} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setSelectedIngredient(item)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition"
                    >
                      📊 History
                    </button>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleOpenEditMaster(item)}
                        className="text-xs text-gray-500 hover:text-gray-900 font-bold transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setShowDeductModal(item)}
                        className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 font-bold transition"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                        Deduct
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Waste / Damage Deduction Modal */}
      {showDeductModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmDeduction} className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-gray-800">Manual Deduction: {showDeductModal.name}</h3>
              <button type="button" onClick={() => setShowDeductModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="bg-gray-50 p-2 rounded-lg text-xs text-gray-600 flex justify-between">
              <span>Current Stock:</span>
              <strong>{Number(showDeductModal.stock || 0).toFixed(3)} {showDeductModal.unit}</strong>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-500">Deduct Quantity ({showDeductModal.unit})</label>
                <input
                  type="number"
                  step="0.001"
                  max={showDeductModal.stock}
                  required
                  value={deductQty}
                  onChange={(e) => setDeductQty(e.target.value)}
                  placeholder="e.g. 0.500"
                  className="w-full border rounded-lg p-2 mt-0.5"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500">Reason</label>
                <select
                  value={deductReason}
                  onChange={(e) => setDeductReason(e.target.value)}
                  className="w-full border rounded-lg p-2 mt-0.5 bg-white text-gray-800"
                >
                  <option value="Damage / Expired">Damage / Expired</option>
                  <option value="Spillage / Waste">Spillage / Waste</option>
                  <option value="Testing Batch">Testing Batch</option>
                  <option value="Inventory Adjustment">Inventory Adjustment</option>
                </select>
              </div>
            </div>

            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-sm">
              CONFIRM DEDUCTION
            </button>
          </form>
        </div>
      )}

      {/* Single-Ingredient Purchase History Drill-Down Modal */}
      {selectedIngredient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 shadow-2xl space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start border-b pb-2">
              <div>
                <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{selectedIngredient.code}</span>
                <h3 className="font-bold text-base text-gray-900 mt-1">{selectedIngredient.name} Purchase History</h3>
              </div>
              <button onClick={() => setSelectedIngredient(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-xl text-center text-xs">
              <div>
                <span className="text-[10px] text-gray-400 block">Stock</span>
                <span className="font-bold text-gray-800">{Number(selectedIngredient.stock || 0).toFixed(3)} {selectedIngredient.unit}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Avg Rate</span>
                <span className="font-bold text-rose-600">৳ {selectedIngredient.unit_cost}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Total Spent</span>
                <span className="font-bold text-gray-800">৳ {totalSpentOnItem}</span>
              </div>
            </div>

            {/* Batches */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Purchase Batches</p>
              {ingredientPurchases.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No logged purchase records for this item.</p>
              ) : (
                ingredientPurchases.map((pur) => (
                  <div key={pur.id} className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs flex flex-col gap-1.5">
                    <div className="flex justify-between items-center font-bold text-gray-800">
                      <span>+{Number(pur.quantity || 0).toFixed(3)} {pur.unit} @ ৳{pur.unit_price}/{pur.unit}</span>
                      <span className="text-gray-900">৳ {pur.total_cost}</span>
                    </div>
                    <div className="flex flex-wrap justify-between items-center text-[10px] text-gray-500">
                      <span>Source: {pur.source || "Market"}</span>
                      <span>{formatToUniversalDate(pur.date)}</span>
                    </div>
                    {pur.notes && (
                      <div className="text-[10px] text-gray-500 italic bg-white p-1.5 border border-gray-100 rounded">
                        <span className="font-medium text-gray-400">Note: </span> {pur.notes}
                      </div>
                    )}
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
                  handleOpenAddPurchase(target);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg text-xs"
              >
                + Restock Batch
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

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-gray-800">
                {isEditing ? "Edit Ingredient Details" : "Record Purchase / Stock"}
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500">Ingredient Code (ID)</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. ING01"
                className="w-full border rounded-lg p-2 mt-0.5 font-mono uppercase bg-gray-50"
                disabled={isEditing}
              />
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-500">Ingredient Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Butter"
                  className="w-full border rounded-lg p-2 mt-0.5"
                />
              </div>

              {!isEditing && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500">Quantity</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 3.000"
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
              )}

              {isEditing && (
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
              )}

              {!isEditing && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Batch Rate / Unit Price (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full border rounded-lg p-2 mt-0.5"
                  />
                </div>
              )}

              {!isEditing && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Supplier / Source</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. New Market Wholesale"
                    className="w-full border rounded-lg p-2 mt-0.5"
                  />
                </div>
              )}

              {!isEditing && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Notes (Optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Brand name, expiry date"
                    className="w-full border rounded-lg p-2 mt-0.5"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-gray-500">Low Stock Alert At</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={minimum}
                  onChange={(e) => setMinimum(e.target.value)}
                  placeholder="e.g. 5.000"
                  className="w-full border rounded-lg p-2 mt-0.5 bg-rose-50"
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-md transition">
              {isEditing ? "UPDATE INGREDIENT DETAILS" : "SAVE PURCHASE BATCH"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};