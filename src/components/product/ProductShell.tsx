import { useEffect, useState } from "react";
import ProductTopBar from "./ProductTopBar";
import MobileBottomNav from "./MobileBottomNav";

export default function ProductShell({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <ProductTopBar compact={isMobile} />
      <main
        className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8"
        style={{ maxWidth: 1320 }}
      >
        {children}
      </main>
      {isMobile && <MobileBottomNav />}
    </div>
  );
}
