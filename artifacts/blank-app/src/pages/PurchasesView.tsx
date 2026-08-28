import React from "react";
import { useBakery } from "../context/BakeryContext";

export const PurchasesView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { purchases } = useBakery();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">Purchase History ({purchases.length})</h2>
        <button onClick={onBack} className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg">
          Back to Inventory
        </button>
      </div>

      <div className="space-y-3">
        {purchases.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No purchases logged yet.</p>
        ) : (
          purchases.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-teal-600">{p.id}</span>
                <span className="text-[10px] text-gray-400">{new Date(p.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{p.name} ({p.code})</h4>
                  <p className="text-xs text-gray-500">Source: {p.source}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-gray-900">৳ {p.totalCost}</p>
                  <p className="text-xs text-gray-400">{p.quantity} {p.unit} × ৳{p.unitPrice}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};