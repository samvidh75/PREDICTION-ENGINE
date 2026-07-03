import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { AppRoutes } from "./app/routes";
import { ScrollToTop } from "./app/ScrollToTop";
import LiveAlertSentinel from "./components/LiveAlertSentinel";
import { analytics } from "./lib/client/anonymousAnalytics";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  useEffect(() => {
    analytics.init();
    return () => analytics.destroy();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          {/* Persistent global event broker notification sentinel */}
          <LiveAlertSentinel />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
