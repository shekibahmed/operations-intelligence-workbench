"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";

export function CopyableJson({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(value, null, 2);

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          void navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
      <pre tabIndex={0} className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-surface-muted p-3 text-xs">
        <code>{text}</code>
      </pre>
    </div>
  );
}
