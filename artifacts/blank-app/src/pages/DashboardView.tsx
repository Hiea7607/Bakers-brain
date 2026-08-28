import React from "react";
import { useBakery } from "../context/BakeryContext";

export const DashboardView: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { stats, customers } = useBakery();

  const bestCustomer = customers.find((c) => c.tier === "Best") || customers[0];

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">1. Dashboard</h2>
          <p className="text-[11px] text-gray-500">Today's Overview • {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
      </div>

      {/* Today at a Glance (Scorecards with Sparklines) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-100 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-medium text-gray-400">Today's Sales</span>
            <p className="text-xl font-black text-gray-900 mt-0.5">৳ {stats.todaySales}</p>
          </div>
          <div className="mt-2 pt-1 border-t border-gray-50 flex items-center justify-between">
            <span className="text-[9px] text-gray-400">vs month</span>
            <span className="text-[10px] font-mono text-rose-600 font-bold">▂▄▆█</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-100 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-medium text-gray-400">Today's Profit</span>
            <p className="text-xl font-black text-green-600 mt-0.5">৳ {stats.todayProfit}</p>
          </div>
          <div className="mt-2 pt-1 border-t border-gray-50 flex items-center justify-between">
            <span className="text-[9px] text-gray-400">vs month</span>
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
            <span className="text-base font-bold text-gray-900">{stats.deliveriesTodayCount}</span>
          </div>
          <span className="text-lg">🚚</span>
        </button>

        <button
          onClick={() => onNavigate("orders")}
          className="bg-white p-3 rounded-xl shadow-xs border border-amber-200 bg-amber-50/40 flex items-center justify-between text-left hover:border-amber-400 transition"
        >
          <div>
            <span className="text-[10px] text-amber-700 block font-bold">Pending Payments</span>
            <span className="text-base font-black text-amber-900">৳ {stats.pendingPaymentsAmount}</span>
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
          onClick={() => onNavigate("inventory")}
          className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50 cursor-pointer hover:text-rose-600 transition"
        >
          <div className="flex items-center gap-2">
            <span>🚨</span>
            <span className="text-gray-700 font-medium">Running Out Ingredients</span>
          </div>
          <span className="text-rose-600 font-bold text-xs">{stats.lowStockCount} items ›</span>
        </div>

        <div className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <span>📉</span>
            <span className="text-gray-700 font-medium">Low-Selling Products</span>
          </div>
          <span className="text-amber-600 font-bold text-xs">{stats.lowSellingCount} items ›</span>
        </div>

        <div className="flex justify-between items-center text-xs py-1.5">
          <div className="flex items-center gap-2">
            <span>🔥</span>
            <span className="text-gray-700 font-medium">Best-Selling Product</span>
          </div>
          <span className="text-green-600 font-bold text-xs">{stats.bestSellingProduct}</span>
        </div>
      </div>

      {/* This Month */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-3">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">This Month</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-gray-50 p-2.5 rounded-lg">
            <span className="text-gray-400 text-[10px]">Monthly Sales</span>
            <p className="font-bold text-sm text-gray-900 mt-0.5">৳ {stats.monthlySales}</p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-lg">
            <span className="text-gray-400 text-[10px]">Monthly Profit</span>
            <p className="font-bold text-sm text-green-600 mt-0.5">৳ {stats.monthlyProfit}</p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-lg">
            <span className="text-gray-400 text-[10px]">Total Orders</span>
            <p className="font-bold text-sm text-gray-900 mt-0.5">{stats.monthlyOrdersCount}</p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-lg">
            <span className="text-gray-400 text-[10px]">New Customers</span>
            <p className="font-bold text-sm text-purple-600 mt-0.5">{stats.newCustomersThisMonth}</p>
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