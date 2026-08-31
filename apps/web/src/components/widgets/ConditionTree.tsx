import type { ConditionNode } from "@/lib/stub/rule-trace";

function Node({ node }: { node: ConditionNode }) {
  return (
    <li>
      <span className={node.result === "pass" ? "text-[var(--color-ok-ink)]" : "text-[var(--color-critical-ink)]"}>
        {node.result === "pass" ? "Pass" : "Fail"}
      </span>{" "}
      — {node.label}
      {node.children && node.children.length > 0 ? (
        <ul className="ml-4 mt-1 list-disc space-y-1">
          {node.children.map((child, index) => (
            <Node key={index} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Proper list/tree semantics for the condition evaluation tree (UX_SPEC §5.12 accessibility). */
export function ConditionTree({ root }: { root: ConditionNode }) {
  return (
    <ul className="text-sm">
      <Node node={root} />
    </ul>
  );
}
