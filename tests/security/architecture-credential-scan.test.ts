import { describe, expect, it } from "vitest";

import {
  credentialLabelsInText,
  unsafeWriteBackLabelsInText,
} from "../../scripts/architecture-check.js";

const credentialFixtures = {
  generic: `deploymentToken = "${[
    "Q7mZ",
    "v3Kd",
    "P9xR",
    "t6Wc",
    "N2jF",
    "s8Ha",
    "L5uB",
    "y4Ge",
    "C1qV",
  ].join("")}"`,
  supabase: ["sb", "secret", "N7r4Yp2wQ9d6Hs3kLm8vCx5zBt1fGa0J"].join("_"),
  jwt: [
    ["eyJ", "hbGciOiJIUzI1NiJ9"].join(""),
    ["eyJ", "zdWIiOiJzeW50aGV0aWMtdGVzdCJ9"].join(""),
    "K3yT9mV2pQ7wR4sN8dF1hJ6cL0xZ5bG",
  ].join("."),
  postgres: [
    "postgresql://deployment_user:",
    "V9xQ2mL7pR4sW8dK1fH6cN3z",
    "@db.production.invalid:5432/oiw",
  ].join(""),
} as const;

describe("architecture credential backstop", () => {
  it("detects every expanded credential fixture", () => {
    expect(credentialLabelsInText(credentialFixtures.generic)).toContain(
      "generic high-entropy credential",
    );
    expect(credentialLabelsInText(credentialFixtures.supabase)).toContain(
      "Supabase secret key",
    );
    expect(credentialLabelsInText(credentialFixtures.jwt)).toContain("JWT-shaped token");
    expect(credentialLabelsInText(credentialFixtures.postgres)).toContain(
      "credential-bearing PostgreSQL URL",
    );
  });

  it("allows checksums, local development URLs and explicit placeholders", () => {
    expect(
      credentialLabelsInText(
        [
          `artifactChecksum=${"a".repeat(64)}`,
          "postgresql://postgres:postgres@localhost:5432/oiw",
          "SESSION_SECRET=replace-with-your-secret-placeholder",
          "const sessionSecret = 'e2e-test-session-secret-not-for-production-use'",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("detects outbound network capability in the rule or decision path", () => {
    expect(unsafeWriteBackLabelsInText(`import https from "node:https";`)).toEqual([
      "outbound network client import in the rule/decision path",
    ]);
    expect(unsafeWriteBackLabelsInText("await fetch(targetUrl);")).toEqual([
      "outbound fetch call in the rule/decision path",
    ]);
  });
});
