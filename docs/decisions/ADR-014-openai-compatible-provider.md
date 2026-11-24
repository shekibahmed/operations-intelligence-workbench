# ADR-014: Optional OpenAI-Compatible Intelligence Provider

## Status

Accepted — 2026-11-22

## Context

PRD FR-021 (P1) asks for an optional live intelligence provider that can be
changed without changing domain logic. Until now only the deterministic
fixture provider existed, so the project could not show how a real model
behaves on its adversarial gold sets. The owner does not want the project to
use the owner's own API key or paid quota.

## Decision

1. Add `OpenAICompatibleIntelligenceProvider` to `@oiw/intelligence`. It calls
   `POST {baseUrl}/chat/completions` with `fetch`. No SDK and no new
   dependency. One protocol covers a local Ollama server (free, no key),
   OpenAI, and other compatible gateways.
2. Configuration comes only from the operator: `OIW_LLM_BASE_URL`,
   `OIW_LLM_MODEL` and an optional `OIW_LLM_API_KEY`. With these unset,
   `fromEnv()` returns null and nothing calls a model.
3. The model returns short verbatim quotes, never offsets. The provider
   locates each quote in the artifact text and builds `text-range` locators.
   An `extracted` or `negated` proposal without a verbatim quote becomes
   `insufficient-evidence` with confidence 0. Unknown schema keys are dropped.
   Artifact text is sent between explicit untrusted-data delimiters.
4. The provider is used only by `pnpm eval:llm`, a database-free scorer
   against `evaluations/*.gold.json`. The web app, the guided tours, the
   public demo and `pnpm eval` keep the fixture provider, so the demo path stays
   deterministic and free of external runtime dependencies (AGENTS.md).

## Consequences

- Anyone can measure a model on the 79 smoke and edge-case artifacts at no
  cost to the project.
- Grounding by verbatim search finds the first occurrence of a quote. A quote
  that occurs twice may point at the wrong occurrence. This is acceptable for
  scoring and is visible in the excerpt.
- `text-range` locators differ from gold `page`, `table-cell` and `json-path`
  locators, so `pnpm eval:llm` scores status and value, not locator equality.
- Wiring the provider into the web app for uploaded artifacts is a separate
  decision. It needs per-workspace opt-in and data-handling rules
  (docs/SECURITY.md) before real content could be sent to a hosted model.
