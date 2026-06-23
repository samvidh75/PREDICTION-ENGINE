import React from "react";
import { useAuth } from "../context/AuthContext";
import { Settings, BookOpen, ShieldCheck, Scale, LogOut, ArrowLeftRight, BarChart3 } from "lucide-react";

interface MenuItem {
  page: string;
  label: string;
  icon: React.ReactNode;
}

export default function MorePage(): JSX.Element {
  const { isAuthenticated, logout } = useAuth();

  const navigateTo = (page: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", page);
    window.history.pushState({}, "", url.toString());
    window.dispatchEvent(new Event("urlchange"));
  };

  const mainItems: MenuItem[] = [
    { page: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ];

  const moreItems: MenuItem[] = [
    { page: "compare", label: "Compare", icon: <ArrowLeftRight className="h-4 w-4" /> },
    { page: "pricing", label: "Pricing", icon: <BarChart3 className="h-4 w-4" /> },
    { page: "methodology", label: "Research Standards", icon: <BookOpen className="h-4 w-4" /> },
    { page: "about", label: "About", icon: <ShieldCheck className="h-4 w-4" /> },
    { page: "terms", label: "Terms & Disclosures", icon: <Scale className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">More</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Account, settings, and research resources.
      </p>

      <div className="mt-6 space-y-1">
        {mainItems.map((item) => (
          <button
            key={item.page}
            type="button"
            onClick={() => navigateTo(item.page)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-colors"
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6 border-t border-[var(--color-border)] pt-6">
        <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Resources
        </h2>
        <div className="space-y-1">
          {moreItems.map((item) => (
            <button
              key={item.page}
              type="button"
              onClick={() => navigateTo(item.page)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-colors"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {isAuthenticated && (
        <div className="mt-6 border-t border-[var(--color-border)] pt-6">
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 py-3 text-xs font-bold text-red-500 hover:bg-red-500/20 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
