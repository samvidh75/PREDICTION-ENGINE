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
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#FFFFFF' }}>
      <ProductTopBar compact={isMobile} />
      <main
        className="mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8"
        style={{
          maxWidth: 'var(--content)',
          paddingTop: 'calc(var(--header-h) + 24px)',
          paddingBottom: isMobile ? 'calc(var(--nav-h) + 24px)' : 48,
        }}
      >
        {children}
      </main>
      {isMobile && <MobileBottomNav />}
    </div>
  );
}
