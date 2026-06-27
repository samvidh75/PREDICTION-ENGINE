import React, { type CSSProperties } from 'react';
import { colors, radius, transition, spacing } from '../../styles';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const BASE: CSSProperties = {
  width:        '100%',
  height:       '44px',               // Apple HIG touch target
  padding:      `0 ${spacing.base}`,  // 12px 16px
  fontSize:     '16px',
  fontFamily:   '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontWeight:   400,
  border:       `1px solid ${colors.bg.tertiary}`,  // #D9D9D9 ~ E5E5E5
  borderRadius: radius.sm,            // 6px
  background:   colors.bg.primary,
  color:        colors.text.primary,
  outline:      'none',
  transition:   `border-color ${transition.base}`,
  boxSizing:    'border-box',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, style, onFocus, onBlur, disabled, ...rest }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div style={{ width: '100%' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              display:      'block',
              fontSize:     '14px',
              fontWeight:   600,
              color:        colors.text.primary,
              marginBottom: spacing.sm,
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          style={{
            ...BASE,
            borderColor: error ? colors.error : colors.bg.tertiary,
            borderWidth: error ? '2px' : '1px',
            background:  disabled ? colors.bg.secondary : colors.bg.primary,
            color:       disabled ? colors.text.tertiary : colors.text.primary,
            cursor:      disabled ? 'not-allowed' : 'text',
            ...style,
          }}
          onFocus={e => {
            if (!disabled && !error) {
              e.currentTarget.style.borderColor = colors.primary;
              e.currentTarget.style.borderWidth = '2px';
            }
            onFocus?.(e);
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = error ? colors.error : colors.bg.tertiary;
            e.currentTarget.style.borderWidth = error ? '2px' : '1px';
            onBlur?.(e);
          }}
          {...rest}
        />
        {error && (
          <span style={{ fontSize: '12px', color: colors.error, marginTop: spacing.xs, display: 'block' }}>
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
