import { AdaptCta } from "@/components/shell/AdaptCta";
import { LensSwitcher } from "@/components/shell/LensSwitcher";
import { SessionIndicator } from "@/components/shell/SessionIndicator";
import { SyntheticDataNotice } from "@/components/shell/SyntheticDataNotice";
import { LogoMark } from "@/components/brand/Logo";
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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span aria-hidden="true" className="hidden h-5 w-px bg-border sm:block" />
          </span>
          <span className="truncate text-sm font-semibold text-ink">{packName}</span>
        </div>
        <LensSwitcher activeLens={lens} />
        <div className="flex items-center gap-2.5">
          <SessionIndicator workspace={workspace} minutesRemaining={sessionMinutesRemaining} />
          <AdaptCta scenario={packId} />
        </div>
      </div>
      <div className="border-t border-[var(--color-warn-ink)]/15 bg-[var(--color-warn-surface)] px-4 py-1.5 sm:px-5">
        <SyntheticDataNotice />
      </div>
    </header>
  );
}
