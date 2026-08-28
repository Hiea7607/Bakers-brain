import React, { useState } from "react";
import { useBakery } from "../context/BakeryContext";

export const OrdersView: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { orders, markOrderPaid, deleteOrder } = useBakery();
  const [activeTab, setActiveTab] = useState<"Pending" | "Today" | "Completed" | "All">("Pending");

  const todayStr = new Date().toDateString();

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "Pending") return o.status === "Pending";
    if (activeTab === "Completed") return o.status === "Paid";
    if (activeTab === "Today") return new Date(o.date).toDateString() === todayStr;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">3. Orders Manager</h2>
        <button
          onClick={() => onNavigate("neworder")}
          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
        >
          + New Order
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-200 p-1 rounded-xl text-xs font-bold text-gray-600">
        {(["Pending", "Today", "Completed", "All"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === tab ? "bg-white text-rose-600 shadow-xs" : "hover:text-gray-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No orders found in "{activeTab}".</p>
        ) : (
          filteredOrders.map((order) => {
            const isPending = order.status === "Pending";

            return (
              <div
                key={order.id}
                className={`bg-white p-4 rounded-xl shadow-xs border transition space-y-2.5 ${
                  isPending ? "border-amber-200" : "border-gray-100"
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-rose-600">{order.id}</span>
                      <span className="font-bold text-sm text-gray-900">{order.customer}</span>
                      {order.isNewCustomer && (
                        <span className="text-[9px] bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{order.phone || "No phone"}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">{order.time}</span>
                </div>

                {/* Body Details */}
                <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1 text-gray-700">
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>🍰 {order.productName} × {order.quantity}</span>
                    <span>৳ {order.total}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>📍 {order.location}</span>
                    <span>📅 {order.deliveryDate}</span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-1 border-t border-gray-200">
                    <span className="text-gray-500">Advance: ৳{order.advancePaid}</span>
                    <span className={order.pendingPayment > 0 ? "font-bold text-amber-600" : "text-green-600"}>
                      Due: ৳{order.pendingPayment}
                    </span>
                  </div>
                </div>

                {/* Footer / Actions */}
                <div className="flex justify-between items-center pt-1 text-xs">
                  {isPending ? (
                    <button
                      onClick={() => markOrderPaid(order.id)}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition"
                    >
                      ✓ Mark as Paid & Complete
                    </button>
                  ) : (
                    <span className="bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full text-[11px]">
                      ✓ Paid & Realized
                    </span>
                  )}

                  <button
                    onClick={() => {
                      if (window.confirm(`Delete order ${order.id}?`)) deleteOrder(order.id);
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
    </div>
  );
};