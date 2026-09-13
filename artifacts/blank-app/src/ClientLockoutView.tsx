import React from "react";

interface ClientLockoutViewProps {
  reason: "locked" | "expired";
  businessName: string;
  onLogout: () => void;
}

export function ClientLockoutView({ reason, businessName, onLogout }: ClientLockoutViewProps) {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 font-sans shadow-2xl">
      <div className="bg-white w-full p-8 rounded-2xl shadow-xl border border-gray-100 text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-inner">
          🔒
        </div>
        
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Access Restricted</h1>
          <p className="text-xs font-semibold text-rose-600 mt-1">{businessName || "Business Account"}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs text-gray-600 leading-relaxed">
          {reason === "locked" ? (
            <span>Your account has been temporarily suspended by the administrator. Please contact support to restore access.</span>
          ) : (
            <span>Your subscription plan has reached its expiry date. Please renew your subscription to continue managing your bakery operations.</span>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <div className="text-xs text-gray-500">
            Need help or want to renew? <br />
            <span className="font-bold text-gray-800">Contact System Administrator</span>
          </div>

          <button
            onClick={onLogout}
            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-lg text-xs shadow-md transition active:scale-95"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}