import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigationMotion } from '../../hooks/useNavigationMotion';
import { useAuth } from '../../context/AuthContext';
import { ProfileButton } from './ProfileButton';

export const TopNav: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { controls } = useNavigationMotion();
  const { user, logout, isConnecting } = useAuth();

  const handleSignOut = () => {
    if (isConnecting) return;
    void logout();
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      animate={controls}
      className={`fixed top-0 w-full z-[100] transition-all duration-500 ease-in-out ${
        isScrolled ? 'bg-[#050505]/95 backdrop-blur-md border-b border-white/10 py-4' : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        <div className="text-xl font-bold tracking-widest text-white">
          STOCKSTORY<span className="text-cyan-500">.INDIA</span>
        </div>

        <div className="flex items-center gap-8 text-sm text-gray-400">
          {[
            { label: "Dashboard", page: "dashboard" },
            { label: "Discover", page: "discovery" },
          ].map((link) => (
            <button
              key={link.label}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", link.page);
                window.history.pushState({}, "", `?${params.toString()}`);
                window.dispatchEvent(new Event("urlchange"));
              }}
              className="hover:text-cyan-400 transition-colors bg-transparent border-none cursor-pointer"
            >
              {link.label}
            </button>
          ))}
          {user ? (
            <div className="flex items-center gap-3">
              <ProfileButton />
              <button
                type="button"
                disabled={isConnecting}
                onPointerDown={handleSignOut}
                onClick={handleSignOut}
                className="px-4 py-2 border border-white/15 text-white rounded-full text-xs hover:bg-white/10 transition-all bg-transparent cursor-pointer disabled:opacity-50"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button 
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", "login");
                window.history.pushState({}, "", `?${params.toString()}`);
                window.dispatchEvent(new Event("urlchange"));
              }}
              className="px-5 py-2 border border-white/20 text-white rounded-full text-sm hover:bg-white/10 transition-all bg-transparent cursor-pointer"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default TopNav;
