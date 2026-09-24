import React, { useState, useMemo } from "react";
import { useBakery, Order } from "../context/BakeryContext";

export const InvoicesView: React.FC = () => {
  const { orders, shopSettings, markOrderCompleted, deleteOrder } = useBakery();
  const CURRENCY = shopSettings?.currency_symbol || "৳";
  const businessName = localStorage.getItem("bb_business_name") || shopSettings?.shop_name || "MY BAKERY";
  const businessEmail = localStorage.getItem("bb_user_email") || "";

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const pendingOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};

    orders
      .filter((o) => o.status === "Pending")
      .forEach((o) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          o.customer.toLowerCase().includes(searchLower) ||
          (o.phone && o.phone.toLowerCase().includes(searchLower)) ||
          o.id.toLowerCase().includes(searchLower);

        if (searchQuery && !matchesSearch) return;

        if (!groups[o.id]) groups[o.id] = [];
        groups[o.id].push(o);
      });

    return groups;
  }, [orders, searchQuery]);

  const selectedOrderLines = selectedOrderId ? pendingOrders[selectedOrderId] : null;
  const firstLine = selectedOrderLines ? selectedOrderLines[0] : null;

  // Reconstruct exact receipt math from DB
  const invoiceGrandTotal = selectedOrderLines?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
  const invoiceAdvance = selectedOrderLines?.reduce((sum, item) => sum + (item.advance_paid || 0), 0) || 0;
  const invoiceDue = selectedOrderLines?.reduce((sum, item) => sum + (item.pending_payment || 0), 0) || 0;

  const calculatedSubtotal = selectedOrderLines?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0;
  const calculatedVat = (calculatedSubtotal * (shopSettings?.default_tax_rate || 0)) / 100;
  const calculatedDelivery = Math.max(0, invoiceGrandTotal - calculatedSubtotal - calculatedVat); // Reverse engineered from Total

  const handleDispatch = async () => {
    if (!selectedOrderId) return;
    if (window.confirm("Mark this order as Completed/Delivered? This will clear it from the queue and log the final revenue.")) {
      await markOrderCompleted(selectedOrderId);
      setSelectedOrderId(null);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!selectedOrderId) return;
    if (window.confirm("🚨 Are you sure you want to permanently DELETE this order? This action cannot be undone.")) {
      await deleteOrder(selectedOrderId);
      setSelectedOrderId(null);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto">

      <div className="mb-5 print:hidden">
        <h2 className="text-xl font-bold text-gray-900">Dispatch Invoices</h2>
        <p className="text-xs text-gray-500 mb-4">Manage and print online & queued deliveries.</p>

        <div className="relative">
          <input 
            type="text" 
            placeholder="🔍 Search by name, phone, or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" 
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 font-bold">✕</button>
          )}
        </div>
      </div>

      <div className="space-y-3 print:hidden">
        {Object.keys(pendingOrders).length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">
            {searchQuery ? "No invoices match your search." : "No pending deliveries! You are all caught up."}
          </div>
        ) : (
          Object.entries(pendingOrders).map(([orderId, lines]) => {
            const customer = lines[0].customer;
            const deliveryDate = lines[0].delivery_date;
            const phone = lines[0].phone;
            const totalDue = lines.reduce((sum, l) => sum + l.pending_payment, 0);

            return (
              <div key={orderId} onClick={() => setSelectedOrderId(orderId)} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{orderId}</span>
                    {totalDue === 0 && <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">Paid</span>}
                  </div>
                  <h4 className="font-bold text-gray-900 leading-tight">{customer}</h4>
                  <p className="text-[10px] text-gray-500 font-medium">{phone || "No Phone"}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block mb-1">Del: {deliveryDate}</span>
                  <span className={`text-xs font-black px-2 py-1 rounded ${totalDue > 0 ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-600'}`}>
                    {totalDue > 0 ? `Due: ${CURRENCY} ${totalDue.toFixed(2)}` : 'Paid in Full'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedOrderId && firstLine && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4 print:bg-white print:p-0">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl print:shadow-none print:border-none print:w-full print:max-w-none max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible">

            <div className="flex justify-between items-center mb-4 print:hidden">
              <h3 className="text-sm font-bold text-gray-800">Invoice Preview</h3>
              <button onClick={() => setSelectedOrderId(null)} className="text-gray-400 hover:text-gray-900 font-bold bg-gray-100 w-8 h-8 rounded-full">✕</button>
            </div>

            {/* --- THE UNIFIED MASTER INVOICE (DISPATCH PAGE) --- */}
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-lg max-w-sm mx-auto font-sans print:shadow-none print:border-none print:p-0 print:max-w-full text-gray-900">

              <div className="text-center space-y-1">
                <h2 className="font-black text-2xl uppercase tracking-widest text-black">{businessName}</h2>
                {(shopSettings?.shop_address || shopSettings?.shop_phone || businessEmail) && (
                  <div className="text-[11px] text-gray-600 print:text-black mt-1">
                     {shopSettings?.shop_address && <p>{shopSettings.shop_address}</p>}
                     <p>
                       {shopSettings?.shop_phone && <span>📞 {shopSettings.shop_phone}</span>}
                       {businessEmail && <span> | ✉️ {businessEmail}</span>}
                     </p>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-dashed border-gray-300 my-4 print:border-black"></div>

              <div className="text-center mb-4">
                <h3 className="font-bold text-sm tracking-widest uppercase text-black">Commercial Invoice</h3>
                <p className="text-[10px] font-mono text-gray-500 mt-0.5 print:text-black">Receipt No: {selectedOrderId}</p>
              </div>

              <div className="text-xs space-y-1 mb-4 text-black">
                <div className="flex justify-between"><span className="font-medium">Customer:</span> <span className="font-bold">{firstLine.customer}</span></div>
                <div className="flex justify-between"><span className="font-medium">Phone:</span> <span className="font-bold">{firstLine.phone || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="font-medium">Delivery Date:</span> <span className="font-bold">{firstLine.delivery_date}</span></div>
                <div className="flex justify-between"><span className="font-medium">Location:</span> <span className="font-bold text-right max-w-[150px] truncate">{firstLine.location}</span></div>
              </div>

              <div className="border-t-2 border-dashed border-gray-300 my-3 print:border-black"></div>

              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-2 print:text-black">
                  <span>Item & Qty</span>
                  <span>Total</span>
                </div>
                <div className="space-y-2 text-xs text-black">
                  {selectedOrderLines?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <p className="font-semibold">{item.product_name} <span className="text-gray-500 font-normal ml-1 print:text-black">× {item.quantity}</span></p>
                      <p className="font-bold">{CURRENCY} {(item.quantity * item.unit_price).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t-2 border-dashed border-gray-300 my-3 print:border-black"></div>

              <div className="text-xs space-y-1.5 mb-4 text-gray-600 print:text-black">
                <div className="flex justify-between"><span>Subtotal:</span><span>{CURRENCY} {calculatedSubtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Delivery Charge:</span><span>{CURRENCY} {calculatedDelivery.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>VAT (Auto {shopSettings?.default_tax_rate || 0}%):</span><span>{CURRENCY} {calculatedVat.toFixed(2)}</span></div>
              </div>

              <div className="border-t-2 border-gray-800 my-3 print:border-black"></div>

              <div className="flex justify-between items-center text-sm font-black mb-3 text-black">
                <span>GRAND TOTAL:</span>
                <span>{CURRENCY} {invoiceGrandTotal.toFixed(2)}</span>
              </div>

              <div className="border-t-2 border-dashed border-gray-300 my-3 print:border-black"></div>

              <div className="text-xs space-y-1.5 mb-4 text-gray-600 print:text-black">
                <div className="flex justify-between">
                  <span>Paid / Advance:</span>
                  <span>{CURRENCY} {invoiceAdvance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black bg-gray-100 p-2 rounded-lg print:bg-transparent print:border-2 print:border-black print:p-1.5 mt-2">
                  <span className="text-black">DUE TO COLLECT:</span>
                  <span className="text-black">{CURRENCY} {invoiceDue.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-gray-300 my-4 print:border-black"></div>

              <div className="text-center space-y-2">
                <div className="text-[10px] text-gray-500 font-medium print:text-black">
                   {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} | {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-[10px] text-gray-500 font-bold print:text-black">
                   Powered by tongka
                </div>
                <div className="text-xs font-semibold italic mt-2 text-black">
                   ✨ Thank you for treating yourself today!<br/>We hope to see you again soon.
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-6 mt-4 border-t border-gray-100 print:hidden">
              <button onClick={() => window.print()} className="w-full bg-gray-800 hover:bg-black text-white font-bold py-3.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-2">
                🖨️ Print Dispatch Invoice
              </button>
              <button onClick={handleDispatch} className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3.5 rounded-xl text-xs transition border border-emerald-200 shadow-sm">
                ✓ Mark as Delivered
              </button>
              <button onClick={handleDeleteInvoice} className="w-full text-red-500 hover:text-red-700 font-bold py-2 rounded-xl text-xs transition mt-2">
                🗑️ Delete Order
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};