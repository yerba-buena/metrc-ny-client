import type { MetrcClient, MetrcConfig } from "./interface.js";
import { createRequester } from "../transport/request.js";
import { fetchAllPages, type PaginatedResponse } from "../transport/pagination.js";
import { metrcTransferSchema, metrcPackageSchema } from "../schemas/index.js";
import type { MetrcTransfer, MetrcPackage, DeliveryWithPackages } from "../schemas/index.js";
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

  function paged<T>(endpoint: string) {
    return async function fetchPage(pageNumber: number) {
      return request<PaginatedResponse<T>>(endpoint, {
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

  return {
    async getIncomingTransfers(): Promise<MetrcTransfer[]> {
      const endpoint = "/transfers/v2/incoming";
      const data = await fetchAllPages<MetrcTransfer>(paged<MetrcTransfer>(endpoint), endpoint);
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
  };
}
