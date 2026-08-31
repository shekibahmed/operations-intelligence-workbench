export type PackIssueSeverity = "error" | "warning";

export interface PackIssue {
  /**
   * Repository-relative-to-pack path of the offending file, optionally
   * suffixed with `#<field.path>` for a specific field inside that file.
   */
  path: string;
  message: string;
  severity: PackIssueSeverity;
}

export function issueError(path: string, message: string): PackIssue {
  return { path, message, severity: "error" };
}

export function issueWarning(path: string, message: string): PackIssue {
  return { path, message, severity: "warning" };
}

export function formatIssue(issue: PackIssue): string {
  return `[${issue.severity}] ${issue.path}: ${issue.message}`;
}
