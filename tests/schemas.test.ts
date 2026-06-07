import { describe, it, expect } from "vitest";
import {
  metrcTransferSchema, metrcPackageSchema, metrcDeliverySchema,
  metrcLocationSchema, metrcActivePackageSchema, metrcPackageAdjustReasonSchema,
  metrcItemSchema, metrcSalesReceiptSchema, metrcSalesReceiptDetailSchema,
  metrcSalesTransactionSchema, metrcItemCategorySchema,
} from "../src/schemas/index.js";

const sampleTransfer = {
  Id: 1, ManifestNumber: "M-1", ShipmentLicenseType: "Adult Use",
  ShipperFacilityLicenseNumber: "OBCM-123", ShipperFacilityName: "Acme Farms",
  TransporterFacilityLicenseNumber: null, TransporterFacilityName: null,
  DriverName: null, DriverOccupationalLicenseNumber: null, DriverVehicleLicenseNumber: null,
  VehicleMake: null, VehicleModel: null, VehicleLicensePlateNumber: null,
  DeliveryCount: 1, ReceivedDeliveryCount: 0, PackageCount: 5, ReceivedPackageCount: 0,
  ContainsPlantPackage: false, ContainsProductPackage: true, ContainsTradeSample: false,
  ContainsDonation: false, ContainsTestingSample: false,
  ContainsProductRequiresRemediation: false, ContainsRemediatedProductPackage: false,
  CreatedDateTime: "2026-04-28T10:00:00Z", CreatedByUserName: null,
  LastModified: "2026-04-28T10:00:00Z",
  DeliveryId: 100, RecipientFacilityLicenseNumber: "OCM-RET-1",
  RecipientFacilityName: "Yerba Buena", ShipmentTypeName: "Wholesale",
  ShipmentTransactionType: "Standard",
  EstimatedDepartureDateTime: "2026-04-28T08:00:00Z", ActualDepartureDateTime: null,
  EstimatedArrivalDateTime: "2026-04-28T14:00:00Z", ActualArrivalDateTime: null,
  DeliveryPackageCount: 5, DeliveryReceivedPackageCount: 0,
  ReceivedDateTime: null, EstimatedReturnDepartureDateTime: null,
  ActualReturnDepartureDateTime: null, EstimatedReturnArrivalDateTime: null,
  ActualReturnArrivalDateTime: null,
};

const samplePackage = {
  PackageId: 9001, PackageLabel: "1A4FF...", PackageType: "Product",
  SourceHarvestNames: null, SourcePackageLabels: null,
  ItemId: 1, ItemName: "Blue Dream 3.5g", ItemCategoryName: "Flower",
  ItemStrainName: "Blue Dream", ItemUnitOfMeasureName: "Grams",
  ItemUnitOfMeasureAbbreviation: "g", LabTestingState: "TestPassed",
  ProductionBatchNumber: null, IsTradeSample: false, IsDonation: false,
  SourcePackageIsTradeSample: false, SourcePackageIsDonation: false,
  ProductRequiresRemediation: false, ContainsRemediatedProduct: false,
  RemediationDate: null, ShipmentPackageState: "Shipped",
  ShippedQuantity: 50, ShippedUnitOfMeasureName: "Each",
  ShippedUnitOfMeasureAbbreviation: "ea",
  GrossUnitOfWeightName: null, GrossUnitOfWeightAbbreviation: null,
  ReceivedQuantity: null, ReceivedDateTime: null,
};

describe("metrcTransferSchema", () => {
  it("parses a well-formed transfer", () => {
    expect(() => metrcTransferSchema.parse(sampleTransfer)).not.toThrow();
  });
  it("rejects a transfer missing a required field", () => {
    const bad = { ...sampleTransfer, ManifestNumber: undefined };
    expect(() => metrcTransferSchema.parse(bad)).toThrow();
  });
  it("rejects a transfer with wrong type on a required field", () => {
    const bad = { ...sampleTransfer, Id: "not-a-number" };
    expect(() => metrcTransferSchema.parse(bad)).toThrow();
  });
  it("accepts null in nullable fields", () => {
    expect(() => metrcTransferSchema.parse({ ...sampleTransfer, DriverName: null })).not.toThrow();
  });
});

describe("metrcPackageSchema", () => {
  it("parses a well-formed package", () => {
    expect(() => metrcPackageSchema.parse(samplePackage)).not.toThrow();
  });
  it("rejects a package missing PackageLabel", () => {
    const bad: Record<string, unknown> = { ...samplePackage };
    delete bad.PackageLabel;
    expect(() => metrcPackageSchema.parse(bad)).toThrow();
  });
});

const sampleLocation = {
  Id: 1, Name: "Fulfillment", LocationTypeId: 1, LocationTypeName: "Default",
  ForPlantBatches: false, ForPlants: false, ForHarvests: false, ForPackages: true,
};

const sampleActivePackage = {
  Id: 5001, Label: "1A4FF0300000001000000101", ExternalId: null,
  PackageType: "Product", SourceHarvestCount: 1, SourcePackageCount: 0,
  SourceProcessingJobCount: 0, SourceHarvestNames: "Harvest 2026.04",
  SourcePackageLabels: null, LocationId: 1, LocationName: "Fulfillment",
  SublocationId: null, SublocationName: null, LocationTypeName: "Default",
  Quantity: 25, OriginalPackageQuantity: 25, UnitOfMeasureName: "Each",
  UnitOfMeasureAbbreviation: "ea", PatientLicenseNumber: null,
  ItemFromFacilityLicenseNumber: null, ItemFromFacilityName: null,
  Note: null, PackagedDate: "2026-04-20", ExpirationDate: null,
  SellByDate: null, UseByDate: null, InitialLabTestingState: "TestPassed",
  LabTestingState: "TestPassed", LabTestingStateDate: "2026-04-22",
  LabTestingPerformedDate: null, LabTestResultExpirationDateTime: null,
  LabTestingRecordedDate: null, LabTestStageId: null, LabTestStage: null,
  IsProductionBatch: false, ProductionBatchNumber: null,
  SourceProductionBatchNumbers: null, IsTradeSample: false,
  IsTradeSamplePersistent: false, SourcePackageIsTradeSample: false,
  IsDonation: false, IsDonationPersistent: false,
  SourcePackageIsDonation: false, IsTestingSample: false,
  IsProcessValidationTestingSample: false, ProductRequiresRemediation: false,
  ContainsRemediatedProduct: false, RemediationDate: null,
  ProductRequiresDecontamination: false, ContainsDecontaminatedProduct: false,
  DecontaminationDate: null, ContainsPreTreatedProduct: false,
  PreTreatmentDate: null, ReceivedDateTime: null,
  ReceivedFromManifestNumber: null, ReceivedFromFacilityLicenseNumber: null,
  ReceivedFromFacilityName: null, IsOnHold: false, IsOnHoldCombined: false,
  IsOnInvestigation: false, IsOnInvestigationHold: false,
  IsOnInvestigationRecall: false, IsOnRecall: null, IsOnRecallCombined: false,
  ArchivedDate: null, IsFinished: false, FinishedDate: null,
  IsFinishedGood: false, IsOnRetailerDelivery: false,
  PackageForProductDestruction: null, LabelsLastGeneratedDateTime: null,
  LastModified: "2026-04-28T10:00:00Z",
  Item: {
    Id: 1, Name: "Blue Dream 3.5g", GlobalProductName: null,
    GlobalProductNumber: null, ProductCategoryName: "Flower",
    ProductCategoryType: 0, QuantityType: 0, DefaultLabTestingState: 0,
    UnitOfMeasureName: null, ApprovalStatus: 0,
    ApprovalStatusDateTime: "0001-01-01T00:00:00+00:00",
    StrainId: 1, StrainName: "Blue Dream", ItemBrandId: 0,
    ItemBrandName: null, AdministrationMethod: null,
    Description: null, IsUsed: false,
  },
  ProductLabel: {
    QrCount: 1, IsChildFromParentWithLabel: false,
    OriginalSourcePackageId: null, OriginalSourcePackageLabel: null,
    LabelSource: null, IsActive: true,
  },
};

describe("metrcLocationSchema", () => {
  it("parses a well-formed location", () => {
    expect(() => metrcLocationSchema.parse(sampleLocation)).not.toThrow();
  });
  it("rejects a location missing a required field", () => {
    const bad: Record<string, unknown> = { ...sampleLocation };
    delete bad.Name;
    expect(() => metrcLocationSchema.parse(bad)).toThrow();
  });
  it("rejects a location with wrong type on Id", () => {
    const bad = { ...sampleLocation, Id: "not-a-number" };
    expect(() => metrcLocationSchema.parse(bad)).toThrow();
  });
  it("accepts null in nullable fields", () => {
    expect(() => metrcLocationSchema.parse({ ...sampleLocation, LocationTypeId: null, LocationTypeName: null })).not.toThrow();
  });
});

describe("metrcActivePackageSchema", () => {
  it("parses a well-formed active package", () => {
    expect(() => metrcActivePackageSchema.parse(sampleActivePackage)).not.toThrow();
  });
  it("rejects an active package missing Label", () => {
    const bad: Record<string, unknown> = { ...sampleActivePackage };
    delete bad.Label;
    expect(() => metrcActivePackageSchema.parse(bad)).toThrow();
  });
  it("rejects an active package with wrong type on Quantity", () => {
    const bad = { ...sampleActivePackage, Quantity: "not-a-number" };
    expect(() => metrcActivePackageSchema.parse(bad)).toThrow();
  });
  it("accepts null in nullable fields", () => {
    expect(() => metrcActivePackageSchema.parse({ ...sampleActivePackage, LocationId: null, LocationName: null })).not.toThrow();
  });
});

describe("metrcDeliverySchema", () => {
  it("parses a well-formed delivery", () => {
    const sample = {
      Id: 1, RecipientFacilityLicenseNumber: "OCM-RET-1",
      RecipientFacilityName: "Yerba Buena", ShipmentTypeName: "Wholesale",
      ShipmentTransactionType: "Standard",
      EstimatedDepartureDateTime: "2026-04-28T08:00:00Z", ActualDepartureDateTime: null,
      EstimatedArrivalDateTime: "2026-04-28T14:00:00Z", ActualArrivalDateTime: null,
      DeliveryPackageCount: 5, DeliveryReceivedPackageCount: 0,
      ReceivedDateTime: null, EstimatedReturnDepartureDateTime: null,
      ActualReturnDepartureDateTime: null, EstimatedReturnArrivalDateTime: null,
      ActualReturnArrivalDateTime: null,
    };
    expect(() => metrcDeliverySchema.parse(sample)).not.toThrow();
  });
});

// Captured from a real /items/v2/active response in prod (May 2026):
// item Id=657627, Vape Cartridge SKU. Used to verify the schema parses real data.
const sampleItem = {
  Id: 657627,
  Name: "*Sample* Jetty | Wedding Cake Solventless Mini Tank | AlO | 1g",
  GlobalProductName: null,
  GlobalProductNumber: null,
  ProductCategoryName: "Vape Cartridge - Each",
  ProductCategoryType: "Concentrate",
  IsExpirationDateRequired: true,
  HasExpirationDate: true,
  QuantityType: "CountBased",
  DefaultLabTestingState: "NotSubmitted",
  UnitOfMeasureName: "Each",
  ApprovalStatus: "Approved",
  ApprovalStatusDateTime: "2025-12-17T18:43:00+00:00",
  StrainId: null,
  StrainName: null,
  ItemBrandId: 0,
  ItemBrandName: null,
  AdministrationMethod: "",
  UnitThcContent: 81,
  UnitThcContentUnitOfMeasureName: "Milligrams",
  UnitWeight: 1,
  UnitWeightUnitOfMeasureName: "Grams",
  PublicIngredients: "cannabis",
  Description: "",
  ProductImages: [],
  IsUsed: true,
  CreatedDateTime: "2025-12-17T18:42:59.61+00:00",
  LabTestBatchNames: [],
};

describe("metrcItemSchema", () => {
  it("parses a real captured /items/v2/active sample", () => {
    expect(() => metrcItemSchema.parse(sampleItem)).not.toThrow();
  });
  it("preserves unknown passthrough fields", () => {
    const parsed = metrcItemSchema.parse(sampleItem);
    // UnitThcContent is not declared in the schema but should survive via .passthrough()
    expect((parsed as Record<string, unknown>).UnitThcContent).toBe(81);
  });
  it("rejects when Name is missing", () => {
    const bad: Record<string, unknown> = { ...sampleItem };
    delete bad.Name;
    expect(() => metrcItemSchema.parse(bad)).toThrow();
  });
  it("rejects when ProductCategoryType is not a string", () => {
    expect(() => metrcItemSchema.parse({ ...sampleItem, ProductCategoryType: 0 })).toThrow();
  });
  it("accepts null StrainId/StrainName/UnitOfMeasureName", () => {
    expect(() => metrcItemSchema.parse({
      ...sampleItem, StrainId: null, StrainName: null, UnitOfMeasureName: null,
    })).not.toThrow();
  });
});

// Captured from a real /sales/v2/receipts/active list entry (prod, May 2026).
const sampleReceiptListEntry = {
  Id: 12769278,
  ReceiptNumber: "0012769278",
  ExternalReceiptNumber: "26102742-3fa1-442b-acb4-3596b3623af4",
  SalesDateTime: "2026-05-24T10:53:19.570",
  SalesCustomerType: "Consumer",
  PatientLicenseNumber: "",
  CaregiverLicenseNumber: "",
  IdentificationMethod: "",
  PatientRegistrationLocationId: null,
  TotalPackages: 1,
  TotalPrice: 92.04,
  Transactions: [],
  IsFinal: false,
  ArchivedDate: null,
  RecordedDateTime: "2026-05-24T14:53:21+00:00",
  RecordedByUserName: "John Colon",
  LastModified: "2026-05-24T14:53:21+00:00",
};

// Captured from /sales/v2/receipts/{id} for the same receipt — Transactions populated.
const sampleTransaction = {
  PackageId: 1675227,
  TripId: null,
  PackageLabel: "1A412030000132A000003132",
  ProductName: "Weekenders: Tropicana cookies 7 pack Glow",
  ProductCategoryName: "Raw Pre-Roll - Each",
  ItemStrainName: "Tropicana Cookies",
  ItemUnitThcPercent: 0.00,
  ItemUnitWeight: 1.0,
  ItemUnitWeightUnitOfMeasureName: "Grams",
  QuantitySold: 2.0,
  UnitOfMeasureName: "Each",
  UnitOfMeasureAbbreviation: "ea",
  UnitWeight: 1.0,
  TotalPrice: 92.04,
  ArchivedDate: null,
  RecordedDateTime: "0001-01-01T00:00:00+00:00",
  RecordedByUserName: null,
  LastModified: "2026-05-24T14:53:21+00:00",
  InvoiceNumber: "JhAnQj-hRCustDWWs2I69A",
  Price: 92.04,
  DiscountAmount: 0.00,
  SubTotal: 104.00,
};
const sampleReceiptDetail = { ...sampleReceiptListEntry, Transactions: [sampleTransaction] };

describe("metrcSalesTransactionSchema", () => {
  it("parses a real captured sales transaction line item", () => {
    expect(() => metrcSalesTransactionSchema.parse(sampleTransaction)).not.toThrow();
  });
  it("rejects when PackageLabel is missing", () => {
    const bad: Record<string, unknown> = { ...sampleTransaction };
    delete bad.PackageLabel;
    expect(() => metrcSalesTransactionSchema.parse(bad)).toThrow();
  });
  it("accepts null ItemStrainName (non-strain products)", () => {
    expect(() => metrcSalesTransactionSchema.parse({ ...sampleTransaction, ItemStrainName: null })).not.toThrow();
  });
});

describe("metrcSalesReceiptSchema (list shape)", () => {
  it("parses a real captured list entry with empty Transactions", () => {
    expect(() => metrcSalesReceiptSchema.parse(sampleReceiptListEntry)).not.toThrow();
  });
  it("rejects when ReceiptNumber is missing", () => {
    const bad: Record<string, unknown> = { ...sampleReceiptListEntry };
    delete bad.ReceiptNumber;
    expect(() => metrcSalesReceiptSchema.parse(bad)).toThrow();
  });
  it("accepts a populated Transactions array (detail-shaped payload)", () => {
    expect(() => metrcSalesReceiptSchema.parse(sampleReceiptDetail)).not.toThrow();
  });
});

describe("metrcSalesReceiptDetailSchema", () => {
  it("parses a real captured receipt detail (Transactions populated)", () => {
    const parsed = metrcSalesReceiptDetailSchema.parse(sampleReceiptDetail);
    expect(parsed.Transactions.length).toBe(1);
    expect(parsed.Transactions[0]!.PackageLabel).toBe("1A412030000132A000003132");
  });
  it("rejects when Transactions contains an invalid line item", () => {
    const bad = { ...sampleReceiptDetail, Transactions: [{ ...sampleTransaction, QuantitySold: "two" }] };
    expect(() => metrcSalesReceiptDetailSchema.parse(bad)).toThrow();
  });
});

const sampleAdjustReason = {
  Name: "Spoilage",
  RequiresNote: false,
  RequiresWasteWeight: false,
  RequiresImmatureWasteWeight: false,
  RequiresMatureWasteWeight: false,
};

describe("metrcPackageAdjustReasonSchema", () => {
  it("parses a well-formed adjust reason", () => {
    expect(() => metrcPackageAdjustReasonSchema.parse(sampleAdjustReason)).not.toThrow();
  });
  it("rejects an adjust reason missing Name", () => {
    const bad: Record<string, unknown> = { ...sampleAdjustReason };
    delete bad.Name;
    expect(() => metrcPackageAdjustReasonSchema.parse(bad)).toThrow();
  });
  it("rejects an adjust reason with wrong type on RequiresNote", () => {
    const bad = { ...sampleAdjustReason, RequiresNote: "not-a-bool" };
    expect(() => metrcPackageAdjustReasonSchema.parse(bad)).toThrow();
  });
});

const sampleItemCategory = {
  Name: "Bud/Flower - Each",
  ProductCategoryType: "Buds",
  QuantityType: "WeightBased",
  CanBeDecontaminated: false,
  CanBeDestroyed: true,
  CanBePreTreated: false,
  CanBeRemediated: false,
  CanContainSeeds: false,
  RequiresStrain: true,
  RequiresItemBrand: false,
  // long tail preserved via passthrough — populate one representative null + one array to exercise the passthrough path
  MaxDaysForRecoveryAfterFailure: null,
  LabTestBatchNames: [],
};

describe("metrcItemCategorySchema", () => {
  it("parses a well-formed item category", () => {
    expect(() => metrcItemCategorySchema.parse(sampleItemCategory)).not.toThrow();
  });
  it("rejects a category missing Name", () => {
    const bad: Record<string, unknown> = { ...sampleItemCategory };
    delete bad.Name;
    expect(() => metrcItemCategorySchema.parse(bad)).toThrow();
  });
  it("rejects a category with wrong type on CanContainSeeds", () => {
    const bad = { ...sampleItemCategory, CanContainSeeds: "not-a-bool" };
    expect(() => metrcItemCategorySchema.parse(bad)).toThrow();
  });
});
