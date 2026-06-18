import React from "react";
import { BookOpen } from "lucide-react";

interface MethodologyLinkProps {
  href?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
}

export function MethodologyLink({ href, onClick, label = "View scoring methodology", className = "" }: MethodologyLinkProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      const params = new URLSearchParams(window.location.search);
      params.set("page", "methodology");
      window.history.pushState({}, "", `?${params.toString()}`);
      window.dispatchEvent(new Event("urlchange"));
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium text-[#2962FF] hover:text-[#1E53E5] transition-colors ${className}`}
    >
      <BookOpen className="h-3 w-3" aria-hidden="true" />
      {label}
    </button>
  );
}
