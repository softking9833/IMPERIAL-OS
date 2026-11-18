/** Shared IMPERIAL OS crest — gold IO monogram in a double shield. */
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
      {/* Outer shield */}
      <path
        d="M32 4 L52 12 V30 C52 44 42 54 32 60 C22 54 12 44 12 30 V12 Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Inner shield */}
      <path
        d="M32 10 L46 16.5 V30 C46 41 38.5 49 32 54 C25.5 49 18 41 18 30 V16.5 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {/* O ring */}
      <circle
        cx="32"
        cy="31"
        r="11.5"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      {/* I stem */}
      <path
        d="M32 18.5 V43.5"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* I serifs */}
      <path
        d="M26.5 18.5 H37.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M26.5 43.5 H37.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Crossbar through monogram */}
      <path
        d="M22 36.5 H42"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
