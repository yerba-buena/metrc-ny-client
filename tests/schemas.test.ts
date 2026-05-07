import { describe, it, expect } from "vitest";
import { metrcTransferSchema, metrcPackageSchema, metrcDeliverySchema, metrcLocationSchema, metrcActivePackageSchema } from "../src/schemas/index.js";

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
