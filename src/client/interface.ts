// src/client/interface.ts
import type {
  MetrcTransfer, MetrcPackage, DeliveryWithPackages,
  MetrcLocation, MetrcActivePackage, MetrcPackageAdjustReason,
  MetrcItem, MetrcSalesReceipt, MetrcSalesReceiptDetail,
  MetrcItemCategory,
} from "../schemas/index.js";
import type { Logger } from "../logger.js";
import type { RetryConfig } from "../transport/retry.js";

export interface MetrcConfig {
  vendorApiKey: string;
  userApiKey: string;
  licenseNumber: string;
  baseUrl: string;
  logger?: Logger;
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
  rateLimitMs?: number;
  retry?: Partial<RetryConfig>;
  validateResponses?: boolean;
}

export interface SalesReceiptsWindow {
  /** ISO-8601 timestamp for the inclusive start of the LastModified window. */
  lastModifiedStart: string;
  /** ISO-8601 timestamp for the inclusive end of the LastModified window. */
  lastModifiedEnd: string;
}

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
 * date window because METRC silently returns empty (or partial) lists
 * otherwise.
 */
export interface MetrcClient {
  /** API: GET /transfers/v2/incoming (LastModified-quirk) */
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

  /** API: GET /packages/v2/active (LastModified-quirk) */
  getActivePackages(): Promise<MetrcActivePackage[]>;

  /** API: GET /packages/v2/inactive (LastModified-quirk) */
  getInactivePackages(): Promise<MetrcActivePackage[]>;

  /** API: GET /packages/v2/onhold (LastModified-quirk) */
  getOnHoldPackages(): Promise<MetrcActivePackage[]>;

  /** API: GET /packages/v2/types */
  getPackageTypes(): Promise<string[]>;

  /** API: GET /packages/v2/adjust/reasons */
  getPackageAdjustReasons(): Promise<MetrcPackageAdjustReason[]>;

  /** API: GET /packages/v2/{id} */
  getPackageById(id: number): Promise<MetrcActivePackage>;

  /** API: GET /packages/v2/{label} */
  getPackageByLabel(label: string): Promise<MetrcActivePackage>;

  /** API: GET /items/v2/active (LastModified-quirk) */
  getActiveItems(): Promise<MetrcItem[]>;

  /** API: GET /items/v2/categories */
  getItemCategories(): Promise<MetrcItemCategory[]>;

  /** API: GET /sales/v2/receipts/active */
  getActiveSalesReceipts(window: SalesReceiptsWindow): Promise<MetrcSalesReceipt[]>;

  /** API: GET /sales/v2/receipts/{id} */
  getSalesReceiptById(id: number): Promise<MetrcSalesReceiptDetail>;

  /** API: GET /sales/v2/customertypes */
  getSalesCustomerTypes(): Promise<string[]>;
}
