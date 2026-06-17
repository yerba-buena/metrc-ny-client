// src/client/interface.ts
import type {
  MetrcTransfer, MetrcOutgoingTransfer, MetrcTransferType, MetrcPackage, DeliveryWithPackages,
  MetrcLocation, MetrcActivePackage, MetrcPackageAdjustReason, MetrcPackageAdjustment, MetrcTransferredPackage, MetrcPackageSourceHarvest,
  MetrcItem, MetrcSalesReceipt, MetrcSalesReceiptDetail,
  MetrcItemCategory, MetrcStrain, MetrcSublocation, MetrcLocationType,
  MetrcSalesPatientRegistrationLocation, MetrcSalesDeliveryReturnReason,
  MetrcSalesCounty, MetrcSalesPaymentType, MetrcSalesDelivery, MetrcSalesRetailerDelivery,
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

  /** API: GET /transfers/v2/outgoing (LastModified-quirk) */
  getOutgoingTransfers(): Promise<MetrcOutgoingTransfer[]>;

  /** API: GET /transfers/v2/rejected (LastModified-quirk) */
  getRejectedTransfers(): Promise<MetrcOutgoingTransfer[]>;

  /** API: GET /transfers/v2/types */
  getTransferTypes(): Promise<MetrcTransferType[]>;

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

  /** API: GET /packages/v2/adjustments (LastModified-quirk) */
  getPackageAdjustments(): Promise<MetrcPackageAdjustment[]>;

  /** API: GET /packages/v2/transferred (LastModified-quirk) */
  getTransferredPackages(): Promise<MetrcTransferredPackage[]>;

  /** API: GET /packages/v2/intransit (LastModified-quirk) */
  getInTransitPackages(): Promise<MetrcActivePackage[]>;

  /** API: GET /packages/v2/labsamples (LastModified-quirk) */
  getLabSamplePackages(): Promise<MetrcActivePackage[]>;

  /** API: GET /packages/v2/{id}/source/harvests */
  getPackageSourceHarvests(id: number): Promise<MetrcPackageSourceHarvest[]>;

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

  /** API: GET /sales/v2/patientregistration/locations */
  getSalesPatientRegistrationLocations(): Promise<MetrcSalesPatientRegistrationLocation[]>;

  /**
   * API: GET /sales/v2/deliveries/returnreasons
   *
   * Returns the list of valid reasons for returning a sales delivery.
   * Paginated endpoint; no date window required.
   */
  getSalesDeliveryReturnReasons(): Promise<MetrcSalesDeliveryReturnReason[]>;

  /**
   * API: GET /sales/v2/counties
   *
   * NOTE: Returns HTTP 401 on the current license. URL pattern implemented;
   * live shape unverified. Schema is permissive pending license access.
   */
  getSalesCounties(): Promise<MetrcSalesCounty[]>;

  /**
   * API: GET /sales/v2/paymenttypes
   *
   * NOTE: Returns HTTP 401 on the current license. URL pattern implemented;
   * live shape unverified. Schema is permissive pending license access.
   */
  getSalesPaymentTypes(): Promise<MetrcSalesPaymentType[]>;

  /**
   * API: GET /sales/v2/deliveries/active
   *
   * Phase 7 audit: 0 rows on this license (INCONCLUSIVE quirk verdict).
   * Wide window applied defensively. Schema is permissive pending live row observation.
   */
  getActiveSalesDeliveries(window: SalesReceiptsWindow): Promise<MetrcSalesDelivery[]>;

  /**
   * API: GET /sales/v2/deliveries/inactive
   *
   * Phase 7 audit: 0 rows on this license. Wide window applied defensively.
   */
  getInactiveSalesDeliveries(window: SalesReceiptsWindow): Promise<MetrcSalesDelivery[]>;

  /**
   * API: GET /sales/v2/deliveries/retailer/active
   *
   * Phase 7 audit: 0 rows on this license. Wide window applied defensively.
   * Retailer deliveries may have additional fields vs standard sales deliveries.
   */
  getActiveRetailerSalesDeliveries(window: SalesReceiptsWindow): Promise<MetrcSalesRetailerDelivery[]>;

  /**
   * API: GET /sales/v2/deliveries/retailer/inactive
   *
   * Phase 7 audit: 0 rows on this license. Wide window applied defensively.
   */
  getInactiveRetailerSalesDeliveries(window: SalesReceiptsWindow): Promise<MetrcSalesRetailerDelivery[]>;

  /**
   * API: GET /sales/v2/receipts/inactive
   *
   * Phase 7 audit: QUIRKED (bare 181 vs windowed 9822). Window REQUIRED;
   * mirrors getActiveSalesReceipts exactly with boundary guard.
   */
  getInactiveSalesReceipts(window: SalesReceiptsWindow): Promise<MetrcSalesReceipt[]>;

  /**
   * API: GET /sales/v2/receipts/external/{externalNumber}
   *
   * Single-object lookup by the external receipt number. The externalNumber
   * is URL-encoded into the path. Returns the same shape as getSalesReceiptById.
   */
  getSalesReceiptByExternalNumber(externalNumber: string): Promise<MetrcSalesReceiptDetail>;

  /**
   * API: GET /sales/v2/deliveries/{id}
   *
   * NOTE: Returns HTTP 401 on the current license. URL pattern implemented;
   * live shape unverified. Schema is permissive pending license access.
   */
  getSalesDeliveryById(id: number): Promise<MetrcSalesDelivery>;

  /**
   * API: GET /sales/v2/deliveries/retailer/{id}
   *
   * NOTE: Returns HTTP 401 on the current license. URL pattern implemented;
   * live shape unverified. Schema is permissive pending license access.
   */
  getRetailerSalesDeliveryById(id: number): Promise<MetrcSalesRetailerDelivery>;

  /** API: GET /strains/v2/active (LastModified-quirk) */
  getActiveStrains(): Promise<MetrcStrain[]>;

  /** API: GET /strains/v2/inactive (LastModified-quirk) */
  getInactiveStrains(): Promise<MetrcStrain[]>;

  /** API: GET /strains/v2/{id} */
  getStrainById(id: number): Promise<MetrcStrain>;

  /** API: GET /sublocations/v2/active (LastModified-quirk) */
  getActiveSublocations(): Promise<MetrcSublocation[]>;

  /** API: GET /sublocations/v2/inactive (LastModified-quirk) */
  getInactiveSublocations(): Promise<MetrcSublocation[]>;

  /** API: GET /sublocations/v2/{id} */
  getSublocationById(id: number): Promise<MetrcSublocation>;

  /** API: GET /locations/v2/types */
  getLocationTypes(): Promise<MetrcLocationType[]>;

  /** API: GET /locations/v2/inactive (LastModified-quirk) */
  getInactiveLocations(): Promise<MetrcLocation[]>;

  /** API: GET /locations/v2/{id} */
  getLocationById(id: number): Promise<MetrcLocation>;
}
