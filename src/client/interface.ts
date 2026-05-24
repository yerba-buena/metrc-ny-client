// src/client/interface.ts
import type {
  MetrcTransfer, MetrcPackage, DeliveryWithPackages,
  MetrcLocation, MetrcActivePackage,
  MetrcItem, MetrcSalesReceipt, MetrcSalesReceiptDetail,
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

export interface MetrcClient {
  getIncomingTransfers(): Promise<MetrcTransfer[]>;
  getPackagesForDelivery(deliveryId: number): Promise<MetrcPackage[]>;
  getDeliveriesWithPackages(): Promise<DeliveryWithPackages[]>;
  getActiveLocations(): Promise<MetrcLocation[]>;
  getActivePackages(): Promise<MetrcActivePackage[]>;
  getActiveItems(): Promise<MetrcItem[]>;
  getActiveSalesReceipts(window: SalesReceiptsWindow): Promise<MetrcSalesReceipt[]>;
  getSalesReceiptById(id: number): Promise<MetrcSalesReceiptDetail>;
}
