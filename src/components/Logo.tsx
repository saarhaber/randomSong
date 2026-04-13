type LogoProps = { className?: string };

export function Logo({ className }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      width="32"
      height="32"
      aria-hidden
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--logo-grad-a, #1ed760)" />
          <stop offset="100%" stopColor="var(--logo-grad-b, #169c46)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#logoGrad)" />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fontSize="15"
        fill="var(--logo-fg, #0d0d0d)"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
      >
        ♪
      </text>
    </svg>
  );
}
