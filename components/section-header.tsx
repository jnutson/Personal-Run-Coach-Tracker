interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {/* Wave underline accent */}
        <svg viewBox="0 0 48 5" fill="none" className="w-12 h-1.5 mt-1 text-driftwood opacity-50" aria-hidden="true">
          <path
            d="M0 2.5 Q6 0.5 12 2.5 Q18 4.5 24 2.5 Q30 0.5 36 2.5 Q42 4.5 48 2.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {subtitle && (
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
