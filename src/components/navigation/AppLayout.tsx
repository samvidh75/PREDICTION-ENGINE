import React from "react";
import AppShell from "../layout/AppShell";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => (
  <AppShell>{children}</AppShell>
);

export default AppLayout;
