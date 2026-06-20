import React from "react";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  "aria-label"?: string;
  "aria-current"?: "page" | "step" | "location" | "date" | "time" | "true" | "false" | boolean;
  title?: string;
}

function handleNav(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  const href = e.currentTarget.getAttribute("href");
  if (!href) return;
  const url = new URL(href, window.location.origin);
  const params = new URLSearchParams(url.search);
  const existing = new URLSearchParams(window.location.search);
  for (const [k, v] of params) {
    existing.set(k, v);
  }
  window.history.pushState({}, "", `?${existing.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

export function NavLink({ href, children, className, onClick, ...rest }: NavLinkProps) {
  return (
    <a
      href={href}
      onClick={(e) => {
        if (onClick) onClick(e);
        if (!e.defaultPrevented) handleNav(e);
      }}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}
