export default function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5 no-underline">
      <img src="/logo-mark.svg" alt="S" width={36} height={36} className="flex-shrink-0" />
      <div className="leading-none">
        <div className="text-[17px] font-[800] text-[#0a0a0a] tracking-[-0.5px]">StockStory</div>
        <div className="mt-[2px] text-[9px] font-[600] text-[#888] tracking-[0.15em]">India</div>
      </div>
    </a>
  );
}
