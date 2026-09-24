import React, { useState, useMemo } from "react";
import { useBakery, Order } from "../context/BakeryContext";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export const ReportsView: React.FC<{ onNavigate: (page: string) => void }> = () => {
  const { orders, inventory, purchases, customers, shopSettings } = useBakery();
  const CURRENCY = shopSettings?.currency_symbol || "৳";

  const [activeTab, setActiveTab] = useState<"BI Hub" | "Customers">("BI Hub");
  const [selectedIngredient, setSelectedIngredient] = useState<string>('');
  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<any | null>(null);

  useMemo(() => {
    if (!selectedIngredient && inventory.length > 0) {
      setSelectedIngredient(inventory[0].code);
    }
  }, [inventory, selectedIngredient]);

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
                {inventory.map(item => (
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
                {orders
                  .filter(o => o.phone === selectedCustomerForModal.phone || o.customer === selectedCustomerForModal.name)
                  .map((order: Order, idx: number) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 text-xs space-y-1 shadow-xs">
                      <div className="flex justify-between font-bold text-gray-800">
                        <span>{order.product_name} × {order.quantity}</span>
                        <span className="text-emerald-600">{CURRENCY}{order.total}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>{order.delivery_date || order.date}</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold ${order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{order.status}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <button onClick={() => setSelectedCustomerForModal(null)} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs shadow transition">
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};