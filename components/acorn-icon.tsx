interface AcornIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * Custom acorn SVG icon — the Nutty Tracker brand mark.
 * Designed to sit naturally alongside lucide-react icons at any size.
 */
export function AcornIcon({ size = 18, className = "", strokeWidth = 1.75 }: AcornIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Stem — small arch nub sitting on top of cap */}
      <path d="M10.5 5.5 Q10.5 2.5 12 2.5 Q13.5 2.5 13.5 5.5" />
      {/* Cap — wide dome; the Z closing line IS the single meeting line */}
      <path d="M4 12 Q4 5.5 12 5.5 Q20 5.5 20 12 Z" />
      {/* Body — open at top so no duplicate line at meeting point */}
      <path d="M7 12 Q5.5 13 5.5 17.5 Q5.5 22.5 12 23.5 Q18.5 22.5 18.5 17.5 Q18.5 13 17 12" />
    </svg>
  );
}
