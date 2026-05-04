import type { MetrcClient } from "./interface.js";
import type { MetrcTransfer, MetrcPackage, DeliveryWithPackages } from "../schemas/index.js";

export interface MockFixtures {
  transfers: MetrcTransfer[];
  packagesByDeliveryId: Record<number, MetrcPackage[]>;
}

const DEFAULT_TRANSFER: MetrcTransfer = {
  Id: 1,
  ManifestNumber: "M-DEFAULT-001",
  ShipmentLicenseType: "Adult Use",
  ShipperFacilityLicenseNumber: "OBCM-MOCK-1",
  ShipperFacilityName: "Mock Farms",
  TransporterFacilityLicenseNumber: null,
  TransporterFacilityName: null,
  DriverName: null,
  DriverOccupationalLicenseNumber: null,
  DriverVehicleLicenseNumber: null,
  VehicleMake: null,
  VehicleModel: null,
  VehicleLicensePlateNumber: null,
  DeliveryCount: 1,
  ReceivedDeliveryCount: 0,
  PackageCount: 2,
  ReceivedPackageCount: 0,
  ContainsPlantPackage: false,
  ContainsProductPackage: true,
  ContainsTradeSample: false,
  ContainsDonation: false,
  ContainsTestingSample: false,
  ContainsProductRequiresRemediation: false,
  ContainsRemediatedProductPackage: false,
  CreatedDateTime: "2026-04-28T10:00:00Z",
  CreatedByUserName: "mock-user",
  LastModified: "2026-04-28T10:00:00Z",
  DeliveryId: 1001,
  RecipientFacilityLicenseNumber: "OCM-RET-MOCK-1",
  RecipientFacilityName: "Mock Dispensary",
  ShipmentTypeName: "Wholesale Manifest",
  ShipmentTransactionType: "Standard",
  EstimatedDepartureDateTime: "2026-04-28T08:00:00Z",
  ActualDepartureDateTime: null,
  EstimatedArrivalDateTime: "2026-04-28T14:00:00Z",
  ActualArrivalDateTime: null,
  DeliveryPackageCount: 2,
  DeliveryReceivedPackageCount: 0,
  ReceivedDateTime: null,
  EstimatedReturnDepartureDateTime: null,
  ActualReturnDepartureDateTime: null,
  EstimatedReturnArrivalDateTime: null,
  ActualReturnArrivalDateTime: null,
};

const DEFAULT_PACKAGE_A: MetrcPackage = {
  PackageId: 9001,
  PackageLabel: "1A4FF0300000001000000001",
  PackageType: "Product",
  SourceHarvestNames: "Mock Harvest 2026.04",
  SourcePackageLabels: null,
  ItemId: 1,
  ItemName: "Mock Flower 3.5g",
  ItemCategoryName: "Flower",
  ItemStrainName: "Mock Strain",
  ItemUnitOfMeasureName: "Each",
  ItemUnitOfMeasureAbbreviation: "ea",
  LabTestingState: "TestPassed",
  ProductionBatchNumber: null,
  IsTradeSample: false,
  IsDonation: false,
  SourcePackageIsTradeSample: false,
  SourcePackageIsDonation: false,
  ProductRequiresRemediation: false,
  ContainsRemediatedProduct: false,
  RemediationDate: null,
  ShipmentPackageState: "Shipped",
  ShippedQuantity: 50,
  ShippedUnitOfMeasureName: "Each",
  ShippedUnitOfMeasureAbbreviation: "ea",
  GrossUnitOfWeightName: null,
  GrossUnitOfWeightAbbreviation: null,
  ReceivedQuantity: null,
  ReceivedDateTime: null,
};

const DEFAULT_PACKAGE_B: MetrcPackage = {
  ...DEFAULT_PACKAGE_A,
  PackageId: 9002,
  PackageLabel: "1A4FF0300000001000000002",
  ItemId: 2,
  ItemName: "Mock Pre-Roll 1g",
  ItemCategoryName: "Pre-Rolls",
  ItemStrainName: "Mock Strain B",
  ShippedQuantity: 30,
};

export const DEFAULT_MOCK_FIXTURES: MockFixtures = {
  transfers: [DEFAULT_TRANSFER],
  packagesByDeliveryId: { 1001: [DEFAULT_PACKAGE_A, DEFAULT_PACKAGE_B] },
};

export function createMockMetrcClient(fixtures: MockFixtures = DEFAULT_MOCK_FIXTURES): MetrcClient {
  return {
    async getIncomingTransfers(): Promise<MetrcTransfer[]> {
      return [...fixtures.transfers];
    },
    async getPackagesForDelivery(deliveryId: number): Promise<MetrcPackage[]> {
      return [...(fixtures.packagesByDeliveryId[deliveryId] ?? [])];
    },
    async getDeliveriesWithPackages(): Promise<DeliveryWithPackages[]> {
      return fixtures.transfers.map((t) => ({
        transfer: t,
        packages: [...(fixtures.packagesByDeliveryId[t.DeliveryId] ?? [])],
      }));
    },
  };
}
