"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

/**
 * Focus-managed confirmation for high-risk actions (UX_SPEC §5.11: Approve/
 * Reject on a high-risk Decision requires a comment and a confirmation step,
 * not `window.confirm()`; focus returns to the triggering control on close).
 * Built on Radix Dialog, which owns the focus-trap/return behaviour.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  requireComment = false,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  requireComment?: boolean;
  onConfirm: (comment: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const canConfirm = !requireComment || comment.trim().length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(28rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-4 shadow-lg">
          <Dialog.Title className="text-sm font-semibold text-ink">{title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-ink-muted">{description}</Dialog.Description>
          <label className="mt-3 block text-sm">
            <span className="font-medium text-ink">
              Comment{requireComment ? " (required)" : " (optional)"}
            </span>
            <textarea
              className="mt-1 w-full rounded-md border border-border p-2 text-sm"
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              disabled={!canConfirm}
              onClick={() => {
                onConfirm(comment);
                setOpen(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
