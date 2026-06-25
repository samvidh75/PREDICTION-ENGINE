import { useNavigate } from "react-router-dom";
import type { ReactNode, CSSProperties, AnchorHTMLAttributes } from "react";

interface NavLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick" | "style"> {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export default function NavLink({ href, children, className, style, onClick, ...rest }: NavLinkProps) {
  const navigate = useNavigate();
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
        onClick?.();
      }}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </a>
  );
}
