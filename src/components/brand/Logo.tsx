import logoMark from "../../assets/logo-mark.svg";

export default function Logo() {
  return (
    <div className="flex items-center gap-2 cursor-pointer">
      <img src={logoMark} alt="S" width={36} height={36} />
      <div>
        <div className="text-[17px] font-[800] text-[#0a0a0a] tracking-[-0.5px] leading-none">
          StockStory
        </div>
        <div className="text-[9px] font-[600] text-[#888] tracking-[0.12em] mt-[2px]">
          India
        </div>
      </div>
    </div>
  );
}
