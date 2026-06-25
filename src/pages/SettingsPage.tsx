import React, { useState, useEffect, useCallback } from "react";
import { Settings, LogIn, ExternalLink, Info, Sun, ChevronRight } from "lucide-react";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ProductPanel, ProductPage, ProductShell, productNavigate } from "../components/product/ProductUI";

interface UserPreferences {
  defaultSort: "score" | "quality" | "growth" | "momentum" | "valuation";
  compactRows: boolean;
  showSourceBadges: boolean;
  showPipelineHealth: boolean;
}

const STORAGE_KEY = "ss_user_preferences";

const DEFAULTS: UserPreferences = {
  defaultSort: "score",
  compactRows: false,
  showSourceBadges: true,
  showPipelineHealth: true,
};

const SORT_LABELS: Record<UserPreferences["defaultSort"], string> = {
  score: "Conviction",
  quality: "Quality",
  growth: "Growth",
  momentum: "Momentum",
  valuation: "Valuation",
};

function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`w-10 h-5 rounded-full transition relative cursor-pointer shrink-0 ${
        checked ? "bg-[#2962FF]" : "bg-[rgba(148,163,184,0.16)]"
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-[#E6EDF3] absolute top-0.5 transition ${
          checked ? "left-[22px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

export const SettingsPage: React.FC = () => {
  useDocumentTitle("Settings | StockStory India");
  const [prefs, setPrefs] = useState<UserPreferences>(loadPreferences);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const update = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPrefs((p) => ({ ...p, [key]: value }));
    },
    [],
  );

  return (
    <ProductShell>
      <ProductPage>
        <div className="mb-6">
          <h1 className="text-base font-semibold text-[#E6EDF3]">Settings</h1>
          <p className="mt-1 text-xs text-[#9AA7B5]">
            Configure your scanner, display and data preferences.
          </p>
        </div>

        <div className="space-y-6 max-w-2xl">
          {/* Display Preferences */}
          <ProductPanel className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sun className="w-4 h-4 text-[#E6EDF3]" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-[#E6EDF3]">
                Display preferences
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="defaultSort"
                  className="block text-xs font-semibold text-[#9AA7B5] mb-1.5"
                >
                  Default scanner sort
                </label>
                <select
                  id="defaultSort"
                  value={prefs.defaultSort}
                  onChange={(e) =>
                    update("defaultSort", e.target.value as UserPreferences["defaultSort"])
                  }
                  className="w-full max-w-[200px] rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(13,17,23,0.6)] px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-[#2962FF] cursor-pointer"
                >
                  {(Object.entries(SORT_LABELS) as [UserPreferences["defaultSort"], string][]).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-semibold text-[#E6EDF3]">
                    Compact scanner rows
                  </span>
                  <span className="mt-0.5 block text-xs text-[#9AA7B5]">
                    Show denser row layout with less spacing
                  </span>
                </div>
                <Toggle
                  checked={prefs.compactRows}
                  onChange={(v) => update("compactRows", v)}
                  label="Compact scanner rows"
                />
              </div>
            </div>
          </ProductPanel>

          {/* Data Preferences */}
          <ProductPanel className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-[#E6EDF3]" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-[#E6EDF3]">
                Data preferences
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-semibold text-[#E6EDF3]">
                    Show data badges
                  </span>
                  <span className="mt-0.5 block text-xs text-[#9AA7B5]">
                    Display data attribution badges on stock pages
                  </span>
                </div>
                <Toggle
                  checked={prefs.showSourceBadges}
                  onChange={(v) => update("showSourceBadges", v)}
                  label="Show data badges"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-semibold text-[#E6EDF3]">
                    Show data status panel
                  </span>
                  <span className="mt-0.5 block text-xs text-[#9AA7B5]">
                    Display data status indicator on the stock detail page
                  </span>
                </div>
                <Toggle
                  checked={prefs.showPipelineHealth}
                  onChange={(v) => update("showPipelineHealth", v)}
                  label="Show data status panel"
                />
              </div>
            </div>
          </ProductPanel>

          {/* Account */}
          <ProductPanel className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <LogIn className="w-4 h-4 text-[#E6EDF3]" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-[#E6EDF3]">Account</h2>
            </div>
            <p className="text-xs text-[#9AA7B5] mb-4">
              Sign in to save preferences across devices.
            </p>
            <button
              type="button"
              onClick={() => productNavigate("login")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2962FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B82FF] transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              Sign in
            </button>
          </ProductPanel>

          {/* About */}
          <ProductPanel className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-[#E6EDF3]" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-[#E6EDF3]">About</h2>
            </div>

            <div className="space-y-3 text-xs text-[#9AA7B5]">
              <div className="flex justify-between">
                <span>App version</span>
                <span className="text-[#E6EDF3] font-medium">2.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Engine version</span>
                <span className="text-[#E6EDF3] font-medium">Unified v2.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Research basis</span>
                <span className="text-[#E6EDF3] font-medium text-right">
                  Multi-source financial data
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => productNavigate("methodology")}
                className="inline-flex items-center justify-between rounded-lg border border-[rgba(148,163,184,0.16)] px-3 py-2.5 text-xs font-semibold text-[#E6EDF3] hover:bg-[rgba(148,163,184,0.06)] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-[#9AA7B5]" aria-hidden="true" />
                  View methodology
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#9AA7B5]" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => productNavigate("terms")}
                className="inline-flex items-center justify-between rounded-lg border border-[rgba(148,163,184,0.16)] px-3 py-2.5 text-xs font-semibold text-[#E6EDF3] hover:bg-[rgba(148,163,184,0.06)] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-[#9AA7B5]" aria-hidden="true" />
                  View terms
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#9AA7B5]" aria-hidden="true" />
              </button>
            </div>
          </ProductPanel>
        </div>
      </ProductPage>
    </ProductShell>
  );
};

export default SettingsPage;
