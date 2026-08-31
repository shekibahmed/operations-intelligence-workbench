export function Skeleton({ className = "", label }: { className?: string; label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`animate-pulse rounded-md bg-surface-muted ${className}`}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}
