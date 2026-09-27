export function BulletMascot({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} role="img" aria-label="Bullet the Tesla">
      {/* body */}
      <rect x="18" y="30" width="78" height="30" rx="10" fill="var(--primary)" />
      <rect x="30" y="16" width="46" height="22" rx="8" fill="var(--primary)" />
      {/* windows */}
      <rect x="36" y="20" width="16" height="14" rx="3" fill="var(--accent)" opacity="0.9" />
      <rect x="56" y="20" width="16" height="14" rx="3" fill="var(--accent)" opacity="0.9" />
      {/* headlight */}
      <circle cx="92" cy="45" r="4" fill="var(--accent)" />
      {/* three wheels: two back, one front (three-wheeler) */}
      <circle cx="34" cy="62" r="10" fill="#1a1a17" />
      <circle cx="34" cy="62" r="4" fill="var(--muted)" />
      <circle cx="80" cy="62" r="10" fill="#1a1a17" />
      <circle cx="80" cy="62" r="4" fill="var(--muted)" />
      {/* spark badge */}
      <path d="M60 4 l4 8 l-4 -1 l3 7 l-9 -9 l4 1 z" fill="var(--accent)" />
    </svg>
  );
}
