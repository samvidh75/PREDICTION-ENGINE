import React, { SelectHTMLAttributes, forwardRef } from 'react';

export interface CustomSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const CustomSelect = forwardRef<HTMLSelectElement, CustomSelectProps>((props, ref) => {
  return (
    <select
      ref={ref}
      {...props}
      className={`appearance-none bg-white text-[var(--color-text-primary)] border border-[rgba(148,163,184,0.16)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2962FF] ${props.className || ''}`}
    >
      {props.children}
    </select>
  );
});

CustomSelect.displayName = 'CustomSelect';

export default CustomSelect;
