# Phase 2 — Packages resource (full coverage) Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out the packages resource family. After this phase, `CLIENT_COVERAGE.packages.status === "complete"` and the README's items row reads as fully covered. Also delivers the two cross-resource helpers `groupByLocation` (pure) and `siteSnapshot` (compositional).

**Architecture:** Three focused subphases, each one a small group of related changes that could be its own commit. Single PR targeting `main` (after PR #12 lands). The phase reuses `metrcActivePackageSchema` for inactive / by-id / by-label (discovery confirmed the shapes are identical-with-nullables); adds a tiny `metrcPackageAdjustReasonSchema`; introduces a non-paginated `requestArray()` transport variant for `/packages/v2/types`.

**Tech Stack:** existing — TypeScript NodeNext + strict + verbatimModuleSyntax, Vitest 4, Zod 3, the established per-endpoint template.

---

## Discovery summary (authoritative — from `docs/superpowers/audits/discover-packages-v2-*.json`)

| Endpoint | Envelope | Shape decision | LastModified | Notes |
|---|---|---|---|---|
| `/packages/v2/inactive` | paginated | reuses `metrcActivePackageSchema` | **wide-window required** (bare 8 vs windowed 1419) | INCONCLUSIVE verdict — patch defensively, JSDoc with `(LastModified-quirk)`. |
| `/packages/v2/onhold` | paginated | reuses `metrcActivePackageSchema` | **wide-window applied defensively** (license had 0 rows; verdict OK but inconclusive in practice) | JSDoc with `(LastModified-quirk)`. |
| `/packages/v2/types` | **bare-array of strings** | each row is `z.string()` | N/A | No envelope, no pagination — needs `requestArray<string>()`. |
| `/packages/v2/adjust/reasons` | paginated | new `metrcPackageAdjustReasonSchema` (5 fields) | N/A | 9 records on this license. |
| `/packages/v2/{id}` | single-object | reuses `metrcActivePackageSchema` (identical shape) | N/A | Use `validateOne`. |
| `/packages/v2/{label}` | single-object | reuses `metrcActivePackageSchema` (identical shape) | N/A | Use `validateOne`. |
| `/packages/v2/{id}/history` | n/a | **404 NOT FOUND** — endpoint absent on NY v2 today | N/A | **Dropped from P2.** File issue to investigate alternative URLs. |

## Subphase layout

### Subphase A — List endpoints + cross-resource helpers
Closes the "items at a location / on site" use case the user named at the start.
- API: `getInactivePackages()` → `/packages/v2/inactive` (wide-window, returns `MetrcActivePackage[]`)
- API: `getOnHoldPackages()` → `/packages/v2/onhold` (wide-window defensively, returns `MetrcActivePackage[]`)
- **Enhancement:** `groupByLocation(packages)` — pure function `(MetrcActivePackage[]) => Record<string, MetrcActivePackage[]>` keyed by `LocationName`. Lives in `src/helpers/group-by-location.ts`.
- **Enhancement:** `siteSnapshot(client)` — composes `getActivePackages() + getInactivePackages() + getOnHoldPackages() + getActiveLocations()` into a `SiteSnapshot` type `{ locations: MetrcLocation[]; packagesByLocation: Record<string, MetrcActivePackage[]>; counts: { active, inactive, onHold } }`. Lives in `src/helpers/site-snapshot.ts`.

### Subphase B — Lookup endpoints
- API: `getPackageTypes()` → `/packages/v2/types` — non-paginated, returns `string[]`. Introduces `requestArray<T>()` transport helper.
- API: `getPackageAdjustReasons()` → `/packages/v2/adjust/reasons` — paginated, returns `MetrcPackageAdjustReason[]`. New `metrcPackageAdjustReasonSchema` with 5 fields.

### Subphase C — Detail endpoints
- API: `getPackageById(id: number)` → `/packages/v2/{id}` — single-object, `validateOne(metrcActivePackageSchema, ...)`.
- API: `getPackageByLabel(label: string)` → `/packages/v2/{label}` — single-object, same schema.

### Out of scope (becomes an issue)
- `getPackageHistory(...)` — METRC NY returned 404 at `/packages/v2/{id}/history`. File GitHub issue "Investigate /packages/v2 history endpoint URL" so we don't lose track.

---

## File structure

**Create:**
- `src/schemas/package-adjust-reason.ts` — new schema + type
- `src/helpers/group-by-location.ts` — pure helper (enhancement)
- `src/helpers/site-snapshot.ts` — composition helper (enhancement)
- `src/transport/request-array.ts` — `requestArray<T>()` for bare-array endpoints

**Modify:**
- `src/schemas/index.ts` — re-export the new schema
- `src/client/interface.ts` — add 5 new methods to `MetrcClient`
- `src/client/live.ts` — implement 5 new methods
- `src/client/mock.ts` — extend `MockFixtures` with `inactivePackages`, `onHoldPackages`, `packageTypes`, `packageAdjustReasons`; default fixtures + 5 method implementations
- `src/index.ts` — public re-exports
- `src/coverage.ts` — flip 5 endpoint statuses to complete; bump packages resource to `complete`; add 2 helpers under packages.helpers
- `tests/schemas.test.ts` — 3 tests for adjust-reason schema
- `tests/live-client.test.ts` — URL/window/return + validateResponses for each new method
- `tests/mock-client.test.ts` — default fixtures parse + defensive copy
- `tests/conformance.test.ts` — extend `makeLiveClientFromFixtures` signature + 5 new entries
- `tests/coverage.test.ts` — packages resource now complete; both helpers listed
- `tests/helpers.test.ts` (new) — non-hollow tests for `groupByLocation` + `siteSnapshot`
- `README.md` — packages row + Client-enhancements rows for the new helpers

**Untouched:** schemas other than the one new, all P0 audit files, `src/coverage.ts` other than the packages entry, all other tests, all of `scripts/`.

---

## Per-subphase tasks (TDD throughout)

Each subphase = one focused commit. Three commits + the cleanup commit (coverage/README) = 4 commits in the phase.

### Subphase A (one commit)

1. **RED** — add tests for `getInactivePackages` + `getOnHoldPackages` in `tests/live-client.test.ts`. URL contains correct path + the wide-window params. Schema parses returned rows.
2. **RED** — add `groupByLocation` test in `tests/helpers.test.ts`: pin an input fixture (3 packages across 2 locations) → expect exact `{ "Fulfillment": [...], "Vault": [...] }` shape.
3. **RED** — add `siteSnapshot` test in `tests/helpers.test.ts`: stub a `MetrcClient` (using `createMockMetrcClient`) with known counts, assert returned shape `{ locations, packagesByLocation, counts: { active, inactive, onHold } }`.
4. **GREEN** — implement methods + helpers.
5. Run full suite. Test count grows by ~10–12.
6. Commit: `feat: add inactive/onhold packages + groupByLocation + siteSnapshot`

### Subphase B (one commit)

1. **RED** — add `tests/transport/request-array.test.ts` (or extend `tests/transport.test.ts`): assert `requestArray<string>()` returns the response body unchanged for a bare-array response; rejects via `MetrcResponseError` if the response isn't an array.
2. **RED** — add `tests/schemas.test.ts` entries for `metrcPackageAdjustReasonSchema`: well-formed parses; missing `Name` rejects; wrong type on `RequiresNote` rejects.
3. **RED** — add `tests/live-client.test.ts` entries for `getPackageTypes` and `getPackageAdjustReasons`.
4. **GREEN** — implement schema, transport helper, methods.
5. Commit: `feat: add package types + adjust reasons`

### Subphase C (one commit)

1. **RED** — `tests/live-client.test.ts` for `getPackageById` and `getPackageByLabel`. URL captures the integer / label. `validateResponses=true` test using `metrcActivePackageSchema`.
2. **GREEN** — implement methods (use `validateOne`).
3. Commit: `feat: add getPackageById + getPackageByLabel`

### Cleanup (one commit)

1. Update `src/coverage.ts`: items resource (already complete from P1) untouched; **packages** resource → `status: complete`; the 5 newly-added endpoint entries → `clientMethod` set, `status: complete`; remove `/packages/v2/{id}/history` entry OR set its status to `out-of-scope-for-now` with `notes: "404 from current NY docs; see issue #X"`. Add `groupByLocation` + `siteSnapshot` to `packages.helpers`.
2. Update `tests/coverage.test.ts` to assert the new state. RED → GREEN.
3. Update README packages row + Client-enhancements section (new rows for `groupByLocation`, `siteSnapshot`).
4. Commit: `docs: mark packages resource complete + register helpers`

### Out-of-scope issue

File a single roadmap issue (`gh issue create --label roadmap`) titled "Investigate /packages/v2 history endpoint URL" with the discovery JSON attached or referenced. Note the 404 observation and suggest checking `/packages/v2/history/{id}`, `/packages/v2/history/{label}`, `/packages/{id}/history` alternatives. Label `roadmap`, no `out-of-scope-for-now` (it's discovery-pending, not deferred wholesale).

---

## Per-endpoint deliverable template (reminder)

Reproduced from CLAUDE.md for the executor:

1. Schema in `src/schemas/...` mirroring API field names. `.passthrough()` for nested objects with unbounded fields.
2. Method on `MetrcClient` interface in `src/client/interface.ts`. JSDoc starts with `API: GET /path/v2/...` (plus `(LastModified-quirk)` if applicable) for passthroughs OR `Enhancement: composed from ...` for helpers.
3. Live implementation in `src/client/live.ts` (paged + fetchAllPages + validateArray for list; `request<unknown>` + validateOne for detail; `requestArray<T>` for non-paginated).
4. Mock implementation in `src/client/mock.ts` + default fixture(s).
5. Public re-export in `src/index.ts`.
6. Tests at every layer: schema parse, live URL+return, mock default+defensive-copy, conformance.

For helpers (groupByLocation, siteSnapshot):
- Type names distinct from `Metrc*` (e.g. `LocationGrouping`, `SiteSnapshot`).
- JSDoc starts with `Enhancement: composed from <list>`.
- Tests pin input fixture → expected derived structure.

---

## Definition of done

- `npm test` passes with zero failures, zero `Errors`, zero `Unhandled Rejection`. Test count somewhere around 165+ (a fair bit higher than 149 since helpers and 5 endpoints each get tests).
- `npm run typecheck` clean.
- `npm run build` clean; `dist/index.js` + `dist/index.d.ts` produced.
- Coverage thresholds (90% all four metrics) hold.
- `CLIENT_COVERAGE.find(r => r.resource === "packages").status === "complete"`.
- `CLIENT_COVERAGE.find(r => r.resource === "packages").helpers` includes `groupByLocation` and `siteSnapshot`.
- README packages row reads `complete` and lists 6 endpoints (`/active`, `/inactive`, `/onhold`, `/types`, `/adjust/reasons`, `/{id}`, `/{label}`).
- README Client-enhancements section adds rows for the two new helpers.
- `gh issue list --state open --label roadmap` shows a new issue for the history endpoint investigation.

---

## Out of plan

- `getPackageHistory(...)` — see issue.
- All write operations on packages (create / adjust / finish / unfinish / remediate / etc.). Already deferred — issue #7.

## Notes on rebase

This branch is based on `main` at `862ed7a`. PR #12 (P1 re-merge to main) is open and unmerged at plan-writing time. After P1 lands on main, rebase `phase-2/packages` onto updated main. No expected conflicts since P1 and P2 touch disjoint resources (`items` vs `packages`), but `src/client/mock.ts`, `src/coverage.ts`, `src/client/interface.ts`, `tests/conformance.test.ts`, `tests/coverage.test.ts`, and `README.md` will need careful conflict resolution. Each is a small mechanical reconciliation — keep both phases' additions.
