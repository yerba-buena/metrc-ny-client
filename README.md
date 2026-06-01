# @yerba-buena/metrc-ny-client

TypeScript client for the METRC NY v2 API. Started as a dispensary-focused subset; growing toward comprehensive read coverage of the dispensary-relevant surface. Cultivator-side resources (plants, plant batches, harvests, waste) and all write operations are tracked as open issues — see [Roadmap](#roadmap).

- Live + mock implementations behind a shared `MetrcClient` interface.
- Read-only today (GET endpoints). Write operations are deferred.
- Pre-1.0. Used internally by Yerba Buena retail apps. Consumed via git submodule by sibling repos; npm publishing TBD.

## Coverage

Source of truth: the [`CLIENT_COVERAGE`](src/coverage.ts) constant. The resource rows of the table below mirror it; the final `writes` row is an editorial note about a category deferred wholesale rather than per-endpoint.

| Resource | Endpoints implemented | Status | Notes |
|---|---|---|---|
| transfers | `/transfers/v2/incoming`, `/transfers/v2/deliveries/{id}/packages` | partial | Outgoing, rejected, types, by-id planned. |
| packages | `/packages/v2/active` | partial | Inactive, onhold, types, adjust reasons, by-id, by-label, history planned. |
| locations | `/locations/v2/active` | partial | Types planned. |
| items | `/items/v2/active` | partial | Categories planned. |
| sales | `/sales/v2/receipts/active`, `/sales/v2/receipts/{id}` | partial | Transactions, customer types planned. |
| strains | — | planned | |
| labtests | — | planned | |
| plants | — | out-of-scope-for-now | Requires cultivator license. See [issue](#roadmap). |
| plantbatches | — | out-of-scope-for-now | Requires cultivator license. |
| harvests | — | out-of-scope-for-now | Requires cultivator license. |
| waste | — | out-of-scope-for-now | Requires cultivator license. |
| writes (POST/PUT/DELETE, any resource) | — | out-of-scope-for-now | Reads-first; separate spec planned. |

Status values: `complete` (every documented endpoint in the family is implemented and tested), `partial` (some endpoints implemented), `planned` (in the roadmap), `out-of-scope-for-now` (deferred; see linked issues).

## Client enhancements (not in METRC API)

These are conveniences and compositions added by this client, not part of the METRC contract. Each is implemented on top of one or more underlying API methods.

| Helper / type | Composes / built on | Description |
|---|---|---|
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
- [Cultivator: waste](https://github.com/yerba-buena/metrc-ny-client/issues/5)
- [Write: receive incoming transfer](https://github.com/yerba-buena/metrc-ny-client/issues/6)
- [Write: create / adjust packages](https://github.com/yerba-buena/metrc-ny-client/issues/7)
- [Write: record sales receipt](https://github.com/yerba-buena/metrc-ny-client/issues/8)
- [Transporter facility endpoints](https://github.com/yerba-buena/metrc-ny-client/issues/9)

See `docs/superpowers/specs/2026-05-24-comprehensive-metrc-ny-coverage-design.md` for the full phasing plan.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
npm run discover  # requires .env with METRC vendor/user/license keys
```
