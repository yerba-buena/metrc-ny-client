# @yerba-buena/metrc-ny-client

TypeScript client for the METRC NY v2 API. Started as a dispensary-focused subset; growing toward comprehensive read coverage of the dispensary-relevant surface. Cultivator-side resources (plants, plant batches, harvests, waste) and all write operations are tracked as open issues — see [Roadmap](#roadmap).

- Live + mock implementations behind a shared `MetrcClient` interface.
- Read-only today (GET endpoints). Write operations are deferred.
- Pre-1.0. Used internally by Yerba Buena retail apps. Consumed via git submodule by sibling repos; npm publishing TBD.

## Coverage

Source of truth: [`src/coverage.ts`](src/coverage.ts) (`CLIENT_COVERAGE`). The table below shows one row per resource family. The "Endpoints implemented" column lists only the complete endpoints — see [`src/coverage.ts`](src/coverage.ts) for the full list of planned and out-of-scope entries.

| Resource | Endpoints implemented | Status | Notes |
|---|---|---|---|
| transfers | `/transfers/v2/incoming`, `/transfers/v2/deliveries/{id}/packages`, `/transfers/v2/outgoing`, `/transfers/v2/rejected`, `/transfers/v2/types` | partial | 13 additional endpoints planned (Phase 8). See [`src/coverage.ts`](src/coverage.ts). |
| packages | `/packages/v2/active`, `/packages/v2/inactive`, `/packages/v2/onhold`, `/packages/v2/types`, `/packages/v2/adjust/reasons`, `/packages/v2/{id}`, `/packages/v2/{label}` | partial | 5 additional endpoints planned (Phase 6), including `/packages/v2/adjustments`. See [`src/coverage.ts`](src/coverage.ts). |
| locations | `/locations/v2/active` | partial | `/{id}`, `/inactive`, `/types` planned (Phase 5). |
| sublocations | — | planned | Phase 5. See [`src/coverage.ts`](src/coverage.ts). |
| items | `/items/v2/active`, `/items/v2/categories` | partial | 5 additional endpoints planned (Phase 9). See [`src/coverage.ts`](src/coverage.ts). |
| strains | — | planned | Phase 5. See [`src/coverage.ts`](src/coverage.ts). |
| sales | `/sales/v2/receipts/active`, `/sales/v2/receipts/{id}`, `/sales/v2/customertypes` | partial | 12 additional endpoints planned (Phase 7), including deliveries and retailer-delivery sub-family. `/sales/v2/transactions` removed — URL does not exist in METRC NY v2. See [`src/coverage.ts`](src/coverage.ts). |
| labtests | — | planned | Phase 10. See [`src/coverage.ts`](src/coverage.ts). |
| unitsofmeasure | — | planned | Phase 11. |
| facilities | — | planned | Phase 11. |
| employees | — | planned | Phase 11. |
| tags | — | planned | Phase 11. |
| wastemethods | — | planned | Phase 11. |
| retailid | — | planned | Phase 12 (retail-specific). |
| patients | — | out-of-scope-for-now | Medical marijuana program; adult-use retail license only. |
| caregivers | — | out-of-scope-for-now | Medical marijuana program; adult-use retail license only. |
| patient-checkins | — | out-of-scope-for-now | Medical marijuana program; adult-use retail license only. |
| plants | — | out-of-scope-for-now | Cultivator-side. [Issue #2](https://github.com/yerba-buena/metrc-ny-client/issues/2). |
| plantbatches | — | out-of-scope-for-now | Cultivator-side. [Issue #3](https://github.com/yerba-buena/metrc-ny-client/issues/3). |
| harvests | — | out-of-scope-for-now | Cultivator-side. [Issue #4](https://github.com/yerba-buena/metrc-ny-client/issues/4). |
| processing | — | out-of-scope-for-now | Cultivator-side processing jobs. |
| additivestemplates | — | out-of-scope-for-now | Cultivator-side. |
| writes (POST/PUT/DELETE, any resource) | — | out-of-scope-for-now | Reads-first; issues [#6](https://github.com/yerba-buena/metrc-ny-client/issues/6), [#7](https://github.com/yerba-buena/metrc-ny-client/issues/7), [#8](https://github.com/yerba-buena/metrc-ny-client/issues/8). |

Status values: `complete` (every documented endpoint in the family is implemented and tested), `partial` (some endpoints implemented), `planned` (in the roadmap), `out-of-scope-for-now` (deferred; see linked issues).

## Client enhancements (not in METRC API)

These are conveniences and compositions added by this client, not part of the METRC contract. Each is implemented on top of one or more underlying API methods.

| Helper / type | Composes / built on | Description |
|---|---|---|
| `groupByLocation` | (pure helper over `MetrcActivePackage[]`) | Buckets a list of packages by `LocationName`. Null locations bucket under `<no location>`. |
| `siteSnapshot` | `getActiveLocations` + `getActivePackages` + `getInactivePackages` + `getOnHoldPackages` | "What's on site, where" snapshot — returns `{ locations, packagesByLocation, counts: { active, inactive, onHold } }`. |
| `getDeliveriesWithPackages` | `getIncomingTransfers` + `getPackagesForDelivery` | One entry per incoming transfer with its packages loaded inline. Sequential fetches today. |
| `SalesReceiptsWindow` | n/a (type) | Required `lastModifiedStart` + `lastModifiedEnd` window for `getActiveSalesReceipts`. Boundary-validated. |
| `CLIENT_COVERAGE` | n/a (constant) | Typed introspection map of per-resource coverage status (see [Coverage](#coverage)). |
| `(LastModified-quirk)` wide-window fallback | n/a (transport convention) | For `/locations/v2/active`, `/items/v2/active`, `/packages/v2/active`, and `/transfers/v2/incoming`, the client passes a wide internal window because METRC returns empty or partial lists without one. Tagged in method JSDoc. |
| Mock client (`createMockMetrcClient`) | n/a | In-memory `MetrcClient` for testing, with default fixtures and an override slot. |
| Typed error hierarchy (`MetrcAuthError`, …) | wraps fetch failures | Distinct error types for auth/client/rate-limit/server/network/response failures. |

## Status

Pre-1.0. Used internally by Yerba Buena's inventory apps.

## Install

Currently consumed via git submodule (path alias) by sibling repos. npm publishing TBD.

## Usage

```ts
import { createLiveMetrcClient, NY_PROD_BASE_URL } from "@yerba-buena/metrc-ny-client";

const client = createLiveMetrcClient({
  vendorApiKey: process.env.METRC_VENDOR_API_KEY!,
  userApiKey: process.env.METRC_USER_API_KEY!,
  licenseNumber: process.env.METRC_LICENSE_NUMBER!,
  baseUrl: NY_PROD_BASE_URL,
});

const transfers = await client.getIncomingTransfers();
```

### Using a client enhancement

```ts
// getDeliveriesWithPackages is a client-side composition, not a METRC endpoint.
// It calls getIncomingTransfers and then getPackagesForDelivery per transfer.
const deliveriesWithPackages = await client.getDeliveriesWithPackages();
```

### Introspecting coverage

```ts
import { CLIENT_COVERAGE } from "@yerba-buena/metrc-ny-client";

const salesEndpoints = CLIENT_COVERAGE
  .find((r) => r.resource === "sales")
  ?.endpoints
  .filter((e) => e.status === "complete");
```

## Roadmap

These resources and operations are explicitly out of scope for the current phase. Each is tracked as a GitHub issue with a checkbox list of endpoints. Subscribe to follow progress or comment on the issue if your use case unblocks any of them.

- [Cultivator: plants](https://github.com/yerba-buena/metrc-ny-client/issues/2)
- [Cultivator: plant batches](https://github.com/yerba-buena/metrc-ny-client/issues/3)
- [Cultivator: harvests](https://github.com/yerba-buena/metrc-ny-client/issues/4)
- [Cultivator: waste tracking](https://github.com/yerba-buena/metrc-ny-client/issues/5)
- [Write: receive incoming transfer](https://github.com/yerba-buena/metrc-ny-client/issues/6)
- [Write: create / adjust packages](https://github.com/yerba-buena/metrc-ny-client/issues/7)
- [Write: record sales receipt](https://github.com/yerba-buena/metrc-ny-client/issues/8)
- [Transporter facility endpoints](https://github.com/yerba-buena/metrc-ny-client/issues/9)

See `docs/superpowers/specs/2026-05-24-comprehensive-metrc-ny-coverage-design.md` for the full phasing plan (updated 2026-06-10 with a comprehensive respec covering all ~24 METRC NY v2 resource families).

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
npm run discover  # requires .env with METRC vendor/user/license keys
```
