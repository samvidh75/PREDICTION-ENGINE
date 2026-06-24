import logoMark from "../../assets/logo-mark.svg";

export default function Logo() {
  return (
    <div className="flex items-center gap-2 cursor-pointer">
      <img src={logoMark} alt="S" width={24} height={24} />
      <div className="text-[14px] font-[600] text-white tracking-[-0.2px] leading-none">
        StockStory
      </div>
    </div>
  );
}
