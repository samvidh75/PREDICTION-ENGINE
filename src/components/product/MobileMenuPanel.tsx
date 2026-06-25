import { useEffect, useRef } from "react";
import { Award, GitCompare, Briefcase, Bell, BookOpen, Settings, X } from "lucide-react";
import { navigate } from "./routeConfig";

const MENU_ITEMS = [
  { page: 'rankings', label: 'Rankings', icon: Award },
  { page: 'compare', label: 'Compare', icon: GitCompare },
  { page: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { page: 'alerts', label: 'Alerts', icon: Bell },
  { page: 'methodology', label: 'Methodology', icon: BookOpen },
  { page: 'settings', label: 'Settings', icon: Settings },
];

export default function MobileMenuPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={ref}
        style={{
          background: '#FFFFFF',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: 'var(--shadow-lg)',
        }}
        className="relative w-full max-w-md mx-auto p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <span style={{ color: 'var(--text-primary)' }} className="text-[16px] font-[700]">Menu</span>
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-1">
          {MENU_ITEMS.map(({ page, label, icon: Icon }) => (
            <button
              key={page}
              onClick={() => { navigate(page); onClose(); }}
              className="flex items-center gap-3 w-full text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(41,98,255,0.08)] rounded-[8px] transition-colors"
              style={{ height: 48, padding: '0 12px', fontSize: 13 }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
