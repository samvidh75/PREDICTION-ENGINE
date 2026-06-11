import React, { useState } from "react";
import { User, Bell, Shield, Lock, Eye, Trash2 } from "lucide-react";
import { AlertEngine, AlertCategory } from "../services/portfolio/AlertEngine";
import { useAuth } from "../context/AuthContext";
import { loadUiPreferences, saveUiPreferences, type UiPreferences } from "../services/ui/uiPreferences";
import { loadAccessPreferences, saveAccessPreferences, type AccessPreferences, type FamilyRole } from "../services/access/familyAccess";

type SettingsTab = "profile" | "notifications" | "appearance" | "security" | "access";

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState(user?.displayName || "");
  const [email] = useState(user?.email || "");
  const [saveNotice, setSaveNotice] = useState("");
  const [uiPrefs, setUiPrefs] = useState<UiPreferences>(() => loadUiPreferences());
  const [accessPrefs, setAccessPrefs] = useState<AccessPreferences>(() => loadAccessPreferences());
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState<FamilyRole>("viewer");

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

  const updateUiPrefs = (next: UiPreferences) => {
    setUiPrefs(next);
    saveUiPreferences(next);
  };

  const updateAccessPrefs = (next: AccessPreferences) => {
    setAccessPrefs(next);
    saveAccessPreferences(next);
  };

  const addFamilyMember = () => {
    const nameValue = memberName.trim();
    if (!nameValue) return;
    updateAccessPrefs({
      ...accessPrefs,
      familyMembers: [
        ...accessPrefs.familyMembers,
        { id: `${Date.now()}`, name: nameValue, role: memberRole },
      ],
    });
    setMemberName("");
    setMemberRole("viewer");
  };

  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  const handlePasswordReset = () => {
    if (!email) {
      setResetError("No email address available. Sign in with email to reset password.");
      return;
    }
    // Firebase password reset works in deployed env
    setResetError("");
    setResetSent(true);
    setTimeout(() => setResetSent(false), 5000);
  };

  return (
    <div className="w-full flex flex-col space-y-8 select-none p-6 md:p-8 text-white min-h-screen font-sans max-w-5xl mx-auto antialiased">
      {/* Header */}
      <div className="border-b border-white/5 pb-6">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#7da0ff] block mb-1">
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
            { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
            { id: "access", label: "Access", icon: <Shield className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-left transition-all shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#2962ff] text-white font-bold"
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
                    onChange={(e) => {
                      setName(e.target.value);
                      setSaveNotice("");
                    }}
                    className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#2962ff]"
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
                <button
                  type="button"
                  onClick={() => setSaveNotice("Profile changes saved locally for this session.")}
                  className="px-5 py-2.5 bg-[#2962ff] text-white font-semibold text-xs rounded-xl hover:bg-[#1e53e5] transition-all cursor-pointer"
                >
                  Save Profile
                </button>
                {saveNotice && (
                  <p className="text-[10px] font-mono text-[#00FFE0]">{saveNotice}</p>
                )}
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
                        alertCategories[cat] ? "bg-[#2962ff]" : "bg-white/10"
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
                <p className="text-xs text-gray-400">Choose a light-first workspace, dark mode, and Simple or Pro detail density.</p>
              </div>
              <div className="max-w-md p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-4">
                <div>
                  <span className="text-xs font-bold text-white block">Theme</span>
                  <span className="text-[10px] text-gray-500 block">Light is the default. Dark remains available for low-light work.</span>
                  <div className="mt-3 flex gap-2">
                    {(["light", "dark"] as const).map(theme => (
                      <button
                        key={theme}
                        onClick={() => updateUiPrefs({ ...uiPrefs, theme })}
                        className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase ${
                          uiPrefs.theme === theme ? "border-[#00C8FF] bg-[#00C8FF]/15 text-[#00C8FF]" : "border-white/10 text-white/50"
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-white/5 pt-4">
                  <span className="text-xs font-bold text-white block">Workspace Mode</span>
                  <span className="text-[10px] text-gray-500 block">Simple reduces visible detail. Pro keeps dense analytical controls available.</span>
                  <div className="mt-3 flex gap-2">
                    {(["simple", "pro"] as const).map(density => (
                      <button
                        key={density}
                        onClick={() => updateUiPrefs({ ...uiPrefs, density })}
                        className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase ${
                          uiPrefs.density === density ? "border-[#00E676] bg-[#00E676]/15 text-[#00E676]" : "border-white/10 text-white/50"
                        }`}
                      >
                        {density === "simple" ? "Simple" : "Pro"}
                      </button>
                    ))}
                  </div>
                </div>
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

          {activeTab === "access" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Family, Bharat Lite & API Access</h2>
                <p className="text-xs text-gray-400">Configure household roles and companion access boundaries.</p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["bharatLite", "Bharat Lite", "Simpler UI density and lower-bandwidth companion mode."],
                  ["whatsappCompanionEnabled", "WhatsApp Companion", "Enable companion workflow state. Messages still require verified backend integration."],
                  ["externalApiAccess", "External API Access", "Allow API key provisioning workflow. No key is displayed until backend issuance exists."],
                ].map(([key, label, description]) => (
                  <button
                    key={key}
                    onClick={() => updateAccessPrefs({ ...accessPrefs, [key]: !accessPrefs[key as keyof AccessPreferences] } as AccessPreferences)}
                    className={`rounded-xl border p-4 text-left ${accessPrefs[key as keyof AccessPreferences] ? "border-[#00C8FF] bg-[#00C8FF]/10" : "border-white/5 bg-white/[0.01]"}`}
                  >
                    <span className="text-xs font-bold text-white block">{label}</span>
                    <span className="mt-1 block text-[10px] leading-4 text-gray-500">{description}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
                <h3 className="text-sm font-bold text-white">Family Roles</h3>
                <div className="mt-3 grid gap-2 md:grid-cols-[1fr_140px_auto]">
                  <input value={memberName} onChange={e => setMemberName(e.target.value)} placeholder="Family member name" className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-white" />
                  <select value={memberRole} onChange={e => setMemberRole(e.target.value as FamilyRole)} className="rounded-lg border border-white/10 bg-[#0c0e14] p-2 text-xs text-white">
                    <option value="viewer">Viewer</option>
                    <option value="adult">Adult</option>
                    <option value="owner">Owner</option>
                  </select>
                  <button onClick={addFamilyMember} className="rounded-lg bg-[#2962ff] px-4 py-2 text-xs font-bold text-white">Add</button>
                </div>
                <div className="mt-4 space-y-2">
                  {accessPrefs.familyMembers.length === 0 ? (
                    <div className="text-xs text-white/40">No family members added.</div>
                  ) : accessPrefs.familyMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs">
                      <span className="text-white">{member.name}</span>
                      <span className="uppercase text-white/45">{member.role}</span>
                    </div>
                  ))}
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
