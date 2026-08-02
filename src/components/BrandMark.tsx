export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/stockex-mark.svg?v=20260703"
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
      style={{ flex: "0 0 auto", display: "block" }}
    />
  );
}
