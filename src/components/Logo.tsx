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
      <path
        fill="var(--logo-fg, #0d0d0d)"
        transform="translate(5,5) scale(0.92)"
        d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
      />
    </svg>
  );
}
