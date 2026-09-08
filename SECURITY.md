# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's
[private vulnerability reporting](https://github.com/shekibahmed/operations-intelligence-workbench/security/advisories/new)
for this repository. Do not open a public issue for security problems.

Include what you observed, steps to reproduce, and the commit or version
affected. You should receive an acknowledgement within a few days. Once a fix
is available it will be released on `main` and credited in the advisory
unless you prefer otherwise.

## Scope

This project ships synthetic demonstration data only and contains no
credentials, live connectors or client data. The threat model, mitigations
and accepted risks for the public demonstration are documented in
[`docs/SECURITY.md`](docs/SECURITY.md); the prompt-injection test matrix is in
[`docs/quality/INJECTION_TEST_MATRIX.md`](docs/quality/INJECTION_TEST_MATRIX.md).

Reports about the deliberately accepted risks listed there (for example the
process-local rate-limit store) are welcome as ordinary issues rather than
security advisories.

## Supported versions

Only the current `main` branch is supported.
