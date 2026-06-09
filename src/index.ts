// src/index.ts
export {
  metrcTransferSchema, metrcOutgoingTransferSchema, metrcPackageSchema, metrcDeliverySchema,
  deliveryWithPackagesSchema, metrcLocationSchema, metrcActivePackageSchema,
  metrcPackageAdjustReasonSchema,
  metrcItemSchema, metrcSalesReceiptSchema, metrcSalesReceiptDetailSchema,
  metrcSalesTransactionSchema, metrcItemCategorySchema,
} from "./schemas/index.js";

export type {
  MetrcTransfer, MetrcOutgoingTransfer, MetrcPackage, MetrcDelivery, DeliveryWithPackages,
  MetrcLocation, MetrcActivePackage, MetrcPackageAdjustReason,
  MetrcItem, MetrcSalesReceipt, MetrcSalesReceiptDetail, MetrcSalesTransaction,
  MetrcItemCategory,
} from "./schemas/index.js";

export type { MetrcClient, MetrcConfig, SalesReceiptsWindow } from "./client/interface.js";
export type { Logger } from "./logger.js";
export { NOOP_LOGGER } from "./logger.js";
export type { RetryConfig } from "./transport/retry.js";

export { createLiveMetrcClient } from "./client/live.js";
export { createMockMetrcClient, DEFAULT_MOCK_FIXTURES } from "./client/mock.js";
export type { MockFixtures } from "./client/mock.js";

export { NY_PROD_BASE_URL, NY_SANDBOX_BASE_URL } from "./constants.js";

export {
  MetrcError, MetrcAuthError, MetrcClientError, MetrcRateLimitError,
  MetrcServerError, MetrcNetworkError, MetrcResponseError,
} from "./errors.js";

export {
  CLIENT_COVERAGE,
} from "./coverage.js";
export type {
  CoverageStatus, ResourceCoverage, EndpointCoverage, HelperCoverage,
} from "./coverage.js";

export { groupByLocation } from "./helpers/group-by-location.js";
export type { LocationGrouping } from "./helpers/group-by-location.js";
export { siteSnapshot } from "./helpers/site-snapshot.js";
export type { SiteSnapshot } from "./helpers/site-snapshot.js";
