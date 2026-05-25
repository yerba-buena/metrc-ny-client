import type { MetrcClient, MetrcConfig, SalesReceiptsWindow } from "./interface.js";
import { createRequester } from "../transport/request.js";
import { fetchAllPages, type PaginatedResponse } from "../transport/pagination.js";
import {
  metrcTransferSchema, metrcPackageSchema, metrcLocationSchema, metrcActivePackageSchema,
  metrcItemSchema, metrcSalesReceiptSchema, metrcSalesReceiptDetailSchema,
} from "../schemas/index.js";
import type {
  MetrcTransfer, MetrcPackage, DeliveryWithPackages,
  MetrcLocation, MetrcActivePackage,
  MetrcItem, MetrcSalesReceipt, MetrcSalesReceiptDetail,
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
    async getIncomingTransfers(): Promise<MetrcTransfer[]> {
      const endpoint = "/transfers/v2/incoming";
      // METRC's /transfers/v2/incoming was confirmed by the Phase 0 audit
      // (docs/superpowers/audits/audit-lastmodified-transfers-incoming.json)
      // to return a near-empty subset of incoming transfers when called without a
      // LastModified window (bare 1 vs windowed 365 records observed).
      // Same convention as /locations/v2/active and /items/v2/active: pass
      // a wide window so every incoming transfer is returned regardless of
      // last edit.
      const data = await fetchAllPages<MetrcTransfer>(
        paged<MetrcTransfer>(endpoint, {
          lastModifiedStart: "2015-01-01T00:00:00Z",
          lastModifiedEnd: new Date().toISOString(),
        }),
        endpoint,
      );
      return validateArray(metrcTransferSchema, data, endpoint);
    },

    async getPackagesForDelivery(deliveryId: number): Promise<MetrcPackage[]> {
      const endpoint = `/transfers/v2/deliveries/${deliveryId}/packages`;
      const data = await fetchAllPages<MetrcPackage>(paged<MetrcPackage>(endpoint), endpoint);
      return validateArray(metrcPackageSchema, data, endpoint);
    },

    async getDeliveriesWithPackages(): Promise<DeliveryWithPackages[]> {
      const transfers = await this.getIncomingTransfers();
      const result: DeliveryWithPackages[] = [];
      for (const transfer of transfers) {
        const packages = await this.getPackagesForDelivery(transfer.DeliveryId);
        result.push({ transfer, packages });
      }
      return result;
    },

    async getActiveLocations(): Promise<MetrcLocation[]> {
      const endpoint = "/locations/v2/active";
      // METRC's /locations/v2/active returns an empty list (HTTP 200, no error)
      // unless BOTH lastModifiedStart and lastModifiedEnd are supplied. Use a
      // wide window so every active location is returned regardless of last edit.
      const data = await fetchAllPages<MetrcLocation>(
        paged<MetrcLocation>(endpoint, {
          lastModifiedStart: "2015-01-01T00:00:00Z",
          lastModifiedEnd: new Date().toISOString(),
        }),
        endpoint,
      );
      return validateArray(metrcLocationSchema, data, endpoint);
    },

    async getActivePackages(): Promise<MetrcActivePackage[]> {
      const endpoint = "/packages/v2/active";
      // METRC's /packages/v2/active was confirmed by the Phase 0 audit
      // (docs/superpowers/audits/audit-lastmodified-packages-active.json)
      // to return a small subset of active packages when called without a
      // LastModified window (bare 162 vs windowed 1424 records observed).
      // Same convention as /locations/v2/active and /items/v2/active: pass
      // a wide window so every active package is returned regardless of
      // last edit.
      const data = await fetchAllPages<MetrcActivePackage>(
        paged<MetrcActivePackage>(endpoint, {
          lastModifiedStart: "2015-01-01T00:00:00Z",
          lastModifiedEnd: new Date().toISOString(),
        }),
        endpoint,
      );
      return validateArray(metrcActivePackageSchema, data, endpoint);
    },

    async getActiveItems(): Promise<MetrcItem[]> {
      const endpoint = "/items/v2/active";
      // Same convention as /locations/v2/active: pass a wide LastModified window
      // so every active item is returned regardless of when it was last edited.
      const data = await fetchAllPages<MetrcItem>(
        paged<MetrcItem>(endpoint, {
          lastModifiedStart: "2015-01-01T00:00:00Z",
          lastModifiedEnd: new Date().toISOString(),
        }),
        endpoint,
      );
      return validateArray(metrcItemSchema, data, endpoint);
    },

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

    async getSalesReceiptById(id: number): Promise<MetrcSalesReceiptDetail> {
      const endpoint = `/sales/v2/receipts/${id}`;
      // Single-object GET, not paginated.
      const data = await request<unknown>(endpoint, {});
      return validateOne(metrcSalesReceiptDetailSchema, data, endpoint);
    },
  };
}
