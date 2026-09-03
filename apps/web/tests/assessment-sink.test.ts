import { describe, expect, it } from "vitest";

import { assessmentSinkName } from "@/lib/server/assessment-sink";

describe("assessment sink selection", () => {
  it("defaults to postgres and selects the explicit log sink", () => {
    expect(assessmentSinkName(undefined)).toBe("postgres");
    expect(assessmentSinkName("postgres")).toBe("postgres");
    expect(assessmentSinkName("log")).toBe("log");
    expect(assessmentSinkName(" log ")).toBe("log");
  });

  it("fails closed for an unknown destination", () => {
    expect(() => assessmentSinkName("email")).toThrow("must be postgres or log");
    expect(() => assessmentSinkName("webhook")).toThrow("must be postgres or log");
  });
});
