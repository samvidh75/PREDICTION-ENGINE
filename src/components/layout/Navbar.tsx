import React from "react";
import { motion } from "framer-motion";
import { useNavigationMotion } from "../../hooks/useNavigationMotion";
import logo from "../../assets/logo.svg";

const NAV_ITEMS = [
  { label: "Dashboard", page: "dashboard" },
  { label: "Discovery", page: "discovery" },
  { label: "Portfolio", page: "portfolio" },
];

function setPage(pageKey: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  params.delete("id");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

export const Navbar: React.FC = () => {
  const { controls, triggerTransition } = useNavigationMotion();

  const handleNav = (item: (typeof NAV_ITEMS)[number]) => async () => {
    await triggerTransition(item.label);
    setPage(item.page);
  };

  return (
    <motion.header
      animate={controls}
      initial={{ opacity: 1 }}
      className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-[#05070A]/95 backdrop-blur-xl"
    >
      <div className="flex w-full items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setPage("dashboard")}
          className="border-none bg-transparent p-0 text-left"
          aria-label="StockStory India home"
        >
          <img src={logo} alt="" width={32} height={32} aria-hidden="true" />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.3px' }}>
            StockStory
          </span>
          <span style={{
            fontSize: 9, fontWeight: 600, color: 'var(--brand)',
            background: 'var(--brand-tint)', padding: '2px 5px', borderRadius: 4,
            letterSpacing: '1.5px', marginLeft: 4
          }}>
            INDIA
          </span>
        </button>

        <nav className="hidden items-center space-x-2 md:flex">
          {NAV_ITEMS.map((item) => (
            <motion.button
              key={item.page}
              onClick={handleNav(item)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-md px-3 py-2 text-sm text-[#9AA7B5] hover:text-white"
            >
              {item.label}
            </motion.button>
          ))}
        </nav>

        <motion.button
          type="button"
          onClick={() => setPage("login")}
          whileHover={{ scale: 1.02 }}
          className="rounded-md bg-gradient-to-r from-[#00C8FF] to-[#00FFE0] px-3 py-2 text-sm font-medium text-[#031017]"
        >
          Sign in
        </motion.button>
      </div>
    </motion.header>
  );
};

export default Navbar;
