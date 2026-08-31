import type { ArtifactSegment } from "@oiw/contracts";

/** Human-readable label for an evidence locator, shared by the Technical Inspector and Review Queue. */
export function formatLocator(locator: ArtifactSegment["locator"]): string {
  switch (locator.kind) {
    case "text-range":
      return `Characters ${locator.start}–${locator.end}`;
    case "page":
      return `Page ${locator.page}`;
    case "table-cell":
      return `Row ${locator.row}, column ${locator.column}`;
    case "json-path":
      return `Path ${locator.path}`;
    case "attachment":
      return `Attachment ${locator.attachmentId}`;
  }
}
