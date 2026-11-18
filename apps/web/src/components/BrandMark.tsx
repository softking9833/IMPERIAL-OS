/** Shared IMPERIAL OS mark — hexagonal seal with sunburst I. */
export function BrandMark({
  size = 40,
  className,
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}

      {/* Outer hexagon */}
      <path
        d="M32 5 L50 15.5 V36.5 L32 47 L14 36.5 V15.5 Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Inner hexagon */}
      <path
        d="M32 9.5 L46 17.5 V34.5 L32 42.5 L18 34.5 V17.5 Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* Corner diamonds */}
      <path d="M32 6.8 L33.2 8 L32 9.2 L30.8 8 Z" fill="currentColor" />
      <path d="M32 42.8 L33.2 44 L32 45.2 L30.8 44 Z" fill="currentColor" />

      {/* Side filigree hints */}
      <path
        d="M17.5 20 C20 22.5 20 29.5 17.5 32"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.55"
      />
      <path
        d="M46.5 20 C44 22.5 44 29.5 46.5 32"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.55"
      />

      {/* Sunburst rays above I */}
      <g stroke="currentColor" strokeLinecap="round">
        <path d="M32 11.2 V14.2" strokeWidth="1.2" />
        <path d="M28.6 11.8 L29.8 14.4" strokeWidth="1.05" />
        <path d="M35.4 11.8 L34.2 14.4" strokeWidth="1.05" />
        <path d="M25.8 13.2 L27.6 15.2" strokeWidth="1" />
        <path d="M38.2 13.2 L36.4 15.2" strokeWidth="1" />
        <path d="M23.8 15.2 L26 16.6" strokeWidth="0.9" />
        <path d="M40.2 15.2 L38 16.6" strokeWidth="0.9" />
        <path d="M30 11.4 L30.6 13.8" strokeWidth="0.95" />
        <path d="M34 11.4 L33.4 13.8" strokeWidth="0.95" />
      </g>

      {/* Serif I */}
      <path
        d="M25.5 17.2 H38.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M32 17.2 V37.2"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M25.5 37.2 H38.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
