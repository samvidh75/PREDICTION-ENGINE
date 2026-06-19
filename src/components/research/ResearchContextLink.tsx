import React from "react";
import { BookOpen, ArrowRight } from "lucide-react";
import { productNavigate } from "../product/ProductUI";

interface ResearchContextLinkProps {
  label?: string;
}

export const ResearchContextLink: React.FC<ResearchContextLinkProps> = ({ label = "How to read this" }) => {
  return (
    <button
      type="button"
      onClick={() => productNavigate("methodology")}
      className="inline-flex items-center gap-1 text-[10px] text-[#64748B] hover:text-[#2962FF] transition-colors"
    >
      <BookOpen className="h-3 w-3" aria-hidden="true" />
      {label}
      <ArrowRight className="h-3 w-3" aria-hidden="true" />
    </button>
  );
};

export default ResearchContextLink;
