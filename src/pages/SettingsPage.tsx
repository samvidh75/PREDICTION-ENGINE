import React, { useState } from "react";
import { User, Bell, Shield, Lock, Eye, Trash2 } from "lucide-react";
import { AlertEngine, AlertCategory } from "../services/portfolio/AlertEngine";
import { useAuth } from "../context/AuthContext";

type SettingsTab = "profile" | "notifications" | "appearance" | "security";

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState(user?.displayName || "Samvidh");
  const [email, setEmail] = useState(user?.email || "samvidh@stockstory.in");

  const [alertCategories, setAlertCategories] = useState<Record<AlertCategory, boolean>>(() => ({
    Factor: AlertEngine.isCategoryEnabled("Factor"),
    Risk: AlertEngine.isCategoryEnabled("Risk"),
    Momentum: AlertEngine.isCategoryEnabled("Momentum"),
    News: AlertEngine.isCategoryEnabled("News"),
    Market: AlertEngine.isCategoryEnabled("Market"),
  }));

  const toggleAlertCategory = (cat: AlertCategory) => {
    const next = !alertCategories[cat];
    AlertEngine.setCategoryStatus(cat, next);
    setAlertCategories(prev => ({ ...prev, [cat]: next }));
  };

  const handlePasswordReset = () => {
    if (email) {
      void AlertEngine.getAlerts(); // Trigger sync
      alert(`Password reset link sent to ${email}`);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-8 select-none p-6 md:p-8 bg-[#020304] text-white min-h-screen font-sans max-w-5xl mx-auto antialiased">
      {/* Header */}
      <div className="border-b border-white/5 pb-6">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-400 block mb-1">
          CONFIG
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* Tab Sidebar */}
        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-2 pb-4 md:pb-0 border-b md:border-b-0 md:border-r border-white/5 pr-0 md:pr-4">
          {[
            { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
            { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
            { id: "appearance", label: "Appearance", icon: <Eye className="w-4 h-4" /> },
            { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-left transition-all shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-black font-bold"
                  : "bg-transparent text-white/50 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Panel */}
        <div className="md:col-span-3 min-h-[300px]">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Profile Information</h2>
                <p className="text-xs text-gray-400">Update your primary identity metrics.</p>
              </div>
              <div className="space-y-4 max-w-md">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-white/40 cursor-not-allowed"
                  />
                </div>
                <button className="px-5 py-2.5 bg-white text-black font-semibold text-xs rounded-xl hover:bg-cyan-400 transition-all cursor-pointer">
                  Save Profile
                </button>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Notifications Channel Preferences</h2>
                <p className="text-xs text-gray-400">Control which alerts are generated for your watchlists.</p>
              </div>
              <div className="space-y-3 max-w-md">
                {(["Factor", "Risk", "Momentum", "News", "Market"] as AlertCategory[]).map(cat => (
                  <div key={cat} className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 rounded-xl">
                    <div>
                      <span className="text-xs font-bold text-white block font-mono">{cat} Alerts</span>
                      <span className="text-[10px] text-gray-500 block">System diagnostics changes for {cat.toLowerCase()} analysis.</span>
                    </div>
                    <button
                      onClick={() => toggleAlertCategory(cat)}
                      className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${
                        alertCategories[cat] ? "bg-cyan-400" : "bg-white/10"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                        alertCategories[cat] ? "left-5.5" : "left-0.5"
                      }`} style={{ left: alertCategories[cat] ? "22px" : "2px" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Appearance Settings</h2>
                <p className="text-xs text-gray-400">Configure your workspace interface theme.</p>
              </div>
              <div className="max-w-md p-4 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Dark Premium Mode</span>
                  <span className="text-[10px] text-gray-500 block">Deep Space Black theme is default and cannot be changed.</span>
                </div>
                <span className="text-[10px] font-bold text-cyan-400 font-mono uppercase bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                  LOCKED
                </span>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Security & Access</h2>
                <p className="text-xs text-gray-400">Manage credentials and authorization access keys.</p>
              </div>
              <div className="max-w-md p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-4">
                <div>
                  <span className="text-xs font-bold text-white block mb-1">Reset Password</span>
                  <p className="text-[10px] text-gray-400 mb-3">We will send a password change validation token link to your registered email address.</p>
                  <button 
                    onClick={handlePasswordReset}
                    className="px-4 py-2 border border-white/10 text-white font-semibold text-xs rounded-xl hover:bg-white/5 transition-all cursor-pointer bg-transparent"
                  >
                    Send Reset Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
