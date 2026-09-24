import { formatToUniversalDate } from "../lib/dateUtils";
import React, { useState, useMemo } from "react";
import { useBakery } from "../context/BakeryContext";

export const OrdersView: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { orders, markOrderCompleted, deleteOrder } = useBakery();

  // Removed "Self" - Added "Upcoming" for future delivery routing
  const [activeTab, setActiveTab] = useState<"Pending" | "Upcoming" | "Completed" | "All">("Pending");

  // ============================================================================
  // MULTI-PRODUCT GROUPING ENGINE
  // Groups individual database rows sharing the same ID into a single Order Card
  // ============================================================================
  const groupedOrders = useMemo(() => {
    const groups: Record<string, any> = {};

    orders.forEach((o) => {
      // Failsafe: Hide internal stock transfers from sales history
      if (o.customer.toLowerCase() === "self") return;

      if (!groups[o.id]) {
        groups[o.id] = { 
            ...o, 
            items: [], 
            groupedTotal: 0, 
            groupedAdvance: 0, 
            groupedPending: 0 
        };
      }

      // Bundle products together
      groups[o.id].items.push({ name: o.product_name, qty: o.quantity });

      // Re-sum the math across the grouped items
      groups[o.id].groupedTotal += (o.total || 0);
      groups[o.id].groupedAdvance += (o.advance_paid || 0);
      groups[o.id].groupedPending += (o.pending_payment || 0);
    });

    return Object.values(groups);
  }, [orders]);

  // ============================================================================
  // DATE-BASED ROUTING ENGINE
  // Routes to "Pending" (Today) or "Upcoming" (Future) based on delivery date
  // ============================================================================
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const getEffectiveDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.length === 10) return new Date(`${dateStr}T00:00:00`);
    return new Date(dateStr);
  };

  const filteredGroups = groupedOrders.filter((group) => {
    const d = getEffectiveDate(group.delivery_date);
    d.setHours(0, 0, 0, 0);

    const isToday = d.getTime() === todayMidnight.getTime();
    const isFuture = d.getTime() > todayMidnight.getTime();

    if (activeTab === "Pending") return group.status === "Pending" && isToday;
    if (activeTab === "Upcoming") return group.status === "Pending" && isFuture;
    if (activeTab === "Completed") return group.status === "Completed" || group.status === "Paid";
    if (activeTab === "All") return true;
    return false; 
  });

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">Orders & Dispatch</h2>
        <button
          onClick={() => onNavigate("neworder")}
          className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition"
        >
          + New Order
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-200 p-1 rounded-xl text-xs font-bold text-gray-600">
        {(["Pending", "Upcoming", "Completed", "All"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg transition whitespace-nowrap ${
              activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "hover:text-gray-900"
            }`}
          >
            {tab === "Pending" ? "Today's Queue" : tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="space-y-3 pb-8">
        {filteredGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center mt-4">
            <span className="text-2xl block mb-2">🎉</span>
            <p className="text-xs text-gray-500 font-bold">No orders found in "{activeTab}".</p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isPending = group.status === "Pending";

            return (
              <div
                key={group.id}
                className={`bg-white p-4 rounded-xl shadow-sm border transition space-y-3 ${
                  isPending ? "border-blue-200" : "border-gray-200"
                }`}
              >
                {/* Header (Customer Name & ID) */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600">{group.id}</span>
                      <span className="font-black text-sm text-gray-900 tracking-wide">{group.customer}</span>
                      {group.is_new_customer === 1 && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">{group.phone || "No phone provided"}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded-md">{group.time}</span>
                </div>

                {/* Body Details (Multi-Product Cart) */}
                <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-2 text-gray-700 border border-gray-100">

                  {/* Bundled Items List */}
                  <div className="space-y-1.5 mb-2">
                    {group.items.map((item: any, idx: number) => (
                       <div key={idx} className="flex justify-between items-center text-[11px] font-semibold text-gray-800">
                         <span><span className="text-blue-600 font-black">{item.qty}x</span> {item.name}</span>
                       </div>
                    ))}
                  </div>

                  <div className="flex justify-between text-[11px] text-gray-500 border-t border-gray-200 pt-2 mt-2">
                    <span>📍 {group.location}</span>
                    <span className="font-bold text-gray-700">📅 {formatToUniversalDate(group.delivery_date)}</span>
                  </div>

                  {/* Financial Math */}
                  <div className="flex justify-between items-center text-[11px] pt-2 mt-1 border-t border-gray-200">
                    <span className="text-gray-500">Advance: ৳{group.groupedAdvance.toFixed(2)}</span>
                    <div className="text-right">
                       <span className="block text-gray-400 text-[9px] uppercase tracking-wider">Grand Total: ৳{group.groupedTotal.toFixed(2)}</span>
                       <span className={`text-[13px] font-black ${group.groupedPending > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                         Due: ৳{group.groupedPending.toFixed(2)}
                       </span>
                    </div>
                  </div>
                </div>

                {/* Footer / Actions */}
                <div className="flex justify-between items-center pt-1 text-xs">
                  {isPending ? (
                    <button
                      onClick={() => markOrderCompleted(group.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition flex-1 mr-2"
                    >
                      ✓ Mark Delivered & Realize
                    </button>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 font-black px-3 py-1.5 rounded-lg text-[11px] flex-1 text-center mr-2">
                      ✓ Complete & Realized
                    </span>
                  )}

                  <button
                    onClick={() => {
                       if (window.confirm("Are you sure you want to delete this entire order?")) {
                           deleteOrder(group.id);
                       }
                    }}
                    className="text-red-400 hover:text-red-600 text-xs font-bold px-3 py-2 bg-red-50 hover:bg-red-100 rounded-xl transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};