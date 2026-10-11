/**
 * The Envoy mark: an E whose middle bar becomes a connection to a node.
 * Traced from the brand artwork (viewBox matches its proportions); drawn in --brand so it adapts to dark mode.
 */
export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size * (505 / 543)} height={size} viewBox="0 0 505 543" aria-hidden className={`shrink-0 ${className}`} style={{ fill: "var(--brand)" }}>
      <path d="M0 161V125C0 56 56 0 125 0H505V40C505 107 451 161 384 161Z" />
      <path d="M0 200H215C252 200 272 222 283 248C287 258 292 263 302 263H362V293H302C292 293 287 298 283 308C272 334 252 355 215 355H0Z" />
      <circle cx="405" cy="278" r="50" />
      <path d="M0 390H384C451 390 505 444 505 505V543H125C56 543 0 487 0 418Z" />
    </svg>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <Mark size={size} />
      <span className="font-sans text-[21px] font-bold tracking-[-0.02em] text-ink">Envoy</span>
    </span>
  );
}
