import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { formatToUniversalDate } from "./lib/dateUtils";

interface ClientSlot {
  user_id: string;
  email: string;
  role: string;
  business_name: string;
  owner_name: string;
  mobile_number: string;
  address: string;
  plan_type: string;
  expiry_date: string;
  is_locked: boolean;
}

export function AdminPortalView({ onLogout }: { onLogout: () => void }) {
  const [clients, setClients] = useState<ClientSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastAdminSession, setLastAdminSession] = useState<{ name: string; date: string } | null>(null);

  useEffect(() => {
    fetchClients();
    const savedSession = localStorage.getItem("lastAdminSession");
    if (savedSession) {
      setLastAdminSession(JSON.parse(savedSession));
    }
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_roster")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching client roster:", error.message);
    } else {
      const clientOnlyList = (data || []).filter(c => c.role !== 'admin');
      setClients(clientOnlyList);
    }
    setLoading(false);
  };

  const getStatusLight = (expiryDateStr: string, isLocked: boolean) => {
    if (isLocked) return { color: "bg-red-500", label: "Suspended / Locked" };
    if (!expiryDateStr) return { color: "bg-gray-400", label: "No Expiry Set" };

    const today = new Date();
    const expiry = new Date(expiryDateStr);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 15) {
      return { color: "bg-emerald-500", label: `${diffDays} days left` };
    } else if (diffDays >= 0) {
      return { color: "bg-amber-500", label: `${diffDays} days left` };
    } else {
      return { color: "bg-rose-600", label: `Expired` };
    }
  };

  // Toggle Kill Switch / Lock Status using user_id
  const toggleLockStatus = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("client_roster")
      .update({ is_locked: !currentStatus })
      .eq("user_id", userId);

    if (error) {
      alert("Failed to update status: " + error.message);
    } else {
      setClients(clients.map(c => c.user_id === userId ? { ...c, is_locked: !currentStatus } : c));
    }
  };

  const filteredClients = clients.filter(c => 
    c.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto min-h-screen bg-gray-50 p-6 font-sans">
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <span>🛡️</span> Admin Command Center
          </h1>
          <p className="text-xs text-gray-500">
            Managing 410 Total Client Slots • {clients.length} Active Client Roster Accounts
          </p>
        </div>

        <div className="flex items-center gap-4">
          {lastAdminSession && (
            <div className="text-right text-xs bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
              <span className="text-gray-400 block">Last Admin Session:</span>
              <span className="font-bold text-gray-700">{lastAdminSession.name}</span>
              <span className="text-gray-400 ml-1">({lastAdminSession.date})</span>
            </div>
          )}
          <button
            onClick={onLogout}
            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs px-4 py-2.5 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by business name, owner, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-96 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
        />
        <button
          onClick={fetchClients}
          className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm shadow transition"
        >
          🔄 Refresh Slots
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading client slots...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No client slots added yet. Add a client in Supabase to see them appear here!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="p-4">Status</th>
                  <th className="p-4">Business & Owner</th>
                  <th className="p-4">Contact Details</th>
                  <th className="p-4">Plan & Expiry</th>
                  <th className="p-4 text-center">Kill Switch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredClients.map((client, index) => {
                  const status = getStatusLight(client.expiry_date, client.is_locked);
                  const planType = (client.plan_type || "monthly").toLowerCase();

                  return (
                    <tr key={client.user_id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 align-top">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${status.color} shadow-sm`} title={status.label} />
                          <span className="text-[11px] font-bold text-gray-700">Slot #{index + 1}</span>
                        </div>
                      </td>

                      <td className="p-4 align-top">
                        <div className="font-bold text-gray-900">{client.business_name || "Unnamed Business"}</div>
                        <div className="text-xs text-gray-500">{client.owner_name || "No Owner Assigned"}</div>
                      </td>

                      <td className="p-4 align-top">
                        <div className="text-xs font-mono text-gray-700">{client.email}</div>
                        <div className="text-xs text-gray-500">{client.mobile_number || "No Mobile"}</div>
                      </td>

                      <td className="p-4 align-top">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                            planType === 'yearly' 
                              ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {planType}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {client.expiry_date ? `Expires: ${formatToUniversalDate(new Date(client.expiry_date))}` : "No Expiry Set"}
                        </div>
                      </td>

                      <td className="p-4 align-top text-center">
                        <button
                          onClick={() => toggleLockStatus(client.user_id, client.is_locked)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            client.is_locked
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          }`}
                        >
                          {client.is_locked ? "🔒 Suspended" : "🟢 Active"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}