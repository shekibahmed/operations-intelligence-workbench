export interface CasebookLink { label: string; href: string }
export interface CasebookFact { label: string; value: string; reference: string }
export interface CasebookSection {
  id: string;
  title: string;
  explanation: string;
  facts: CasebookFact[];
  qualifications: string[];
  excerpts: Array<{ text: string; sourceId: string }>;
  evidenceIds: string[];
}
export interface CasebookDocument {
  title: string;
  question: string;
  summary: string;
  attribution: string;
  disclosures: string[];
  sources: Array<{ id: string; date: string; label: string; context: string; excerpts: string[]; evidenceIds: string[] }>;
  sections: CasebookSection[];
  capabilities: Array<{ title: string; explanation: string; links: CasebookLink[] }>;
  evidence: Array<{ id: string; kind: string; path: string; text: string; checksum: string; href: string }>;
  provenance: CasebookFact[];
  inputHashes: Array<{ path: string; checksum: string }>;
  implementation: CasebookLink;
  consultancy: CasebookLink;
  contact: CasebookLink;
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
function id(value: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) throw new Error(`Invalid document anchor: ${value}`);
  return value;
}
function link(value: CasebookLink): string {
  const url = new URL(value.href);
  if (url.protocol !== "https:" && url.protocol !== "mailto:") throw new Error("Only HTTPS and mailto destinations are permitted");
  if (url.username || url.password || Array.from(value.href).some((character) => character.charCodeAt(0) <= 32)) throw new Error("Invalid outbound destination");
  return `<a href="${escape(value.href)}">${escape(value.label)}</a>`;
}
function facts(values: CasebookFact[]): string {
  return `<dl class="facts">${values.map((fact) => `<div><dt>${escape(fact.label)}</dt><dd>${escape(fact.value)}<small class="reference">${escape(fact.reference)}</small></dd></div>`).join("")}</dl>`;
}
function evidenceLinks(ids: string[]): string {
  return `<p class="support">Embedded support: ${ids.map((value) => `<a href="#evidence-${id(value)}">${escape(value)}</a>`).join(" · ")}</p>`;
}

/** A pure presentation function: all story, evidence and outcome values arrive as data. */
export function renderCasebook(document: CasebookDocument): string {
  const anchors = new Set(["main", "sources", "capabilities", "provenance", "evidence", "next-steps"]);
  for (const section of document.sections) {
    const anchor = id(section.id);
    if (anchors.has(anchor)) throw new Error(`Duplicate document anchor: ${anchor}`);
    anchors.add(anchor);
  }
  const sourceIds = new Set(document.evidence.map((file) => id(file.id)));
  if (sourceIds.size !== document.evidence.length) throw new Error("Duplicate evidence anchor");
  for (const item of [...document.sources, ...document.sections]) {
    for (const reference of item.evidenceIds) if (!sourceIds.has(reference)) throw new Error(`Unresolved evidence: ${reference}`);
  }
  for (const section of document.sections) for (const excerpt of section.excerpts) {
    const original = document.evidence.find((file) => file.id === excerpt.sourceId);
    if (!original) throw new Error(`Unresolved excerpt source: ${excerpt.sourceId}`);
    if (!original.text.includes(excerpt.text)) throw new Error(`Unsupported excerpt: ${excerpt.sourceId}`);
  }
  for (const source of document.sources) for (const excerpt of source.excerpts) {
    if (!source.evidenceIds.some((reference) => document.evidence.find((file) => file.id === reference)?.text.includes(excerpt))) throw new Error(`Unsupported source excerpt: ${source.id}`);
  }
  const navigation = [{ id: "sources", title: "Sources" }, ...document.sections, { id: "capabilities", title: "Engineering" }, { id: "provenance", title: "Provenance" }, { id: "next-steps", title: "Next steps" }];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escape(document.summary)}">
<title>${escape(document.title)} | Evidence casebook</title>
<style>
:root{color-scheme:light;--ink:#12151c;--muted:#575f6e;--blue:#1f4fd8;--line:#e4e7ec;--soft:#f5f6f8;--tint:#edf2fe}
*{box-sizing:border-box}html{scroll-padding-top:1.5rem}body{margin:0;background:white;color:var(--ink);font:17px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}a{color:var(--blue);text-underline-offset:3px;overflow-wrap:anywhere}a:hover{color:#1a41b5}a:focus-visible,summary:focus-visible{outline:3px solid var(--blue);outline-offset:5px;border-radius:2px}h1,h2,h3,p,ol,ul,dl,blockquote{margin-top:0}h1{font-size:clamp(2.3rem,5vw,4rem);line-height:1.08;letter-spacing:-.045em;max-width:19ch;margin-bottom:1.4rem}h2{font-size:clamp(1.65rem,3vw,2.2rem);line-height:1.2;letter-spacing:-.025em}h3{font-size:1.15rem;line-height:1.4}p:last-child{margin-bottom:0}small{font-size:.8rem}.shell{max-width:1180px;margin:auto;padding:0 36px}.brand{display:flex;justify-content:space-between;gap:24px;align-items:center;padding:24px 0;border-bottom:1px solid var(--line);font-size:.85rem}.brand strong{letter-spacing:.02em}.eyebrow{font-size:.75rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--blue);margin-bottom:20px}.hero{padding:65px 0 36px;max-width:940px}.question{font-size:1.25rem;line-height:1.6;max-width:65ch}.muted,.reference{color:var(--muted)}.disclosures{background:var(--tint);border-left:4px solid var(--blue);padding:26px 28px;font-size:.94rem}.disclosures h2{font-size:1rem;letter-spacing:0;margin-bottom:12px}.disclosures ul{margin-bottom:0;padding-left:20px}.disclosures li+li{margin-top:8px}.navigation{padding:27px 0;border-bottom:1px solid var(--line)}.navigation ol{display:flex;flex-wrap:wrap;gap:10px 22px;list-style:none;padding:0;margin:0;font-size:.87rem}.layout{display:grid;grid-template-columns:165px minmax(0,1fr);column-gap:44px}.rail{padding-top:50px;font-size:.85rem;color:var(--muted)}.rail p{max-width:16ch}.content{min-width:0}.section{padding:48px 0;border-bottom:1px solid var(--line)}.section-heading{display:flex;gap:16px;align-items:baseline}.number{font:700 .85rem/1.4 system-ui;color:var(--blue)}.lead{max-width:76ch;color:var(--muted)}.source-list{padding:0;list-style:none;margin-bottom:0}.source-card{border:1px solid var(--line);border-radius:10px;padding:24px;margin-top:20px;background:white}.source-card time{font-size:.8rem;color:var(--muted)}.source-card h3{margin:5px 0 10px}.source-card p{font-size:.94rem}blockquote{margin:20px 0 16px;padding:16px 20px;border-left:3px solid var(--blue);background:var(--soft);white-space:pre-wrap;overflow-wrap:anywhere;font-size:.95rem}blockquote p{margin:0}.support{font-size:.8rem;color:var(--muted);margin-top:16px}.facts{margin:22px 0 0;border-top:1px solid var(--line)}.facts>div{display:grid;grid-template-columns:minmax(145px,1fr) minmax(0,2fr);gap:22px;padding:13px 0;border-bottom:1px solid var(--line)}dt{font-size:.85rem;color:var(--muted)}dd{margin:0;font-weight:600;overflow-wrap:anywhere;white-space:pre-wrap}.reference{display:block;font:400 .74rem/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;margin-top:5px;overflow-wrap:anywhere}.qualification{margin-top:20px;font-size:.93rem;border-left:3px solid var(--line);padding-left:18px}.capability{margin-top:26px}.capability ul{padding-left:20px;font-size:.83rem}.capability li+li{margin-top:5px}details{margin:18px 0;border:1px solid var(--line);border-radius:8px;padding:16px 20px}summary{cursor:pointer;font-weight:600;overflow-wrap:anywhere}details[open] summary{margin-bottom:18px}pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;font:.8rem/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;background:var(--soft);padding:18px;border-radius:5px}.hashes li{margin:12px 0;overflow-wrap:anywhere}.hashes{list-style:none;padding:0}.next{background:var(--tint);padding:32px;border-radius:12px;margin-top:30px}.buttons{display:flex;flex-wrap:wrap;gap:12px;margin:22px 0}.buttons a{display:inline-block;padding:12px 18px;background:var(--blue);color:white;border-radius:6px;text-decoration:none;font-weight:600;font-size:.9rem}.buttons a+a{background:white;color:var(--blue);border:1px solid var(--blue)}footer{padding:30px 0 42px;color:var(--muted);font-size:.8rem}.skip{position:absolute;top:8px;left:8px;transform:translateY(-200%);background:white;padding:12px;z-index:1}.skip:focus{transform:none}::selection{background:var(--tint)}@media(max-width:760px){.shell{padding:0 22px}.hero{padding-top:40px}.layout{display:block}.rail{display:none}.brand{align-items:flex-start}.brand span{max-width:16ch;text-align:right}.section{padding:36px 0}.source-card{padding:20px}.facts>div{grid-template-columns:1fr;gap:4px}.disclosures{padding:22px}.next{padding:24px}.navigation ol{gap:12px 18px}h1{max-width:100%}}@media print{.shell{max-width:none;padding:0}.layout{display:block}.rail,.skip{display:none}details{break-inside:avoid}.section{padding:25px 0}.buttons a{border:1px solid var(--line)}}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to the case</a>
<div class="shell">
<header class="brand"><strong>Operations Intelligence Workbench</strong><span>Recorded evidence casebook</span></header>
<main id="main">
<div class="hero"><p class="eyebrow">One case · Inspectable evidence · Governed decisions</p><h1>${escape(document.title)}</h1><p class="question">${escape(document.question)}</p><p class="muted">${escape(document.summary)}</p></div>
<aside class="disclosures" aria-labelledby="limits-heading"><h2 id="limits-heading">What this demonstration establishes</h2><ul>${document.disclosures.map((value) => `<li>${escape(value)}</li>`).join("")}</ul></aside>
<nav class="navigation" aria-label="Casebook sections"><ol>${navigation.map((section) => `<li><a href="#${id(section.id)}">${escape(section.title)}</a></li>`).join("")}</ol></nav>
<div class="layout"><aside class="rail"><p>Read the evidence.<br>Follow the judgment.<br>Inspect the engineering.</p><p>Source passages and recorded outcomes are embedded in this file.</p></aside><div class="content">
<section class="section" id="sources" aria-labelledby="sources-heading"><div class="section-heading"><span class="number">01</span><h2 id="sources-heading">The original sources</h2></div><p class="lead">Authored synthetic reports. Their dates describe the example history, separately from the later application capture.</p><ol class="source-list">${document.sources.map((source) => `<li class="source-card" id="source-${id(source.id)}"><time datetime="${escape(source.date)}">${escape(source.date)}</time><h3>${escape(source.label)}</h3><p>${escape(source.context)}</p>${source.excerpts.map((text) => `<blockquote><p>${escape(text)}</p></blockquote>`).join("")}${evidenceLinks(source.evidenceIds)}</li>`).join("")}</ol></section>
${document.sections.map((section, index) => `<section class="section" id="${id(section.id)}" aria-labelledby="${id(section.id)}-heading"><div class="section-heading"><span class="number">${String(index + 2).padStart(2, "0")}</span><h2 id="${id(section.id)}-heading">${escape(section.title)}</h2></div><p class="lead">${escape(section.explanation)}</p>${section.excerpts.map((excerpt) => `<blockquote><p>${escape(excerpt.text)}</p><small><a href="#evidence-${id(excerpt.sourceId)}">Read the complete supporting original</a></small></blockquote>`).join("")}${facts(section.facts)}${section.qualifications.map((value) => `<p class="qualification">${escape(value)}</p>`).join("")}${section.evidenceIds.length ? evidenceLinks(section.evidenceIds) : ""}</section>`).join("\n")}
<section class="section" id="capabilities" aria-labelledby="capabilities-heading"><h2 id="capabilities-heading">Inspect the engineering</h2><p class="lead">Each capability below has implementation or verification evidence at the recorded application revision.</p>${document.capabilities.map((capability) => `<article class="capability"><h3>${escape(capability.title)}</h3><p>${escape(capability.explanation)}</p><ul>${capability.links.map((value) => `<li>${link(value)}</li>`).join("")}</ul></article>`).join("")}</section>
<section class="section" id="provenance" aria-labelledby="provenance-heading"><h2 id="provenance-heading">A historical record, with explicit limits</h2><p class="lead">This file describes the recorded revision. Later publication or repository changes do not turn it into evidence about newer code.</p>${facts(document.provenance)}<details><summary>Capture-time input checksums</summary><p>These hashes identify inputs used by the capture. Later harness changes do not rewrite the historical recording.</p><ul class="hashes">${document.inputHashes.map((input) => `<li>${escape(input.path)}<code class="reference">SHA-256 ${escape(input.checksum)}</code></li>`).join("")}</ul></details></section>
<section class="section" id="evidence" aria-labelledby="evidence-heading"><h2 id="evidence-heading">Embedded supporting originals</h2><p class="lead">Complete frozen text, extraction objects and policy definitions are available below without a network connection. Repository links pin the recorded application revision; the older frozen-evidence revision is disclosed above.</p>${document.evidence.map((file) => `<details id="evidence-${id(file.id)}"><summary>${escape(file.id)} · ${escape(file.kind)}</summary><p>${link({ label: file.path, href: file.href })}</p><p class="reference">SHA-256 ${escape(file.checksum)}</p><pre>${escape(file.text)}</pre></details>`).join("")}</section>
<section class="section" id="next-steps" aria-labelledby="next-steps-heading"><div class="next"><h2 id="next-steps-heading">Explore a workflow pilot</h2><p>Inspect how this case works, or discuss the sources, review boundaries and approval controls in your own workflow.</p><div class="buttons">${link(document.implementation)}${link(document.contact)}</div><p>${link(document.consultancy)} · ${link({ label: document.contact.href.slice(7), href: document.contact.href })}</p><p class="muted">${escape(document.attribution)}</p></div></section>
</div></div>
</main>
<footer>Recorded synthetic evidence. Reading this file does not change operational state. All essential content is available without scripts, an application session or a database.</footer>
</div>
</body>
</html>
`;
}
