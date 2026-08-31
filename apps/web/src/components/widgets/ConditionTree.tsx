import type { RuleTraceConditionNode } from "@/lib/rule-trace";

function Node({ node }: { node: RuleTraceConditionNode }) {
  return (
    <li>
      <span className={node.result ? "text-[var(--color-ok-ink)]" : "text-[var(--color-critical-ink)]"}>
        {node.result ? "Pass" : "Fail"}
      </span>{" "}
      — {node.label}
      {node.children.length > 0 ? (
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
export function ConditionTree({ root }: { root: RuleTraceConditionNode }) {
  return (
    <ul className="text-sm">
      <Node node={root} />
    </ul>
  );
}
