import React, { useState, useCallback } from "react";
import { User, Bell, Eye, Lock, Trash2, FileText, BookOpen } from "lucide-react";
import { AlertEngine, AlertCategory } from "../services/portfolio/AlertEngine";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/auth/authService";
import { mapAuthError } from "../services/auth/authErrorMapper";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { ProductPanel, ProductAction, ProductPage, ProductShell, productNavigate } from "../components/product/ProductUI";
import { PortfolioEngine } from "../services/portfolio/PortfolioEngine";
import { NoteEngine } from "../services/portfolio/NoteEngine";
import { thesisSnapshotStore } from "../lib/workspace/thesisSnapshotStore";

type SettingsTab = "profile" | "notifications" | "appearance" | "security" | "workspace";

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
    <ProductShell>
      <ProductPage>
        <div className="mb-6">
          <h1 className="text-base font-semibold text-[#E6EDF3]">Settings</h1>
          <p className="mt-1 text-xs text-[#9AA7B5]">Manage workspace settings, notifications and preferences.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          <div className="flex flex-row gap-2 overflow-x-auto pb-4 md:flex-col md:overflow-visible" aria-label="Settings tabs">
            {([
              { id: "profile", label: "Profile", icon: <User className="w-4 h-4" aria-hidden="true" /> },
              { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" aria-hidden="true" /> },
              { id: "appearance", label: "Appearance", icon: <Eye className="w-4 h-4" aria-hidden="true" /> },
              { id: "security", label: "Security", icon: <Lock className="w-4 h-4" aria-hidden="true" /> },
              { id: "workspace", label: "Workspace", icon: <FileText className="w-4 h-4" aria-hidden="true" /> },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                aria-selected={activeTab === tab.id}
                aria-controls={`settings-tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-left transition shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#2962FF]/10 text-[#2962FF]"
                    : "text-[#9AA7B5] hover:text-[#E6EDF3]"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="md:col-span-3 min-h-[300px]">
            {activeTab === "profile" && (
              <div id="settings-tabpanel-profile" role="tabpanel" className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-[#E6EDF3]">Profile information</h2>
                  <p className="mt-1 text-xs text-[#9AA7B5]">Review your workspace identity details.</p>
                </div>
                <div className="space-y-4 max-w-md">
                  <Input label="Full Name" type="text" value={name} onChange={(e) => { setName(e.target.value); setSaveNotice(""); }} />
                  <Input label="Email Address" type="email" value={email} disabled className="opacity-50 cursor-not-allowed" />
                  <ProductPanel className="p-3">
                    <p className="text-xs text-[#9AA7B5]">Profile name is stored locally for this session and is not synced to the server.</p>
                  </ProductPanel>
                  <Button type="button" variant="primary" onClick={() => setSaveNotice("Name saved for this session.")}>Save name</Button>
                  {saveNotice && <p className="text-xs text-[#16A34A]">{saveNotice}</p>}
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div id="settings-tabpanel-notifications" role="tabpanel" className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-[#E6EDF3]">Notifications channel</h2>
                  <p className="mt-1 text-xs text-[#9AA7B5]">Control alert categories monitored for watchlists.</p>
                </div>
                <div className="space-y-3 max-w-md">
                  {(["Factor", "Risk", "Momentum", "News", "Market"] as AlertCategory[]).map((cat) => (
                    <ProductPanel key={cat} className="flex items-center justify-between p-4">
                      <div>
                        <span className="block text-sm font-semibold text-[#E6EDF3]">{cat} Alerts</span>
                        <span className="mt-0.5 block text-xs text-[#9AA7B5]">Monitors {cat.toLowerCase()} analysis updates.</span>
                      </div>
                      <button
                        onClick={() => toggleAlertCategory(cat)}
                        role="switch"
                        aria-checked={alertCategories[cat]}
                        aria-label={`${cat} alerts`}
                        className={`w-10 h-5 rounded-full transition relative cursor-pointer ${alertCategories[cat] ? 'bg-[#2962FF]' : 'bg-[#333]'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition ${alertCategories[cat] ? 'left-[22px]' : 'left-[2px]'}`} />
                      </button>
                    </ProductPanel>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div id="settings-tabpanel-appearance" role="tabpanel" className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-[#E6EDF3]">Appearance settings</h2>
                  <p className="mt-1 text-xs text-[#9AA7B5]">Configure your workspace interface theme.</p>
                </div>
                <div className="max-w-md">
                  <ProductPanel className="p-5">
                    <span className="block text-sm font-semibold text-[#E6EDF3]">Research workspace theme</span>
                    <span className="mt-1 block text-xs text-[#9AA7B5]">The interface uses a fixed dark theme optimised for equity research.</span>
                  </ProductPanel>
                </div>
              </div>
            )}

            {activeTab === "workspace" && (
              <div id="settings-tabpanel-workspace" role="tabpanel" className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-[#E6EDF3]">Workspace data</h2>
                  <p className="mt-1 text-xs text-[#9AA7B5]">Manage your research workspace and stored data.</p>
                </div>
                <div className="space-y-4 max-w-md">
                  <ProductPanel className="p-4">
                    <span className="block text-sm font-semibold text-[#E6EDF3]">Portfolio thesis positions</span>
                    <span className="mt-1 block text-xs text-[#9AA7B5]">{PortfolioEngine.getHoldings().length} position(s) saved locally.</span>
                  </ProductPanel>
                  <ProductPanel className="p-4">
                    <span className="block text-sm font-semibold text-[#E6EDF3]">Thesis snapshots</span>
                    <span className="mt-1 block text-xs text-[#9AA7B5]">{Object.keys(thesisSnapshotStore.getSnapshots()).length} company snapshots saved locally.</span>
                  </ProductPanel>
                  <ProductPanel className="border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.04)] p-4">
                    <div className="flex items-start gap-3">
                      <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" aria-hidden="true" />
                      <div>
                        <span className="block text-sm font-semibold text-[#E6EDF3]">Clear local workspace data</span>
                        <p className="mt-1 text-xs text-[#9AA7B5]">Remove all locally stored workspace data including notes, snapshots, and preferences. This cannot be undone.</p>
                        <button
                          type="button"
                          onClick={() => {
                            PortfolioEngine.clearHoldings();
                            NoteEngine.clearAll();
                            thesisSnapshotStore.clearAll();
                          }}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-3 py-1.5 text-[11px] font-semibold text-[#EF4444] hover:bg-[rgba(239,68,68,0.12)] transition-colors"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          Clear local data
                        </button>
                      </div>
                    </div>
                  </ProductPanel>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button type="button" onClick={() => productNavigate("terms")} className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#9AA7B5] transition-colors underline underline-offset-2">
                      <FileText className="h-3 w-3" /> Terms & Disclosures
                    </button>
                    <button type="button" onClick={() => productNavigate("methodology")} className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#9AA7B5] transition-colors underline underline-offset-2">
                      <BookOpen className="h-3 w-3" /> Research Standards
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div id="settings-tabpanel-security" role="tabpanel" className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-[#E6EDF3]">Security and credentials</h2>
                  <p className="mt-1 text-xs text-[#9AA7B5]">Manage password and credentials security.</p>
                </div>
                <div className="max-w-md">
                  <ProductPanel className="space-y-4 p-6">
                    <div>
                      <span className="mb-1 block text-sm font-semibold text-[#E6EDF3]">Reset password</span>
                      <p className="mb-3 text-xs text-[#9AA7B5]">We will send a password change link to your registered email address.</p>
                      <Button variant="outline" size="md" onClick={() => void handlePasswordReset()}>Send Reset Link</Button>
                      {resetSent && <p className="mt-3 text-xs text-[#16A34A]">Reset instructions sent successfully.</p>}
                      {resetError && <p className="mt-3 text-xs text-[#EF4444]">{resetError}</p>}
                    </div>
                  </ProductPanel>
                </div>
              </div>
            )}
          </div>
        </div>
      </ProductPage>
    </ProductShell>
  );
};

export default SettingsPage;
