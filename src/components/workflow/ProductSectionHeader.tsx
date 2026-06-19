import React from "react";

interface ProductSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const ProductSectionHeader: React.FC<ProductSectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className = "",
}) => {
  return (
    <div className={`flex items-start justify-between gap-3 mb-4 ${className}`}>
      <div className="flex items-start gap-2 min-w-0">
        {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-[#E6EDF3]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-[#9AA7B5]">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export default ProductSectionHeader;
