import { color, font, radius, space } from '../../design/tokens';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
}

export function Input({ placeholder, style, ...props }: InputProps) {
  return (
    <input
      placeholder={placeholder}
      style={{
        fontFamily: font,
        fontSize: 16,
        padding: `${space[3]} ${space[4]}`,
        borderRadius: radius.pill,
        border: `1px solid ${color.border}`,
        background: color.bg,
        color: color.text,
        outline: 'none',
        ...style,
      }}
      {...props}
    />
  );
}
