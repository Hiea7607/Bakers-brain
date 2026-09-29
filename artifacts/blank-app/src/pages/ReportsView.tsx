import React, { useState, useMemo } from "react";
import { useBakery, Order } from "../context/BakeryContext";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export const ReportsView: React.FC<{ onNavigate: (page: string) => void }> = () => {
  const { orders, ingredients, purchases, customers, shopSettings } = useBakery();
  const CURRENCY = shopSettings?.currency_symbol || "৳";

  const [activeTab, setActiveTab] = useState<"BI Hub" | "Customers">("BI Hub");
  const [selectedIngredient, setSelectedIngredient] = useState<string>('');
  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<any | null>(null);

  const [receiptToPrint, setReceiptToPrint] = useState<Order[] | null>(null);
  const businessName = localStorage.getItem("bb_business_name") || shopSettings?.shop_name || "BUSINESS BRAIN";

  useMemo(() => {
    if (!selectedIngredient && ingredients.length > 0) {
      setSelectedIngredient(ingredients[0].code);
    }
  }, [ingredients, selectedIngredient]);

  const revenueData = useMemo(() => {
    const dataMap = new Map();
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime());
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dataMap.set(dateStr, { 
        date: new Intl.DateTimeFormat('en-GB', { month: 'short', day: 'numeric' }).format(d), 
        revenue: 0 
      });
    }
    orders.forEach(o => {
      if (o.status !== 'Completed') return;
      const orderDate = o.delivery_date ? new Date(o.delivery_date) : new Date(o.date);
      const effectiveDate = o.delivery_date && o.delivery_date.length === 10 
        ? new Date(`${o.delivery_date}T00:00:00`) 
        : orderDate;
      const dateStr = effectiveDate.toISOString().slice(0, 10);
      if (dataMap.has(dateStr)) dataMap.get(dateStr).revenue += o.total;
    });
    return Array.from(dataMap.values());
  }, [orders]);

  const topProductsData = useMemo(() => {
    const productMap: Record<string, number> = {};
    orders.forEach(o => {
      productMap[o.product_name] = (productMap[o.product_name] || 0) + o.quantity;
    });
    return Object.entries(productMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [orders]);

  const costDriversData = useMemo(() => {
    if (!selectedIngredient) return [];
    const ingredientPurchases = purchases
      .filter(p => p.code === selectedIngredient)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return ingredientPurchases.map(p => {
      const d = new Date(p.date);
      const formattedDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
      return {
        date: formattedDate,
        price: p.unit_price,
      };
    });
  }, [purchases, selectedIngredient]);

  return (
    <div className="space-y-5 pb-24 px-4 max-w-md mx-auto">
      <div className="flex justify-between items-center pt-4">
        <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 tracking-tight">
          <span>📈</span> Business Intelligence Hub
        </h2>
      </div>

      <div className="flex bg-gray-200 p-1 rounded-xl text-xs font-bold text-gray-600">
        {(["BI Hub", "Customers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-lg transition ${
              activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "hover:text-gray-900"
            }`}
          >
            {tab === "BI Hub" ? "📊 BI Analytics" : "👥 Customers"}
          </button>
        ))}
      </div>

      {activeTab === "BI Hub" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">30-Day Revenue Trend</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{fontSize: 10, fill: '#9ca3af'}} tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} tickLine={false} axisLine={false} tickFormatter={(val) => `${CURRENCY}${val}`} width={40} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#0f172a" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Top 5 Products</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 10, fill: '#4b5563', fontWeight: 600}} tickLine={false} axisLine={false} width={90} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="quantity" fill="#0f172a" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Multi-Year Cost Drivers</h3>
                <p className="text-[10px] text-gray-400">Track raw material price trends over time</p>
              </div>
              <select 
                className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer max-w-[140px] truncate"
                value={selectedIngredient}
                onChange={(e) => setSelectedIngredient(e.target.value)}
              >
                {ingredients.map(item => (
                  <option key={item.code} value={item.code}>{item.name}</option>
                ))}
              </select>
            </div>

            <div className="h-56">
              {costDriversData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={costDriversData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{fontSize: 9, fill: '#9ca3af'}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} tickLine={false} axisLine={false} tickFormatter={(val) => `${CURRENCY}${val}`} width={40} />
                    <Tooltip 
                      contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                      formatter={(value: number) => [`${CURRENCY}${value}`, 'Unit Purchase Price']}
                    />
                    <Line type="monotone" dataKey="price" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-medium text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No purchase history for this item.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Customers" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 mb-2">Tap any customer card to view complete purchase history.</p>
          {customers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No customer history recorded yet.</p>
          ) : (
            customers.map((c) => (
              <div 
                key={c.phone || c.name} 
                onClick={() => setSelectedCustomerForModal(c)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3 hover:border-gray-300 transition cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">{c.name}</h3>
                    <p className="text-xs text-gray-400 font-mono">{c.phone}</p>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                      c.tier === "Best"
                        ? "bg-purple-100 text-purple-700"
                        : c.tier === "Medium"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    ⭐ {c.tier} Tier
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-xl text-center text-xs border border-gray-100">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Orders</span>
                    <span className="font-bold text-gray-800">{c.totalOrders}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Total Spent</span>
                    <span className="font-bold text-gray-800">{CURRENCY}{c.totalSpent}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Profit</span>
                    <span className="font-bold text-emerald-600">{CURRENCY}{c.totalProfit}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1">
                  <span>📍 {c.address}</span>
                  <span className="text-indigo-600 font-bold hover:underline">View History →</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CUSTOMER PURCHASE HISTORY MODAL */}
      {selectedCustomerForModal && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">

            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900">{selectedCustomerForModal.name}</h3>
                <p className="text-xs text-gray-500 font-mono">{selectedCustomerForModal.phone}</p>
              </div>
              <button onClick={() => setSelectedCustomerForModal(null)} className="text-gray-400 hover:text-gray-900 font-bold bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center">✕</button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 grid grid-cols-2 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-gray-400 block">Total Orders</span>
                <span className="font-bold text-gray-800">{selectedCustomerForModal.totalOrders}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Lifetime Spend</span>
                <span className="font-bold text-emerald-600">{CURRENCY}{selectedCustomerForModal.totalSpent}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Order History</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(() => {
                  // 1. Filter and Group the orders by Receipt ID
                  const customerOrders = orders.filter(o => o.phone === selectedCustomerForModal.phone || o.customer === selectedCustomerForModal.name);
                  const groups: Record<string, Order[]> = {};
                  customerOrders.forEach(o => {
                    if (!groups[o.id]) groups[o.id] = [];
                    groups[o.id].push(o);
                  });
                  // 2. Sort newest to oldest
                  const sortedGroups = Object.values(groups).sort((a, b) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime());

                  // 3. Render unified receipt cards
                  return sortedGroups.map((group, idx) => {
                    const first = group[0];
                    const groupTotal = group.reduce((sum, item) => sum + item.total, 0);
                    return (
                      <div key={first.id} className="bg-white border border-gray-200 rounded-xl p-3 text-xs space-y-2 shadow-xs mb-2">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                          <div>
                            <span className="font-bold text-gray-800 block">Receipt: {first.id}</span>
                            <span className="text-[10px] text-gray-400">{first.delivery_date || new Date(first.date).toLocaleDateString()}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${first.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{first.status}</span>
                        </div>

                        <div className="space-y-1">
                           {group.map((item, i) => (
                             <div key={i} className="flex justify-between text-gray-600">
                               <span>{item.quantity}x {item.product_name}</span>
                               <span>{CURRENCY} {item.total.toFixed(2)}</span>
                             </div>
                           ))}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                          <span className="font-black text-gray-900">{CURRENCY} {groupTotal.toFixed(2)}</span>
                          <button onClick={() => setReceiptToPrint(group)} className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 transition">🖨️ View Invoice</button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <button onClick={() => setSelectedCustomerForModal(null)} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs shadow transition">
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* 🖨️ THE PRINTABLE INVOICE POPUP */}
      {receiptToPrint && (
        <div className="fixed inset-0 bg-gray-900/60 z-[100] flex flex-col items-center justify-center p-4 print:p-0 print:bg-white">
          <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-lg max-w-sm w-full mx-auto font-sans print:shadow-none print:border-none print:p-0 print:max-w-full text-gray-900">

            <div className="flex justify-end mb-2 print:hidden">
              <button onClick={() => setReceiptToPrint(null)} className="text-gray-400 hover:text-gray-900 font-bold bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition">✕</button>
            </div>

            <div className="text-center space-y-1">
              <h2 className="font-black text-2xl uppercase tracking-widest text-black">{businessName}</h2>
            </div>

            <div className="border-t-2 border-dashed border-gray-300 my-4 print:border-black"></div>

            <div className="text-center mb-4">
              <h3 className="font-bold text-sm tracking-widest uppercase text-black">Commercial Invoice</h3>
              <p className="text-[10px] font-mono text-gray-500 mt-0.5 print:text-black">Receipt No: {receiptToPrint[0].id}</p>
              <p className="text-[10px] font-mono text-gray-500 mt-0.5 print:text-black">{new Date(receiptToPrint[0].date).toLocaleDateString('en-GB')} | {receiptToPrint[0].time}</p>
            </div>

            <div className="text-xs space-y-1 mb-4 text-black">
              <div className="flex justify-between"><span className="font-medium">Customer:</span> <span className="font-bold">{receiptToPrint[0].customer}</span></div>
              <div className="flex justify-between"><span className="font-medium">Phone:</span> <span className="font-bold">{receiptToPrint[0].phone || 'N/A'}</span></div>
            </div>

            <div className="border-t-2 border-dashed border-gray-300 my-3 print:border-black"></div>

            <div className="mb-4">
              <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-2 print:text-black">
                <span>Item & Qty</span>
                <span>Total</span>
              </div>
              <div className="space-y-2 text-xs text-black">
                {receiptToPrint.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <p className="font-semibold">{item.product_name} <span className="text-gray-500 font-normal ml-1 print:text-black">× {item.quantity}</span></p>
                    <p className="font-bold">{CURRENCY} {item.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-2 border-gray-800 my-3 print:border-black"></div>

            <div className="flex justify-between items-center text-sm font-black mb-3 text-black">
              <span>GRAND TOTAL:</span>
              <span>{CURRENCY} {receiptToPrint.reduce((s, i) => s + i.total, 0).toFixed(2)}</span>
            </div>

            <div className="text-xs space-y-1.5 mb-4 text-gray-600 print:text-black">
              <div className="flex justify-between">
                <span>Paid / Advance:</span>
                <span>{CURRENCY} {receiptToPrint.reduce((s, i) => s + i.advance_paid, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black bg-gray-100 p-2 rounded-lg print:bg-transparent print:border-2 print:border-black print:p-1.5 mt-2">
                <span className="text-black">DUE TO COLLECT:</span>
                <span className="text-black">{CURRENCY} {receiptToPrint.reduce((s, i) => s + i.pending_payment, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-500 print:text-black">
                <span>Payment Method:</span>
                <span className="font-bold">{receiptToPrint[0].payment_method || 'Cash'}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-4 print:hidden">
              <button onClick={() => window.print()} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl text-xs shadow transition">🖨️ Print Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};