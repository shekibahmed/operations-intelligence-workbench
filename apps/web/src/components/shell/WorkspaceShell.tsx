import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { LensCookieSync } from "@/components/shell/LensCookieSync";
import { MobileNavDrawer } from "@/components/shell/MobileNavDrawer";
import { PrimaryNav } from "@/components/shell/PrimaryNav";
import { TopBar } from "@/components/shell/TopBar";
import type { Lens } from "@/lib/lens";

export function WorkspaceShell({
  workspace,
  packName,
  packId,
  lens,
  sessionMinutesRemaining,
  itemLabel,
  defaultArtifactId,
  defaultRuleId,
  children,
}: {
  workspace: string;
  packName: string;
  packId: string;
  lens: Lens;
  sessionMinutesRemaining: number;
  itemLabel?: string | undefined;
  defaultArtifactId: string;
  defaultRuleId: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-surface focus:p-2">
        Skip to main content
      </a>
      <LensCookieSync lens={lens} />
      <TopBar workspace={workspace} packName={packName} packId={packId} lens={lens} sessionMinutesRemaining={sessionMinutesRemaining} />
      <div className="flex flex-1 flex-col xl:flex-row">
        <MobileNavDrawer>
          <PrimaryNav workspace={workspace} lens={lens} defaultArtifactId={defaultArtifactId} defaultRuleId={defaultRuleId} />
        </MobileNavDrawer>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Breadcrumbs workspace={workspace} packName={packName} lens={lens} itemLabel={itemLabel} />
          <main id="main-content" className="flex flex-1 flex-col gap-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
