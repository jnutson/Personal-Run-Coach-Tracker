import { AlertCircle } from "lucide-react";

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = "No data available yet." }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
      <AlertCircle size={20} />
      <p className="text-sm">{message}</p>
    </div>
  );
}
