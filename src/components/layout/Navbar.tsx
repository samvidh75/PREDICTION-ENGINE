import React from 'react';
import { motion } from 'framer-motion';
import { useNavigationMotion } from '../../hooks/useNavigationMotion';

const NAV_ITEMS = ['Dashboard', 'Discovery', 'Portfolio'];

export const Navbar: React.FC = () => {
  const { controls, triggerTransition } = useNavigationMotion();

  const handleNav = (item: string) => async () => {
    await triggerTransition(item);
    // routing integration point (e.g. react-router navigate) — intentionally decoupled
  };

  return (
    <motion.header
      animate={controls}
      initial={{ opacity: 1 }}
      className="fixed top-0 left-0 w-full z-50 bg-black/95 backdrop-blur-sm border-b border-neutral-800"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-white font-semibold text-lg tracking-wide">StockStory India</span>
        </div>

        <nav className="hidden md:flex items-center space-x-2">
          {NAV_ITEMS.map((item) => (
            <motion.button
              key={item}
              onClick={handleNav(item)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="text-neutral-200 hover:text-white px-3 py-2 rounded-md text-sm"
            >
              {item}
            </motion.button>
          ))}
        </nav>

        <div className="flex items-center">
          <motion.button
            onClick={() => triggerTransition('init-session')}
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black px-3 py-2 rounded-md text-sm font-medium"
          >
            Sign in
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
