import React, { useState } from "react";
import { User, Bell, Eye, Lock } from "lucide-react";
import { AlertEngine, AlertCategory } from "../services/portfolio/AlertEngine";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/auth/authService";
import { mapAuthError } from "../services/auth/authErrorMapper";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

type SettingsTab = "profile" | "notifications" | "appearance" | "security";

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState(user?.displayName || "");
  const [email] = useState(user?.email || "");
  const [saveNotice, setSaveNotice] = useState("");

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
    setAlertCategories((prev) => ({ ...prev, [cat]: next }));
  };

  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  const handlePasswordReset = async () => {
    if (!email) { setResetError("No email address available."); return; }
    setResetError(""); setResetSent(false);
    try { await authService.sendPasswordReset(email); setResetSent(true); setTimeout(() => setResetSent(false), 5000); }
    catch (error) { setResetError(mapAuthError(error)); }
  };

  return (
    <div className="flex flex-col space-y-6 antialiased" style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#0f1419" }}>
      <header className="pb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#0f1419" }}>Settings</h1>
        <p className="mt-1.5 text-sm" style={{ color: "#536471" }}>Manage workspace settings, notifications and preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        <div className="flex flex-row gap-2 overflow-x-auto pb-4 pr-0 md:flex-col md:overflow-visible md:border-b-0 md:pb-0 md:pr-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)", borderRight: "none" }}>
          {[
            { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
            { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
            { id: "appearance", label: "Appearance", icon: <Eye className="w-4 h-4" /> },
            { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-left transition shrink-0 cursor-pointer ${
                activeTab === tab.id ? "text-white shadow-sm" : "hover:bg-white/40"
              }`}
              style={activeTab === tab.id ? { background: "#1a6e4a", color: "white" } : { background: "transparent", color: "#536471" }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="md:col-span-3 min-h-[300px]">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div><h2 className="text-lg font-semibold mb-1" style={{ color: "#0f1419" }}>Profile information</h2><p className="text-sm" style={{ color: "#536471" }}>Review your workspace identity details.</p></div>
              <div className="space-y-4 max-w-md">
                <Input label="Full Name" type="text" value={name} glass onChange={(e) => { setName(e.target.value); setSaveNotice(""); }} />
                <Input label="Email Address" type="email" value={email} disabled glass className="opacity-50 cursor-not-allowed" />
                <div className="rounded-xl p-3 text-sm" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#b8860b" }}>
                  Profile name is stored locally for this session and is not synced to the server.
                </div>
                <Button type="button" variant="primary" onClick={() => setSaveNotice("Name saved for this session.")}>Save name</Button>
                {saveNotice && <p className="text-sm" style={{ color: "#1a6e4a" }}>{saveNotice}</p>}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div><h2 className="text-lg font-semibold mb-1" style={{ color: "#0f1419" }}>Notifications channel</h2><p className="text-sm" style={{ color: "#536471" }}>Control alert categories monitored for watchlists.</p></div>
              <div className="space-y-3 max-w-md">
                {(["Factor", "Risk", "Momentum", "News", "Market"] as AlertCategory[]).map((cat) => (
                  <div key={cat} className="flex items-center justify-between rounded-xl p-4" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
                    <div>
                      <span className="block text-sm font-semibold" style={{ color: "#0f1419" }}>{cat} Alerts</span>
                      <span className="mt-0.5 block text-xs" style={{ color: "#536471" }}>Monitors {cat.toLowerCase()} analysis updates.</span>
                    </div>
                    <button onClick={() => toggleAlertCategory(cat)} className={`w-10 h-5 rounded-full transition relative cursor-pointer ${alertCategories[cat] ? 'bg-accent-success' : ''}`} style={{ background: alertCategories[cat] ? "#1a6e4a" : "#cbd5e1" }}>
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition ${alertCategories[cat] ? "left-[22px]" : "left-[2px]"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div><h2 className="text-lg font-semibold mb-1" style={{ color: "#0f1419" }}>Appearance settings</h2><p className="text-sm" style={{ color: "#536471" }}>Configure your workspace interface theme.</p></div>
              <div className="max-w-md">
                <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
                  <span className="block text-sm font-semibold" style={{ color: "#0f1419" }}>Research workspace theme</span>
                  <span className="mt-1 block text-sm" style={{ color: "#536471" }}>The interface uses a fixed light theme optimised for equity research. Dark mode is not available.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div><h2 className="text-lg font-semibold mb-1" style={{ color: "#0f1419" }}>Security and credentials</h2><p className="text-sm" style={{ color: "#536471" }}>Manage password and credentials security.</p></div>
              <div className="max-w-md">
                <div className="space-y-4 rounded-xl p-6" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
                  <div>
                    <span className="mb-1 block text-sm font-semibold" style={{ color: "#0f1419" }}>Reset password</span>
                    <p className="mb-3 text-sm" style={{ color: "#536471" }}>We will send a password change link to your registered email address.</p>
                    <Button variant="outline" size="md" onClick={() => void handlePasswordReset()}>Send Reset Link</Button>
                    {resetSent && <p className="mt-3 text-sm" style={{ color: "#1a6e4a" }}>Reset instructions sent successfully.</p>}
                    {resetError && <p className="mt-3 text-sm" style={{ color: "#c0392b" }}>{resetError}</p>}
                  </div>
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
