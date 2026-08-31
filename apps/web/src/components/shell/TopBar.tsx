import { AdaptCta } from "@/components/shell/AdaptCta";
import { LensSwitcher } from "@/components/shell/LensSwitcher";
import { SessionIndicator } from "@/components/shell/SessionIndicator";
import { SyntheticDataNotice } from "@/components/shell/SyntheticDataNotice";
import type { Lens } from "@/lib/lens";

export function TopBar({
  workspace,
  packName,
  packId,
  lens,
  sessionMinutesRemaining,
}: {
  workspace: string;
  packName: string;
  packId: string;
  lens: Lens;
  sessionMinutesRemaining: number;
}) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent)] text-sm font-semibold text-[var(--color-accent-ink)]">
            {packName.slice(0, 1)}
          </span>
          <span className="text-sm font-semibold text-ink">{packName}</span>
        </div>
        <LensSwitcher activeLens={lens} />
        <div className="flex items-center gap-3">
          <SessionIndicator workspace={workspace} minutesRemaining={sessionMinutesRemaining} />
          <AdaptCta scenario={packId} />
        </div>
      </div>
      <div className="border-t border-border px-4 py-1.5">
        <SyntheticDataNotice />
      </div>
    </header>
  );
}
