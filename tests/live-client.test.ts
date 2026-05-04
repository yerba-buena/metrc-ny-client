import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLiveMetrcClient } from "../src/client/live.js";
import { NOOP_LOGGER } from "../src/logger.js";
import { MetrcResponseError } from "../src/errors.js";

const fakeTransfer = (id: number, deliveryId: number) => ({
  Id: id, ManifestNumber: `M-${id}`, ShipmentLicenseType: "AU",
  ShipperFacilityLicenseNumber: "OBCM-1", ShipperFacilityName: "Acme",
  TransporterFacilityLicenseNumber: null, TransporterFacilityName: null,
  DriverName: null, DriverOccupationalLicenseNumber: null, DriverVehicleLicenseNumber: null,
  VehicleMake: null, VehicleModel: null, VehicleLicensePlateNumber: null,
  DeliveryCount: 1, ReceivedDeliveryCount: 0, PackageCount: 1, ReceivedPackageCount: 0,
  ContainsPlantPackage: false, ContainsProductPackage: true, ContainsTradeSample: false,
  ContainsDonation: false, ContainsTestingSample: false,
  ContainsProductRequiresRemediation: false, ContainsRemediatedProductPackage: false,
  CreatedDateTime: "2026-04-28T10:00:00Z", CreatedByUserName: null,
  LastModified: "2026-04-28T10:00:00Z",
  DeliveryId: deliveryId, RecipientFacilityLicenseNumber: "OCM-RET-1",
  RecipientFacilityName: "YB", ShipmentTypeName: "Wholesale",
  ShipmentTransactionType: "Standard",
  EstimatedDepartureDateTime: "2026-04-28T08:00:00Z", ActualDepartureDateTime: null,
  EstimatedArrivalDateTime: "2026-04-28T14:00:00Z", ActualArrivalDateTime: null,
  DeliveryPackageCount: 1, DeliveryReceivedPackageCount: 0,
  ReceivedDateTime: null, EstimatedReturnDepartureDateTime: null,
  ActualReturnDepartureDateTime: null, EstimatedReturnArrivalDateTime: null,
  ActualReturnArrivalDateTime: null,
});

const fakePackage = (id: number) => ({
  PackageId: id, PackageLabel: `LBL-${id}`, PackageType: "Product",
  SourceHarvestNames: null, SourcePackageLabels: null,
  ItemId: 1, ItemName: "Item", ItemCategoryName: "Flower",
  ItemStrainName: null, ItemUnitOfMeasureName: "Each",
  ItemUnitOfMeasureAbbreviation: "ea", LabTestingState: "TestPassed",
  ProductionBatchNumber: null, IsTradeSample: false, IsDonation: false,
  SourcePackageIsTradeSample: false, SourcePackageIsDonation: false,
  ProductRequiresRemediation: false, ContainsRemediatedProduct: false,
  RemediationDate: null, ShipmentPackageState: "Shipped",
  ShippedQuantity: 10, ShippedUnitOfMeasureName: "Each",
  ShippedUnitOfMeasureAbbreviation: "ea",
  GrossUnitOfWeightName: null, GrossUnitOfWeightAbbreviation: null,
  ReceivedQuantity: null, ReceivedDateTime: null,
});

const okEnvelope = (data: unknown[]) => ({
  ok: true, status: 200,
  headers: new Headers(),
  json: async () => ({
    Data: data, Total: data.length, TotalRecords: data.length,
    PageSize: 20, RecordsOnPage: data.length, Page: 1, CurrentPage: 1, TotalPages: 1,
  }),
  text: async () => "",
});

const baseConfig = {
  vendorApiKey: "vk", userApiKey: "uk", licenseNumber: "LIC-1",
  baseUrl: "https://example.test", logger: NOOP_LOGGER, rateLimitMs: 0,
  retry: { maxRetries: 1, initialDelayMs: 1, maxDelayMs: 1, backoffMultiplier: 1 },
};

describe("createLiveMetrcClient", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("getIncomingTransfers calls /transfers/v2/incoming and returns Data", async () => {
    let capturedUrl = "";
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return okEnvelope([fakeTransfer(1, 100), fakeTransfer(2, 200)]) as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getIncomingTransfers();
    expect(capturedUrl).toContain("/transfers/v2/incoming");
    expect(result.length).toBe(2);
    expect(result[0]!.Id).toBe(1);
  });

  it("getPackagesForDelivery calls /transfers/v2/deliveries/:id/packages", async () => {
    let capturedUrl = "";
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return okEnvelope([fakePackage(9001)]) as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getPackagesForDelivery(100);
    expect(capturedUrl).toContain("/transfers/v2/deliveries/100/packages");
    expect(result.length).toBe(1);
    expect(result[0]!.PackageId).toBe(9001);
  });

  it("getDeliveriesWithPackages combines transfers with their packages", async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("/transfers/v2/incoming")) {
        return okEnvelope([fakeTransfer(1, 100), fakeTransfer(2, 200)]) as unknown as Response;
      }
      if (url.includes("/deliveries/100/packages")) {
        return okEnvelope([fakePackage(9001), fakePackage(9002)]) as unknown as Response;
      }
      if (url.includes("/deliveries/200/packages")) {
        return okEnvelope([fakePackage(9003)]) as unknown as Response;
      }
      throw new Error(`unexpected url: ${url}`);
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getDeliveriesWithPackages();
    expect(result.length).toBe(2);
    expect(result[0]!.transfer.Id).toBe(1);
    expect(result[0]!.packages.length).toBe(2);
    expect(result[1]!.transfer.Id).toBe(2);
    expect(result[1]!.packages.length).toBe(1);
  });

  it("getDeliveriesWithPackages propagates per-delivery errors (no swallowing)", async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("/transfers/v2/incoming")) {
        return okEnvelope([fakeTransfer(1, 100), fakeTransfer(2, 200)]) as unknown as Response;
      }
      if (url.includes("/deliveries/100/packages")) {
        return okEnvelope([fakePackage(9001)]) as unknown as Response;
      }
      // 200 fails non-retryably
      return { ok: false, status: 404, headers: new Headers(),
        json: async () => ({}), text: async () => "not found" } as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const p = client.getDeliveriesWithPackages();
    await expect(p).rejects.toThrow();
  });

  it("validateResponses=true rejects malformed transfers via Zod", async () => {
    const fetch = vi.fn(async () => okEnvelope([{ not: "a transfer" }]) as unknown as Response);
    const client = createLiveMetrcClient({ ...baseConfig, fetch, validateResponses: true });
    await expect(client.getIncomingTransfers()).rejects.toBeInstanceOf(MetrcResponseError);
  });

  it("validateResponses=false (default) accepts malformed transfers without parsing", async () => {
    const fetch = vi.fn(async () => okEnvelope([{ not: "a transfer" }]) as unknown as Response);
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getIncomingTransfers();
    expect(result.length).toBe(1);
  });
});
