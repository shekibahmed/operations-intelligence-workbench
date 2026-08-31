import type { Lens } from "@/lib/lens";

export function workspaceBase(workspace: string): string {
  return `/w/${workspace}`;
}

export function withLens(href: string, lens: Lens): string {
  const [path, existingQuery] = href.split("?");
  const params = new URLSearchParams(existingQuery ?? "");
  params.set("lens", lens);
  return `${path}?${params.toString()}`;
}
