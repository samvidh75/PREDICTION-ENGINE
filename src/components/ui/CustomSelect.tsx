import React, { SelectHTMLAttributes, forwardRef } from 'react';

export interface CustomSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const CustomSelect = forwardRef<HTMLSelectElement, CustomSelectProps>((props, ref) => {
  return (
    <select
      ref={ref}
      {...props}
      className={`appearance-none bg-[#1e1e2f] text-[#E6EDF3] border border-[#2b2b3a] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4c6ef5] ${props.className || ''}`}
    >
      {props.children}
    </select>
  );
});

CustomSelect.displayName = 'CustomSelect';

export default CustomSelect;
