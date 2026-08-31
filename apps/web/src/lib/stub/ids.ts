/**
 * Deterministic identifiers for the in-repo stub dataset, generated once via
 * `uuid.uuid5(uuid.NAMESPACE_URL, <seed>)` / `sha256(<seed>)` so the fixture
 * is stable across runs and satisfies the contracts' `IdSchema`/`ChecksumSchema`
 * formats without pulling a runtime UUID/hash dependency into `apps/web`.
 */
export const workspaceId = "c984eea4-c843-5816-b16c-42ccac7ac935";

export const sourceIds = {
  informal: "a23006c2-1894-54d9-9762-3625348b29da",
  maintenance: "0df4f248-cdd6-5857-864a-4fd165feb8b1",
  inspection: "8f721499-5f5f-5d56-9d20-ab94e782a69a",
} as const;

export const artifactIds = {
  informal: "1d0c398b-b9ee-5733-9113-0776557d99e9",
  maintenance: "37b6fa59-542c-5aee-bb6a-c53f0925fd77",
  inspection: "548145fe-bc21-5f38-949c-1f63326d3c51",
  sensor: "f307d05f-379b-5749-be0a-bd857fc51ac4",
} as const;

export const artifactChecksums = {
  informal: "b4e03417779bf8edc183ab54342bae6bdf42b246bdc19ed08e41a88bb854bc59",
  maintenance: "0fe71feb154394817116df6deb7933dd5a3b1529d4a1158486234f5954cb2a3b",
  inspection: "a60aa3282d0b55488a8b372bb5ea18ea71a107ebd73095ff57f4eb4c026a2f21",
  sensor: "b3533b0639754a58afbe0d002586122dc61309a13b67a8e9cf38ea24f4922c33",
} as const;

export const segmentIds = {
  informalAsset: "e5d766bb-527d-5741-8c8c-24942adc4e48",
  informalSymptom: "22b5dfb4-78f8-58cf-b59f-5b6fbb046de4",
  maintenanceRow: "253b5d24-517a-5337-a415-32463f081aa4",
  inspectionPage: "fe7af1a3-d3d5-59c3-9126-d70e8eaa1a11",
} as const;

export const entityIds = {
  assetPrimary: "96e1d2a9-503b-59a4-95e3-77534e4649a0",
  assetSecondary: "16d299e2-a275-5d8b-bd39-57ee864e3107",
  assetTertiary: "882eeba7-c503-5cde-940a-30083d9efb69",
  location: "6c4549bb-f9f8-55fa-ba05-fc9ee2578676",
} as const;

export const observationIds = {
  assetId: "4ee4fcbf-2200-599d-beeb-95a1125cb74b",
  symptom: "7c792734-ba48-5028-a71a-4a83bc690f5d",
  severity: "dd8fc17a-6129-581f-92a3-790589bbd873",
  condition: "e7d385a7-5d47-57f6-9126-dc0976e0275f",
} as const;

export const eventIds = {
  faultReported: "73b0aecc-e45b-548a-bc22-894806103f4f",
  inspectionCompleted: "374d3947-9716-5c54-913d-f26f11d8709f",
  maintenanceRecorded: "2ec42d1d-7585-5817-a12d-5b336c947ab6",
} as const;

export const signalIds = {
  repeatFault: "9e17d738-fd37-5863-9356-7d2d4eb59e94",
} as const;

export const caseIds = {
  open: "49889cc3-4e76-5cb4-9ef4-0de4e6cb0fbd",
  openSecondary: "9f27e2bd-d2f9-5523-963a-4f5778195e82",
  closed: "0aabc459-489b-5e55-850c-91dd2f4da656",
} as const;

export const actionItemIds = {
  inspect: "fcac70fa-f07f-590a-be9b-fb51d28eb9fb",
  replace: "7bbc7bd8-df8c-5d09-ac56-c7aebbf67e87",
  confirm: "e88459cf-1354-5b4d-8bdd-fabf7b8edda2",
} as const;

export const decisionIds = {
  holdFromService: "1ac471c2-fd82-5551-a208-6c3e30fb33be",
  approvedExample: "8d8ad4df-9dde-5b10-b0c9-d9ea1ea95568",
} as const;

export const approvalIds = {
  holdFromService: "1377f5a0-d30c-5797-a996-fe4b4b4c7ffe",
} as const;

export const auditEntryIds = [
  "6845cb65-2fc2-5c7b-9ced-7bb9a36b5687",
  "56d1c894-d290-5d54-adfe-5d2dc1d2f053",
  "e7ec246c-4240-598b-a1ef-fc7e0acba169",
  "75d476fc-440e-5625-a7b0-c6b422776997",
  "4a73f91e-51d6-5932-8e05-850f6afd4fcc",
  "1643d00d-60f9-59b9-93dc-15a66b902db2",
  "4220967a-15a5-5e8c-88a3-911726e2651e",
  "333407d5-4aec-5bff-8d3a-b0cc724e1ca6",
] as const;

export const auditEntryHashes = [
  "5689fc411674474e30c75be00391d6c22be846358a7dd3baf05c288f66e0864b",
  "55828bbee6325eb002ba935ced52ff1fecd476c0f1455031583b84865ce423b4",
  "0b1acb9cd5fb075cadd18e51ba27c32d93cf0e9ad3499ce67faf3c58c263b4a1",
  "b84ea48faacf13a1f8ff12f7483659e94fb5abdd8e7e894020570c78630cd981",
  "3f37bd9e8c7bead87d8bb655c217d46a09737846b7d9d14c7060c465e4e29acb",
  "fd691f63794a8737c10b2a781421e915acfc13cb59762aa42cd5116fb143f586",
  "52c59700fdc887996f5c00438efe03bdcbba15a064ab1cfd2dfdd143e5d319b6",
  "763d2dfab0875b02df047e8562b3315f07ed8ef00bf13d474ba203002b8dbfe5",
] as const;

export const ruleId = {
  id: "repeat-fault-safety-hold",
  version: "1.0.0",
} as const;
