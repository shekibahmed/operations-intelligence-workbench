export interface PackSummary {
  id: string;
  name: string;
  problemStatement: string;
  sourceTypes: string[];
  exampleOutput: string;
  estimatedMinutes: number;
  lensSummary: { leadership: string; operations: string; technical: string };
}

/** Scenario Selector (R2) card content — PRD §20.1. */
export const stubPacks: PackSummary[] = [
  {
    id: "asset-reliability",
    name: "Asset Reliability",
    problemStatement:
      "Connect scattered field reports, maintenance records and inspection documents into one reliability picture before a repeat fault becomes a safety incident.",
    sourceTypes: ["Field messages", "Maintenance exports", "Inspection documents"],
    exampleOutput: "A hold-from-service decision, evidenced back to the original field report.",
    estimatedMinutes: 5,
    lensSummary: {
      leadership: "See the risk and pending decision at a glance.",
      operations: "Work the case: owner, due date, action items.",
      technical: "Verify exactly how the rule fired.",
    },
  },
  {
    id: "process-exceptions",
    name: "Process Exception Management",
    problemStatement:
      "Follow a process deviation from a single shift note through confirmation, escalation and a formal hold request — without it going quiet between shifts.",
    sourceTypes: ["Shift reports", "QC readings", "Supervisor requests"],
    exampleOutput: "A supplier-lot hold request awaiting approval, with the full escalation trail attached.",
    estimatedMinutes: 5,
    lensSummary: {
      leadership: "See yield-loss exposure and pending approvals.",
      operations: "Track the deviation across shifts and owners.",
      technical: "Inspect the escalation rule's evaluated facts.",
    },
  },
  {
    id: "document-assurance",
    name: "Document Assurance",
    problemStatement:
      "Turn a contract review into tracked obligations, so a missing certificate or an out-of-policy clause surfaces early instead of sitting in a filing cabinet.",
    sourceTypes: ["Contracts", "Compliance emails", "Review checklists"],
    exampleOutput: "An approved exception decision with explicit, scoped conditions.",
    estimatedMinutes: 5,
    lensSummary: {
      leadership: "See exposure and what's been formally accepted.",
      operations: "Track obligations against a live case.",
      technical: "See the evidence behind each flagged discrepancy.",
    },
  },
];

export function findPackById(id: string): PackSummary | undefined {
  return stubPacks.find((pack) => pack.id === id);
}
