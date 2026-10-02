import { describe, expect, it } from "vitest";
import { renderCasebook, type CasebookDocument } from "./casebook.js";

function document(): CasebookDocument {
  return {
    title: "An inspectable recorded case", question: "What supports this decision?", summary: "Follow source evidence and review.", attribution: "Built by a synthetic team.",
    disclosures: ["Synthetic fixtures and scripted review. No physical execution established."],
    sources: [{ id: "source-one", date: "2026-01-01", label: "Original report", context: "An authored report.", excerpts: ["A supporting passage."], evidenceIds: ["source-one"] }],
    sections: [{ id: "review", title: "Review uncertainty", explanation: "A recorded transition.", facts: [{ label: "Review status", value: "pending → accepted", reference: "recording.review" }], qualifications: ["Scripted visitor."], excerpts: [{ text: "A supporting passage.", sourceId: "source-one" }], evidenceIds: ["source-one"] }],
    capabilities: [{ title: "Inspectable review", explanation: "Trace a claim to implementation.", links: [{ label: "Verification", href: "https://github.com/example/project/blob/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/test.ts" }] }],
    evidence: [{ id: "source-one", kind: "artifact", path: "sources/one.txt", text: "A supporting passage.", checksum: "0".repeat(64), href: "https://github.com/example/project/blob/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/sources/one.txt" }],
    provenance: [{ label: "Revision", value: "a".repeat(40), reference: "recording.sourceRevision" }], inputHashes: [{ path: "case.json", checksum: "0".repeat(64) }],
    implementation: { label: "Inspect the implementation", href: "https://github.com/example/project" }, consultancy: { label: "Example", href: "https://example.com" }, contact: { label: "Discuss a workflow pilot", href: "mailto:hello@example.com" },
  };
}

describe("standalone casebook presentation", () => {
  it("renders a complete semantic document with inline styles, navigable evidence and no required assets", () => {
    const html = renderCasebook(document());
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<style>');
    expect(html).toContain('<main id="main">');
    expect(html).toContain('href="#review"');
    expect(html).toContain('<details id="evidence-source-one">');
    expect(html).toContain("pending → accepted");
    expect(html).toContain("No physical execution established.");
    expect(html).not.toMatch(/<script|<link|<img|<iframe|@import|url\(/);
    expect(html).toContain('href="mailto:hello@example.com"');
    expect(renderCasebook(document())).toBe(html);
  });

  it("displays untrusted source and presentation strings as text", () => {
    const input = document();
    const attack = '</pre></style><script>alert("x")</script><img src=x onerror="boom"> &';
    input.title = attack;
    input.question = attack;
    input.summary = attack;
    input.disclosures = [attack];
    input.sources[0]!.excerpts = [attack];
    input.evidence[0]!.text += attack;
    input.sections[0]!.facts[0]!.value = attack;
    input.capabilities[0]!.explanation = attack;
    const html = renderCasebook(input);
    expect(html).not.toContain(attack);
    expect(html).not.toMatch(/<script|<img/);
    expect(html).toContain('&lt;/pre&gt;&lt;/style&gt;&lt;script&gt;alert(&quot;x&quot;)');
    expect(html).toContain('onerror=&quot;boom&quot;&gt; &amp;');
  });

  it.each(["javascript:alert(1)", "data:text/html,unsafe", "http://example.com", "https://user:password@example.com", "https://example.com/\nunsafe"])("rejects unsafe outbound destination %s", (href) => {
    const input = document();
    input.capabilities[0]!.links[0]!.href = href;
    expect(() => renderCasebook(input)).toThrow();
  });

  it("rejects unresolved evidence and duplicate section anchors", () => {
    const input = document();
    input.sections[0]!.evidenceIds = ["missing"];
    expect(() => renderCasebook(input)).toThrow(/Unresolved evidence/);
    input.sections[0]!.evidenceIds = ["source-one"];
    input.sections[0]!.id = "sources";
    expect(() => renderCasebook(input)).toThrow(/Duplicate/);
  });

  it("rejects excerpts that do not exist in the original they cite", () => {
    const input = document();
    input.sections[0]!.excerpts[0]!.text = "Invented support";
    expect(() => renderCasebook(input)).toThrow(/excerpt/i);
  });
});
