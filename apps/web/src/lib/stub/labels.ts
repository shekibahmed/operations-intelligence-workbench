import type { PackLabels } from "@/lib/pack-labels";

/**
 * Stand-in for a Scenario Pack's `labels` file (UX_SPEC §8.2). Wave 2's pack
 * registry will load the real file from `scenario-packs/`; this object gives
 * `apps/web` something typed to render against in the meantime, matching the
 * Asset Reliability narrative used by `docs/DEMO_SCRIPT.md`.
 */
export const assetReliabilityLabels: PackLabels = {
  packId: "asset-reliability",
  packName: "Asset Reliability",
  packDescription:
    "Track equipment condition reports from field messages, maintenance records and inspection documents through to reliability cases and decisions.",
  entityTypes: {
    asset: { singular: "Asset", plural: "Assets" },
    location: { singular: "Location", plural: "Locations" },
  },
  eventTypes: {
    "fault-reported": "Fault reported",
    "inspection-completed": "Inspection completed",
    "maintenance-recorded": "Maintenance recorded",
  },
  signalTypes: {
    "repeat-fault": "Repeat fault",
  },
  caseTypes: {
    reliability: "Reliability case",
  },
  actionTypes: {
    inspect: "Inspect",
    replace: "Replace component",
    confirm: "Confirm resolution",
  },
  decisionTypes: {
    "hold-from-service": "Hold asset from service",
  },
  workflowStates: {
    open: "Open",
    "in-progress": "In progress",
    closed: "Closed",
  },
};
