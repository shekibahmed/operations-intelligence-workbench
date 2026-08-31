import { Button } from "@/components/ui/Button";

export function ErrorState({
  message = "Something went wrong loading this content.",
  onRetryHref,
}: {
  message?: string;
  onRetryHref?: string;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-[var(--color-critical-ink)] bg-[var(--color-critical-surface)] p-4 text-sm text-[var(--color-critical-ink)]">
      <p>{message}</p>
      <Button variant="secondary" type="button">
        {onRetryHref ? <a href={onRetryHref}>Retry</a> : "Retry"}
      </Button>
    </div>
  );
}
