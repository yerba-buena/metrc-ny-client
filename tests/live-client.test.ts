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

  it("defaults to NOOP_LOGGER when no logger is provided", async () => {
    const fetch = vi.fn(async () => okEnvelope([]) as unknown as Response);
    const { logger: _omit, ...cfgWithoutLogger } = baseConfig;
    void _omit;
    const client = createLiveMetrcClient({ ...cfgWithoutLogger, fetch });
    const result = await client.getIncomingTransfers();
    expect(result).toEqual([]);
  });

  it("getActiveLocations calls /locations/v2/active and returns Data", async () => {
    let capturedUrl = "";
    const fakeLocation = {
      Id: 1, Name: "Fulfillment", LocationTypeId: 1, LocationTypeName: "Default",
      ForPlantBatches: false, ForPlants: false, ForHarvests: false, ForPackages: true,
    };
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return okEnvelope([fakeLocation]) as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getActiveLocations();
    expect(capturedUrl).toContain("/locations/v2/active");
    expect(result.length).toBe(1);
    expect(result[0]!.Id).toBe(1);
    expect(result[0]!.Name).toBe("Fulfillment");
  });

  it("getActivePackages calls /packages/v2/active and returns Data", async () => {
    let capturedUrl = "";
    const fakeActivePkg = {
      Id: 5001, Label: "LBL-5001", ExternalId: null, PackageType: "Product",
      SourceHarvestCount: 0, SourcePackageCount: 0, SourceProcessingJobCount: 0,
      SourceHarvestNames: null, SourcePackageLabels: null,
      LocationId: 1, LocationName: "Fulfillment", SublocationId: null,
      SublocationName: null, LocationTypeName: "Default",
      Quantity: 25, OriginalPackageQuantity: 25, UnitOfMeasureName: "Each",
      UnitOfMeasureAbbreviation: "ea", PatientLicenseNumber: null,
      ItemFromFacilityLicenseNumber: null, ItemFromFacilityName: null,
      Note: null, PackagedDate: "2026-04-20", ExpirationDate: null,
      SellByDate: null, UseByDate: null,
      InitialLabTestingState: "NotSubmitted", LabTestingState: "NotSubmitted",
      LabTestingStateDate: "2026-04-20", LabTestingPerformedDate: null,
      LabTestResultExpirationDateTime: null, LabTestingRecordedDate: null,
      LabTestStageId: null, LabTestStage: null,
      IsProductionBatch: false, ProductionBatchNumber: null,
      SourceProductionBatchNumbers: null,
      IsTradeSample: false, IsTradeSamplePersistent: false,
      SourcePackageIsTradeSample: false,
      IsDonation: false, IsDonationPersistent: false,
      SourcePackageIsDonation: false,
      IsTestingSample: false, IsProcessValidationTestingSample: false,
      ProductRequiresRemediation: false, ContainsRemediatedProduct: false,
      RemediationDate: null, ProductRequiresDecontamination: false,
      ContainsDecontaminatedProduct: false, DecontaminationDate: null,
      ContainsPreTreatedProduct: false, PreTreatmentDate: null,
      ReceivedDateTime: null, ReceivedFromManifestNumber: null,
      ReceivedFromFacilityLicenseNumber: null, ReceivedFromFacilityName: null,
      IsOnHold: false, IsOnHoldCombined: false, IsOnInvestigation: false,
      IsOnInvestigationHold: false, IsOnInvestigationRecall: false,
      IsOnRecall: null, IsOnRecallCombined: false,
      ArchivedDate: null, IsFinished: false, FinishedDate: null,
      IsFinishedGood: false, IsOnRetailerDelivery: false,
      PackageForProductDestruction: null, LabelsLastGeneratedDateTime: null,
      LastModified: "2026-04-28T10:00:00Z",
      Item: {
        Id: 1, Name: "Item", GlobalProductName: null, GlobalProductNumber: null,
        ProductCategoryName: "Flower", ProductCategoryType: 0, QuantityType: 0,
        DefaultLabTestingState: 0, UnitOfMeasureName: null, ApprovalStatus: 0,
        ApprovalStatusDateTime: "0001-01-01T00:00:00+00:00",
        StrainId: null, StrainName: null, ItemBrandId: 0, ItemBrandName: null,
        AdministrationMethod: null, Description: null, IsUsed: false,
      },
      ProductLabel: {
        QrCount: 1, IsChildFromParentWithLabel: false,
        OriginalSourcePackageId: null, OriginalSourcePackageLabel: null,
        LabelSource: null, IsActive: true,
      },
    };
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return okEnvelope([fakeActivePkg]) as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getActivePackages();
    expect(capturedUrl).toContain("/packages/v2/active");
    expect(result.length).toBe(1);
    expect(result[0]!.Id).toBe(5001);
  });

  it("validateResponses=true rejects malformed locations via Zod", async () => {
    const fetch = vi.fn(async () => okEnvelope([{ not: "a location" }]) as unknown as Response);
    const client = createLiveMetrcClient({ ...baseConfig, fetch, validateResponses: true });
    await expect(client.getActiveLocations()).rejects.toBeInstanceOf(MetrcResponseError);
  });

  it("validateResponses=true rejects malformed active packages via Zod", async () => {
    const fetch = vi.fn(async () => okEnvelope([{ not: "an active package" }]) as unknown as Response);
    const client = createLiveMetrcClient({ ...baseConfig, fetch, validateResponses: true });
    await expect(client.getActivePackages()).rejects.toBeInstanceOf(MetrcResponseError);
  });

  it("validateResponses=true wraps non-Error throws into MetrcResponseError", async () => {
    const fetch = vi.fn(async () => okEnvelope([{}]) as unknown as Response);
    // Stub schema parse to throw a non-Error so the `instanceof Error` branch is exercised.
    const { metrcTransferSchema } = await import("../src/schemas/index.js");
    const spy = vi.spyOn(metrcTransferSchema, "parse").mockImplementation(() => { throw "string-fail"; });
    try {
      const client = createLiveMetrcClient({ ...baseConfig, fetch, validateResponses: true });
      let caught: unknown;
      await client.getIncomingTransfers().catch((e) => { caught = e; });
      expect(caught).toBeInstanceOf(MetrcResponseError);
      expect((caught as MetrcResponseError).message).toBe("validation failed");
    } finally {
      spy.mockRestore();
    }
  });
});
