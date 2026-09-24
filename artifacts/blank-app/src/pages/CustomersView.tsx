import React, { useState } from "react";
import { useBakery, CustomerSummary } from "../context/BakeryContext";
import { formatToUniversalDate } from "../lib/dateUtils";

export const CustomersView: React.FC = () => {
  const { customers, orders } = useBakery();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);

  // Filter customers by name or phone
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery))
  );

  // Get specific order history when a customer is tapped
  const customerOrders = selectedCustomer
    ? orders.filter((o) => o.phone === selectedCustomer.phone || o.customer === selectedCustomer.name)
    : [];

  return (
    <div className="fixed top-[60px] bottom-[70px] left-0 right-0 flex flex-col w-full max-w-md mx-auto bg-gray-50 z-10">

      {/* --- PINNED HEADER --- */}
      <div className="flex-none bg-gray-50 px-4 pt-4 pb-2 z-20">
        <h2 className="text-xl font-bold text-gray-900">Customer Directory</h2>
        <p className="text-xs text-gray-500">Tap a customer to view their full order history</p>

        <div className="relative mt-4">
          <input
            type="text"
            placeholder="🔍 Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-rose-500 shadow-sm"
          />
        </div>
      </div>

      {/* --- SCROLLABLE CUSTOMER DIRECTORY --- */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white p-8 rounded-[20px] text-center text-gray-400 text-xs border border-gray-100 shadow-sm">
            No customers found. 
          </div>
        ) : (
          filteredCustomers.map((customer, index) => {
            const isVIP = customer.tier === "Best";

            return (
              <div 
                key={index} 
                onClick={() => setSelectedCustomer(customer)}
                className={`bg-white p-4 rounded-xl shadow-sm border transition active:scale-95 cursor-pointer flex justify-between items-center ${isVIP ? 'border-rose-200' : 'border-gray-100'}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800 text-sm">{customer.name}</h3>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      isVIP ? 'bg-rose-100 text-rose-600' : 
                      customer.tier === 'Medium' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {customer.tier}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{customer.phone || "No phone number"}</p>
                </div>

                <div className="text-right">
                  <p className="font-black text-gray-900 text-sm">৳ {customer.totalSpent}</p>
                  <p className="text-[10px] font-bold text-gray-400">{customer.totalOrders} Orders</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- CUSTOMER PROFILE & ORDER HISTORY MODAL --- */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
          <div className="bg-gray-50 sm:rounded-2xl rounded-t-3xl w-full max-w-md h-[85vh] sm:h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">

            {/* Modal Header (Profile Summary) */}
            <div className="bg-white px-5 pt-6 pb-4 rounded-t-3xl sm:rounded-t-2xl shadow-sm z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{selectedCustomer.name}</h2>
                  <p className="text-sm font-medium text-gray-500 mt-1">📞 {selectedCustomer.phone || "No phone provided"}</p>
                  {selectedCustomer.address && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">📍 {selectedCustomer.address}</p>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="bg-gray-100 text-gray-600 hover:bg-gray-200 h-8 w-8 rounded-full flex items-center justify-center font-bold transition"
                >
                  ✕
                </button>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center mt-4">
                <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Lifetime Value</span>
                  <p className="font-black text-gray-900 text-sm mt-0.5">৳ {selectedCustomer.totalSpent}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Avg Order</span>
                  <p className="font-black text-gray-900 text-sm mt-0.5">৳ {selectedCustomer.avgOrderValue}</p>
                </div>
                <div className="bg-rose-50 p-2 rounded-xl border border-rose-100">
                  <span className="text-[10px] font-bold text-rose-400 uppercase">Favorite</span>
                  <p className="font-black text-rose-700 text-xs mt-0.5 truncate px-1">{selectedCustomer.favoriteProduct}</p>
                </div>
              </div>
            </div>

            {/* Scrollable Order History Timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2">Order History ({customerOrders.length})</h3>

              {customerOrders.length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-10">No order history found.</p>
              ) : (
                customerOrders.map((order) => {
                  const isCompleted = order.status === "Completed" || order.status === "Paid";

                  return (
                    <div key={order.id} className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <span className="text-xs font-mono font-bold text-gray-500">{order.id}</span>
                        <span className="text-[10px] font-medium text-gray-400">{formatToUniversalDate(order.date)}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-bold text-gray-800">🍽️ {order.product_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Qty: {order.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-gray-900">৳ {order.total}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${isCompleted ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                            {isCompleted ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};