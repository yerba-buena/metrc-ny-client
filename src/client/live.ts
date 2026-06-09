import type { MetrcClient, MetrcConfig, SalesReceiptsWindow } from "./interface.js";
import { createRequester } from "../transport/request.js";
import { requestArray } from "../transport/request-array.js";
import { fetchAllPages, type PaginatedResponse } from "../transport/pagination.js";
import {
  metrcTransferSchema, metrcOutgoingTransferSchema, metrcPackageSchema, metrcLocationSchema, metrcActivePackageSchema,
  metrcPackageAdjustReasonSchema,
  metrcItemSchema, metrcSalesReceiptSchema, metrcSalesReceiptDetailSchema,
  metrcItemCategorySchema,
} from "../schemas/index.js";
import type {
  MetrcTransfer, MetrcOutgoingTransfer, MetrcPackage, DeliveryWithPackages,
  MetrcLocation, MetrcActivePackage, MetrcPackageAdjustReason,
  MetrcItem, MetrcSalesReceipt, MetrcSalesReceiptDetail,
  MetrcItemCategory,
} from "../schemas/index.js";
import { MetrcResponseError } from "../errors.js";
import { NOOP_LOGGER } from "../logger.js";
import { z } from "zod";

export function createLiveMetrcClient(config: MetrcConfig): MetrcClient {
  const logger = config.logger ?? NOOP_LOGGER;
  const validate = config.validateResponses === true;

  const request = createRequester({
    vendorApiKey: config.vendorApiKey,
    userApiKey: config.userApiKey,
    licenseNumber: config.licenseNumber,
    baseUrl: config.baseUrl,
    logger,
    fetch: config.fetch,
    rateLimitMs: config.rateLimitMs,
    retry: config.retry,
  });

  function paged<T>(endpoint: string, extraParams: Record<string, string> = {}) {
    return async function fetchPage(pageNumber: number) {
      return request<PaginatedResponse<T>>(endpoint, {
        ...extraParams,
        pageNumber: String(pageNumber),
        pageSize: "20",
      });
    };
  }

  function validateArray<T>(schema: z.ZodType<T>, data: unknown[], endpoint: string): T[] {
    if (!validate) return data as T[];
    try {
      return data.map((d) => schema.parse(d));
    } catch (err) {
      throw new MetrcResponseError(
        err instanceof Error ? err.message : "validation failed",
        { endpoint, method: "GET", cause: err },
      );
    }
  }

  function validateOne<T>(schema: z.ZodType<T>, data: unknown, endpoint: string): T {
    if (!validate) return data as T;
    try {
      return schema.parse(data);
    } catch (err) {
      throw new MetrcResponseError(
        err instanceof Error ? err.message : "validation failed",
        { endpoint, method: "GET", cause: err },
      );
    }
  }

  return {
    /**
     * API: GET /transfers/v2/incoming (LastModified-quirk)
     *
     * METRC's /transfers/v2/incoming was confirmed by the Phase 0 audit
     * (docs/superpowers/audits/audit-lastmodified-transfers-incoming.json)
     * to return a near-empty subset of incoming transfers when called without a
     * LastModified window (bare 1 vs windowed 365 records observed).
     * Same convention as /locations/v2/active and /items/v2/active: pass
     * a wide window so every incoming transfer is returned regardless of
     * last edit.
     */
    async getIncomingTransfers(): Promise<MetrcTransfer[]> {
      const endpoint = "/transfers/v2/incoming";
      const data = await fetchAllPages<MetrcTransfer>(
        paged<MetrcTransfer>(endpoint, {
          lastModifiedStart: "2015-01-01T00:00:00Z",
          lastModifiedEnd: new Date().toISOString(),
        }),
        endpoint,
      );
      return validateArray(metrcTransferSchema, data, endpoint);
    },

    /**
     * API: GET /transfers/v2/outgoing (LastModified-quirk)
     *
     * Phase 4 audit
     * (docs/superpowers/audits/discover-transfers-v2-outgoing.json)
     * confirmed bare 1 vs windowed 7 — same partial-quirk pattern as
     * /transfers/v2/incoming. Pass a wide window. Schema is
     * metrcOutgoingTransferSchema (NOT metrcTransferSchema — outgoing has
     * extra fields and different nullability).
     */
    async getOutgoingTransfers(): Promise<MetrcOutgoingTransfer[]> {
      const endpoint = "/transfers/v2/outgoing";
      const data = await fetchAllPages<MetrcOutgoingTransfer>(
        paged<MetrcOutgoingTransfer>(endpoint, {
          lastModifiedStart: "2015-01-01T00:00:00Z",
          lastModifiedEnd: new Date().toISOString(),
        }),
        endpoint,
      );
      return validateArray(metrcOutgoingTransferSchema, data, endpoint);
    },

    /**
     * API: GET /transfers/v2/rejected (LastModified-quirk)
     *
     * License had 0 rejected transfers in the Phase 4 audit
     * (docs/superpowers/audits/discover-transfers-v2-rejected.json),
     * so the quirk verdict and exact row shape could not be conclusively
     * measured. Apply wide-window defensively (same as /packages/v2/onhold
     * from P2). Reuses metrcOutgoingTransferSchema with .passthrough()
     * for any rejected-specific fields.
     */
    async getRejectedTransfers(): Promise<MetrcOutgoingTransfer[]> {
      const endpoint = "/transfers/v2/rejected";
      const data = await fetchAllPages<MetrcOutgoingTransfer>(
        paged<MetrcOutgoingTransfer>(endpoint, {
          lastModifiedStart: "2015-01-01T00:00:00Z",
          lastModifiedEnd: new Date().toISOString(),
        }),
        endpoint,
      );
      return validateArray(metrcOutgoingTransferSchema, data, endpoint);
    },

    /** API: GET /transfers/v2/deliveries/{deliveryId}/packages */
    async getPackagesForDelivery(deliveryId: number): Promise<MetrcPackage[]> {
      const endpoint = `/transfers/v2/deliveries/${deliveryId}/packages`;
      const data = await fetchAllPages<MetrcPackage>(paged<MetrcPackage>(endpoint), endpoint);
      return validateArray(metrcPackageSchema, data, endpoint);
    },

    /**
     * Enhancement: composed from getIncomingTransfers + getPackagesForDelivery,
     * one delivery at a time (sequential).
     */
    async getDeliveriesWithPackages(): Promise<DeliveryWithPackages[]> {
      const transfers = await this.getIncomingTransfers();
      const result: DeliveryWithPackages[] = [];
      for (const transfer of transfers) {
        const packages = await this.getPackagesForDelivery(transfer.DeliveryId);
        result.push({ transfer, packages });
      }
      return result;
    },

    /**
     * API: GET /locations/v2/active (LastModified-quirk)
     *
     * METRC's /locations/v2/active returns an empty list (HTTP 200, no error)
     * unless BOTH lastModifiedStart and lastModifiedEnd are supplied. Use a
     * wide window so every active location is returned regardless of last edit.
     */
    async getActiveLocations(): Promise<MetrcLocation[]> {
      const endpoint = "/locations/v2/active";
      const data = await fetchAllPages<MetrcLocation>(
        paged<MetrcLocation>(endpoint, {
          lastModifiedStart: "2015-01-01T00:00:00Z",
          lastModifiedEnd: new Date().toISOString(),
        }),
        endpoint,
      );
      return validateArray(metrcLocationSchema, data, endpoint);
    },

    /**
     * API: GET /packages/v2/active (LastModified-quirk)
     *
     * METRC's /packages/v2/active was confirmed by the Phase 0 audit
     * (docs/superpowers/audits/audit-lastmodified-packages-active.json)
     * to return a small subset of active packages when called without a
     * LastModified window (bare 162 vs windowed 1424 records observed).
     * Same convention as /locations/v2/active and /items/v2/active: pass
     * a wide window so every active package is returned regardless of
     * last edit.
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

    /**
     * API: GET /packages/v2/inactive (LastModified-quirk)
     *
     * The Phase 2 discovery audit
     * (docs/superpowers/audits/discover-packages-v2-inactive.json)
     * showed bare 8 vs windowed 1419 records — same quirk as
     * /packages/v2/active. Pass a wide window so every inactive
     * package is returned regardless of last-edit time.
     *
     * Inactive packages share the active package response shape
     * (only IsFinished/FinishedDate semantics differ); reuse
     * metrcActivePackageSchema.
     */
    async getInactivePackages(): Promise<MetrcActivePackage[]> {
      const endpoint = "/packages/v2/inactive";
      const data = await fetchAllPages<MetrcActivePackage>(
        paged<MetrcActivePackage>(endpoint, {
          lastModifiedStart: "2015-01-01T00:00:00Z",
          lastModifiedEnd: new Date().toISOString(),
        }),
        endpoint,
      );
      return validateArray(metrcActivePackageSchema, data, endpoint);
    },

    /**
     * API: GET /packages/v2/onhold (LastModified-quirk)
     *
     * The Phase 2 discovery audit
     * (docs/superpowers/audits/discover-packages-v2-onhold.json)
     * showed 0 rows on this license — could not conclusively confirm
     * the quirk, but the wide-window pattern is applied defensively
     * since the active and inactive list endpoints both exhibit it.
     * On-hold packages share the active package response shape.
     */
    async getOnHoldPackages(): Promise<MetrcActivePackage[]> {
      const endpoint = "/packages/v2/onhold";
      const data = await fetchAllPages<MetrcActivePackage>(
        paged<MetrcActivePackage>(endpoint, {
          lastModifiedStart: "2015-01-01T00:00:00Z",
          lastModifiedEnd: new Date().toISOString(),
        }),
        endpoint,
      );
      return validateArray(metrcActivePackageSchema, data, endpoint);
    },

    /** API: GET /packages/v2/types */
    async getPackageTypes(): Promise<string[]> {
      const endpoint = "/packages/v2/types";
      const data = await requestArray<unknown>(request, endpoint);
      return validateArray(z.string(), data, endpoint);
    },

    /** API: GET /packages/v2/adjust/reasons */
    async getPackageAdjustReasons(): Promise<MetrcPackageAdjustReason[]> {
      const endpoint = "/packages/v2/adjust/reasons";
      const data = await fetchAllPages<MetrcPackageAdjustReason>(
        paged<MetrcPackageAdjustReason>(endpoint),
        endpoint,
      );
      return validateArray(metrcPackageAdjustReasonSchema, data, endpoint);
    },

    /** API: GET /packages/v2/{id} */
    async getPackageById(id: number): Promise<MetrcActivePackage> {
      const endpoint = `/packages/v2/${id}`;
      const data = await request<unknown>(endpoint, {});
      return validateOne(metrcActivePackageSchema, data, endpoint);
    },

    /** API: GET /packages/v2/{label} */
    async getPackageByLabel(label: string): Promise<MetrcActivePackage> {
      const endpoint = `/packages/v2/${label}`;
      const data = await request<unknown>(endpoint, {});
      return validateOne(metrcActivePackageSchema, data, endpoint);
    },

    /**
     * API: GET /items/v2/active (LastModified-quirk)
     *
     * Same convention as /locations/v2/active: pass a wide LastModified window
     * so every active item is returned regardless of when it was last edited.
     */
    async getActiveItems(): Promise<MetrcItem[]> {
      const endpoint = "/items/v2/active";
      const data = await fetchAllPages<MetrcItem>(
        paged<MetrcItem>(endpoint, {
          lastModifiedStart: "2015-01-01T00:00:00Z",
          lastModifiedEnd: new Date().toISOString(),
        }),
        endpoint,
      );
      return validateArray(metrcItemSchema, data, endpoint);
    },

    /** API: GET /items/v2/categories */
    async getItemCategories(): Promise<MetrcItemCategory[]> {
      const endpoint = "/items/v2/categories";
      const data = await fetchAllPages<MetrcItemCategory>(paged<MetrcItemCategory>(endpoint), endpoint);
      return validateArray(metrcItemCategorySchema, data, endpoint);
    },

    /** API: GET /sales/v2/receipts/active */
    async getActiveSalesReceipts(window: SalesReceiptsWindow): Promise<MetrcSalesReceipt[]> {
      const endpoint = "/sales/v2/receipts/active";
      // METRC's /sales/v2/receipts/active returns 0 rows when called without
      // a LastModified window. Guard at the boundary so a caller bypassing
      // TypeScript can't silently produce an empty list.
      if (
        !window ||
        typeof window.lastModifiedStart !== "string" ||
        typeof window.lastModifiedEnd !== "string" ||
        window.lastModifiedStart.length === 0 ||
        window.lastModifiedEnd.length === 0
      ) {
        throw new TypeError(
          "getActiveSalesReceipts requires { lastModifiedStart, lastModifiedEnd } as non-empty ISO-8601 strings",
        );
      }
      const data = await fetchAllPages<MetrcSalesReceipt>(
        paged<MetrcSalesReceipt>(endpoint, {
          lastModifiedStart: window.lastModifiedStart,
          lastModifiedEnd: window.lastModifiedEnd,
        }),
        endpoint,
      );
      return validateArray(metrcSalesReceiptSchema, data, endpoint);
    },

    /** API: GET /sales/v2/receipts/{id} */
    async getSalesReceiptById(id: number): Promise<MetrcSalesReceiptDetail> {
      const endpoint = `/sales/v2/receipts/${id}`;
      // Single-object GET, not paginated.
      const data = await request<unknown>(endpoint, {});
      return validateOne(metrcSalesReceiptDetailSchema, data, endpoint);
    },

    /** API: GET /sales/v2/customertypes */
    async getSalesCustomerTypes(): Promise<string[]> {
      const endpoint = "/sales/v2/customertypes";
      const data = await requestArray<unknown>(request, endpoint);
      return validateArray(z.string(), data, endpoint);
    },
  };
}
