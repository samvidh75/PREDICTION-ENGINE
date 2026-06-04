import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "../hooks/auth/useAuth";

const LayoutContext = createContext(undefined);

export const LayoutProvider = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();
  const [currentView, setCurrentView] = useState("terminal");

  // Legitimate internal operational frames
  const validViews = ["terminal", "stories", "academy", "hub"];

  /**
   * Central route interception method MapsTo(targetView)
   */
  const MapsTo = (targetView) => {
    if (validViews.includes(targetView)) {
      setCurrentView(targetView);
    }
  };

  /**
   * Route Guard Isolation Interceptor
   * If isAuthenticated is false, block access to private views and push state back.
   */
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear memory pointers and reset state
      setCurrentView("terminal");
    }
  }, [isAuthenticated]);

  return (
    <LayoutContext.Provider
      value={{
        currentView,
        validViews,
        MapsTo,
      }}
    >
      {/* If not authenticated, the app layout will automatically render the public hero space */}
      {children}
    </LayoutContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a LayoutProvider");
  }
  return context;
};
