import React, { useState } from "react";
import { useBakery } from "../context/BakeryContext";

export function PurchasesView({ onBack }: { onBack: () => void }) {
  const { purchases } = useBakery();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // Drill-down Detail View
  if (selectedCode) {
    const itemHistory = purchases.filter((p) => p.code === selectedCode);
    const itemName = itemHistory[0]?.name || "Unknown Ingredient";

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <button onClick={() => setSelectedCode(null)} className="text-gray-400 hover:text-rose-600 font-medium">
            ← Back to List
          </button>
          <h2 className="text-xl font-bold text-gray-800">Timeline: {itemName}</h2>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-20">
          <div className="divide-y divide-gray-100">
            {itemHistory.map((purchase) => (
              <div key={purchase.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{new Date(purchase.date).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">{new Date(purchase.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-600">৳ {purchase.total_cost}</p>
                    <p className="text-xs text-gray-600">{purchase.quantity} {purchase.unit} @ ৳ {purchase.unit_price}/{purchase.unit}</p>
                  </div>
                </div>
                {(purchase.source || purchase.notes) && (
                  <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {purchase.source && <span className="block">📍 {purchase.source}</span>}
                    {purchase.notes && <span className="block">📝 {purchase.notes}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Group latest purchases for the Master View
  const groupedPurchases = purchases.reduce((acc, curr) => {
    if (!acc[curr.code] || new Date(curr.date) > new Date(acc[curr.code].date)) {
      acc[curr.code] = curr;
    }
    return acc;
  }, {} as Record<string, typeof purchases[0]>);

  const latestPurchases = Object.values(groupedPurchases).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Main Master View
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <button onClick={onBack} className="text-gray-400 hover:text-rose-600 font-medium">
          ← Back
        </button>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span>🧾</span> Purchase History
        </h2>
      </div>

      {latestPurchases.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
          No purchases logged yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-20 divide-y divide-gray-100">
          {latestPurchases.map((purchase) => (
            <div 
              key={purchase.code} 
              onClick={() => setSelectedCode(purchase.code)}
              className="p-4 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition"
            >
              <div>
                <h3 className="font-bold text-gray-800">{purchase.name}</h3>
                <p className="text-xs text-gray-400">Last restocked: {new Date(purchase.date).toLocaleDateString()}</p>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <p className="font-bold text-rose-600">৳ {purchase.unit_price}/{purchase.unit}</p>
                  <p className="text-xs text-gray-500">View Timeline</p>
                </div>
                <span className="text-gray-300">❯</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}