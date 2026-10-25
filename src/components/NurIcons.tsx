import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

/** Crescent + star logo for Nur. */
export function CrescentLogo(props: P) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props}>
      <path d="M41 8a24 24 0 1 0 15 42.5A26 26 0 1 1 41 8Z" fill="currentColor" />
      <path
        d="m50 12 2.6 6.2 6.7.6-5.1 4.4 1.6 6.6L50 26.3l-5.8 3.5 1.6-6.6-5.1-4.4 6.7-.6L50 12Z"
        fill="currentColor"
        opacity=".85"
      />
    </svg>
  );
}

/** Halal / Haram: split badge, green halal + red haram. */
export function HalalHaramIcon(props: P) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props}>
      <circle cx="22" cy="32" r="19" fill="oklch(0.62 0.16 152)" />
      <circle cx="42" cy="32" r="19" fill="oklch(0.58 0.21 27)" />
      <path d="M22 25v14M16 32h12M15 25v14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 26l12 12M48 26 36 38" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

/** Tasbih: prayer beads loop. */
export function TasbihIcon(props: P) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props}>
      <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="2.4" opacity=".45" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const cx = Number((32 + Math.cos(a) * 18).toFixed(4));
        const cy = Number((32 + Math.sin(a) * 18).toFixed(4));
        return <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 4.2 : 3.2} fill="currentColor" />;
      })}
      <path d="M32 50v7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M32 57 28 62h8l-4-5Z" fill="currentColor" />
    </svg>
  );
}

/** 99 names: ornate arabic medallion. */
export function NamesIcon(props: P) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props}>
      <path
        d="M32 4 54 16v20c0 13-9.6 21.4-22 24C19.6 57.4 10 49 10 36V16L32 4Z"
        fill="currentColor"
        opacity=".22"
      />
      <path
        d="M32 4 54 16v20c0 13-9.6 21.4-22 24C19.6 57.4 10 49 10 36V16L32 4Z"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontSize="24"
        fill="currentColor"
        fontFamily="var(--font-arabic)"
      >
        ٩٩
      </text>
    </svg>
  );
}

/** Qibla compass: modern, sleek original compass logo with 8-point star, cardinal markers and dynamic needle. */
export function CompassIcon(props: P) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props}>
      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.4" />
      <circle
        cx="32"
        cy="32"
        r="23"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.25"
        strokeDasharray="3 3"
      />
      {/* 4 Cardinal indicators */}
      <circle cx="32" cy="7" r="1.8" fill="currentColor" />
      <circle cx="57" cy="32" r="1.8" fill="currentColor" opacity="0.6" />
      <circle cx="32" cy="57" r="1.8" fill="currentColor" opacity="0.6" />
      <circle cx="7" cy="32" r="1.8" fill="currentColor" opacity="0.6" />
      {/* 8-point geometric star subtle backdrop */}
      <path
        d="M32 15L36 28L49 32L36 36L32 49L28 36L15 32L28 28Z"
        fill="currentColor"
        opacity="0.12"
      />
      {/* North Needle */}
      <path d="M32 10L37.5 32L32 28L26.5 32Z" fill="currentColor" />
      {/* South Needle */}
      <path d="M32 54L26.5 32L32 36L37.5 32Z" fill="currentColor" opacity="0.45" />
      {/* Center pivot */}
      <circle cx="32" cy="32" r="3.5" fill="currentColor" />
      <circle cx="32" cy="32" r="1.5" fill="#fff" />
    </svg>
  );
}

/** Closed Quran book icon. */
export function QuranIcon(props: P) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props}>
      <rect x="10" y="12" width="44" height="40" rx="5" fill="currentColor" opacity=".22" />
      <rect x="10" y="12" width="44" height="40" rx="5" stroke="currentColor" strokeWidth="2.4" />
      <path d="M32 12v40" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M32 22c-4-3-9-3-13-2v18c4-1 9-1 13 2 4-3 9-3 13-2V20c-4-1-9-1-13 2Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity=".8"
      />
    </svg>
  );
}

/** Barcode scan icon. */
export function ScanIcon(props: P) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props}>
      <path
        d="M8 22V13a5 5 0 0 1 5-5h9M56 22v-9a5 5 0 0 0-5-5h-9M8 42v9a5 5 0 0 0 5 5h9M56 42v9a5 5 0 0 1-5 5h-9"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M19 22v20M25 22v20M31 22v14M37 22v20M43 22v20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".75"
      />
      <path d="M10 32h44" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export interface NavIconProps extends SVGProps<SVGSVGElement> {
  active?: boolean;
}

/** Minimalist rounded house with inner threshold dash for the navigation bar. */
export function NavHomeIcon({ active, ...props }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? "2" : "1.8"}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path
        d="M4.5 10.4 11.2 4.4a1.2 1.2 0 0 1 1.6 0l6.7 6c.3.3.5.7.5 1.1V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7.5c0-.4.2-.8.5-1.1Z"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? "0.15" : "0"}
      />
      <line x1="10" y1="16.8" x2="14" y2="16.8" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Person in prayer / Tashahhud / Du'a supplication posture with fine lines. */
export function NavPrayerIcon({ active, ...props }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? "1.9" : "1.75"}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Head */}
      <circle cx="12" cy="4.6" r="2.2" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.2" : "0"} />
      {/* Kufi / Prayer cap line */}
      <path d="M10.6 4.2c.4-.8 1.4-1.2 2.3-.9" strokeWidth="1.3" opacity="0.85" />

      {/* Spine / back in humble prayer */}
      <path d="M11 8.2c-1.8 1.8-2.2 4.8-1.5 8" />

      {/* Upper arm and raised forearm in Du'a */}
      <path d="M11.6 9.2l2.6 3 3.6-4.5" />
      {/* Cupped palms */}
      <path d="M16.5 10.5l2.2-2.8c.4-.5.9-.3.9.3l-.3 1.5" />

      {/* Kneeling thighs and folded feet on floor */}
      <path d="M9.5 16.2c2.8-.4 6 .2 8.5 2.8" />
      <path d="M18 19.5H6.2c-.8 0-1.3-.8-.8-1.5l1.6-1.8" />
    </svg>
  );
}

/** Triad of three dots in a triangle ("More" / "Paramètres"). */
export function NavMoreIcon({ active, ...props }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      {...props}
    >
      <circle cx="12" cy="7.2" r={active ? "2.6" : "2.4"} />
      <circle cx="7.2" cy="15.8" r={active ? "2.6" : "2.4"} />
      <circle cx="16.8" cy="15.8" r={active ? "2.6" : "2.4"} />
    </svg>
  );
}

/** Elegant Mosque icon with central dome, crescent spire, and minarets. */
export function MosqueIcon({ active, ...props }: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={active ? "1.4" : "1.75"}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 21h20" strokeWidth="1.75" />
      <path
        d="M7 19V12c0-2.8 2.2-5 5-5s5 2.2 5 5v7"
        fill={active ? "currentColor" : "none"}
      />
      <path d="M12 2v5" strokeWidth="1.4" />
      <path
        d="M12 1.8a1.2 1.2 0 0 1 1.1 1.8 1.2 1.2 0 0 0-1.1-1.8Z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M10 19v-3.5c0-1.1.9-2 2-2s2 .9 2 2V19"
        fill={active ? "rgba(0,0,0,0.25)" : "none"}
      />
      <path d="M2.5 19V11h3.5v8" fill={active ? "currentColor" : "none"} />
      <path d="M2.5 11l1.75-4 1.75 4" />
      <path d="M4.25 5.5v1.5" strokeWidth="1.4" />
      <path d="M18 19V11h3.5v8" fill={active ? "currentColor" : "none"} />
      <path d="M18 11l1.75-4 1.75 4" />
      <path d="M19.75 5.5v1.5" strokeWidth="1.4" />
    </svg>
  );
}
