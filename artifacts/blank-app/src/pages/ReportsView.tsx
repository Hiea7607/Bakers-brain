import React, { useState, useMemo } from "react";
import { useBakery } from "../context/BakeryContext";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export const ReportsView: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { orders, inventory, purchases, customers } = useBakery();
  const [activeTab, setActiveTab] = useState<"BI Hub" | "Customers">("BI Hub");
  const [selectedIngredient, setSelectedIngredient] = useState<string>('');

  const totalSales = orders.filter((o) => o.status === "Paid").reduce((acc, o) => acc + o.total, 0);
  const totalProfit = orders.filter((o) => o.status === "Paid").reduce((acc, o) => acc + o.profit, 0);
  const totalOrdersCount = orders.length;
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalSales / totalOrdersCount) : 0;

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
        date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), 
        revenue: 0 
      });
    }
    orders.forEach(o => {
      if (o.status !== 'Paid') return;
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
    return ingredientPurchases.map(p => ({
      date: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      price: p.unit_price,
    }));
  }, [purchases, selectedIngredient]);

  return (
    <div className="space-y-5 pb-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2 tracking-tight">
          <span>📊</span> Data Locker BI Hub
        </h2>
      </div>

      <div className="flex bg-gray-200 p-1 rounded-xl text-xs font-bold text-gray-600">
        {(["BI Hub", "Customers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === tab ? "bg-white text-rose-600 shadow-sm" : "hover:text-gray-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "BI Hub" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Sales</span>
              <p className="text-lg font-black text-gray-900">৳ {totalSales}</p>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Profit</span>
              <p className="text-lg font-black text-green-600">৳ {totalProfit}</p>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Orders</span>
              <p className="text-lg font-bold text-gray-900">{totalOrdersCount}</p>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Avg Order Value</span>
              <p className="text-lg font-bold text-gray-900">৳ {avgOrderValue}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">30-Day Revenue Trend</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{fontSize: 10, fill: '#9ca3af'}} tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} tickLine={false} axisLine={false} tickFormatter={(val) => `৳${val}`} width={40} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#e11d48" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Top 5 Products</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 10, fill: '#4b5563', fontWeight: 600}} tickLine={false} axisLine={false} width={90} />
                  <Tooltip cursor={{fill: '#fff1f2'}} contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="quantity" fill="#e11d48" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cost Drivers</h3>
              <select 
                className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer max-w-[140px] truncate"
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
                  <BarChart data={costDriversData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{fontSize: 10, fill: '#9ca3af'}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} tickLine={false} axisLine={false} tickFormatter={(val) => `৳${val}`} width={40} />
                    <Tooltip 
                      cursor={{fill: '#fef3c7'}} 
                      contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                      formatter={(value: number) => [`৳${value}`, 'Unit Price']}
                    />
                    <Bar dataKey="price" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-medium text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  No historical data.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Customers" && (
        <div className="space-y-3">
          {customers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No customer history recorded yet.</p>
          ) : (
            customers.map((c) => (
              <div key={c.phone || c.name} className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">{c.name}</h3>
                    <p className="text-xs text-gray-400 font-mono">{c.phone}</p>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
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

                <div className="grid grid-cols-3 gap-1 bg-gray-50 p-2 rounded-lg text-center text-xs border border-gray-100">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Orders</span>
                    <span className="font-bold text-gray-800">{c.totalOrders}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Total Spent</span>
                    <span className="font-bold text-gray-800">৳{c.totalSpent}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Profit</span>
                    <span className="font-bold text-green-600">৳{c.totalProfit}</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 font-medium">📍 {c.address}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};