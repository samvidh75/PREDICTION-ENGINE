import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "./app/routes";
import { ScrollToTop } from "./app/ScrollToTop";

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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
