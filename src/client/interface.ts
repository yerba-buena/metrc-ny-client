// src/client/interface.ts
import type { MetrcTransfer, MetrcPackage, DeliveryWithPackages } from "../schemas/index.js";
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

export interface MetrcClient {
  getIncomingTransfers(): Promise<MetrcTransfer[]>;
  getPackagesForDelivery(deliveryId: number): Promise<MetrcPackage[]>;
  getDeliveriesWithPackages(): Promise<DeliveryWithPackages[]>;
}
