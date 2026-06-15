import React, { useState } from "react";
import { User, Bell, Eye, Lock } from "lucide-react";
import { AlertEngine, AlertCategory } from "../services/portfolio/AlertEngine";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/auth/authService";
import { mapAuthError } from "../services/auth/authErrorMapper";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";

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
    if (!email) {
      setResetError("No email address available.");
      return;
    }
    setResetError("");
    setResetSent(false);
    try {
      await authService.sendPasswordReset(email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (error) {
      setResetError(mapAuthError(error));
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6 select-none pb-12 text-slate-200 font-sans max-w-5xl mx-auto antialiased">
      <header className="border-b border-slate-800 pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage workspace settings, notifications and preferences.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Tab Sidebar */}
        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-2 pb-4 md:pb-0 border-b md:border-b-0 md:border-r border-slate-800 pr-0 md:pr-4">
          {[
            { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
            { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
            { id: "appearance", label: "Appearance", icon: <Eye className="w-4 h-4" /> },
            { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold text-left transition shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-slate-800 text-white font-bold"
                  : "bg-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
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
                <p className="text-xs text-slate-400">Review your workspace identity details.</p>
              </div>
              <div className="space-y-4 max-w-md">
                <Input
                  label="Full Name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaveNotice("");
                  }}
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  disabled
                  className="opacity-50 cursor-not-allowed"
                />
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setSaveNotice("Profile changes saved locally for this session.")}
                >
                  Save Profile
                </Button>
                {saveNotice && (
                  <p className="text-xs text-emerald-400">{saveNotice}</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Notifications Channel</h2>
                <p className="text-xs text-slate-400">Control alert categories monitored for watchlists.</p>
              </div>
              <div className="space-y-3 max-w-md">
                {(["Factor", "Risk", "Momentum", "News", "Market"] as AlertCategory[]).map((cat) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800 rounded-xl"
                  >
                    <div>
                      <span className="text-xs font-semibold text-white block">{cat} Alerts</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Monitors {cat.toLowerCase()} analysis updates.
                      </span>
                    </div>
                    <button
                      onClick={() => toggleAlertCategory(cat)}
                      className={`w-10 h-5 rounded-full transition relative cursor-pointer ${
                        alertCategories[cat] ? "bg-slate-200" : "bg-slate-800"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-slate-950 absolute top-0.5 transition ${
                          alertCategories[cat] ? "left-[22px]" : "left-[2px]"
                        }`}
                      />
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
                <p className="text-xs text-slate-400">Configure your workspace interface theme.</p>
              </div>
              <div className="max-w-md">
                <Card className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block">Dark Professional Theme</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Slate/Zinc Dark theme is default and cannot be modified.
                    </span>
                  </div>
                  <Badge variant="neutral">Locked</Badge>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Security & Credentials</h2>
                <p className="text-xs text-slate-400">Manage password and credentials security.</p>
              </div>
              <div className="max-w-md">
                <Card className="space-y-4 p-5 bg-slate-900/40 border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block mb-1">Reset Password</span>
                    <p className="text-[10px] text-slate-400 mb-3">
                      We will send a password change link to your registered email address.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => void handlePasswordReset()}>
                      Send Reset Link
                    </Button>
                    {resetSent && (
                      <p className="mt-2 text-xs text-emerald-400">Reset instructions sent successfully.</p>
                    )}
                    {resetError && <p className="mt-2 text-xs text-rose-400">{resetError}</p>}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
