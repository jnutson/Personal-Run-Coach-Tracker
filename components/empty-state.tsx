interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = "No data available yet." }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      {/* Surfboard illustration */}
      <svg
        viewBox="0 0 64 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-10 h-12 text-muted-foreground/30"
        aria-hidden="true"
      >
        {/* Board body */}
        <path
          d="M32 4 Q40 4 44 16 L46 56 Q44 68 32 72 Q20 68 18 56 L20 16 Q24 4 32 4 Z"
          fill="currentColor"
        />
        {/* Center stripe */}
        <line x1="32" y1="8" x2="32" y2="66" stroke="hsl(38 35% 97% / 0.5)" strokeWidth="2" strokeLinecap="round" />
        {/* Nose detail */}
        <circle cx="32" cy="8" r="2.5" fill="hsl(38 35% 97% / 0.4)" />
        {/* Fin */}
        <path d="M32 68 L26 80 L32 76 L38 80 Z" fill="currentColor" opacity="0.7" />
        {/* Wave lines beneath */}
        <path
          d="M8 76 Q16 72 24 76 Q32 80 40 76 Q48 72 56 76"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}
