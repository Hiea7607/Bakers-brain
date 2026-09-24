import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BakeryProvider, useBakery } from "./context/BakeryContext";
import { DashboardView } from "./pages/DashboardView";
import { QuickOrderView } from "./pages/QuickOrderView";
import { OrdersView } from "./pages/OrdersView";
import { ProductsView } from "./pages/ProductsView";
import { RecipeBuilderView } from "./pages/RecipeBuilderView";
import { InventoryView } from "./pages/InventoryView";
import { ReportsView } from "./pages/ReportsView";
import { AdminPortalView } from "./AdminPortalView";
import { ClientLockoutView } from "./ClientLockoutView";
import { formatToUniversalDate } from "./lib/dateUtils";
import { supabase } from "./lib/supabaseClient";
import { InvoicesView } from './pages/InvoicesView';

const queryClient = new QueryClient();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("bb_auth") === "true");
  const [userRole, setUserRole] = useState(() => localStorage.getItem("bb_role") || "business");

  const lockoutReason = localStorage.getItem("bb_lockout_reason") as "locked" | "expired" | null;
  const businessName = localStorage.getItem("bb_business_name") || "Business Account";

  const handleLogin = (role: string) => {
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("bb_auth");
    localStorage.removeItem("bb_role");
    localStorage.removeItem("bb_lockout_reason");
    localStorage.removeItem("bb_business_name");
    setIsAuthenticated(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BakeryProvider>
        {!isAuthenticated ? (
          <LandingGateway onLogin={handleLogin} />
        ) : lockoutReason ? (
          <ClientLockoutView 
            reason={lockoutReason} 
            businessName={businessName} 
            onLogout={handleLogout} 
          />
        ) : userRole === 'admin' ? (
          <AdminPortalView onLogout={handleLogout} />
        ) : (
          <BakersBrainApp userRole={userRole} onLogout={handleLogout} />
        )}
      </BakeryProvider>
    </QueryClientProvider>
  );
}

// Secure Landing / Login Gateway
function LandingGateway({ onLogin }: { onLogin: (role: string) => void }) {
  const [activeTab, setActiveTab] = useState("business");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastAdminSession, setLastAdminSession] = useState<{name: string, date: string} | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("lastAdminSession");
    if (saved) {
      setLastAdminSession(JSON.parse(saved));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const { data: rosterData, error: rosterError } = await supabase
        .from('client_roster')
        .select('role, owner_name, is_locked, expiry_date, business_name')
        .eq('email', authData.user.email)
        .single();

      if (rosterError || !rosterData) {
        await supabase.auth.signOut();
        throw new Error("Account configuration not found.");
      }

      const requestedPortal = activeTab.toLowerCase(); 

      if (rosterData.role !== requestedPortal) {
        await supabase.auth.signOut();
        throw new Error(`Unauthorized. Please use the ${rosterData.role} portal.`);
      }

      if (rosterData.role === 'admin') {
        localStorage.setItem("lastAdminSession", JSON.stringify({
          name: rosterData.owner_name || "Md Golam Rabbany",
          date: formatToUniversalDate(new Date())
        }));
      }

      if (rosterData.role === 'business') {
        const isLocked = rosterData.is_locked;
        const isExpired = rosterData.expiry_date ? new Date(rosterData.expiry_date) < new Date() : false;

        localStorage.setItem("bb_business_name", rosterData.business_name || "Business Account");

        if (isLocked || isExpired) {
          localStorage.setItem("bb_lockout_reason", isLocked ? "locked" : "expired");
        } else {
          localStorage.removeItem("bb_lockout_reason");
        }
      }

      localStorage.setItem("bb_auth", "true");
      localStorage.setItem("bb_role", rosterData.role);
      localStorage.setItem("bb_user_email", email);

      onLogin(rosterData.role);

    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 font-sans shadow-2xl">
      <div className="w-full text-center space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex justify-center items-center gap-2">
            <span>💼</span> Business Brain
          </h1>
          <p className="text-xs text-gray-500 mt-1">Secure Management Gateway</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 text-left">
          <div className="flex mb-6 border-b border-gray-200">
            <button 
              type="button"
              onClick={() => { setActiveTab('business'); setEmail(''); setPassword(''); setError(''); }}
              className={`flex-1 pb-3 text-center text-xs font-bold transition-colors ${activeTab === 'business' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Business Portal
            </button>
            <button 
              type="button"
              onClick={() => { setActiveTab('admin'); setEmail(''); setPassword(''); setError(''); }}
              className={`flex-1 pb-3 text-center text-xs font-bold transition-colors ${activeTab === 'admin' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Admin Portal
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                required
              />
            </div>
            {error && <p className="text-xs font-bold text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-lg text-sm shadow-md transition active:scale-95 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Unlock Dashboard →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function BakersBrainApp({ userRole, onLogout }: { userRole: string; onLogout: () => void }) {
  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem("bb_current_page") || "dashboard");
  const [showDrawer, setShowDrawer] = useState(false);

  const businessName = localStorage.getItem("bb_business_name") || "Business Account";
  const userEmail = localStorage.getItem("bb_user_email") || "user@bakersbrain.com";

  const { stats = {} as any, products = [], exportDatabaseJSON, exportOrdersCSV, fetchData } = useBakery();

  const targetMargin = Number(localStorage.getItem("bb_target_margin")) || 20;
  const issueProductsCount = (products || []).filter(p => {
    const netProfit = p.price - (p.cost || 0);
    const margin = p.price > 0 ? Math.round((netProfit / p.price) * 100) : 0;
    return netProfit < 0 || margin < targetMargin;
  }).length;

  const handleSendDailySummary = () => {
    const subject = encodeURIComponent(`Daily Summary: ${businessName} - ${new Date().toLocaleDateString()}`);
    const body = encodeURIComponent(
      `Daily Summary: ${businessName} - ${new Date().toLocaleDateString()}\n\n` +
      `💰 Financials:\n` +
      `Total Sales: ৳ ${stats.todaySales || 0}\n` +
      `Net Profit: ৳ ${stats.todayProfit || 0}\n` +
      `Pending Dues: ৳ ${stats.pendingPaymentsAmount || 0}\n\n` +
      `📦 Operations:\n` +
      `Orders Completed: ${stats.todayOrdersCount || 0}\n` +
      `Best Seller Today: ${stats.bestSellingProduct || 'N/A'}\n` +
      `Deliveries Due Tomorrow: ${stats.upcomingDeliveriesCount || 0}\n` +
      `New Customers: ${stats.newCustomersToday || 0}\n\n` +
      `⚠️ Kitchen Alerts:\n` +
      `Low Stock Items: ${stats.lowStockCount || 0}`
    );
    window.open(`mailto:${userEmail}?subject=${subject}&body=${body}`, "_blank");
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    localStorage.setItem("bb_current_page", currentPage);
  }, [currentPage]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-between shadow-2xl relative pb-20 font-sans">

      {/* Properly Wrapped Sticky Header */}
      <header className="bg-rose-600 text-white p-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between gap-2">

          {/* Left Side: Hamburger Menu Only */}
          <div className="flex items-center flex-shrink-0">
            <button
              onClick={() => setShowDrawer(true)}
              className="p-1.5 hover:bg-rose-700 rounded-lg transition text-white"
              title="Open Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Right Side: Full Badges & Account Info (Now Fits Perfectly!) */}
          <div className="flex items-center gap-2">

            {/* Badges with full text */}
            <div className="flex items-center gap-1.5">
              {issueProductsCount > 0 && (
                <span
                  onClick={() => setCurrentPage("products")}
                  className="cursor-pointer bg-yellow-400 text-yellow-950 font-extrabold text-[11px] px-2 py-0.5 rounded-full shadow-sm hover:bg-yellow-500 transition whitespace-nowrap"
                  title="Products below target margin"
                >
                  🚨 {issueProductsCount} Margins
                </span>
              )}

              {stats.lowStockCount > 0 && (
                <span
                  onClick={() => setCurrentPage("inventory")}
                  className="cursor-pointer bg-yellow-400 text-yellow-950 font-extrabold text-[11px] px-2 py-0.5 rounded-full shadow-sm hover:bg-yellow-500 transition whitespace-nowrap"
                  title="Low Stock Alert"
                >
                  ⬇️ {stats.lowStockCount} Low
                </span>
              )}
            </div>

            {/* Tenant Identity Display */}
            <div className="text-right border-l border-rose-500 pl-2">
              <div className="text-xs font-extrabold leading-tight truncate max-w-[140px]">{businessName}</div>
              <div className="text-[11px] text-rose-100 font-medium truncate max-w-[140px]">{userEmail}</div>
            </div>

          </div>
        </div>
      </header>

      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDrawer(false)} />
          <div className="relative bg-white w-72 h-full shadow-2xl p-5 flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💼</span>
                  <div>
                    <h2 className="font-bold text-gray-800">Business Brain</h2>
                    <p className="text-xs text-gray-500 capitalize">{userRole} Portal</p>
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
                  { id: "invoices", label: "Invoices & Dispatch", icon: "🧾" }, // <-- ADDED HERE
                  { id: "orders", label: "Orders Manager", icon: "📦" },
                  { id: "products", label: "Products Catalog", icon: "🍽️" },
                  { id: "inventory", label: "Raw Ingredients", icon: "🥣" },
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
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest px-3 mb-2">Data & Backup</p>

                <button
                  onClick={exportOrdersCSV} 
                  className="w-full text-left text-xs text-gray-600 hover:bg-gray-100 px-3 py-2.5 rounded-lg flex items-center gap-2 transition font-medium"
                >
                  📦 Daily Data (CSV)
                </button>

                <button
                  onClick={exportDatabaseJSON} 
                  className="w-full text-left text-xs text-gray-600 hover:bg-gray-100 px-3 py-2.5 rounded-lg flex items-center gap-2 transition font-medium"
                >
                  📅 Monthly Data (JSON)
                </button>

                <button
                  onClick={handleSendDailySummary}
                  className="w-full text-left text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-2.5 rounded-lg flex items-center gap-2 transition"
                >
                  ✉️ Daily Summary
                </button>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <button
                onClick={onLogout}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs py-2.5 rounded-lg transition text-center"
              >
                🚪 Secure Logout
              </button>
              <div className="text-center text-xs text-gray-400">Online First • V1.0.0</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content with professional top spacing */}
      <main className="flex-1 p-4 pt-5 overflow-y-auto">
        {currentPage === "dashboard" && <DashboardView onNavigate={setCurrentPage} />}
        {currentPage === "neworder" && <QuickOrderView onOrderSaved={() => setCurrentPage("orders")} />}
        {currentPage === "invoices" && <InvoicesView />} {/* <-- ADDED HERE */}
        {currentPage === "orders" && <OrdersView onNavigate={setCurrentPage} />}
        {currentPage === "products" && <ProductsView />}
        {currentPage === "inventory" && <InventoryView />}
        {currentPage === "reports" && <ReportsView onNavigate={setCurrentPage} />}
        {currentPage.startsWith("recipe-") && (
          <RecipeBuilderView
            productCode={currentPage.replace("recipe-", "")}
            onBack={() => setCurrentPage("products")}
          />
        )}
      </main>

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
          <span className="text-lg">🍽️</span>
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