import React from "react";
import { useAuth } from "../../context/AuthContext";
import { IntelligenceOSShell } from "../intelligence/IntelligenceOSShell";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  useAuth();
  return (
    <IntelligenceOSShell>
      {children}
    </IntelligenceOSShell>
  );
};

export default AppLayout;
