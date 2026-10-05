import { formatToUniversalDate } from "../lib/dateUtils";
import React, { useState, useMemo, useEffect } from "react";
import { useBakery } from "../context/BakeryContext";

export const OrdersView: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { orders, markOrderCompleted, deleteOrder, shopSettings } = useBakery();
  const CURRENCY = shopSettings?.currency_symbol || "৳";
  const businessName = localStorage.getItem("bb_business_name") || shopSettings?.shop_name || "MY BAKERY";

  const [activeTab, setActiveTab] = useState<"Pending" | "Upcoming" | "Completed" | "All">("Pending");
  const [orderToPrint, setOrderToPrint] = useState<any>(null);

  // Tracks which completed cards the user has swept away from view
  const [hiddenCards, setHiddenCards] = useState<string[]>([]);

  // Trigger print dialog when an order is selected for printing
  useEffect(() => {
    if (orderToPrint) {
      window.print();
      // Clear after printing so it doesn't get stuck
      setTimeout(() => setOrderToPrint(null), 1000); 
    }
  }, [orderToPrint]);

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
      groups[o.id].items.push({ name: o.product_name, qty: o.quantity, price: o.unit_price });

      // Re-sum the math across the grouped items
      groups[o.id].groupedTotal += (o.total || 0);
      groups[o.id].groupedAdvance += (o.advance_paid || 0);
      groups[o.id].groupedPending += (o.pending_payment || 0);
    });

    return Object.values(groups);
  }, [orders]);

  // ============================================================================
  // BULLETPROOF STRING-BASED DATE ROUTING ENGINE
  // Compares exact YYYY-MM-DD values to prevent timezone and midnight bugs
  // ============================================================================
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const filteredGroups = groupedOrders.filter((group) => {
    // If the card is hidden by the user, do not render it
    if (hiddenCards.includes(group.id)) return false; 

    // Extract the YYYY-MM-DD portion safely from the database date string
    const itemDate = group.delivery_date ? String(group.delivery_date).substring(0, 10) : "";

    const isToday = itemDate === todayStr;
    const isFuture = itemDate > todayStr;

    if (activeTab === "Pending") return group.status === "Pending" && isToday;
    if (activeTab === "Upcoming") return group.status === "Pending" && isFuture;
    if (activeTab === "Completed") return group.status === "Completed" || group.status === "Paid";
    if (activeTab === "All") return true;
    return false; 
  });

  return (
    <div className="space-y-4 print:space-y-0">

      {/* --- HIDDEN PRINT TEMPLATE FOR DELIVERY DRIVERS --- */}
      {orderToPrint && (
        <div className="hidden print:block print:w-full font-sans text-black max-w-sm mx-auto">
           <h2 className="text-center font-black text-2xl uppercase tracking-widest text-black mb-4">{businessName}</h2>
           <div className="text-center mb-4 border-b-2 border-dashed border-black pb-4">
              <h3 className="font-bold text-sm tracking-widest uppercase">Delivery Invoice</h3>
              <p className="text-[10px] font-mono text-gray-800 mt-0.5">Order ID: {orderToPrint.id}</p>
           </div>

           <div className="text-xs space-y-1.5 mb-4">
              <div className="flex justify-between"><span className="font-medium">Customer:</span> <span className="font-bold">{orderToPrint.customer}</span></div>
              <div className="flex justify-between"><span className="font-medium">Phone:</span> <span className="font-bold">{orderToPrint.phone || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="font-medium">Address:</span> <span className="font-bold text-right max-w-[160px] truncate">{orderToPrint.location}</span></div>
              <div className="flex justify-between"><span className="font-medium">Date:</span> <span className="font-bold">{formatToUniversalDate(orderToPrint.delivery_date)}</span></div>
              <div className="flex justify-between"><span className="font-medium">Payment:</span> <span className="font-bold">{orderToPrint.payment_method}</span></div>
           </div>

           <div className="border-t-2 border-dashed border-black my-3"></div>

           <div className="mb-4">
              <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                 <span>Item & Qty</span>
              </div>
              <div className="space-y-2 text-xs font-bold">
                 {orderToPrint.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start">
                       <p>{item.name} × {item.qty}</p>
                    </div>
                 ))}
              </div>
           </div>

           <div className="border-t-2 border-black my-3"></div>

           <div className="flex justify-between items-center text-sm font-black mb-3">
              <span>GRAND TOTAL:</span>
              <span>{CURRENCY} {orderToPrint.groupedTotal.toFixed(2)}</span>
           </div>

           <div className="text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                 <span>Advance Paid:</span>
                 <span>{CURRENCY} {orderToPrint.groupedAdvance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black border-2 border-black p-2 mt-2">
                 <span>DUE ON DELIVERY:</span>
                 <span>{CURRENCY} {orderToPrint.groupedPending.toFixed(2)}</span>
              </div>
           </div>

           <div className="text-center text-[10px] font-bold mt-8">
              Powered by tongka
           </div>
        </div>
      )}

      <div className="print:hidden">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Orders & Dispatch</h2>
          <button
            onClick={() => onNavigate("neworder")}
            className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition"
          >
            + New Order
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-200 p-1 rounded-xl text-xs font-bold text-gray-600 mb-4">
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
                    isPending ? "border-blue-300" : "border-gray-200"
                  }`}
                >
                  {/* Header (Customer Name, ID, & Print Button) */}
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
                    <div className="flex gap-2">
                      <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded-md flex items-center">{group.time}</span>
                    </div>
                  </div>

                  {/* Body Details (Multi-Product Cart) */}
                  <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-2 text-gray-700 border border-gray-100 relative">

                    {/* Payment Method Badge */}
                    <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider text-gray-500 bg-gray-200 px-2 py-1 rounded">
                       {group.payment_method || "Cash"}
                    </span>

                    {/* Bundled Items List */}
                    <div className="space-y-1.5 mb-2 pr-12">
                      {group.items.map((item: any, idx: number) => (
                         <div key={idx} className="flex justify-between items-center text-[11px] font-semibold text-gray-800">
                           <span><span className="text-blue-600 font-black">{item.qty}x</span> {item.name}</span>
                         </div>
                      ))}
                    </div>

                    <div className="flex justify-between text-[11px] text-gray-500 border-t border-gray-200 pt-2 mt-2">
                      <span className="max-w-[150px] truncate">📍 {group.location}</span>
                      <span className="font-bold text-gray-700">📅 {formatToUniversalDate(group.delivery_date)}</span>
                    </div>

                    {/* Financial Math */}
                    <div className="flex justify-between items-center text-[11px] pt-2 mt-1 border-t border-gray-200">
                      <span className="text-gray-500">Advance: {CURRENCY} {group.groupedAdvance.toFixed(2)}</span>
                      <div className="text-right">
                         <span className="block text-gray-400 text-[9px] uppercase tracking-wider">Grand Total: {CURRENCY} {group.groupedTotal.toFixed(2)}</span>
                         <span className={`text-[13px] font-black ${group.groupedPending > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                           Due: {CURRENCY} {group.groupedPending.toFixed(2)}
                         </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer / Actions */}
                  <div className="flex justify-between items-center pt-1 text-xs">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => markOrderCompleted(group.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition flex-1 mr-2"
                        >
                          ✓ Mark Delivered & Realize
                        </button>
                        <button
                          onClick={() => {
                             if (window.confirm("⚠️ VOID ORDER & RESTOCK?\n\nThis will permanently delete this order, remove any revenue, and return all items back to your POS shelf automatically.")) {
                                 deleteOrder(group.id);
                             }
                          }}
                          className="text-red-500 hover:text-red-700 text-[11px] font-bold px-3 py-2 bg-red-50 hover:bg-red-100 rounded-xl transition border border-red-100"
                        >
                          Void / Undo
                        </button>
                      </>
                    ) : (
                      <div className="relative flex-1 flex items-center">
                        {/* Added pr-8 so the text doesn't hide behind the cross icon */}
                        <span className="bg-emerald-100 text-emerald-800 font-black px-3 py-1.5 rounded-lg text-[11px] flex-1 text-center pr-8">
                          ✓ Complete & Realized
                        </span>

                        {/* The overlapping Cross Button - Safely dismisses without deleting data */}
                        <button
                          onClick={() => setHiddenCards((prev) => [...prev, group.id])}
                          title="Dismiss from view"
                          className="absolute right-1 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-400 rounded-md transition font-black text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};