import React, { useState, useMemo } from "react";
import { useBakery, Order } from "../context/BakeryContext";
import { formatToUniversalDate } from "../lib/dateUtils";

export const CustomersView: React.FC = () => {
  const { orders, shopSettings } = useBakery();
  const CURRENCY = shopSettings?.currency_symbol || "৳";
  const businessName = localStorage.getItem("bb_business_name") || shopSettings?.shop_name || "MY BAKERY";
  const businessEmail = localStorage.getItem("bb_user_email") || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // ============================================================================
  // CUSTOMER CRM ENGINE (PHONE-FIRST IDENTIFICATION)
  // Groups profiles by Phone Number to prevent name collisions
  // ============================================================================
  const customerProfiles = useMemo(() => {
    const profiles: Record<string, any> = {};

    orders.forEach((o) => {
      if (o.customer.toLowerCase() === "self") return; // Skip internal stock transfers

      // THE FIX: Use Phone Number as the primary ID. 
      // If phone is missing or "N/A", fallback to using their Name.
      const rawPhone = (o.phone || "").trim().toLowerCase();
      const isInvalidPhone = rawPhone === "" || rawPhone === "n/a" || rawPhone === "none";
      const key = isInvalidPhone ? o.customer.toLowerCase().trim() : rawPhone;

      if (!profiles[key]) {
        profiles[key] = {
          name: o.customer, // Stores their most recent name
          phone: o.phone || "",
          location: o.location || "",
          email: o.email || "", 
          totalSpent: 0,
          totalProfit: 0,
          orderIds: new Set(),
          itemsBought: {} as Record<string, number>,
          rawOrders: [] as Order[],
        };
      } else {
        // Automatically updates their profile if they provide a new name or better address
        if (isInvalidPhone === false && o.customer.toLowerCase() !== "online customer") {
            profiles[key].name = o.customer; 
        }
        if (o.location && o.location !== "Display Shelf" && o.location !== "Direct Pickup") {
            profiles[key].location = o.location;
        }
        if (o.email) profiles[key].email = o.email;
      }

      profiles[key].totalSpent += (o.total || 0);
      profiles[key].totalProfit += (o.profit || 0);
      profiles[key].orderIds.add(o.id);
      profiles[key].rawOrders.push(o);

      if (!profiles[key].itemsBought[o.product_name]) {
        profiles[key].itemsBought[o.product_name] = 0;
      }
      profiles[key].itemsBought[o.product_name] += o.quantity;
    });

    // Format profiles and assign VIP tiers based on spending
    return Object.values(profiles)
      .map((p) => {
        // Find their favorite product by sorting items bought
        const favoriteProduct = Object.entries(p.itemsBought).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "None";
        const orderCount = p.orderIds.size;
        const avgOrder = p.totalSpent / (orderCount || 1);

        let tier = "Regular";
        let tierColor = "bg-gray-100 text-gray-700";
        if (p.totalSpent >= 1000) { tier = "Best Tier"; tierColor = "bg-purple-100 text-purple-700"; }
        else if (p.totalSpent >= 100) { tier = "Medium Tier"; tierColor = "bg-blue-100 text-blue-700"; }

        return { ...p, orderCount, avgOrder, favoriteProduct, tier, tierColor };
      })
      .filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.phone.includes(searchQuery)
      )
      .sort((a, b) => b.totalSpent - a.totalSpent); // Sort highest spenders first
  }, [orders, searchQuery]);

  // Group the selected customer's raw database lines into structured receipts
  const customerReceipts = useMemo(() => {
    if (!selectedCustomer) return [];

    const receipts: Record<string, any> = {};
    selectedCustomer.rawOrders.forEach((o: Order) => {
      if (!receipts[o.id]) {
        receipts[o.id] = {
          id: o.id,
          date: o.delivery_date || o.date,
          status: o.status,
          paymentMethod: o.payment_method || "Cash",
          items: [],
          grandTotal: 0,
        };
      }
      receipts[o.id].items.push({ name: o.product_name, qty: o.quantity, price: o.unit_price, lineTotal: o.quantity * o.unit_price });
      receipts[o.id].grandTotal += (o.total || 0);
    });

    // Sort receipts newest first
    return Object.values(receipts).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCustomer]);

  // Engine for the specific Invoice Preview
  const invoiceLines = useMemo(() => {
    if (!selectedInvoiceId || !selectedCustomer) return null;
    return selectedCustomer.rawOrders.filter((o: Order) => o.id === selectedInvoiceId);
  }, [selectedInvoiceId, selectedCustomer]);

  // Reconstruct exact receipt math from DB for the preview
  const invoiceGrandTotal = invoiceLines?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
  const invoiceAdvance = invoiceLines?.reduce((sum, item) => sum + (item.advance_paid || 0), 0) || 0;
  const invoiceDue = invoiceLines?.reduce((sum, item) => sum + (item.pending_payment || 0), 0) || 0;

  const calculatedSubtotal = invoiceLines?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0;
  const calculatedVat = (calculatedSubtotal * (shopSettings?.default_tax_rate || 0)) / 100;
  const calculatedDelivery = Math.max(0, invoiceGrandTotal - calculatedSubtotal - calculatedVat); 

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
      {/* 🔴 PRINT ISOLATION FOR INVOICE 🔴 */}
      <style>{`
        @media print {
          @page { size: auto; margin: 0; }
          body { background-color: white !important; }
          body * { visibility: hidden; }
          #printable-invoice-container, #printable-invoice-container * { visibility: visible; }
          #printable-invoice-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 15px; }
          .hide-on-print, .hide-on-print * { display: none !important; visibility: hidden !important; }
        }
      `}</style>

      {/* --- PAGE HEADER --- */}
      <div className="mb-5 print:hidden">
        <h2 className="text-xl font-bold text-gray-900">Customers Directory</h2>
        <p className="text-xs text-gray-500 mb-4">Tap any customer card to view complete purchase history.</p>

        <div className="relative">
          <input 
            type="text" 
            placeholder="🔍 Search by name or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" 
          />
        </div>
      </div>

      {/* --- CUSTOMER LIST CARDS --- */}
      <div className="space-y-4 print:hidden">
        {customerProfiles.map((customer) => (
          <div 
            key={customer.phone + customer.name} 
            onClick={() => setSelectedCustomer(customer)}
            className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{customer.name}</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{customer.phone || "No Phone"}</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${customer.tierColor}`}>
                ⭐ {customer.tier}
              </span>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 text-center border border-gray-100 mb-3">
              <div>
                <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Orders</span>
                <span className="font-black text-gray-800 text-sm">{customer.orderCount}</span>
              </div>
              <div className="border-l border-gray-200">
                <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Total Spent</span>
                <span className="font-black text-gray-800 text-sm">{CURRENCY}{customer.totalSpent.toFixed(2)}</span>
              </div>
              <div className="border-l border-gray-200">
                <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Profit</span>
                <span className="font-black text-emerald-600 text-sm">{CURRENCY}{customer.totalProfit.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 truncate max-w-[200px]">📍 {customer.location || "No Address"}</span>
              <span className="font-bold text-indigo-600">View History →</span>
            </div>
          </div>
        ))}
      </div>

      {/* --- DETAILED CUSTOMER PROFILE MODAL --- */}
      {selectedCustomer && !selectedInvoiceId && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-end justify-center sm:items-center print:hidden">
          <div className="bg-gray-50 w-full sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">

            {/* Header Area */}
            <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200 relative shrink-0">
              <button 
                onClick={() => setSelectedCustomer(null)} 
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-full font-bold transition"
              >
                ✕
              </button>

              <h2 className="text-2xl font-black text-gray-900 mb-2 pr-8 leading-tight">{selectedCustomer.name}</h2>

              <div className="space-y-1.5">
                {selectedCustomer.phone && <p className="text-sm text-gray-600 flex items-center gap-2">📞 <span className="font-mono">{selectedCustomer.phone}</span></p>}
                {selectedCustomer.email && <p className="text-sm text-gray-600 flex items-center gap-2">✉️ <span>{selectedCustomer.email}</span></p>}
                {selectedCustomer.location && <p className="text-sm text-gray-600 flex items-center gap-2">📍 <span>{selectedCustomer.location}</span></p>}
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-3 gap-2 mt-5">
                <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
                  <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lifetime Value</span>
                  <span className="font-black text-gray-900 text-sm">{CURRENCY}{selectedCustomer.totalSpent.toFixed(2)}</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
                  <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Avg Order</span>
                  <span className="font-black text-gray-900 text-sm">{CURRENCY}{selectedCustomer.avgOrder.toFixed(2)}</span>
                </div>
                <div className="bg-rose-50 rounded-xl p-2 text-center border border-rose-100">
                  <span className="block text-[9px] font-bold text-rose-400 uppercase tracking-widest mb-1">Favorite</span>
                  <span className="font-black text-rose-700 text-sm truncate block">{selectedCustomer.favoriteProduct}</span>
                </div>
              </div>
            </div>

            {/* Order History List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest ml-1 mb-2">Order History ({selectedCustomer.orderCount})</h3>

              {customerReceipts.map((receipt: any) => (
                <div key={receipt.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
                    <span className="text-[11px] font-bold text-gray-800">{receipt.id}</span>
                    <span className="text-[11px] font-medium text-gray-500">{formatToUniversalDate(receipt.date)}</span>
                  </div>

                  {/* Item List displaying exact quantities cleanly */}
                  <div className="bg-gray-50/70 rounded-lg p-2.5 space-y-2 mb-3 border border-gray-100">
                    {receipt.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-700">{item.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Qty</span>
                          <span className="font-black text-gray-800 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-200">
                            {item.qty}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${receipt.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {receipt.status}
                      </span>
                      <span className="font-black text-sm text-gray-900">{CURRENCY}{receipt.grandTotal.toFixed(2)}</span>
                    </div>

                    <button 
                      onClick={() => setSelectedInvoiceId(receipt.id)}
                      className="text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg transition border border-indigo-100 flex items-center gap-1"
                    >
                      🖨️ View Invoice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- INVOICE PREVIEW MODAL --- */}
      {selectedInvoiceId && invoiceLines && invoiceLines.length > 0 && (
        <div className="fixed inset-0 bg-gray-900/60 z-[60] flex items-center justify-center p-4 print:bg-white print:p-0">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl print:shadow-none print:border-none print:w-full print:max-w-none max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible">

            <div className="flex justify-between items-center mb-4 print:hidden">
              <h3 className="text-sm font-bold text-gray-800">Invoice Preview</h3>
              <button onClick={() => setSelectedInvoiceId(null)} className="text-gray-400 hover:text-gray-900 font-bold bg-gray-100 w-8 h-8 rounded-full">✕</button>
            </div>

            <div id="printable-invoice-container" className="bg-white border border-gray-200 p-6 rounded-xl shadow-lg max-w-sm mx-auto font-sans print:shadow-none print:border-none print:p-0 print:max-w-full text-gray-900">

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
                <p className="text-[10px] font-mono text-gray-500 mt-0.5 print:text-black">Receipt No: {selectedInvoiceId}</p>
              </div>

              <div className="text-xs space-y-1 mb-4 text-black">
                <div className="flex justify-between"><span className="font-medium">Customer:</span> <span className="font-bold">{invoiceLines[0].customer}</span></div>
                <div className="flex justify-between"><span className="font-medium">Phone:</span> <span className="font-bold">{invoiceLines[0].phone || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="font-medium">Date:</span> <span className="font-bold">{formatToUniversalDate(invoiceLines[0].delivery_date || invoiceLines[0].date)}</span></div>
                <div className="flex justify-between"><span className="font-medium">Location:</span> <span className="font-bold text-right max-w-[150px] truncate">{invoiceLines[0].location}</span></div>
                <div className="flex justify-between"><span className="font-medium">Payment By:</span> <span className="font-bold">{invoiceLines[0].payment_method || 'Cash'}</span></div>
              </div>

              <div className="border-t-2 border-dashed border-gray-300 my-3 print:border-black"></div>

              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-2 print:text-black">
                  <span>Item & Qty</span>
                  <span>Total</span>
                </div>
                <div className="space-y-2 text-xs text-black">
                  {invoiceLines.map((item, idx) => (
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
                <div className="flex justify-between"><span>Delivery & Fees:</span><span>{CURRENCY} {calculatedDelivery.toFixed(2)}</span></div>
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
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-6 mt-4 border-t border-gray-100 print:hidden">
              <button onClick={() => window.print()} className="w-full bg-gray-800 hover:bg-black text-white font-bold py-3.5 rounded-xl text-xs shadow transition flex items-center justify-center gap-2">
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};