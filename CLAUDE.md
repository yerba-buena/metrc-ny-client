# Agent guide for @yerba-buena/metrc-ny-client

If you are a Claude Code (or similar) agent landing on this repo, read this file first. It is the canonical place to learn what this package is, what it does today, what is planned, and the conventions you must respect.

## What this is

A TypeScript client for the METRC NY v2 API (cannabis seed-to-sale tracking). Pre-1.0, MIT, repo `yerba-buena/metrc-ny-client`. Internal use by Yerba Buena retail apps. Consumed via:

1. Git submodule + tsconfig path-alias (existing sibling repos import from `src/` directly).
2. `npm install github:yerba-buena/metrc-ny-client` (works since the `prepare` script builds `dist/` on install).

There is no npm publish today.

## What it provides

`createLiveMetrcClient(config)` and `createMockMetrcClient(fixtures?)` both implement a shared `MetrcClient` interface. The client is **read-only** today — writes are deferred (see Roadmap below). The supported methods are listed in `src/client/interface.ts` and machine-readable in `src/coverage.ts` as `CLIENT_COVERAGE`.

To check programmatically what an endpoint is supported and at what status:

```ts
import { CLIENT_COVERAGE } from "@yerba-buena/metrc-ny-client";

const sales = CLIENT_COVERAGE.find((r) => r.resource === "sales");
const completeEndpoints = sales?.endpoints.filter((e) => e.status === "complete");
```

`CLIENT_COVERAGE` is the source of truth for the full endpoint enumeration (~24 resource families, all documented v2 GET endpoints). README's Coverage table mirrors it at the resource-family level; per-endpoint detail is in `src/coverage.ts`.

## Source of truth, in priority order

1. `src/coverage.ts` (`CLIENT_COVERAGE`) — what's supported, at what status, per endpoint and per resource.
2. `src/client/interface.ts` — the actual method surface. Each method's JSDoc starts with either `API: GET /...` or `Enhancement: ...` so you can tell at a glance whether a method maps 1:1 to a METRC endpoint or is a client-side composition.
3. `README.md` — human-readable Coverage + Client-enhancements + Roadmap, kept in sync with `CLIENT_COVERAGE`.
4. `docs/superpowers/specs/` — the comprehensive-coverage design spec. The authoritative roadmap, conventions, and decisions.
5. `docs/superpowers/plans/` — per-phase implementation plans.
6. `docs/superpowers/audits/` — discovery audit results (counts and verdicts only, no PII).
7. GitHub issues labeled `roadmap` — deferred resources tracked for later phases.

Read the spec doc before designing anything that touches the API surface. Read `CLIENT_COVERAGE` before deciding whether an endpoint is already implemented.

## Conventions you must follow

### `API:` vs `Enhancement:` labels

Every method on `MetrcClient` must declare what it is in the FIRST line of its JSDoc:

- `API: GET /path/v2/...` — a 1:1 passthrough of a single METRC endpoint. The behavior is METRC's contract, not ours.
- `Enhancement: composed from <list of API methods>.` — a client-side helper. The behavior is decided by this client, not METRC.

The same distinction applies in the README (Coverage table = API passthroughs; Client-enhancements section = our additions), in type names (schemas mirroring API responses keep `metrc*` naming; client-only derived types like `SiteSnapshot` use distinct names), and in `CLIENT_COVERAGE` (endpoints vs helpers).

Never put a helper in the Coverage table. Never label a passthrough as an Enhancement. Reviewers will catch it.

### LastModified-quirk endpoints

Four METRC NY endpoints silently return empty or partial results when called without a `lastModifiedStart`/`lastModifiedEnd` window:

- `/locations/v2/active`
- `/items/v2/active`
- `/packages/v2/active` (Phase 0 audit: bare 162 vs windowed 1424 rows)
- `/transfers/v2/incoming` (Phase 0 audit: bare 1 vs windowed 365 rows)

These four methods in `src/client/live.ts` already pass a wide window (`2015-01-01T00:00:00Z` → now). Their JSDoc carries the `(LastModified-quirk)` tag. If you add a new "active" list endpoint, run the discovery audit first (`scripts/discover-schemas.ts`) and patch defensively if the verdict is QUIRKED or INCONCLUSIVE.

### Per-endpoint window types

For endpoints where a date window is semantically required (not just a quirk), declare a per-endpoint typed interface — never a generic shared `DateRange` type. Precedent: `SalesReceiptsWindow` (used by `getActiveSalesReceipts`). The transport layer enforces the typing; both fields are required ISO-8601 strings with boundary input validation.

### Schema discovery before schema writing

When adding a new endpoint, run `scripts/discover-schemas.ts` against it first to capture the real response shape. Hand-typed schemas drift. The discover script writes samples to `scripts/fixtures/` (git-ignored, contains live PII) or audits with counts only to `docs/superpowers/audits/` (committed).

### Sandbox-first for any future writes

The discover script reads `METRC_BASE_URL` from env and defaults to `https://sandbox-api-ny.metrc.com`. The `.env` keys in this repo are currently prod-only (sandbox is not enrolled for this license), so for live read operations against METRC you must set `METRC_BASE_URL=https://api-ny.metrc.com` explicitly on the command line. Writes (when they eventually land) must require an explicit opt-in flag for prod — never default-target prod for mutations.

### TDD discipline

Red first; tests must be non-hollow (pin URLs, params, parsed return shapes). 90% coverage thresholds are enforced in `vitest.config.ts`. Each per-endpoint deliverable adds at least: a schema test, a live-client test, a mock-client test, and a conformance entry.

## What is in scope vs. out of scope

**In scope (planned, in progress, or done):** every documented METRC NY v2 GET endpoint relevant to the dispensary/retailer workflow. The spec and `CLIENT_COVERAGE` enumerate them. See `src/coverage.ts` for the authoritative full list across ~24 resource families. Phasing is in the spec doc (updated 2026-06-10).

**Out of scope for now, tracked as roadmap issues:**

- Cultivator-side resources: plants, plant batches, harvests, processing, additivestemplates, and cultivator-side waste tracking. Reason: we lack a cultivator license for live verification. Issues `#2`, `#3`, `#4`, `#5`.
- Write operations (POST/PUT/DELETE) on any resource. Reason: read-only first. Issues `#6`, `#7`, `#8`. Resources with documented writes are flagged `hasWrites: true` in `CLIENT_COVERAGE`.
- Medical marijuana program endpoints: patients, caregivers, patient-checkins. Reason: adult-use retail license only.
- Transporter-facility endpoints. Reason: not a transporter facility. Issue `#9`.

If a request involves one of those areas, comment on the relevant issue rather than starting work.

**Closed investigations (do not re-open):**

- `/packages/v2/{id}/history` — URL confirmed not to exist. The actual history-like endpoint is `/packages/v2/adjustments` (live-confirmed, 956 records). Issue #13 closed.
- `/sales/v2/transactions` — URL confirmed not to exist in METRC NY v2. Per-transaction data is available via `getSalesReceiptById(id).Transactions`. Issue #16 closed.
- `/transfers/v2/{id}` — URL confirmed not to exist (no bare single-transfer endpoint). The conceptual replacement `/transfers/v2/{id}/deliveries` is planned for Phase 8.

## Common gotchas

- `dist/` is git-ignored; built on `npm install` via the `prepare` script. Don't commit `dist/`.
- `scripts/fixtures/*.json` is git-ignored — those files may contain live PII. Audit outputs go under `docs/superpowers/audits/` and must contain only counts + verdict (no row data, no field values from live records).
- `.env` is git-ignored. Keys live on each developer's machine.
- ESM: `package.json` declares `"type": "module"`. Imports must use `.js` extensions in TS source (even though the source is `.ts`). This matches the project's `tsconfig` (`module: NodeNext`, `verbatimModuleSyntax: true`).
- Node engine: `>= 20`.
- Tests: `npm test` (Vitest); `npm run typecheck`; `npm run build`. All three must pass before opening a PR.
- Commit messages: short conventional prefixes (`feat:`, `fix:`, `test:`, `chore:`, `docs:`), each commit ends with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` if generated by Claude.

## Quick orientation commands

```bash
# What does the client support today?
node -e "import('./dist/index.js').then(m => console.table(m.CLIENT_COVERAGE.map(r => ({ resource: r.resource, status: r.status }))))"

# Which methods are 1:1 API passthroughs vs client helpers?
grep -E "^\s*/\*\* (API|Enhancement)" src/client/interface.ts

# What are the deferred areas?
gh issue list --state open --label roadmap

# What is the design rationale?
ls docs/superpowers/specs/
```

If you are about to do significant work, read the latest spec doc in `docs/superpowers/specs/` and check open PRs (`gh pr list`) to see if anyone is already on it.
