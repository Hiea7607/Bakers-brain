import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export const ResetPasswordView = ({ onComplete }: { onComplete: () => void }) => {
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("Please enter your new secure password below.");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Success! Your password has been updated.");
      setIsSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 font-sans shadow-2xl">
      <div className="w-full bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-6">
        <h2 className="text-2xl font-extrabold text-center text-gray-900">
          Reset Password
        </h2>

        <div className={`p-3 text-sm text-center rounded-lg ${isSuccess ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'} font-medium`}>
          {message}
        </div>

        {!isSuccess ? (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                placeholder="Min 6 characters..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-lg text-sm shadow-md transition active:scale-95 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        ) : (
          <button
            onClick={onComplete}
            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-lg text-sm transition shadow-md"
          >
            Return to Login
          </button>
        )}
      </div>
    </div>
  );
};