# Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the conventions, hygiene, and introspection scaffolding that all subsequent phases (P1–P7) rely on, without adding any new METRC endpoints. Land a clean baseline so per-resource phases can focus purely on their resource.

**Architecture:** Eight self-contained tasks executed in dependency order. The first task (test-noise cleanup) gives a clean baseline. The next (conformance extension) closes the gap left by the remote agent commits. The middle tasks add the `CLIENT_COVERAGE` introspection map and the JSDoc convention. The audit task pulls live samples to verify whether the LastModified-quirk affects any remaining paginated endpoints. The final tasks (issues + README) make the new scope visible to consumers.

**Tech Stack:** TypeScript (NodeNext, strict, `verbatimModuleSyntax`), Vitest 4, Zod 3, `gh` CLI for issue filing, existing transport (`createRequester` + `fetchAllPages` + `validateOne`).

---

## Background a new engineer needs

- `@yerba-buena/metrc-ny-client` is a TypeScript client for METRC NY v2 (cannabis seed-to-sale tracking) used internally by Yerba Buena retail apps. Pre-1.0. Read-only today.
- The design spec is at `docs/superpowers/specs/2026-05-24-comprehensive-metrc-ny-coverage-design.md` — read its "Status snapshot" and "Cross-cutting conventions" sections before starting.
- The codebase has two clients behind one `MetrcClient` interface: a live one (`src/client/live.ts`) and a mock one (`src/client/mock.ts`). Every endpoint method must exist on both, and a `tests/conformance.test.ts` runs the same expectations against each.
- METRC has a documented quirk: some "/active" list endpoints (`/locations/v2/active`, `/items/v2/active`) silently return zero rows when `lastModifiedStart` and `lastModifiedEnd` aren't passed. The existing fix uses a wide window: `lastModifiedStart=2015-01-01T00:00:00Z`, `lastModifiedEnd=new Date().toISOString()`.
- The repo enforces 90% coverage thresholds across lines/branches/functions/statements (`vitest.config.ts`). Don't lower them.
- Commit messages follow short conventional prefixes (`feat:`, `fix:`, `test:`, `chore:`, `docs:`). One concern per commit. End every commit body with the `Co-Authored-By` line that other commits in the repo use.

## File structure for Phase 0

**Create:**
- `src/coverage.ts` — `CLIENT_COVERAGE` typed map describing per-resource status. Marked as a client-side **Enhancement** (not an API passthrough).
- `tests/coverage.test.ts` — non-hollow assertions on the contents of `CLIENT_COVERAGE`.
- `scripts/fixtures/audit-lastmodified-packages-active.json` — discovery output from the audit (with and without window).
- `scripts/fixtures/audit-lastmodified-transfers-incoming.json` — discovery output.
- `scripts/fixtures/audit-lastmodified-deliveries-packages.json` — discovery output (uses the first delivery id found).

**Modify:**
- `tests/transport.test.ts` — eliminate 6 unhandled-rejection patterns.
- `tests/conformance.test.ts` — extend `MockFixtures`-shaped helper and add 3 conformance entries (items, active sales receipts, sales receipt by id).
- `scripts/discover-schemas.ts` — extend target list to perform the LastModified audit.
- `src/client/interface.ts` — add JSDoc preambles to every method (`API: GET ...` or `Enhancement: composed from ...`).
- `src/client/live.ts` — add JSDoc preambles to every method; patch any endpoint that the audit proves needs the LastModified-quirk fix.
- `src/index.ts` — export `CLIENT_COVERAGE` and `ResourceCoverage` / `CoverageStatus` types.
- `README.md` — full rescope per the spec's "README restructure" section.

**Untouched in P0:** `src/client/mock.ts`, all `src/schemas/*.ts`, `src/transport/*`, `src/errors.ts`, `src/logger.ts`, `src/constants.ts`.

---

## Task 1: Eliminate unhandled-rejection warnings in transport tests

**Files:**
- Modify: `tests/transport.test.ts`

**Why:** Six tests trigger "Unhandled Rejection" warnings because they create a rejecting promise via `const p = req(...)` and then call `await vi.advanceTimersByTimeAsync(...)` before attaching `.catch`. The rejection settles during timer advance with no handler attached, so Vitest logs an unhandled-rejection error even though the test then asserts on `p`. The fix is to attach the catch immediately by capturing the settled value as a *resolved* promise: `const settled = req(...).catch((e: unknown) => e);`. The assertion shape changes from `await expect(p).rejects.toBeInstanceOf(X)` (or `await p.catch(e => caught = e)`) to `expect(await settled).toBeInstanceOf(X)`. The behavior under test is identical.

The 6 tests, all in `tests/transport.test.ts`:
1. `"throws MetrcAuthError on 401"`
2. `"throws MetrcRateLimitError after max retries on 429"`
3. `"throws MetrcServerError after max retries on 500"`
4. `"throws MetrcNetworkError after max retries on fetch rejection"`
5. `"throws MetrcRateLimitError with undefined retryAfterSeconds when no header on final 429"`
6. `"wraps a non-Error fetch rejection into MetrcNetworkError using String(err)"`

- [ ] **Step 1: Confirm the current baseline.**

  Run: `npm test 2>&1 | grep -c "Unhandled Rejection"`

  Expected output: `6`

- [ ] **Step 2: Fix test 1 — `throws MetrcAuthError on 401`.**

  Locate the existing test in `tests/transport.test.ts`. Replace its body with the following:

  ```ts
  it("throws MetrcAuthError on 401", async () => {
    const fetch = vi.fn(async () => mockResponse({ ok: false, status: 401, body: "Unauthorized" }));
    const req = createRequester({ ...baseConfig, fetch });
    const settled = req("/x/v2/y", {}).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(0);
    expect(await settled).toBeInstanceOf(MetrcAuthError);
  });
  ```

- [ ] **Step 3: Fix test 2 — `throws MetrcRateLimitError after max retries on 429`.**

  Replace the existing test body with:

  ```ts
  it("throws MetrcRateLimitError after max retries on 429", async () => {
    const fetch = vi.fn(async () => mockResponse({ ok: false, status: 429, headers: { "Retry-After": "1" }, body: "rate limited" }));
    const req = createRequester({ ...baseConfig, fetch });
    const settled = req("/x/v2/y", {}).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(20000);
    const caught = await settled;
    expect(caught).toBeInstanceOf(MetrcRateLimitError);
    expect((caught as MetrcRateLimitError).retryAfterSeconds).toBe(1);
    expect(fetch.mock.calls.length).toBe(3); // 1 initial + 2 retries
  });
  ```

- [ ] **Step 4: Fix test 3 — `throws MetrcServerError after max retries on 500`.**

  Replace the existing test body with:

  ```ts
  it("throws MetrcServerError after max retries on 500", async () => {
    const fetch = vi.fn(async () => mockResponse({ ok: false, status: 503, body: "down" }));
    const req = createRequester({ ...baseConfig, fetch });
    const settled = req("/x/v2/y", {}).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(20000);
    expect(await settled).toBeInstanceOf(MetrcServerError);
  });
  ```

- [ ] **Step 5: Fix test 4 — `throws MetrcNetworkError after max retries on fetch rejection`.**

  Replace the existing test body with:

  ```ts
  it("throws MetrcNetworkError after max retries on fetch rejection", async () => {
    const fetch = vi.fn(async () => { throw new TypeError("ECONNRESET"); });
    const req = createRequester({ ...baseConfig, fetch });
    const settled = req("/x/v2/y", {}).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(20000);
    expect(await settled).toBeInstanceOf(MetrcNetworkError);
  });
  ```

- [ ] **Step 6: Fix test 5 — `throws MetrcRateLimitError with undefined retryAfterSeconds when no header on final 429`.**

  Replace the existing test body with:

  ```ts
  it("throws MetrcRateLimitError with undefined retryAfterSeconds when no header on final 429", async () => {
    const fetch = vi.fn(async () => mockResponse({ ok: false, status: 429, body: "rate limited" }));
    const req = createRequester({ ...baseConfig, fetch });
    const settled = req("/x/v2/y", {}).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(20000);
    const caught = await settled;
    expect(caught).toBeInstanceOf(MetrcRateLimitError);
    expect((caught as MetrcRateLimitError).retryAfterSeconds).toBeUndefined();
  });
  ```

- [ ] **Step 7: Fix test 6 — `wraps a non-Error fetch rejection into MetrcNetworkError using String(err)`.**

  Replace the existing test body with:

  ```ts
  it("wraps a non-Error fetch rejection into MetrcNetworkError using String(err)", async () => {
    const fetch = vi.fn(async () => { throw "string-rejection"; });
    const req = createRequester({ ...baseConfig, fetch });
    const settled = req("/x/v2/y", {}).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(20000);
    const caught = await settled;
    expect(caught).toBeInstanceOf(MetrcNetworkError);
    expect((caught as MetrcNetworkError).message).toBe("string-rejection");
  });
  ```

- [ ] **Step 8: Verify zero unhandled rejections and the test count is unchanged.**

  Run:

  ```bash
  npm test 2>&1 | tail -20
  ```

  Expected output (relevant lines):

  ```
   Test Files  11 passed (11)
        Tests  125 passed (125)
       Start at  ...
       Duration ...
  ```

  There must be **no** `Errors  N errors` line and **no** `Unhandled Rejection` block.

  Sanity-check the zero count:

  ```bash
  npm test 2>&1 | grep -c "Unhandled Rejection"
  ```

  Expected output: `0`

- [ ] **Step 9: Typecheck and build.**

  ```bash
  npm run typecheck && npm run build
  ```

  Both must exit 0 with no errors.

- [ ] **Step 10: Commit.**

  ```bash
  git add tests/transport.test.ts
  git commit -m "$(cat <<'EOF'
  test: eliminate unhandled-rejection warnings in transport tests

  Six retry/auth tests created rejecting promises and then awaited fake
  timer advances before attaching a handler, producing "Unhandled
  Rejection" warnings in npm test output even though the tests then
  asserted on the rejection. Capture the settled value as a resolved
  promise (.catch(e => e)) so the handler is attached before timers
  advance. Assertions and behavior under test are unchanged.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 2: Extend conformance suite to cover items and sales receipts

**Files:**
- Modify: `tests/conformance.test.ts`

**Why:** The remote agent added `getActiveItems`, `getActiveSalesReceipts`, and `getSalesReceiptById` to the interface and to both clients, but did not extend `tests/conformance.test.ts`. The conformance suite is the safety net that proves mock and live clients agree on contract for every method; missing entries silently drop that protection. This task fixes the gap.

The existing `makeLiveClientFromFixtures` helper only knows about four URL paths. We extend it to also route `/items/v2/active`, `/sales/v2/receipts/active`, and `/sales/v2/receipts/{id}`. We add three new conformance `it()` blocks that follow the existing shape: parse every returned row against the appropriate schema.

- [ ] **Step 1: Add the three new conformance tests (RED).**

  Open `tests/conformance.test.ts`. Update the imports at the top to add the new types and schemas:

  ```ts
  import type {
    MetrcTransfer, MetrcPackage, MetrcLocation, MetrcActivePackage,
    MetrcItem, MetrcSalesReceipt, MetrcSalesReceiptDetail,
  } from "../src/schemas/index.js";
  import {
    metrcTransferSchema, metrcPackageSchema, metrcLocationSchema, metrcActivePackageSchema,
    metrcItemSchema, metrcSalesReceiptSchema, metrcSalesReceiptDetailSchema,
  } from "../src/schemas/index.js";
  ```

  Update the signature of `makeLiveClientFromFixtures` and the call site:

  ```ts
  function makeLiveClientFromFixtures(
    transfers: MetrcTransfer[],
    packagesByDeliveryId: Record<number, MetrcPackage[]>,
    locations: MetrcLocation[],
    activePackages: MetrcActivePackage[],
    items: MetrcItem[],
    salesReceipts: MetrcSalesReceipt[],
    salesReceiptDetailsById: Record<number, MetrcSalesReceiptDetail>,
  ): MetrcClient {
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("/transfers/v2/incoming")) return okEnvelope(transfers) as unknown as Response;
      if (url.includes("/locations/v2/active")) return okEnvelope(locations) as unknown as Response;
      if (url.includes("/packages/v2/active")) return okEnvelope(activePackages) as unknown as Response;
      if (url.includes("/items/v2/active")) return okEnvelope(items) as unknown as Response;
      if (url.includes("/sales/v2/receipts/active")) return okEnvelope(salesReceipts) as unknown as Response;
      const receiptDetailMatch = url.match(/\/sales\/v2\/receipts\/(\d+)(?:\?|$)/);
      if (receiptDetailMatch) {
        const id = parseInt(receiptDetailMatch[1]!, 10);
        const detail = salesReceiptDetailsById[id];
        if (!detail) throw new Error(`fixture: no sales receipt detail for id ${id}`);
        return {
          ok: true, status: 200, headers: new Headers(),
          json: async () => detail,
          text: async () => "",
        } as unknown as Response;
      }
      const m = url.match(/\/deliveries\/(\d+)\/packages/);
      if (m) {
        const id = parseInt(m[1]!, 10);
        return okEnvelope(packagesByDeliveryId[id] ?? []) as unknown as Response;
      }
      throw new Error(`unexpected url: ${url}`);
    });
    return createLiveMetrcClient({
      vendorApiKey: "vk", userApiKey: "uk", licenseNumber: "LIC",
      baseUrl: "https://example.test", logger: NOOP_LOGGER,
      fetch, rateLimitMs: 0,
      retry: { maxRetries: 0, initialDelayMs: 1, maxDelayMs: 1, backoffMultiplier: 1 },
    });
  }
  ```

  Update the variants array to pass the new fixture fields:

  ```ts
  const variants: Array<[string, () => MetrcClient]> = [
    ["mock", () => createMockMetrcClient(fixtures)],
    ["live (with stubbed fetch)", () => makeLiveClientFromFixtures(
      fixtures.transfers,
      fixtures.packagesByDeliveryId,
      fixtures.locations,
      fixtures.activePackages,
      fixtures.items,
      fixtures.salesReceipts,
      fixtures.salesReceiptDetailsById,
    )],
  ];
  ```

  Inside the `describe.each(variants)` block, append three new tests after the existing five:

  ```ts
  it("getActiveItems returns items that parse as MetrcItem", async () => {
    const client = makeClient();
    const result = await client.getActiveItems();
    expect(result.length).toBe(fixtures.items.length);
    for (const item of result) expect(() => metrcItemSchema.parse(item)).not.toThrow();
  });

  it("getActiveSalesReceipts returns receipts that parse as MetrcSalesReceipt", async () => {
    const client = makeClient();
    const result = await client.getActiveSalesReceipts({
      lastModifiedStart: "2026-01-01T00:00:00Z",
      lastModifiedEnd: "2026-12-31T23:59:59Z",
    });
    expect(result.length).toBe(fixtures.salesReceipts.length);
    for (const r of result) expect(() => metrcSalesReceiptSchema.parse(r)).not.toThrow();
  });

  it("getSalesReceiptById returns a detail that parses as MetrcSalesReceiptDetail", async () => {
    const client = makeClient();
    const knownId = Number(Object.keys(fixtures.salesReceiptDetailsById)[0]);
    expect(Number.isFinite(knownId)).toBe(true);
    const detail = await client.getSalesReceiptById(knownId);
    expect(() => metrcSalesReceiptDetailSchema.parse(detail)).not.toThrow();
    expect(detail.Id).toBe(knownId);
    expect(detail.Transactions.length).toBeGreaterThan(0);
  });
  ```

- [ ] **Step 2: Run the new tests to confirm they pass (GREEN).**

  Run:

  ```bash
  npx vitest run tests/conformance.test.ts
  ```

  Expected output: all conformance tests pass for both `mock` and `live (with stubbed fetch)` variants. The new three tests should appear in the output. If `getSalesReceiptById` fails for the `mock` variant because the fixture id changed, inspect `src/client/mock.ts` `DEFAULT_MOCK_FIXTURES.salesReceiptDetailsById` and adjust the assertion logic above only — do **not** add new fixtures.

  *Why this can pass without a RED step:* the test file was complete before the implementation methods existed elsewhere, but the methods already exist on `main`. The test is "red" relative to the gap (conformance wasn't covering them); landing the test is the fix. If they had not yet existed, the suite would fail to typecheck.

- [ ] **Step 3: Run the full suite.**

  ```bash
  npm test 2>&1 | tail -10
  ```

  Expected: `Tests  128 passed (128)`, zero errors, zero unhandled rejections.

- [ ] **Step 4: Typecheck and build.**

  ```bash
  npm run typecheck && npm run build
  ```

  Both clean.

- [ ] **Step 5: Commit.**

  ```bash
  git add tests/conformance.test.ts
  git commit -m "$(cat <<'EOF'
  test: extend conformance suite to items and sales receipts

  The remote items+sales-receipts work added three new MetrcClient
  methods (getActiveItems, getActiveSalesReceipts, getSalesReceiptById)
  but did not add them to the conformance suite, which silently dropped
  the mock-vs-live agreement check for those endpoints. Extend
  makeLiveClientFromFixtures to route the new URLs and add three
  conformance entries that parse every returned row against its
  schema.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 3: Discovery audit — LastModified quirk on remaining paginated endpoints

**Files:**
- Modify: `scripts/discover-schemas.ts`
- Create: `scripts/fixtures/audit-lastmodified-packages-active.json`
- Create: `scripts/fixtures/audit-lastmodified-transfers-incoming.json`
- Create: `scripts/fixtures/audit-lastmodified-deliveries-packages.json`

**Why:** Two existing endpoints (`/locations/v2/active`, `/items/v2/active`) silently return zero rows without a LastModified window. If the same quirk affects `/packages/v2/active`, `/transfers/v2/incoming`, or `/transfers/v2/deliveries/{id}/packages`, downstream consumers are quietly getting empty lists in production. This task uses the existing `npm run discover` machinery to hit each endpoint twice — once without the window and once with a wide window — and capture both responses. The findings determine whether Task 4 is needed.

**Pre-req:** `.env` in the repo root must contain valid `METRC_VENDOR_API_KEY`, `METRC_USER_API_KEY`, `METRC_LICENSE_NUMBER` for the Yerba Buena prod or sandbox license. The file already exists per `ls -la` earlier; do not create or commit it.

- [ ] **Step 1: Extend the discovery script to perform the audit.**

  Open `scripts/discover-schemas.ts`. Replace the entire `targets` const **and** the `main` function with the following. Keep the rest of the file unchanged (env loading, `request` setup, the existing `discover` helper).

  ```ts
  interface DiscoveryTarget {
    endpoint: string;
    outputFile: string;
    extraParams?: Record<string, string>;
  }

  const widePeriod = {
    lastModifiedStart: "2015-01-01T00:00:00Z",
    lastModifiedEnd: new Date().toISOString(),
  };

  const targets: DiscoveryTarget[] = [
    { endpoint: "/transfers/v2/incoming", outputFile: "transfers-v2-incoming-sanity.json" },
    { endpoint: "/locations/v2/active", outputFile: "locations-v2-active-sample.json", extraParams: widePeriod },
    { endpoint: "/packages/v2/active", outputFile: "packages-v2-active-sample.json" },
  ];

  // Audit targets for the LastModified-quirk discovery (Phase 0 Task 3).
  // Each pair runs the endpoint twice: bare (no window) vs wide window,
  // so we can see whether the bare response is silently empty.
  const auditPairs: Array<{ endpoint: string; outputFile: string; idPlaceholder?: (sample: unknown) => string | null }> = [
    { endpoint: "/packages/v2/active", outputFile: "audit-lastmodified-packages-active.json" },
    { endpoint: "/transfers/v2/incoming", outputFile: "audit-lastmodified-transfers-incoming.json" },
  ];

  async function discoverPair(target: { endpoint: string; outputFile: string }) {
    console.log(`\n=== AUDIT ${target.endpoint} ===`);
    const bare = await request<PaginatedResponse<unknown>>(target.endpoint, { pageNumber: "1", pageSize: "5" });
    const windowed = await request<PaginatedResponse<unknown>>(target.endpoint, {
      pageNumber: "1", pageSize: "5", ...widePeriod,
    });
    const payload = {
      endpoint: target.endpoint,
      capturedAt: new Date().toISOString(),
      bareRequest: { totalRecords: bare.TotalRecords, recordsOnPage: bare.RecordsOnPage, firstRow: bare.Data?.[0] ?? null },
      windowedRequest: { totalRecords: windowed.TotalRecords, recordsOnPage: windowed.RecordsOnPage, firstRow: windowed.Data?.[0] ?? null },
      verdict: bare.TotalRecords === 0 && windowed.TotalRecords > 0
        ? "QUIRKED: bare returns empty; window required"
        : bare.TotalRecords === windowed.TotalRecords
          ? "OK: bare and windowed match"
          : "INCONCLUSIVE: counts differ but bare is non-zero",
    };
    const pretty = JSON.stringify(payload, null, 2);
    console.log(pretty);
    mkdirSync(FIXTURES_DIR, { recursive: true });
    writeFileSync(join(FIXTURES_DIR, target.outputFile), pretty + "\n");
  }

  async function auditDeliveriesPackages() {
    console.log(`\n=== AUDIT /transfers/v2/deliveries/{id}/packages ===`);
    const incoming = await request<PaginatedResponse<{ DeliveryId?: number }>>(
      "/transfers/v2/incoming",
      { pageNumber: "1", pageSize: "1", ...widePeriod },
    );
    const firstDeliveryId = incoming.Data?.[0]?.DeliveryId;
    if (typeof firstDeliveryId !== "number") {
      const payload = {
        endpoint: "/transfers/v2/deliveries/{id}/packages",
        capturedAt: new Date().toISOString(),
        verdict: "INCONCLUSIVE: no incoming transfers available to pick a delivery id; recommend reusing the wide-window pattern as the safe default.",
      };
      const pretty = JSON.stringify(payload, null, 2);
      console.log(pretty);
      writeFileSync(join(FIXTURES_DIR, "audit-lastmodified-deliveries-packages.json"), pretty + "\n");
      return;
    }
    await discoverPair({
      endpoint: `/transfers/v2/deliveries/${firstDeliveryId}/packages`,
      outputFile: "audit-lastmodified-deliveries-packages.json",
    });
  }

  async function main() {
    let failures = 0;
    for (const target of targets) {
      try {
        await discover(target);
      } catch (err) {
        failures++;
        console.error(`\nFAILED ${target.endpoint}:`, err);
      }
    }
    for (const target of auditPairs) {
      try {
        await discoverPair(target);
      } catch (err) {
        failures++;
        console.error(`\nFAILED AUDIT ${target.endpoint}:`, err);
      }
    }
    try {
      await auditDeliveriesPackages();
    } catch (err) {
      failures++;
      console.error(`\nFAILED AUDIT /transfers/v2/deliveries/{id}/packages:`, err);
    }
    if (failures > 0) {
      console.log(`\n${failures} target(s) failed.`);
      process.exit(1);
    }
    console.log("\nDone.");
  }
  ```

  Replace the previous `discover` helper's signature to accept `extraParams` so the existing `/locations/v2/active` target keeps working:

  ```ts
  async function discover(target: DiscoveryTarget) {
    console.log(`\n=== ${target.endpoint} ===`);
    const response = await request<PaginatedResponse<unknown>>(target.endpoint, {
      pageNumber: "1",
      pageSize: "5",
      ...(target.extraParams ?? {}),
    });
    // ... rest of body unchanged
  }
  ```

  (If your local copy of `discover-schemas.ts` already supports `extraParams`, skip the signature change; the diff against `main` is what matters.)

- [ ] **Step 2: Run discovery to perform the audit.**

  ```bash
  npm run discover
  ```

  Expected console output: three `=== AUDIT ... ===` sections, each printing the JSON payload with a `verdict` field of `OK`, `QUIRKED`, or `INCONCLUSIVE`. Three new files appear under `scripts/fixtures/`.

  If the script fails with "Missing env var", stop and ask the user to populate `.env`. Do not invent fake credentials.

- [ ] **Step 3: Inspect each verdict and record the result.**

  Read each of the three new audit JSON files and note their `verdict` field. Save the trio of verdicts inline in the commit message of step 4.

- [ ] **Step 4: Commit the audit fixtures and updated script.**

  ```bash
  git add scripts/discover-schemas.ts scripts/fixtures/audit-lastmodified-*.json
  git commit -m "$(cat <<'EOF'
  chore: audit remaining paginated endpoints for LastModified quirk

  Extends discover-schemas.ts to call /packages/v2/active,
  /transfers/v2/incoming, and /transfers/v2/deliveries/{id}/packages
  twice each — bare vs wide window — and capture both responses to
  scripts/fixtures/audit-lastmodified-*.json. Records a verdict
  (OK / QUIRKED / INCONCLUSIVE) per endpoint so Task 4 knows which,
  if any, need the wide-window patch.

  Verdicts:
  - /packages/v2/active: <FILL IN FROM AUDIT>
  - /transfers/v2/incoming: <FILL IN FROM AUDIT>
  - /transfers/v2/deliveries/{id}/packages: <FILL IN FROM AUDIT>

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

  Before running `git commit`, replace the three `<FILL IN FROM AUDIT>` placeholders with the actual verdicts you observed in Step 3.

---

## Task 4: Patch any audit-confirmed quirky endpoints

**Files:**
- Modify (conditional, per Task 3 findings): `src/client/live.ts`
- Modify (conditional): `tests/live-client.test.ts`

**Why:** Task 3 determines whether `/packages/v2/active`, `/transfers/v2/incoming`, or `/transfers/v2/deliveries/{id}/packages` need the wide-window LastModified fix that `/locations/v2/active` and `/items/v2/active` already use. This task applies the patch for any endpoint whose Task 3 verdict was `QUIRKED`. If all three verdicts are `OK`, **skip this task entirely** and move to Task 5. If any verdict is `INCONCLUSIVE`, apply the wide-window patch as the safe default and document it as a precaution.

**Pattern to apply (per quirky endpoint):**

- In `src/client/live.ts`, locate the method (e.g. `getActivePackages` for `/packages/v2/active`).
- Replace the `paged<T>(endpoint)` call with `paged<T>(endpoint, { lastModifiedStart: "2015-01-01T00:00:00Z", lastModifiedEnd: new Date().toISOString() })`.
- Add a JSDoc comment above the method explaining the quirk and referencing the audit file by path.
- In `tests/live-client.test.ts`, find the corresponding test (e.g. one that captures the URL). Update its URL-substring assertion to additionally verify `expect(capturedUrl).toContain("lastModifiedStart=2015-01-01T00%3A00%3A00Z")` (URL-encoded). Add a second assertion checking that `lastModifiedEnd=` appears.

- [ ] **Step 1: Determine which endpoints (if any) need patching.**

  Read the three audit files written in Task 3. Build a list of endpoints with `verdict` ∈ `{QUIRKED, INCONCLUSIVE}`. If the list is empty, mark this task complete and proceed to Task 5; no commit needed.

- [ ] **Step 2 (per affected endpoint): Add the failing test (RED).**

  Open `tests/live-client.test.ts`. For each affected endpoint, locate the existing test that captures its URL (e.g. `"getActivePackages calls /packages/v2/active and returns Data"` for `/packages/v2/active`). After the existing `expect(capturedUrl).toContain(...)` line, add:

  ```ts
  expect(capturedUrl).toContain("lastModifiedStart=2015-01-01T00%3A00%3A00Z");
  expect(capturedUrl).toContain("lastModifiedEnd=");
  ```

  Run the test:

  ```bash
  npx vitest run tests/live-client.test.ts -t "<existing test name>"
  ```

  Expected: FAIL — the captured URL does not contain `lastModifiedStart`.

- [ ] **Step 3 (per affected endpoint): Apply the wide-window patch (GREEN).**

  In `src/client/live.ts`, replace the method body. Example for `getActivePackages`:

  ```ts
  /**
   * API: GET /packages/v2/active
   *
   * METRC's /packages/v2/active was confirmed by the Phase 0 audit
   * (scripts/fixtures/audit-lastmodified-packages-active.json) to
   * silently return an empty list when called without a LastModified
   * window. Same convention as /locations/v2/active and /items/v2/active:
   * pass a wide window so every active package is returned regardless
   * of last edit.
   */
  async getActivePackages(): Promise<MetrcActivePackage[]> {
    const endpoint = "/packages/v2/active";
    const data = await fetchAllPages<MetrcActivePackage>(
      paged<MetrcActivePackage>(endpoint, {
        lastModifiedStart: "2015-01-01T00:00:00Z",
        lastModifiedEnd: new Date().toISOString(),
      }),
      endpoint,
    );
    return validateArray(metrcActivePackageSchema, data, endpoint);
  },
  ```

  Re-run the test:

  ```bash
  npx vitest run tests/live-client.test.ts -t "<existing test name>"
  ```

  Expected: PASS.

- [ ] **Step 4: Run the full suite to confirm nothing regressed.**

  ```bash
  npm test 2>&1 | tail -10
  ```

  Expected: all tests pass, zero errors, zero unhandled rejections. If the conformance suite's stubbed-fetch comparator fails because the URL changed, it's fine — the comparator routes by `url.includes(...)`, so the path substring still matches.

- [ ] **Step 5: Typecheck, build.**

  ```bash
  npm run typecheck && npm run build
  ```

  Both clean.

- [ ] **Step 6: Commit (per affected endpoint, or one batched commit).**

  ```bash
  git add src/client/live.ts tests/live-client.test.ts
  git commit -m "$(cat <<'EOF'
  fix: send wide LastModified window to <endpoint>

  Phase 0 audit (scripts/fixtures/audit-lastmodified-<file>.json)
  confirmed <endpoint> silently returns zero rows without
  lastModifiedStart/lastModifiedEnd, same quirk previously observed on
  /locations/v2/active and /items/v2/active. Pass a wide window so
  callers get every row regardless of last-edit time. Behavior of the
  client method's public signature is unchanged.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

  Replace `<endpoint>` and `<file>` with the actual values for each commit.

---

## Task 5: Add API:/Enhancement: JSDoc preambles to all existing MetrcClient methods

**Files:**
- Modify: `src/client/interface.ts`
- Modify: `src/client/live.ts`

**Why:** The spec establishes a convention: every method on `MetrcClient` declares whether it is a 1:1 API passthrough or a client-side enhancement. Today none of the existing methods declare it. Future-phase reviews depend on the convention being established and visible everywhere. This is documentation-only; no behavior changes.

**The labels:**

| Method | Label |
|---|---|
| `getIncomingTransfers` | `API: GET /transfers/v2/incoming` |
| `getPackagesForDelivery` | `API: GET /transfers/v2/deliveries/{deliveryId}/packages` |
| `getDeliveriesWithPackages` | `Enhancement: composed from getIncomingTransfers + getPackagesForDelivery, one delivery at a time (sequential).` |
| `getActiveLocations` | `API: GET /locations/v2/active` |
| `getActivePackages` | `API: GET /packages/v2/active` |
| `getActiveItems` | `API: GET /items/v2/active` |
| `getActiveSalesReceipts` | `API: GET /sales/v2/receipts/active` |
| `getSalesReceiptById` | `API: GET /sales/v2/receipts/{id}` |

- [ ] **Step 1: Add a convention note to the `MetrcClient` interface block-comment.**

  Open `src/client/interface.ts`. Above the `export interface MetrcClient {` declaration, add:

  ```ts
  /**
   * Read-only client for the METRC NY v2 API.
   *
   * Each method's JSDoc starts with one of two markers so callers always
   * know what they are calling:
   *
   *   - `API: GET /...` — a 1:1 passthrough of a single METRC endpoint.
   *   - `Enhancement: composed from ...` — a client-side helper built on
   *     top of one or more API methods. Behavior is decided by this
   *     client, not by METRC.
   *
   * Endpoints flagged with `(LastModified-quirk)` use a wide internal
   * date window because METRC silently returns empty lists otherwise.
   */
  ```

- [ ] **Step 2: Add per-method JSDoc on the interface.**

  Replace the method declarations inside `export interface MetrcClient {` with the labeled versions:

  ```ts
  export interface MetrcClient {
    /** API: GET /transfers/v2/incoming */
    getIncomingTransfers(): Promise<MetrcTransfer[]>;

    /** API: GET /transfers/v2/deliveries/{deliveryId}/packages */
    getPackagesForDelivery(deliveryId: number): Promise<MetrcPackage[]>;

    /**
     * Enhancement: composed from getIncomingTransfers + getPackagesForDelivery,
     * one delivery at a time (sequential).
     */
    getDeliveriesWithPackages(): Promise<DeliveryWithPackages[]>;

    /** API: GET /locations/v2/active (LastModified-quirk) */
    getActiveLocations(): Promise<MetrcLocation[]>;

    /** API: GET /packages/v2/active */
    getActivePackages(): Promise<MetrcActivePackage[]>;

    /** API: GET /items/v2/active (LastModified-quirk) */
    getActiveItems(): Promise<MetrcItem[]>;

    /** API: GET /sales/v2/receipts/active */
    getActiveSalesReceipts(window: SalesReceiptsWindow): Promise<MetrcSalesReceipt[]>;

    /** API: GET /sales/v2/receipts/{id} */
    getSalesReceiptById(id: number): Promise<MetrcSalesReceiptDetail>;
  }
  ```

  If Task 4 added the LastModified-quirk to `getActivePackages` (or others), add `(LastModified-quirk)` to those preambles too.

- [ ] **Step 3: Add per-method JSDoc on the live implementation.**

  Open `src/client/live.ts`. For each method inside the returned object, add a one-line `///` JSDoc above the method declaration with the same label as the interface. Existing larger JSDoc blocks (for example, the LastModified-quirk paragraphs on `getActiveLocations` and `getActiveItems`) stay, but the **first** line of those JSDoc blocks must be the `API:` / `Enhancement:` preamble. Example for `getActiveLocations`:

  ```ts
  /**
   * API: GET /locations/v2/active (LastModified-quirk)
   *
   * METRC's /locations/v2/active returns an empty list (HTTP 200, no
   * error) unless BOTH lastModifiedStart and lastModifiedEnd are
   * supplied. Use a wide window so every active location is returned
   * regardless of last edit.
   */
  async getActiveLocations(): Promise<MetrcLocation[]> {
    // ... existing body unchanged
  },
  ```

  Repeat for every method: prepend the API:/Enhancement: line above the existing body and, where a longer JSDoc comment already exists, make sure the preamble is the first non-empty line inside the `/** */`.

- [ ] **Step 4: Typecheck and run tests to confirm no behavior changed.**

  ```bash
  npm run typecheck && npm test 2>&1 | tail -10
  ```

  Expected: typecheck clean; tests still pass with same count; zero errors; zero unhandled rejections.

- [ ] **Step 5: Commit.**

  ```bash
  git add src/client/interface.ts src/client/live.ts
  git commit -m "$(cat <<'EOF'
  docs: add API/Enhancement JSDoc preambles to MetrcClient methods

  Per the comprehensive-coverage design spec, every method on the
  MetrcClient interface declares whether it is a 1:1 passthrough of a
  METRC endpoint (API:) or a client-side helper (Enhancement:). The
  preamble is the first line of the JSDoc on both the interface and
  the live implementation. The existing composition method
  getDeliveriesWithPackages is now correctly labeled as an enhancement
  rather than appearing as a peer to the API methods. Endpoints that
  use the wide-window LastModified workaround are tagged
  (LastModified-quirk).

  No behavior change.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 6: Add `CLIENT_COVERAGE` introspection map

**Files:**
- Create: `src/coverage.ts`
- Create: `tests/coverage.test.ts`
- Modify: `src/index.ts`

**Why:** Downstream consumers of this package need a programmatic way to ask "is endpoint X supported, and at what level?" without scraping the README. The `CLIENT_COVERAGE` map is the source of truth: a typed, frozen array of per-resource entries, each listing the endpoints and helpers in that resource with a status field. This map is itself a client-side **Enhancement** (not part of the METRC API) and must be clearly labeled.

Tests are non-hollow: they assert specific resource names, specific endpoint paths, specific status values, and that the structure is frozen. A "the map is defined" tautology is forbidden.

- [ ] **Step 1: Write the failing tests (RED).**

  Create `tests/coverage.test.ts` with:

  ```ts
  import { describe, it, expect } from "vitest";
  import { CLIENT_COVERAGE, type ResourceCoverage } from "../src/coverage.js";

  describe("CLIENT_COVERAGE", () => {
    it("is a frozen, non-empty array", () => {
      expect(Array.isArray(CLIENT_COVERAGE)).toBe(true);
      expect(CLIENT_COVERAGE.length).toBeGreaterThan(0);
      expect(Object.isFrozen(CLIENT_COVERAGE)).toBe(true);
    });

    it("contains expected resource families", () => {
      const names = CLIENT_COVERAGE.map((r) => r.resource);
      expect(names).toEqual(expect.arrayContaining([
        "transfers", "packages", "locations", "items", "sales",
      ]));
    });

    it("declares /transfers/v2/incoming as complete and tied to getIncomingTransfers", () => {
      const transfers = CLIENT_COVERAGE.find((r) => r.resource === "transfers")!;
      const incoming = transfers.endpoints.find((e) => e.path === "/transfers/v2/incoming");
      expect(incoming).toBeDefined();
      expect(incoming!.method).toBe("GET");
      expect(incoming!.clientMethod).toBe("getIncomingTransfers");
      expect(incoming!.status).toBe("complete");
    });

    it("lists getDeliveriesWithPackages as a transfers-resource helper composing two API methods", () => {
      const transfers = CLIENT_COVERAGE.find((r) => r.resource === "transfers")!;
      const helper = transfers.helpers?.find((h) => h.name === "getDeliveriesWithPackages");
      expect(helper).toBeDefined();
      expect(helper!.composes).toEqual(
        expect.arrayContaining(["getIncomingTransfers", "getPackagesForDelivery"]),
      );
    });

    it("declares /items/v2/active as complete and /items/v2/categories as planned", () => {
      const items = CLIENT_COVERAGE.find((r) => r.resource === "items")!;
      const active = items.endpoints.find((e) => e.path === "/items/v2/active");
      const categories = items.endpoints.find((e) => e.path === "/items/v2/categories");
      expect(active?.status).toBe("complete");
      expect(active?.clientMethod).toBe("getActiveItems");
      expect(categories?.status).toBe("planned");
      expect(categories?.clientMethod).toBeNull();
    });

    it("declares sales receipts list+detail complete, /sales/v2/transactions and /sales/v2/customertypes planned", () => {
      const sales = CLIENT_COVERAGE.find((r) => r.resource === "sales")!;
      const receiptsActive = sales.endpoints.find((e) => e.path === "/sales/v2/receipts/active");
      const receiptById = sales.endpoints.find((e) => e.path === "/sales/v2/receipts/{id}");
      const txns = sales.endpoints.find((e) => e.path === "/sales/v2/transactions");
      const customers = sales.endpoints.find((e) => e.path === "/sales/v2/customertypes");
      expect(receiptsActive?.status).toBe("complete");
      expect(receiptsActive?.clientMethod).toBe("getActiveSalesReceipts");
      expect(receiptById?.status).toBe("complete");
      expect(receiptById?.clientMethod).toBe("getSalesReceiptById");
      expect(txns?.status).toBe("planned");
      expect(customers?.status).toBe("planned");
    });

    it("uses only the four allowed status values", () => {
      const allowed = new Set<ResourceCoverage["status"]>(["complete", "partial", "planned", "out-of-scope-for-now"]);
      for (const resource of CLIENT_COVERAGE) {
        expect(allowed.has(resource.status)).toBe(true);
        for (const endpoint of resource.endpoints) {
          expect(allowed.has(endpoint.status)).toBe(true);
        }
      }
    });

    it("marks plants/plantbatches/harvests/waste as out-of-scope-for-now", () => {
      const expectedOutOfScope = ["plants", "plantbatches", "harvests", "waste"];
      for (const name of expectedOutOfScope) {
        const entry = CLIENT_COVERAGE.find((r) => r.resource === name);
        expect(entry, `resource ${name} should appear in CLIENT_COVERAGE as out-of-scope-for-now`).toBeDefined();
        expect(entry!.status).toBe("out-of-scope-for-now");
      }
    });
  });
  ```

- [ ] **Step 2: Run the test to verify it fails.**

  ```bash
  npx vitest run tests/coverage.test.ts
  ```

  Expected: FAIL — module `../src/coverage.js` not found (or `CLIENT_COVERAGE` not exported).

- [ ] **Step 3: Implement `src/coverage.ts`.**

  Create `src/coverage.ts`:

  ```ts
  /**
   * Enhancement: typed, programmatic map of which METRC NY v2 endpoints
   * this client covers and at what level. Not a METRC API surface — this
   * is a client-side introspection artifact for downstream consumers
   * that want to ask "is endpoint X supported?" without scraping the
   * README. Kept in lockstep with the Coverage table in README.md.
   */

  export type CoverageStatus = "complete" | "partial" | "planned" | "out-of-scope-for-now";

  export interface EndpointCoverage {
    path: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    clientMethod: string | null;
    status: CoverageStatus;
  }

  export interface HelperCoverage {
    name: string;
    composes: string[];
  }

  export interface ResourceCoverage {
    resource: string;
    status: CoverageStatus;
    endpoints: EndpointCoverage[];
    helpers?: HelperCoverage[];
  }

  export const CLIENT_COVERAGE: readonly ResourceCoverage[] = Object.freeze([
    Object.freeze({
      resource: "transfers",
      status: "partial" as CoverageStatus,
      endpoints: [
        { path: "/transfers/v2/incoming", method: "GET", clientMethod: "getIncomingTransfers", status: "complete" },
        { path: "/transfers/v2/deliveries/{id}/packages", method: "GET", clientMethod: "getPackagesForDelivery", status: "complete" },
        { path: "/transfers/v2/outgoing", method: "GET", clientMethod: null, status: "planned" },
        { path: "/transfers/v2/rejected", method: "GET", clientMethod: null, status: "planned" },
        { path: "/transfers/v2/types", method: "GET", clientMethod: null, status: "planned" },
        { path: "/transfers/v2/{id}", method: "GET", clientMethod: null, status: "planned" },
      ],
      helpers: [
        { name: "getDeliveriesWithPackages", composes: ["getIncomingTransfers", "getPackagesForDelivery"] },
      ],
    }),
    Object.freeze({
      resource: "packages",
      status: "partial" as CoverageStatus,
      endpoints: [
        { path: "/packages/v2/active", method: "GET", clientMethod: "getActivePackages", status: "complete" },
        { path: "/packages/v2/inactive", method: "GET", clientMethod: null, status: "planned" },
        { path: "/packages/v2/onhold", method: "GET", clientMethod: null, status: "planned" },
        { path: "/packages/v2/types", method: "GET", clientMethod: null, status: "planned" },
        { path: "/packages/v2/adjust/reasons", method: "GET", clientMethod: null, status: "planned" },
        { path: "/packages/v2/{id}", method: "GET", clientMethod: null, status: "planned" },
        { path: "/packages/v2/{label}", method: "GET", clientMethod: null, status: "planned" },
        { path: "/packages/v2/{id}/history", method: "GET", clientMethod: null, status: "planned" },
      ],
    }),
    Object.freeze({
      resource: "locations",
      status: "partial" as CoverageStatus,
      endpoints: [
        { path: "/locations/v2/active", method: "GET", clientMethod: "getActiveLocations", status: "complete" },
        { path: "/locations/v2/types", method: "GET", clientMethod: null, status: "planned" },
      ],
    }),
    Object.freeze({
      resource: "items",
      status: "partial" as CoverageStatus,
      endpoints: [
        { path: "/items/v2/active", method: "GET", clientMethod: "getActiveItems", status: "complete" },
        { path: "/items/v2/categories", method: "GET", clientMethod: null, status: "planned" },
      ],
    }),
    Object.freeze({
      resource: "sales",
      status: "partial" as CoverageStatus,
      endpoints: [
        { path: "/sales/v2/receipts/active", method: "GET", clientMethod: "getActiveSalesReceipts", status: "complete" },
        { path: "/sales/v2/receipts/{id}", method: "GET", clientMethod: "getSalesReceiptById", status: "complete" },
        { path: "/sales/v2/transactions", method: "GET", clientMethod: null, status: "planned" },
        { path: "/sales/v2/customertypes", method: "GET", clientMethod: null, status: "planned" },
      ],
    }),
    Object.freeze({
      resource: "strains",
      status: "planned" as CoverageStatus,
      endpoints: [
        { path: "/strains/v2/active", method: "GET", clientMethod: null, status: "planned" },
        { path: "/strains/v2/{id}", method: "GET", clientMethod: null, status: "planned" },
      ],
    }),
    Object.freeze({
      resource: "labtests",
      status: "planned" as CoverageStatus,
      endpoints: [
        { path: "/labtests/v2/results", method: "GET", clientMethod: null, status: "planned" },
        { path: "/labtests/v2/states", method: "GET", clientMethod: null, status: "planned" },
        { path: "/labtests/v2/types", method: "GET", clientMethod: null, status: "planned" },
        { path: "/labtests/v2/{id}", method: "GET", clientMethod: null, status: "planned" },
      ],
    }),
    Object.freeze({
      resource: "plants",
      status: "out-of-scope-for-now" as CoverageStatus,
      endpoints: [],
    }),
    Object.freeze({
      resource: "plantbatches",
      status: "out-of-scope-for-now" as CoverageStatus,
      endpoints: [],
    }),
    Object.freeze({
      resource: "harvests",
      status: "out-of-scope-for-now" as CoverageStatus,
      endpoints: [],
    }),
    Object.freeze({
      resource: "waste",
      status: "out-of-scope-for-now" as CoverageStatus,
      endpoints: [],
    }),
  ]);
  ```

- [ ] **Step 4: Run the tests to verify they pass (GREEN).**

  ```bash
  npx vitest run tests/coverage.test.ts
  ```

  Expected: all assertions pass.

- [ ] **Step 5: Export `CLIENT_COVERAGE` from the package entry.**

  Open `src/index.ts`. Append:

  ```ts
  export {
    CLIENT_COVERAGE,
  } from "./coverage.js";
  export type {
    CoverageStatus, ResourceCoverage, EndpointCoverage, HelperCoverage,
  } from "./coverage.js";
  ```

- [ ] **Step 6: Run full suite, typecheck, build.**

  ```bash
  npm test 2>&1 | tail -10 && npm run typecheck && npm run build
  ```

  Expected: all green, zero errors, zero unhandled rejections, coverage thresholds still pass.

- [ ] **Step 7: Commit.**

  ```bash
  git add src/coverage.ts tests/coverage.test.ts src/index.ts
  git commit -m "$(cat <<'EOF'
  feat: add CLIENT_COVERAGE introspection map

  Exports a typed, frozen list of per-resource coverage entries so
  downstream consumers can ask "is endpoint X supported?" without
  scraping the README. Each entry lists endpoints (path, HTTP method,
  the client method that implements it if any, status) and any
  client-side helpers built on top.

  This is a client-side enhancement, not a METRC API surface. The
  jsdoc on src/coverage.ts says so explicitly so future readers know
  the file is not derived from the METRC contract.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 7: File 8 roadmap issues on GitHub

**Files:** none in the repo; uses `gh issue create`.

**Why:** The spec defers four cultivator-side resources and four write-operation families to roadmap issues so the README can link them and consumers can subscribe. Each issue body describes what the resource covers, why it is deferred, what would unblock the work, and a checkbox list of the specific endpoints in that family. The repository's `gh` CLI is already authenticated (used to view PR #1 earlier).

- [ ] **Step 1: Create labels (idempotent — skip silently if they already exist).**

  ```bash
  gh label create roadmap --color FBCA04 --description "On the roadmap; not yet scheduled" 2>/dev/null || true
  gh label create out-of-scope-for-now --color D4C5F9 --description "Not currently in scope; tracked here for future planning" 2>/dev/null || true
  ```

- [ ] **Step 2: File issue 1 — plants resource.**

  ```bash
  gh issue create \
    --title "Cultivator resources: plants (/plants/v2/*)" \
    --label roadmap --label out-of-scope-for-now \
    --body "$(cat <<'EOF'
  Add read coverage for the plants resource family. Deferred because the only METRC NY license currently available for live verification is retailer (OCM-RET-*), which cannot exercise the cultivator-side plants endpoints.

  **Unblocks:** Access to a cultivator sandbox license or vendor-level credentials.

  **Endpoints in scope when this is picked up:**

  - [ ] GET /plants/v2/vegetative
  - [ ] GET /plants/v2/flowering
  - [ ] GET /plants/v2/onhold
  - [ ] GET /plants/v2/inactive
  - [ ] GET /plants/v2/growthphases
  - [ ] GET /plants/v2/{id}
  - [ ] GET /plants/v2/{label}

  Schemas to add: `metrcPlantSchema`. Conformance and mock entries follow the pattern in `docs/superpowers/specs/2026-05-24-comprehensive-metrc-ny-coverage-design.md`.
  EOF
  )"
  ```

- [ ] **Step 3: File issue 2 — plant batches.**

  ```bash
  gh issue create \
    --title "Cultivator resources: plant batches (/plantbatches/v2/*)" \
    --label roadmap --label out-of-scope-for-now \
    --body "$(cat <<'EOF'
  Add read coverage for the plant batches resource family. Same retailer-only license constraint as the plants issue.

  **Unblocks:** Cultivator sandbox license or vendor-level credentials.

  **Endpoints in scope:**

  - [ ] GET /plantbatches/v2/active
  - [ ] GET /plantbatches/v2/inactive
  - [ ] GET /plantbatches/v2/types
  - [ ] GET /plantbatches/v2/{id}
  EOF
  )"
  ```

- [ ] **Step 4: File issue 3 — harvests.**

  ```bash
  gh issue create \
    --title "Cultivator resources: harvests (/harvests/v2/*)" \
    --label roadmap --label out-of-scope-for-now \
    --body "$(cat <<'EOF'
  Add read coverage for the harvests resource family.

  **Unblocks:** Cultivator sandbox license.

  **Endpoints in scope:**

  - [ ] GET /harvests/v2/active
  - [ ] GET /harvests/v2/onhold
  - [ ] GET /harvests/v2/inactive
  - [ ] GET /harvests/v2/wastetypes
  - [ ] GET /harvests/v2/{id}
  EOF
  )"
  ```

- [ ] **Step 5: File issue 4 — waste.**

  ```bash
  gh issue create \
    --title "Cultivator resources: waste (/waste/v2/*)" \
    --label roadmap --label out-of-scope-for-now \
    --body "$(cat <<'EOF'
  Add read coverage for the waste resource family.

  **Unblocks:** Cultivator sandbox license (waste endpoints attach to plants/harvests).

  **Endpoints in scope (confirm against current NY docs at pick-up time):**

  - [ ] GET /waste/v2/active
  - [ ] GET /waste/v2/types
  - [ ] GET /waste/v2/methods
  EOF
  )"
  ```

- [ ] **Step 6: File issue 5 — receive transfer (write).**

  ```bash
  gh issue create \
    --title "Write operations: receive incoming transfer" \
    --label roadmap --label out-of-scope-for-now \
    --body "$(cat <<'EOF'
  Add support for receiving an incoming transfer (POST). Deferred because writes carry distinct risk (validation, idempotency, error semantics on partial receipt) and the current spec's first iteration is read-only.

  **Unblocks:** Reads-first phasing (P1–P7) reaches stable coverage; a follow-up spec adds the write-side error hierarchy and idempotency story.

  **Endpoints in scope (verify exact paths at pick-up):**

  - [ ] POST /transfers/v2/deliveries/{id}/packages
  - [ ] PUT /transfers/v2/deliveries/{id}/packages (adjust)
  - [ ] Related: package receive/adjust on the receiving side.
  EOF
  )"
  ```

- [ ] **Step 7: File issue 6 — create/adjust packages (write).**

  ```bash
  gh issue create \
    --title "Write operations: create / adjust packages" \
    --label roadmap --label out-of-scope-for-now \
    --body "$(cat <<'EOF'
  Add support for creating new packages and adjusting existing ones (POST/PUT). Defers for the same write-risk reason as the receive-transfer issue.

  **Endpoints in scope:**

  - [ ] POST /packages/v2/create
  - [ ] POST /packages/v2/create/plantings
  - [ ] PUT /packages/v2/adjust
  - [ ] PUT /packages/v2/finish
  - [ ] PUT /packages/v2/unfinish
  - [ ] PUT /packages/v2/remediate
  EOF
  )"
  ```

- [ ] **Step 8: File issue 7 — record sales receipt (write).**

  ```bash
  gh issue create \
    --title "Write operations: record sales receipt" \
    --label roadmap --label out-of-scope-for-now \
    --body "$(cat <<'EOF'
  Add support for recording, voiding, and updating sales receipts (POST/PUT/DELETE).

  **Endpoints in scope:**

  - [ ] POST /sales/v2/receipts
  - [ ] PUT /sales/v2/receipts
  - [ ] DELETE /sales/v2/receipts/{id}
  EOF
  )"
  ```

- [ ] **Step 9: File issue 8 — transporter facility endpoints.**

  ```bash
  gh issue create \
    --title "Transporter facility endpoints" \
    --label roadmap --label out-of-scope-for-now \
    --body "$(cat <<'EOF'
  Add coverage for transporter-facility endpoints. Yerba Buena is not a transporter today; deferring.

  **Unblocks:** Transporter license or an operational need (e.g. an in-house delivery vehicle going on the NY OCM transporter registry).

  **Endpoints in scope (verify against current NY docs):**

  - [ ] GET /transporters/v2/{transferId}
  - [ ] GET /transporters/v2/{transferId}/details
  - [ ] Related transporter routes documented under /transfers/v2.
  EOF
  )"
  ```

- [ ] **Step 10: Capture the resulting issue numbers.**

  ```bash
  gh issue list --state open --label roadmap --limit 20 --json number,title
  ```

  Expected: 8 entries. Note each issue's number — Task 8 (README) links to them.

  This task makes no commit; the artifact is the set of remote issues.

---

## Task 8: README restructure

**Files:**
- Modify: `README.md`

**Why:** The README currently describes the package as "a small subset" and lists 4 endpoints. The reframed scope (comprehensive read coverage of dispensary endpoints; cultivator + writes as roadmap issues) and the new enhancement-tagging convention need to be visible to anyone landing on the GitHub repo. The new README has a Coverage table whose rows mirror `CLIENT_COVERAGE`, a Client-enhancements section (helpers and types not in the METRC API), and a Roadmap section linking the issues filed in Task 7.

- [ ] **Step 1: Replace `README.md` entirely.**

  Open `README.md` and replace its full contents with the markdown below. The outer ````markdown` fence uses four backticks so the inner triple-backtick code blocks render correctly.

  ````markdown
  # @yerba-buena/metrc-ny-client

  TypeScript client for the METRC NY v2 API. Started as a dispensary-focused subset; growing toward comprehensive read coverage of the dispensary-relevant surface. Cultivator-side resources (plants, plant batches, harvests, waste) and all write operations are tracked as open issues — see [Roadmap](#roadmap).

  - Live + mock implementations behind a shared `MetrcClient` interface.
  - Read-only today (GET endpoints). Write operations are deferred.
  - Pre-1.0. Used internally by Yerba Buena retail apps. Consumed via git submodule by sibling repos; npm publishing TBD.

  ## Coverage

  Source of truth: the [`CLIENT_COVERAGE`](src/coverage.ts) constant. The table below is kept in lockstep.

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
  | `(LastModified-quirk)` wide-window fallback | n/a (transport convention) | For `/locations/v2/active` and `/items/v2/active`, the client passes a wide internal window because METRC returns empty without one. Tagged in method JSDoc. |
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

  - [Cultivator: plants](https://github.com/yerba-buena/metrc-ny-client/issues/<#>)
  - [Cultivator: plant batches](https://github.com/yerba-buena/metrc-ny-client/issues/<#>)
  - [Cultivator: harvests](https://github.com/yerba-buena/metrc-ny-client/issues/<#>)
  - [Cultivator: waste](https://github.com/yerba-buena/metrc-ny-client/issues/<#>)
  - [Write: receive incoming transfer](https://github.com/yerba-buena/metrc-ny-client/issues/<#>)
  - [Write: create / adjust packages](https://github.com/yerba-buena/metrc-ny-client/issues/<#>)
  - [Write: record sales receipt](https://github.com/yerba-buena/metrc-ny-client/issues/<#>)
  - [Transporter facility endpoints](https://github.com/yerba-buena/metrc-ny-client/issues/<#>)

  See `docs/superpowers/specs/2026-05-24-comprehensive-metrc-ny-coverage-design.md` for the full phasing plan.

  ## Development

  ```bash
  npm install
  npm test
  npm run typecheck
  npm run build
  npm run discover  # requires .env with METRC vendor/user/license keys
  ```
  ````

- [ ] **Step 2: Replace the `<#>` placeholders with the actual issue numbers from Task 7.**

  Run:

  ```bash
  gh issue list --state open --label roadmap --limit 20 --json number,title --jq '.[] | "\(.number)  \(.title)"'
  ```

  For each issue printed, replace its matching `<#>` in `README.md` with the integer issue number. After this step there must be zero `<#>` placeholders remaining.

  Verify:

  ```bash
  grep -c "issues/<#>" README.md
  ```

  Expected output: `0`

- [ ] **Step 3: Confirm the README claims match `CLIENT_COVERAGE` exactly.**

  This is a manual eyeball check, not a script: for each row in the Coverage table, confirm the row's `Endpoints implemented` column matches the `clientMethod !== null` entries for that resource in `src/coverage.ts`. If they drift, fix the README (the constant is the source of truth).

- [ ] **Step 4: Commit.**

  ```bash
  git add README.md
  git commit -m "$(cat <<'EOF'
  docs: rescope README around comprehensive-read goal with coverage table

  Reframes the package from "deliberately small subset" to
  "comprehensive read coverage of the dispensary-relevant METRC NY
  surface; cultivator + writes tracked as roadmap issues." Adds a
  Coverage table whose rows mirror src/coverage.ts, a Client-
  enhancements section that names every artifact in this client that
  is not a 1:1 passthrough of a METRC endpoint, and a Roadmap section
  linking the 8 GitHub issues filed for deferred work. Adds usage
  examples showing both a direct API call and an enhancement helper,
  plus an introspection example for CLIENT_COVERAGE.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Phase 0 Definition of Done (verify after all 8 tasks land)

Run each command. Each must produce the expected result.

- [ ] **All tests pass with zero noise:**

  ```bash
  npm test 2>&1 | tail -10
  ```

  - `Test Files  12 passed (12)` (was 11; +1 for `tests/coverage.test.ts`)
  - `Tests  139+ passed (139+)` (was 125; +6 conformance from Task 2 — 3 new entries × 2 variants — and +8 coverage from Task 6; Task 4 only modifies existing assertions)
  - No `Errors  N errors` line.
  - No `Unhandled Rejection` block.

- [ ] **Typecheck clean:**

  ```bash
  npm run typecheck
  ```

  Exits 0.

- [ ] **Build clean:**

  ```bash
  npm run build
  ```

  Exits 0. Produces `dist/` with no errors.

- [ ] **Coverage thresholds pass:**

  ```bash
  npx vitest run --coverage 2>&1 | tail -25
  ```

  Final block must show `All files` line at >= 90% on each of `% Stmts / Branch / Funcs / Lines`. If `src/coverage.ts` pulls the score down, add targeted tests rather than relaxing thresholds.

- [ ] **Discovery script still runs end-to-end:**

  ```bash
  npm run discover
  ```

  Exits 0; prints both the existing target outputs and the new audit pair outputs.

- [ ] **All 8 roadmap issues exist on GitHub:**

  ```bash
  gh issue list --state open --label roadmap --json number | jq 'length'
  ```

  Expected: `8`.

- [ ] **README has no placeholder issue numbers:**

  ```bash
  grep -c "issues/<#>" README.md
  ```

  Expected: `0`.

- [ ] **`CLIENT_COVERAGE` is exported from the package entry:**

  ```bash
  node -e "import('./dist/index.js').then(m => console.log(Array.isArray(m.CLIENT_COVERAGE), m.CLIENT_COVERAGE.length))"
  ```

  Expected: `true 11` (11 resource entries — adjust if the table grows).

- [ ] **Every method on `MetrcClient` has an API:/Enhancement: JSDoc preamble:**

  ```bash
  grep -E "^\s*(/\*\* (API|Enhancement)|//\s*(API|Enhancement))" src/client/interface.ts | wc -l
  ```

  Expected: `8` (one per method).

When all the above pass, Phase 0 is complete and the work is ready to merge.

---

## Notes for the executing agent

- This plan is to be executed task-by-task with a commit per task (or per affected endpoint inside Task 4). Do **not** batch multiple tasks into a single commit.
- The spec at `docs/superpowers/specs/2026-05-24-comprehensive-metrc-ny-coverage-design.md` is the source of truth for conventions; if a task's instructions and the spec disagree, the spec wins — pause and ask the user.
- The repo enforces 90% coverage thresholds. If any task drops coverage below threshold, add targeted tests in the same task before committing.
- Do not run `git push` without explicit user instruction. The user pushes manually.
- Do not run any `gh pr create` step as part of this plan; the PR for Phase 0 is opened by the user once all 8 tasks land.
