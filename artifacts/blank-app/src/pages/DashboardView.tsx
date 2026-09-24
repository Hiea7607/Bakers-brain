import React from "react";
import { useBakery } from "../context/BakeryContext";

export const DashboardView: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { stats, customers, shopSettings } = useBakery();
  const CURRENCY = shopSettings?.currency_symbol || "৳";

  const bestCustomer = customers.find((c) => c.tier === "Best") || customers[0];

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Dashboard</h2>
          <p className="text-[11px] text-gray-500">Today's Overview • {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
      </div>

      {/* Today at a Glance (Scorecards with Sparklines) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-100 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-medium text-gray-400">Today's Sales</span>
            <p className="text-xl font-black text-gray-900 mt-0.5">{CURRENCY} {stats.todaySales}</p>
          </div>
          <div className="mt-2 pt-1 border-t border-gray-50 flex items-center justify-between">
            <span className="text-[9px] text-gray-400">vs month</span>
            <span className="text-[10px] font-mono text-rose-600 font-bold">▂▄▆█</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-100 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-medium text-gray-400">Realized Profit</span>
            <p className="text-xl font-black text-green-600 mt-0.5">{CURRENCY} {stats.todayProfit}</p>
          </div>
          <div className="mt-2 pt-1 border-t border-gray-50 flex items-center justify-between">
            <span className="text-[9px] text-gray-400">completed only</span>
            <span className="text-[10px] font-mono text-green-600 font-bold"> ▂▅▇█</span>
          </div>
        </div>
      </div>

      {/* 4 Operational Action Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onNavigate("orders")}
          className="bg-white p-3 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between text-left hover:border-rose-200 transition"
        >
          <div>
            <span className="text-[10px] text-gray-400 block font-medium">Orders Today</span>
            <span className="text-base font-bold text-gray-900">{stats.todayOrdersCount}</span>
          </div>
          <span className="text-lg">📋</span>
        </button>

        <button
          onClick={() => onNavigate("orders")}
          className="bg-white p-3 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between text-left hover:border-rose-200 transition"
        >
          <div>
            <span className="text-[10px] text-gray-400 block font-medium">Upcoming Deliveries</span>
            <span className="text-base font-bold text-gray-900">{stats.upcomingDeliveriesCount}</span>
          </div>
          <span className="text-lg">🚚</span>
        </button>

        <button
          onClick={() => onNavigate("orders")}
          className="bg-white p-3 rounded-xl shadow-xs border border-amber-200 bg-amber-50/40 flex items-center justify-between text-left hover:border-amber-400 transition"
        >
          <div>
            <span className="text-[10px] text-amber-700 block font-bold">Pending Dues</span>
            <span className="text-base font-black text-amber-900">{CURRENCY} {stats.pendingPaymentsAmount}</span>
          </div>
          <span className="text-lg">⏳</span>
        </button>

        <button
          onClick={() => onNavigate("reports")}
          className="bg-white p-3 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between text-left hover:border-rose-200 transition"
        >
          <div>
            <span className="text-[10px] text-gray-400 block font-medium">Contact Customer</span>
            <span className="text-xs font-bold text-rose-600 truncate block max-w-[85px]">
              {bestCustomer ? `⭐ ${bestCustomer.name}` : "No Clients"}
            </span>
          </div>
          <span className="text-lg">👥</span>
        </button>
      </div>

      {/* Need Your Attention */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-2">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Attention Needed</h3>

        <div
          onClick={() => onNavigate("reports")}
          className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50 cursor-pointer hover:text-purple-600 transition"
        >
          <div className="flex items-center gap-2">
            <span>👤</span>
            <span className="text-gray-700 font-medium">New Customers Today</span>
          </div>
          <span className="text-purple-600 font-bold text-xs">
            {stats.newCustomersToday || 0} joined ›
          </span>
        </div>

        <div
          onClick={() => onNavigate("products")}
          className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50 cursor-pointer hover:text-rose-600 transition"
        >
          <div className="flex items-center gap-2">
            <span>📉</span>
            <span className="text-gray-700 font-medium">Low-Selling Products</span>
          </div>
          <span className="text-amber-600 font-bold text-xs">{stats.lowSellingCount || 0} items ›</span>
        </div>

        <div
          onClick={() => onNavigate("products")}
          className="flex justify-between items-center text-xs py-1.5 cursor-pointer hover:text-rose-600 transition"
        >
          <div className="flex items-center gap-2">
            <span>🔥</span>
            <span className="text-gray-700 font-medium">Best-Selling Product</span>
          </div>
          <span className="text-green-600 font-bold text-xs">{stats.bestSellingProduct || "None"} ›</span>
        </div>
      </div>

      {/* This Month (6-Box Grid) */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-3">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">This Month</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">

          {/* Row 1: Finance */}
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            <span className="text-gray-500 text-[10px] font-bold">Monthly Sales</span>
            <p className="font-black text-sm text-gray-900 mt-0.5">{CURRENCY} {stats.monthlySales}</p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            <span className="text-gray-500 text-[10px] font-bold">Monthly Profit</span>
            <p className="font-black text-sm text-green-600 mt-0.5">{CURRENCY} {stats.monthlyProfit}</p>
          </div>

          {/* Row 2: Volume & CRM */}
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex justify-between items-end">
             <div>
                <span className="text-gray-500 text-[10px] font-bold">Total Orders</span>
                <p className="font-black text-sm text-gray-900 mt-0.5">{stats.monthlyOrdersCount}</p>
             </div>
             <span className="text-lg opacity-40">📦</span>
          </div>
          <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 flex justify-between items-end">
             <div>
                <span className="text-purple-700 text-[10px] font-bold">New Customers</span>
                <p className="font-black text-sm text-purple-700 mt-0.5">{stats.newCustomersThisMonth}</p>
             </div>
             <span className="text-lg opacity-40">👥</span>
          </div>

          {/* Row 3: Waste & Performance */}
          <div className="bg-red-50 p-2.5 rounded-lg border border-red-100 flex justify-between items-end">
             <div>
                <span className="text-red-700 text-[10px] font-bold">Food Waste (Loss)</span>
                <p className="font-black text-sm text-red-600 mt-0.5">- {CURRENCY} {stats.monthlyLoss || 0}</p>
             </div>
             <span className="text-lg opacity-40">🗑️</span>
          </div>
          <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100 flex justify-between items-end">
             <div>
                <span className="text-blue-700 text-[10px] font-bold">Avg Order Value</span>
                <p className="font-black text-sm text-blue-700 mt-0.5">
                  {CURRENCY} {stats.monthlyOrdersCount > 0 ? (stats.monthlySales / stats.monthlyOrdersCount).toFixed(2) : "0.00"}
                </p>
             </div>
             <span className="text-lg opacity-40">🛒</span>
          </div>

        </div>
      </div>

      {/* Additional Business Signals */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-2 text-xs">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Business Signals</h3>
        <p className="text-gray-600">
          • <strong>Most Consumed:</strong> {stats.mostConsumedIngredient}
        </p>
        <p className="text-gray-600">
          • <strong>Highest Margin:</strong> {stats.highestProfitProduct}
        </p>
      </div>
    </div>
  );
};