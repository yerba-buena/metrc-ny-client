# Comprehensive METRC NY v2 read-coverage — design

**Date:** 2026-05-24
**Status:** Approved (sections A–D); reconciled with remote agent commits `b86c7d5` and `8b1220c`.
**Scope:** Grow `@yerba-buena/metrc-ny-client` from a small subset toward comprehensive *read* coverage of the dispensary-relevant METRC NY v2 API, ordered for minimum work and risk. Write operations and cultivator-side resources are explicitly deferred and tracked as roadmap issues.

## Status snapshot at spec time

Already on `main` and not to be re-planned:

- `getIncomingTransfers`, `getPackagesForDelivery`, `getDeliveriesWithPackages` (composition / **enhancement** — retroactively label).
- `getActiveLocations` (now with required wide LastModified window).
- `getActivePackages`.
- `getActiveItems` (P1 endpoint, **shipped**).
- `getActiveSalesReceipts({lastModifiedStart, lastModifiedEnd})` (P3 endpoint, **shipped**).
- `getSalesReceiptById(id)` (P3 endpoint, **shipped**; single-object GET, uses new `validateOne` helper).
- `SalesReceiptsWindow` per-endpoint window type and `validateOne` single-object validator now exist in the codebase and are the precedent the rest of the spec follows.
- 125 tests passing. 6 cosmetic unhandled-rejection warnings remain (P0 hygiene item).
- Conformance suite still only covers the original 5 methods — items and sales receipts are NOT yet in `tests/conformance.test.ts` (P0 gap).

## Goals

1. Cover every dispensary/retailer-relevant GET endpoint in the METRC NY v2 documentation.
2. Land coverage one resource family at a time, in a dependency-aware order that delivers the two near-term needs early: (a) examining items METRC says are at a location / on site, (b) examining transactions for analysis.
3. Make the boundary between API-passthrough behavior and client-side enhancements explicit everywhere — code, JSDoc, README, exports.
4. Maintain the existing test discipline (red→green TDD, non-hollow assertions, 90% coverage thresholds).

## Non-goals (this spec)

- Write operations (POST/PUT/DELETE). Deferred; tracked as roadmap issues.
- Cultivator-only resources: plants, plant batches, harvests, waste. Deferred; tracked as roadmap issues.
- Parity with non-NY METRC jurisdictions.
- npm publishing / 1.0 release.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Writes in scope? | Reads first, writes later | Each write phase carries its own risk (validation, idempotency); a complete read client is independently valuable. |
| First-priority transactions | Sales (POS) → transfers → package adjustments → lab tests | User-stated analysis priorities. |
| On-site gap | Items catalog + inactive/onhold packages + composition + helpers (all four) | The on-site question needs both new endpoints and client-side composition. |
| License scope | Retailer/dispensary first; non-retailer endpoints filed as issues | Only retailer license is available for live verification today. |
| Phasing shape | Resource-by-resource | User choice. Simpler PRs and clearer changelog than use-case slicing. |

## Phase ladder

Each phase ships as one PR titled `feat: phase N — <resource>`.

### P0 — Foundation (no new endpoints)

- Rewrite `README.md` (see "README restructure" below).
- File roadmap issues for everything deferred (see "Issues filed in P0").
- Add `CLIENT_COVERAGE` constant — a typed, exported map describing the per-resource status of the client. **Enhancement** (introspection helper, not part of the API).
- Clean up the 6 cosmetic unhandled-rejection warnings in `npm test` output (attach `.catch` / `expect(...).rejects.*` before advancing fake timers in the affected transport tests).
- Extend `tests/conformance.test.ts` to also cover the methods already on `main` but missing from conformance: `getActiveItems`, `getActiveSalesReceipts`, `getSalesReceiptById`. Same dual-variant (mock + stubbed live) shape as the existing entries.
- Audit existing GET methods for the "silently empty without LastModified window" quirk: `/packages/v2/active`, `/transfers/v2/incoming`, and `/transfers/v2/deliveries/{id}/packages`. For each, capture a discovery sample with and without the window; document the result in the method's JSDoc; patch where required following the pattern used by `getActiveLocations` and `getActiveItems`.
- Retroactively add the `API:` / `Enhancement:` JSDoc preamble to every existing method on `MetrcClient`. (Today none of them have it; future-phase code review depends on it being established.)

### P1 — Items resource

| Type | Endpoint or helper | Status | Notes |
|---|---|---|---|
| API | `GET /items/v2/active` → `getActiveItems()` | **done** (remote commit `8b1220c`) | Uses wide LastModified window per quirk. |
| API | `GET /items/v2/categories` → `getItemCategories()` | planned | |
| Schema | `metrcItemSchema` / `MetrcItem` | **done** | Already in `src/schemas/item.ts`. |
| Schema | `metrcItemCategorySchema` / `MetrcItemCategory` | planned | |

P1 remaining: `/items/v2/categories` + its schema + conformance entry. Most of the resource is already in place.

### P2 — Packages resource (full coverage)

| Type | Endpoint or helper | Notes |
|---|---|---|
| API | `GET /packages/v2/inactive` → `getInactivePackages()` | |
| API | `GET /packages/v2/onhold` → `getOnHoldPackages()` | |
| API | `GET /packages/v2/types` → `getPackageTypes()` | |
| API | `GET /packages/v2/adjust/reasons` → `getPackageAdjustReasons()` | |
| API | `GET /packages/v2/{id}` → `getPackageById(id)` | |
| API | `GET /packages/v2/{label}` → `getPackageByLabel(label)` | Exact METRC URL TBD by discovery — both id- and label-keyed lookups exist. |
| API | `GET /packages/v2/{id}/history` → `getPackageHistory(id)` | Historical change events. |
| Enhancement | `groupByLocation(packages)` | Pure function over active/inactive/onhold. |
| Enhancement | `siteSnapshot(client)` | Composes active + inactive + onhold + locations into one `SiteSnapshot`. |

### P3 — Sales resource

| Type | Endpoint or helper | Status | Notes |
|---|---|---|---|
| API | `GET /sales/v2/receipts/active` → `getActiveSalesReceipts({lastModifiedStart, lastModifiedEnd})` | **done** | Window required (boundary input-validation guard). |
| API | `GET /sales/v2/receipts/{id}` → `getSalesReceiptById(id)` | **done** | Single-object GET, uses `validateOne`. List endpoint always returns `Transactions: []`, so this is required for line items. |
| API | `GET /sales/v2/transactions` → `getSalesTransactions(window)` | planned | Same per-endpoint window pattern as receipts. |
| API | `GET /sales/v2/customertypes` → `getSalesCustomerTypes()` | planned | |

P3 remaining: `/sales/v2/transactions`, `/sales/v2/customertypes`, plus extending the conformance suite for receipts.

**Note on date-range types:** the prior version of this spec proposed a single `MetrcDateRange` type. The remote agent's `SalesReceiptsWindow` (per-endpoint window type) is now the precedent. We follow it: each endpoint that requires a window declares its own typed window interface (e.g. `SalesTransactionsWindow`), even when the field names are identical, so semantics (required vs optional, allowed range, time-precision) stay attached to the endpoint.

### P4 — Transfers resource (full coverage)

| Type | Endpoint or helper | Notes |
|---|---|---|
| API | `GET /transfers/v2/outgoing` → `getOutgoingTransfers()` | |
| API | `GET /transfers/v2/rejected` → `getRejectedTransfers()` | |
| API | `GET /transfers/v2/types` → `getTransferTypes()` | |
| API | `GET /transfers/v2/{id}` → `getTransferById(id)` | |

`getIncomingTransfers` and `getPackagesForDelivery` are already present and unchanged.

### P5 — Locations + Strains

| Type | Endpoint or helper | Notes |
|---|---|---|
| API | `GET /locations/v2/types` → `getLocationTypes()` | |
| API | `GET /strains/v2/active` → `getActiveStrains()` | |
| API | `GET /strains/v2/{id}` → `getStrainById(id)` | |

Combined because each is a tiny resource family.

### P6 — Lab tests

| Type | Endpoint or helper | Notes |
|---|---|---|
| API | `GET /labtests/v2/results` → `getLabTestResults(range?)` | |
| API | `GET /labtests/v2/states` → `getLabTestStates()` | |
| API | `GET /labtests/v2/types` → `getLabTestTypes()` | |
| API | `GET /labtests/v2/{id}` → `getLabTestById(id)` | |

### P7 — Reference data

| Type | Endpoint or helper | Notes |
|---|---|---|
| API | `GET /unitsofmeasure/v2/active` → `getUnitsOfMeasure()` | Exact URL TBD by discovery. |
| API | `GET /facilities/v2` → `getFacilities()` | |
| API | `GET /employees/v2` → `getEmployees()` | |

Any other small lookup endpoints surfaced during P1–P6 that weren't already required by their parent resource land here for completeness.

## Cross-cutting conventions

### Per-endpoint deliverable template (API passthrough)

1. Zod schema in `src/schemas/<resource>.ts` named `metrc<Resource>Schema` exporting a `Metrc<Resource>` type. Mirrors API field names exactly (PascalCase preserved). Use `.passthrough()` on nested objects where useful fields are unbounded (precedent: `metrcActivePackageItemSchema`).
2. Method on `MetrcClient` interface. JSDoc starts with **`API: GET /path/v2/...`**.
3. Live implementation in `src/client/live.ts` using `paged()` + `fetchAllPages()`. Honors `validateResponses`.
4. Mock implementation in `src/client/mock.ts` with default fixture and override-via-fixtures path.
5. Public re-exports added to `src/index.ts`.
6. Tests, written red-first, in this order:
   - `tests/schemas.test.ts` — parse a real fixture from discovery; reject missing-required; reject wrong-type; accept null in nullables.
   - `tests/live-client.test.ts` — URL contains path; params include `licenseNumber`; returns expected `Data`; `validateResponses: true` throws `MetrcResponseError` on malformed shape.
   - `tests/mock-client.test.ts` — default fixture round-trips; override replaces defaults; defensive copy.
   - `tests/conformance.test.ts` — both mock and stubbed-fetch live clients parse against the schema.

### Per-helper deliverable template (client-side enhancement)

- Type name distinct from `Metrc*` (e.g. `SiteSnapshot`, `LocationGrouping`).
- JSDoc starts with **`Enhancement: composed from <list of endpoints>.`**
- README lists helpers in their own section: *Client enhancements (not in METRC API)*.
- Tests pin composition behavior using the mock client (no new fetch stubs).

### Date-range / filtering params

The remote agent has already established the pattern: a per-endpoint window interface, both fields required as ISO-8601 strings, with a runtime guard at the boundary so JS callers (no TypeScript) can't silently produce empty results.

```ts
// existing precedent — src/client/interface.ts
export interface SalesReceiptsWindow {
  lastModifiedStart: string; // ISO-8601
  lastModifiedEnd: string;   // ISO-8601
}
```

Rules for any future endpoint that takes a LastModified window:

- Declare its own window type (`<Endpoint>Window`) on the interface, even if the field names match an existing one. Keeps semantics per-endpoint.
- Both `lastModifiedStart` and `lastModifiedEnd` are strings (not `Date | string`) — METRC's contract is strings, and accepting `Date` here would push a normalization concern into transport for an unclear ergonomics gain. Callers do `.toISOString()` themselves.
- Add the same boundary guard as `getActiveSalesReceipts`: `TypeError` with a method-naming message when either field is missing/empty.
- For endpoints where the window is only *quirk-required* (the "/active" lists that silently return empty without one), use a wide internal default — `lastModifiedStart=2015-01-01T00:00:00Z`, `lastModifiedEnd=new Date().toISOString()` — and do NOT expose the window in the method signature. Document the quirk in JSDoc. (Precedent: `getActiveLocations`, `getActiveItems`.)
- For endpoints where the window is semantically meaningful (sales receipts, transactions, lab test results), require the caller to pass it.

This whole machinery is an **Enhancement** in the sense that the per-endpoint window types and the wide-window default are client-side conveniences on top of plain METRC query params.

### Errors

Existing hierarchy (`MetrcAuthError`/`ClientError`/`RateLimitError`/`ServerError`/`NetworkError`/`ResponseError`) covers read endpoints. No new error types unless a distinct condition surfaces during a phase.

### Pagination and single-object GETs

- `fetchAllPages()` stays as-is for paginated list endpoints.
- For single-object detail endpoints (e.g. `/sales/v2/receipts/{id}`), use `request<unknown>(endpoint, {})` directly and parse with the existing `validateOne()` helper (added in remote commit `8b1220c`). This is now the convention.
- If a future endpoint returns a non-paginated *array* (some tiny lookup lists), add a `requestArray()` variant rather than weakening `fetchAllPages()`.

### Schema discovery

`npm run discover` is extended each phase to include the new endpoints. Discovery output is committed to `scripts/fixtures/` and used as the source of truth when writing schema tests.

### Test noise hygiene

P0 fixes the 6 unhandled-rejection warnings caused by tests that create promises before attaching `.catch` / `expect.rejects.*` while using fake timers. After P0 the bar is: zero unhandled rejections in `npm test` output, forever.

## README restructure (P0 deliverable)

- Lead paragraph reframed: *"Started as a dispensary/retailer-focused subset of METRC NY v2. Growing toward comprehensive read coverage of the dispensary-relevant surface. Cultivator-side resources (plants, plant batches, harvests, waste) and all write operations are tracked as open issues."*
- Replace the existing "Scope" section with a **Coverage** table:

  | Resource | Endpoints implemented | Status | Notes |
  |---|---|---|---|

  Status is one of `complete` / `partial` / `planned` / `out-of-scope-for-now`. The table is the canonical user-facing answer to "is X supported."

- New section **Client enhancements (not in METRC API)** — every helper / composed call / convenience type lives here, each with a one-liner and the underlying endpoints it composes.
- New section **Roadmap** linking to the GitHub issues filed in P0.
- Existing "Status: Pre-1.0" line stays. Existing usage example stays; a second example shows a helper with the enhancement marker.

## Issues filed in P0

Each tagged `roadmap` + (`out-of-scope-for-now` | `enhancement`):

1. Cultivator resources: plants (`/plants/v2/*`)
2. Cultivator resources: plant batches (`/plantbatches/v2/*`)
3. Cultivator resources: harvests (`/harvests/v2/*`)
4. Cultivator resources: waste (`/waste/v2/*`)
5. Write operations: receive incoming transfer
6. Write operations: create / adjust packages
7. Write operations: record sales receipt
8. Transporter facility endpoints

Each issue body has: what the resource covers, why it's deferred (license-type or write-risk), what unblocks it (e.g. cultivator sandbox license), and a checkbox list of the specific endpoints in that family.

## Scope marking inside the code

- The `MetrcClient` interface block-comment lists which methods are 1:1 with an API endpoint and which are client compositions. `getDeliveriesWithPackages` (already a composition) gets its preamble flipped to `Enhancement:` retroactively in P0.
- Exported `CLIENT_COVERAGE` constant — typed map of `resource → { status, endpoints, helpers }`. **Enhancement.** Lets downstream consumers introspect coverage without scraping README.

## Testing posture

### TDD discipline

- Red first; failing test names the precise gap (missing method, wrong URL, schema rejection).
- Green minimum; smallest delta that makes the red test pass.
- Refactor only after green.
- Full suite runs at every green step; coverage thresholds in `vitest.config.ts` (90% lines/branches/functions/statements) must still pass at phase end.

### Non-hollow rules

- Schema tests must use a real sample shape from `npm run discover`, not a hand-typed fixture that exactly matches the schema. Tautological tests get caught in self-review.
- Live-client tests assert on the captured URL string, the captured params, **and** the parsed return value. URL-only or return-only is hollow.
- `validateResponses: true` tests use a malformed payload the schema rejects for a stated, specific reason.
- Conformance tests use the same schema-parse assertion on both mock and stubbed-live variants.
- Helper tests pin input fixture → expected derived structure. `expect(result).toBeDefined()` is forbidden.

### Definition of done (every phase)

1. All red→green→refactor cycles complete for the phase's endpoints/helpers.
2. `npm test` passes with zero failures **and** zero unhandled-rejection noise.
3. `npm run typecheck` clean.
4. `npm run build` clean.
5. Coverage thresholds pass.
6. `npm run discover` extended; new fixtures committed under `scripts/fixtures/`.
7. README Coverage table and Client-enhancements section updated for the phase's deltas.
8. `CLIENT_COVERAGE` constant updated.
9. Every new method's JSDoc starts with `API:` or `Enhancement:`.
10. Phase opens its own PR titled `feat: phase N — <resource>` with coverage diff and linked closed issues in the description.

### P0-only DoD additions

- All 8 roadmap issues filed.
- README rescope landed.
- Test noise eliminated.
- `CLIENT_COVERAGE` constant present.
- This spec committed under `docs/superpowers/specs/`.

## Resolved-by-discovery items (not design gaps)

These are unknowns that `npm run discover` will answer when the relevant phase starts. They do not block spec approval or implementation planning.

- Exact URL for package lookup by label, and for units-of-measure (METRC has minor URL drift between docs versions; confirm during P2 and P7 discovery respectively).
- Whether `/packages/v2/{id}/history` is id-keyed or label-keyed in the current NY docs (confirm during P2 discovery).
- For each *paginated* endpoint not yet audited (`/packages/v2/active`, `/transfers/v2/incoming`, `/transfers/v2/deliveries/{id}/packages`): whether it silently returns empty without a LastModified window, the same way `/locations/v2/active` and `/items/v2/active` do. P0 audits this and patches as needed.
