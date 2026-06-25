import logoSrc from '../../assets/logo.svg';

export default function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5 no-underline">
      <img src={logoSrc} alt="StockStory" width={28} height={28} className="flex-shrink-0" />
      <div className="leading-none">
        <div className="text-[16px] font-[700] text-[var(--text-primary)] tracking-[-0.02em]">StockStory</div>
        <div className="mt-[2px] text-[11px] font-[500] text-[var(--text-secondary)] tracking-[0.08em]">India</div>
      </div>
    </a>
  );
}
