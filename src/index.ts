// src/index.ts
export {
  metrcTransferSchema, metrcPackageSchema, metrcDeliverySchema,
  deliveryWithPackagesSchema, metrcLocationSchema, metrcActivePackageSchema,
  metrcItemSchema, metrcSalesReceiptSchema, metrcSalesReceiptDetailSchema,
  metrcSalesTransactionSchema,
} from "./schemas/index.js";

export type {
  MetrcTransfer, MetrcPackage, MetrcDelivery, DeliveryWithPackages,
  MetrcLocation, MetrcActivePackage,
  MetrcItem, MetrcSalesReceipt, MetrcSalesReceiptDetail, MetrcSalesTransaction,
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
