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
    expect(capturedUrl).toContain("lastModifiedStart=2015-01-01T00%3A00%3A00Z");
    expect(capturedUrl).toContain("lastModifiedEnd=");
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

  it("getActiveLocations sends a valid, current lastModifiedStart/End window", async () => {
    // METRC's /locations/v2/active returns an empty list (HTTP 200, no error)
    // unless BOTH lastModifiedStart and lastModifiedEnd query params are sent.
    vi.setSystemTime(new Date("2026-05-22T12:00:00Z"));
    let capturedUrl = "";
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return okEnvelope([]) as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    await client.getActiveLocations();

    expect(capturedUrl).toContain("/locations/v2/active");
    const params = new URL(capturedUrl).searchParams;
    const start = params.get("lastModifiedStart");
    const end = params.get("lastModifiedEnd");

    // Both params present with non-empty, real ISO-8601 date values.
    expect(start).toBeTruthy();
    expect(end).toBeTruthy();
    expect(Number.isNaN(Date.parse(start!))).toBe(false);
    expect(Number.isNaN(Date.parse(end!))).toBe(false);
    // Window is ordered, and the end tracks "now" (not a stale hardcoded value).
    expect(Date.parse(start!)).toBeLessThan(Date.parse(end!));
    expect(end).toContain("2026-05-22");
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
    expect(capturedUrl).toContain("lastModifiedStart=2015-01-01T00%3A00%3A00Z");
    expect(capturedUrl).toContain("lastModifiedEnd=");
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

  it("getInactivePackages calls /packages/v2/inactive with wide LastModified window", async () => {
    let capturedUrl = "";
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return okEnvelope([]) as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    await client.getInactivePackages();
    expect(capturedUrl).toContain("/packages/v2/inactive");
    expect(capturedUrl).toContain("lastModifiedStart=2015-01-01T00%3A00%3A00Z");
    expect(capturedUrl).toContain("lastModifiedEnd=");
  });

  it("getOnHoldPackages calls /packages/v2/onhold with wide LastModified window", async () => {
    let capturedUrl = "";
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return okEnvelope([]) as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    await client.getOnHoldPackages();
    expect(capturedUrl).toContain("/packages/v2/onhold");
    expect(capturedUrl).toContain("lastModifiedStart=2015-01-01T00%3A00%3A00Z");
    expect(capturedUrl).toContain("lastModifiedEnd=");
  });

  it("validateResponses=true rejects malformed inactive packages via Zod", async () => {
    const fetch = vi.fn(async () => okEnvelope([{ not: "a package" }]) as unknown as Response);
    const client = createLiveMetrcClient({ ...baseConfig, fetch, validateResponses: true });
    await expect(client.getInactivePackages()).rejects.toBeInstanceOf(MetrcResponseError);
  });

  it("validateResponses=true rejects malformed on-hold packages via Zod", async () => {
    const fetch = vi.fn(async () => okEnvelope([{ not: "a package" }]) as unknown as Response);
    const client = createLiveMetrcClient({ ...baseConfig, fetch, validateResponses: true });
    await expect(client.getOnHoldPackages()).rejects.toBeInstanceOf(MetrcResponseError);
  });

  it("getItemCategories calls /items/v2/categories and returns Data", async () => {
    let capturedUrl = "";
    const fakeCategory = {
      Name: "Bud/Flower - Each", ProductCategoryType: "Buds", QuantityType: "WeightBased",
      CanBeDecontaminated: false, CanBeDestroyed: true, CanBePreTreated: false,
      CanBeRemediated: false, CanContainSeeds: false,
      RequiresStrain: true, RequiresItemBrand: false,
    };
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return okEnvelope([fakeCategory]) as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getItemCategories();
    expect(capturedUrl).toContain("/items/v2/categories");
    expect(capturedUrl).toContain("licenseNumber=LIC-1");
    expect(result.length).toBe(1);
    expect(result[0]!.Name).toBe("Bud/Flower - Each");
  });

  it("validateResponses=true rejects malformed item categories via Zod", async () => {
    const fetch = vi.fn(async () => okEnvelope([{ not: "a category" }]) as unknown as Response);
    const client = createLiveMetrcClient({ ...baseConfig, fetch, validateResponses: true });
    await expect(client.getItemCategories()).rejects.toBeInstanceOf(MetrcResponseError);
  });

  const fakeItem = (id: number) => ({
    Id: id, Name: `Item ${id}`,
    ProductCategoryName: "Flower", ProductCategoryType: "Buds",
    QuantityType: "CountBased", UnitOfMeasureName: "Each",
    StrainId: null, StrainName: null, ItemBrandId: 0, ItemBrandName: null,
    ApprovalStatus: "Approved", ApprovalStatusDateTime: "2026-01-01T00:00:00+00:00",
    IsUsed: true,
  });

  const fakeReceipt = (id: number) => ({
    Id: id, ReceiptNumber: `R-${id}`, ExternalReceiptNumber: null,
    SalesDateTime: "2026-05-01T12:00:00", SalesCustomerType: "Consumer",
    PatientLicenseNumber: "", CaregiverLicenseNumber: "", IdentificationMethod: "",
    PatientRegistrationLocationId: null, TotalPackages: 1, TotalPrice: 60,
    Transactions: [], IsFinal: false, ArchivedDate: null,
    RecordedDateTime: "2026-05-01T12:00:00+00:00",
    RecordedByUserName: "u", LastModified: "2026-05-01T12:00:00+00:00",
  });

  it("getActiveItems calls /items/v2/active with a LastModified window", async () => {
    vi.setSystemTime(new Date("2026-05-22T12:00:00Z"));
    let capturedUrl = "";
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return okEnvelope([fakeItem(1), fakeItem(2)]) as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getActiveItems();
    expect(capturedUrl).toContain("/items/v2/active");
    const params = new URL(capturedUrl).searchParams;
    expect(params.get("lastModifiedStart")).toBeTruthy();
    expect(params.get("lastModifiedEnd")).toContain("2026-05-22");
    expect(result.length).toBe(2);
    expect(result[0]!.Id).toBe(1);
  });

  it("validateResponses=true rejects malformed items via Zod", async () => {
    const fetch = vi.fn(async () => okEnvelope([{ not: "an item" }]) as unknown as Response);
    const client = createLiveMetrcClient({ ...baseConfig, fetch, validateResponses: true });
    await expect(client.getActiveItems()).rejects.toBeInstanceOf(MetrcResponseError);
  });

  it("getActiveSalesReceipts passes through the LastModified window verbatim", async () => {
    let capturedUrl = "";
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return okEnvelope([fakeReceipt(7001)]) as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getActiveSalesReceipts({
      lastModifiedStart: "2026-04-01T00:00:00Z",
      lastModifiedEnd: "2026-05-01T00:00:00Z",
    });
    expect(capturedUrl).toContain("/sales/v2/receipts/active");
    const params = new URL(capturedUrl).searchParams;
    expect(params.get("lastModifiedStart")).toBe("2026-04-01T00:00:00Z");
    expect(params.get("lastModifiedEnd")).toBe("2026-05-01T00:00:00Z");
    expect(result.length).toBe(1);
    expect(result[0]!.Id).toBe(7001);
  });

  it("getActiveSalesReceipts throws when window fields are missing or non-string", async () => {
    const fetch = vi.fn();
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    await expect(
      client.getActiveSalesReceipts(undefined as never),
    ).rejects.toBeInstanceOf(TypeError);
    await expect(
      client.getActiveSalesReceipts({ lastModifiedStart: "", lastModifiedEnd: "2026-05-01T00:00:00Z" } as never),
    ).rejects.toBeInstanceOf(TypeError);
    await expect(
      client.getActiveSalesReceipts({ lastModifiedStart: "2026-04-01T00:00:00Z" } as never),
    ).rejects.toBeInstanceOf(TypeError);
    await expect(
      client.getActiveSalesReceipts({ lastModifiedStart: 123, lastModifiedEnd: 456 } as never),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("getActiveSalesReceipts concatenates across multiple pages in order", async () => {
    const pageEnvelope = (items: ReturnType<typeof fakeReceipt>[], page: number, total: number) => ({
      ok: true, status: 200, headers: new Headers(),
      json: async () => ({
        Data: items, Total: total, TotalRecords: total,
        PageSize: items.length, RecordsOnPage: items.length,
        Page: page, CurrentPage: page, TotalPages: 3,
      }),
      text: async () => "",
    });
    const calls: number[] = [];
    const fetch = vi.fn(async (url: string) => {
      const page = parseInt(new URL(url).searchParams.get("pageNumber") || "1", 10);
      calls.push(page);
      if (page === 1) return pageEnvelope([fakeReceipt(1)], 1, 3) as unknown as Response;
      if (page === 2) return pageEnvelope([fakeReceipt(2)], 2, 3) as unknown as Response;
      return pageEnvelope([fakeReceipt(3)], 3, 3) as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getActiveSalesReceipts({
      lastModifiedStart: "2026-04-01T00:00:00Z",
      lastModifiedEnd: "2026-05-01T00:00:00Z",
    });
    expect(calls).toEqual([1, 2, 3]);
    expect(result.map((r) => r.Id)).toEqual([1, 2, 3]);
  });

  it("getSalesReceiptById calls /sales/v2/receipts/:id and returns a single object (not paginated)", async () => {
    let capturedUrl = "";
    const detail = { ...fakeReceipt(12345), Transactions: [
      { PackageId: 1, PackageLabel: "L-1", ProductName: "P", ProductCategoryName: "Flower",
        ItemStrainName: null, QuantitySold: 1, UnitOfMeasureName: "Each",
        UnitOfMeasureAbbreviation: "ea", TotalPrice: 10, InvoiceNumber: "INV-1",
        RecordedDateTime: "2026-05-01T12:00:00+00:00", RecordedByUserName: null,
        LastModified: "2026-05-01T12:00:00+00:00" },
    ] };
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return { ok: true, status: 200, headers: new Headers(),
        json: async () => detail, text: async () => "" } as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch, validateResponses: true });
    const result = await client.getSalesReceiptById(12345);
    expect(capturedUrl).toContain("/sales/v2/receipts/12345");
    // Single GET, never paginated.
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.Id).toBe(12345);
    expect(result.Transactions.length).toBe(1);
    expect(result.Transactions[0]!.PackageLabel).toBe("L-1");
  });

  it("getSalesReceiptById with validateResponses=true rejects malformed detail via Zod", async () => {
    const fetch = vi.fn(async () => ({
      ok: true, status: 200, headers: new Headers(),
      json: async () => ({ not: "a receipt" }), text: async () => "",
    } as unknown as Response));
    const client = createLiveMetrcClient({ ...baseConfig, fetch, validateResponses: true });
    await expect(client.getSalesReceiptById(1)).rejects.toBeInstanceOf(MetrcResponseError);
  });

  it("getSalesReceiptById propagates non-retryable HTTP errors (e.g. 404)", async () => {
    const fetch = vi.fn(async () => ({
      ok: false, status: 404, headers: new Headers(),
      json: async () => ({}), text: async () => "not found",
    } as unknown as Response));
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    await expect(client.getSalesReceiptById(999)).rejects.toThrow();
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

  const bareArray = (data: unknown[]) =>
    ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => data,
      text: async () => "",
    }) as unknown as Response;

  it("getPackageTypes calls /packages/v2/types and returns the bare string array", async () => {
    let capturedUrl = "";
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return bareArray(["Product", "ImmaturePlant"]);
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getPackageTypes();
    expect(capturedUrl).toContain("/packages/v2/types");
    expect(result).toEqual(["Product", "ImmaturePlant"]);
  });

  it("validateResponses=true rejects non-string package types via Zod", async () => {
    const fetch = vi.fn(async () => bareArray([42, "Product"]) as unknown as Response);
    const client = createLiveMetrcClient({ ...baseConfig, fetch, validateResponses: true });
    await expect(client.getPackageTypes()).rejects.toBeInstanceOf(MetrcResponseError);
  });

  it("validateResponses=false (default) accepts non-string package types without parsing", async () => {
    const fetch = vi.fn(async () => bareArray([42, "Product"]) as unknown as Response);
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getPackageTypes();
    expect(result.length).toBe(2);
  });

  it("getPackageAdjustReasons calls /packages/v2/adjust/reasons and returns Data", async () => {
    let capturedUrl = "";
    const fakeReason = {
      Name: "Spoilage",
      RequiresNote: false,
      RequiresWasteWeight: false,
      RequiresImmatureWasteWeight: false,
      RequiresMatureWasteWeight: false,
    };
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return okEnvelope([fakeReason]) as unknown as Response;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getPackageAdjustReasons();
    expect(capturedUrl).toContain("/packages/v2/adjust/reasons");
    expect(result.length).toBe(1);
    expect(result[0]!.Name).toBe("Spoilage");
  });

  it("validateResponses=true rejects malformed adjust reasons via Zod", async () => {
    const fetch = vi.fn(async () => okEnvelope([{ not: "a reason" }]) as unknown as Response);
    const client = createLiveMetrcClient({ ...baseConfig, fetch, validateResponses: true });
    await expect(client.getPackageAdjustReasons()).rejects.toBeInstanceOf(MetrcResponseError);
  });

  it("getPackageById calls /packages/v2/{id} and returns the single object", async () => {
    let capturedUrl = "";
    const mockClient = await import("../src/client/mock.js").then(m => m.createMockMetrcClient());
    const fakePkg = (await mockClient.getActivePackages())[0]!;
    const singleObjectResponse = {
      ok: true, status: 200, headers: new Headers(),
      json: async () => fakePkg, text: async () => "",
    } as unknown as Response;
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return singleObjectResponse;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getPackageById(fakePkg.Id);
    expect(capturedUrl).toContain(`/packages/v2/${fakePkg.Id}`);
    expect(result.Id).toBe(fakePkg.Id);
  });

  it("getPackageByLabel calls /packages/v2/{label} and returns the single object", async () => {
    let capturedUrl = "";
    const mockClient = await import("../src/client/mock.js").then(m => m.createMockMetrcClient());
    const fakePkg = (await mockClient.getActivePackages())[0]!;
    const singleObjectResponse = {
      ok: true, status: 200, headers: new Headers(),
      json: async () => fakePkg, text: async () => "",
    } as unknown as Response;
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return singleObjectResponse;
    });
    const client = createLiveMetrcClient({ ...baseConfig, fetch });
    const result = await client.getPackageByLabel(fakePkg.Label);
    expect(capturedUrl).toContain(`/packages/v2/${fakePkg.Label}`);
    expect(result.Label).toBe(fakePkg.Label);
  });

  it("validateResponses=true rejects a malformed package detail via Zod", async () => {
    const fetch = vi.fn(async () => ({
      ok: true, status: 200, headers: new Headers(),
      json: async () => ({ not: "a package" }), text: async () => "",
    } as unknown as Response));
    const client = createLiveMetrcClient({ ...baseConfig, fetch, validateResponses: true });
    await expect(client.getPackageById(1)).rejects.toBeInstanceOf(MetrcResponseError);
  });
});
