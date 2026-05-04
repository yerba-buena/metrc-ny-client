import { describe, it, expect } from "vitest";
import { metrcTransferSchema, metrcPackageSchema, metrcDeliverySchema } from "../src/schemas/index.js";

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
