import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BakeryProvider, useBakery } from "./context/BakeryContext";
import { DashboardView } from "./pages/DashboardView";
import { QuickOrderView } from "./pages/QuickOrderView";
import { OrdersView } from "./pages/OrdersView";
import { ProductsView } from "./pages/ProductsView";
import { RecipeBuilderView } from "./pages/RecipeBuilderView";
import { InventoryView } from "./pages/InventoryView";
import { PurchasesView } from "./pages/PurchasesView";
import { ReportsView } from "./pages/ReportsView";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BakeryProvider>
        <BakersBrainApp />
      </BakeryProvider>
    </QueryClientProvider>
  );
}

function BakersBrainApp() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [showDrawer, setShowDrawer] = useState(false);
  const { stats, exportDatabaseJSON, exportOrdersCSV } = useBakery();

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-between shadow-2xl relative pb-20 font-sans">
      {/* Top Header */}
      <header className="bg-rose-600 text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDrawer(true)}
            className="p-1 hover:bg-rose-700 rounded-md transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
            <span>🍰</span> Baker's Brain
          </h1>
        </div>
        <div>
          {stats.lowStockCount > 0 && (
            <span
              onClick={() => setCurrentPage("inventory")}
              className="cursor-pointer bg-yellow-400 text-rose-950 font-extrabold text-xs px-2 py-0.5 rounded-full shadow-sm"
              title="Low Stock Alert"
            >
              ⚠️ {stats.lowStockCount} Low
            </span>
          )}
        </div>
      </header>

      {/* Drawer Menu */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDrawer(false)} />
          <div className="relative bg-white w-72 h-full shadow-2xl p-5 flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🧁</span>
                  <div>
                    <h2 className="font-bold text-gray-800">Baker's Brain</h2>
                    <p className="text-xs text-gray-500">Smart Bakery Management</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {[
                  { id: "dashboard", label: "Dashboard", icon: "🏠" },
                  { id: "neworder", label: "New Order (Quick)", icon: "⚡" },
                  { id: "orders", label: "Orders Manager", icon: "📦" },
                  { id: "products", label: "Products Catalog", icon: "🎂" },
                  { id: "inventory", label: "Raw Ingredients", icon: "🥣" },
                  { id: "purchases", label: "Purchase History", icon: "🧾" },
                  { id: "reports", label: "Reports & Analytics", icon: "📊" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPage(item.id);
                      setShowDrawer(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      currentPage === item.id
                        ? "bg-rose-50 text-rose-600 font-bold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="mt-6 pt-4 border-t space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3">Data & Backup</p>
                <button
                  onClick={exportDatabaseJSON}
                  className="w-full text-left text-xs text-gray-600 hover:bg-gray-100 px-3 py-2 rounded flex items-center gap-2"
                >
                  💾 Export JSON Backup
                </button>
                <button
                  onClick={exportOrdersCSV}
                  className="w-full text-left text-xs text-gray-600 hover:bg-gray-100 px-3 py-2 rounded flex items-center gap-2"
                >
                  📑 Download Orders (CSV)
                </button>
              </div>
            </div>

            <div className="pt-4 border-t text-center text-xs text-gray-400">Offline First • V1.0.0</div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto">
        {currentPage === "dashboard" && <DashboardView onNavigate={setCurrentPage} />}
        {currentPage === "neworder" && <QuickOrderView onOrderSaved={() => setCurrentPage("orders")} />}
        {currentPage === "orders" && <OrdersView onNavigate={setCurrentPage} />}
        {currentPage === "products" && <ProductsView onNavigate={setCurrentPage} />}
        {currentPage === "inventory" && <InventoryView onNavigate={setCurrentPage} />}
        {currentPage === "purchases" && <PurchasesView onBack={() => setCurrentPage("inventory")} />}
        {currentPage === "reports" && <ReportsView />}
        {currentPage.startsWith("recipe-") && (
          <RecipeBuilderView
            productCode={currentPage.replace("recipe-", "")}
            onBack={() => setCurrentPage("products")}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 py-2 flex justify-between items-center z-40 shadow-lg">
        <button
          onClick={() => setCurrentPage("dashboard")}
          className={`flex flex-col items-center gap-1 transition ${
            currentPage === "dashboard" ? "text-rose-600 font-bold" : "text-gray-400"
          }`}
        >
          <span className="text-lg">🏠</span>
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button
          onClick={() => setCurrentPage("orders")}
          className={`flex flex-col items-center gap-1 transition ${
            currentPage === "orders" ? "text-rose-600 font-bold" : "text-gray-400"
          }`}
        >
          <span className="text-lg">📋</span>
          <span className="text-[10px]">Orders</span>
        </button>

        <button
          onClick={() => setCurrentPage("neworder")}
          className="bg-rose-600 hover:bg-rose-700 text-white w-12 h-12 rounded-full flex items-center justify-center -mt-6 shadow-lg border-4 border-white transition transform active:scale-95"
          title="New Order"
        >
          <span className="text-2xl font-bold">+</span>
        </button>

        <button
          onClick={() => setCurrentPage("products")}
          className={`flex flex-col items-center gap-1 transition ${
            currentPage === "products" || currentPage.startsWith("recipe-")
              ? "text-rose-600 font-bold"
              : "text-gray-400"
          }`}
        >
          <span className="text-lg">🎂</span>
          <span className="text-[10px]">Products</span>
        </button>

        <button
          onClick={() => setCurrentPage("reports")}
          className={`flex flex-col items-center gap-1 transition ${
            currentPage === "reports" ? "text-rose-600 font-bold" : "text-gray-400"
          }`}
        >
          <span className="text-lg">📊</span>
          <span className="text-[10px]">Reports</span>
        </button>
      </nav>
    </div>
  );
}