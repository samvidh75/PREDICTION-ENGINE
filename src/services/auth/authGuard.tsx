import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const AuthGuard = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  
  if (!user) {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      p.set("page", "landing");
      window.history.pushState({}, "", `?${p.toString()}`);
      window.dispatchEvent(new Event("urlchange"));
    }
    return <div className="text-white text-xs p-6">Redirecting...</div>;
  }
  
  return children;
};

export default AuthGuard;

