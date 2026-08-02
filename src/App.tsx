import { useEffect, useState, type ComponentType } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { AppRoutes } from "./app/routes";
import { ScrollToTop } from "./app/ScrollToTop";
import { SuccessCheck } from "./ui/SuccessCheck";

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
  const [LiveAlertSentinel, setLiveAlertSentinel] = useState<ComponentType | null>(null);
  const [FloatingAIButton, setFloatingAIButton] = useState<ComponentType | null>(null);

  useEffect(() => {
    console.log("[App] Mounting");

    let cancelled = false;
    let cleanupAnalytics: (() => void) | undefined;

    const runWhenIdle = (task: () => void, timeout = 2500) => {
      if (typeof window === "undefined") return;
      if ("requestIdleCallback" in window) {
        const id = window.requestIdleCallback(task, { timeout });
        return () => window.cancelIdleCallback(id);
      }
      const id = globalThis.setTimeout(task, timeout);
      return () => globalThis.clearTimeout(id);
    };

    const cancelAnalyticsBoot = runWhenIdle(() => {
      void import("./lib/client/anonymousAnalytics").then(({ analytics }) => {
        if (cancelled) return;
        analytics.init();
        cleanupAnalytics = () => analytics.destroy();
      });
    }, 1500);

    const cancelGlobalUiBoot = runWhenIdle(() => {
      void Promise.all([
        import("./components/LiveAlertSentinel"),
        import("./components/SmartFloatingAIButton"),
      ]).then(([liveAlertModule, floatingAiModule]) => {
        if (cancelled) return;
        setLiveAlertSentinel(() => liveAlertModule.default);
        setFloatingAIButton(() => floatingAiModule.default);
      });
    }, 2000);

    return () => {
      cancelled = true;
      cancelAnalyticsBoot?.();
      cancelGlobalUiBoot?.();
      cleanupAnalytics?.();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          {LiveAlertSentinel ? <LiveAlertSentinel /> : null}
          {FloatingAIButton ? <FloatingAIButton /> : null}
          <AppRoutes />
          <Toaster
            theme="dark"
            position="bottom-right"
            gap={10}
            icons={{ success: <SuccessCheck size={18} /> }}
            toastOptions={{
              style: {
                background: "rgba(18, 18, 20, 0.85)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
                color: "#FFFFFF",
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
                fontSize: "13px",
                borderRadius: "10px",
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
