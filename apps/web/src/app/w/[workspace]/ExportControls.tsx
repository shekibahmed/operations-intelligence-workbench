"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";

type ExportDataset = "audit" | "cases";
type ExportFormat = "csv" | "json";

function responseFilename(response: Response, dataset: ExportDataset, format: ExportFormat): string {
  const disposition = response.headers.get("content-disposition");
  const match = disposition?.match(/filename="([^"]+)"/i);
  return match?.[1] ?? `${dataset}.${format}`;
}

export function ExportControls({ workspace, dataset }: { workspace: string; dataset: ExportDataset }) {
  const [pending, setPending] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: ExportFormat): Promise<void> {
    setPending(format);
    setError(null);
    try {
      const response = await fetch(`/w/${encodeURIComponent(workspace)}/exports/${dataset}/${format}`, {
        credentials: "same-origin",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not download the export.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = responseFilename(response, dataset, format);
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not download the export.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <div role="group" aria-label={`Export ${dataset}`} className="flex items-center gap-2">
        <span className="text-sm font-medium text-ink-muted">Export</span>
        {(["csv", "json"] as const).map((format) => (
          <Button
            key={format}
            type="button"
            variant="secondary"
            aria-label={`Export ${dataset} as ${format.toUpperCase()}`}
            disabled={pending !== null}
            onClick={() => void download(format)}
          >
            {pending === format ? "Preparing…" : format.toUpperCase()}
          </Button>
        ))}
      </div>
      {error === null ? null : (
        <p role="alert" className="mt-2 text-sm text-[var(--color-critical-ink)]">
          {error}
        </p>
      )}
    </div>
  );
}
