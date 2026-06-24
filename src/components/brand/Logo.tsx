import logoMark from "../../assets/logo-mark.svg";

export default function Logo() {
  return (
    <div className="flex items-center gap-2.5 cursor-pointer">
      <img src={logoMark} alt="S" width={32} height={32} />
      <div>
        <div className="text-[16px] font-[400] text-[#0d253d] tracking-[-0.2px] leading-none">StockStory</div>
        <div className="text-[9px] font-[400] text-[#64748d] tracking-[0.08em] mt-[1px]">India</div>
      </div>
    </div>
  );
}
