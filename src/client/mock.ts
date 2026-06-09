import type { MetrcClient, SalesReceiptsWindow } from "./interface.js";
import type {
  MetrcTransfer, MetrcOutgoingTransfer, MetrcTransferType, MetrcPackage, DeliveryWithPackages,
  MetrcLocation, MetrcActivePackage, MetrcPackageAdjustReason,
  MetrcItem, MetrcSalesReceipt, MetrcSalesReceiptDetail,
  MetrcItemCategory,
} from "../schemas/index.js";

export interface MockFixtures {
  transfers: MetrcTransfer[];
  outgoingTransfers: MetrcOutgoingTransfer[];
  rejectedTransfers: MetrcOutgoingTransfer[];
  transferTypes: MetrcTransferType[];
  packagesByDeliveryId: Record<number, MetrcPackage[]>;
  locations: MetrcLocation[];
  activePackages: MetrcActivePackage[];
  inactivePackages: MetrcActivePackage[];
  onHoldPackages: MetrcActivePackage[];
  packageTypes: string[];
  packageAdjustReasons: MetrcPackageAdjustReason[];
  packageDetailsById: Record<number, MetrcActivePackage>;
  packageDetailsByLabel: Record<string, MetrcActivePackage>;
  items: MetrcItem[];
  salesReceipts: MetrcSalesReceipt[];
  salesReceiptDetailsById: Record<number, MetrcSalesReceiptDetail>;
  itemCategories: MetrcItemCategory[];
  salesCustomerTypes: string[];
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

const DEFAULT_OUTGOING_TRANSFER: MetrcOutgoingTransfer = {
  Id: 2,
  ManifestNumber: "M-DEFAULT-OUT-001",
  ShipmentLicenseType: "Adult Use",
  ShipperFacilityLicenseNumber: "OCM-CAURD-MOCK-1",
  ShipperFacilityName: "Mock Dispensary",
  RecipientFacilityLicenseNumber: null,
  RecipientFacilityName: null,
  TransporterFacilityLicenseNumber: null,
  TransporterFacilityName: null,
  DriverName: null,
  DriverOccupationalLicenseNumber: null,
  DriverVehicleLicenseNumber: null,
  VehicleMake: null,
  VehicleModel: null,
  VehicleLicensePlateNumber: null,
  VehicleRegistrationNumber: null,
  DeliveryId: 2001,
  DeliveryCount: 1,
  ReceivedDeliveryCount: 0,
  PackageCount: 1,
  ReceivedPackageCount: 0,
  DeliveryPackageCount: 1,
  DeliveryReceivedPackageCount: 0,
  InvoiceNumber: null,
  IsVoided: false,
  Name: null,
  OriginatingTemplateId: null,
  ShipmentTypeName: null,
  ShipmentTransactionType: null,
  ContainsPlantPackage: false,
  ContainsProductPackage: true,
  ContainsTradeSample: false,
  ContainsDonation: false,
  ContainsTestingSample: false,
  ContainsProductRequiresRemediation: false,
  ContainsRemediatedProductPackage: false,
  ContainsPreTreatedProductPackage: false,
  CreatedDateTime: "2026-05-01T10:00:00Z",
  CreatedByUserName: "mock-user",
  LastModified: "2026-05-01T10:00:00Z",
  EstimatedDepartureDateTime: "2026-05-01T08:00:00Z",
  ActualDepartureDateTime: null,
  EstimatedArrivalDateTime: "2026-05-01T14:00:00Z",
  ActualArrivalDateTime: null,
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

const DEFAULT_LOCATION_FULFILLMENT: MetrcLocation = {
  Id: 1,
  Name: "Fulfillment",
  LocationTypeId: 1,
  LocationTypeName: "Default",
  ForPlantBatches: false,
  ForPlants: false,
  ForHarvests: false,
  ForPackages: true,
};

const DEFAULT_LOCATION_VAULT: MetrcLocation = {
  Id: 2,
  Name: "Vault",
  LocationTypeId: 1,
  LocationTypeName: "Default",
  ForPlantBatches: false,
  ForPlants: false,
  ForHarvests: false,
  ForPackages: true,
};

const DEFAULT_ITEM_A = {
  Id: 1,
  Name: "Mock Flower 3.5g",
  GlobalProductName: null,
  GlobalProductNumber: null,
  ProductCategoryName: "Flower",
  ProductCategoryType: 0,
  QuantityType: 0,
  DefaultLabTestingState: 0,
  UnitOfMeasureName: null,
  ApprovalStatus: 0,
  ApprovalStatusDateTime: "0001-01-01T00:00:00+00:00",
  StrainId: 1,
  StrainName: "Mock Strain",
  ItemBrandId: 0,
  ItemBrandName: null,
  AdministrationMethod: null,
  Description: null,
  IsUsed: false,
};

const DEFAULT_PRODUCT_LABEL = {
  QrCount: 1,
  IsChildFromParentWithLabel: false,
  OriginalSourcePackageId: null,
  OriginalSourcePackageLabel: null,
  LabelSource: null,
  IsActive: true,
};

const DEFAULT_ACTIVE_PACKAGE_A: MetrcActivePackage = {
  Id: 5001,
  Label: "1A4FF0300000001000000101",
  ExternalId: null,
  PackageType: "Product",
  SourceHarvestCount: 1,
  SourcePackageCount: 0,
  SourceProcessingJobCount: 0,
  SourceHarvestNames: "Mock Harvest 2026.04",
  SourcePackageLabels: null,
  LocationId: 1,
  LocationName: "Fulfillment",
  SublocationId: null,
  SublocationName: null,
  LocationTypeName: "Default",
  Quantity: 25,
  OriginalPackageQuantity: 25,
  UnitOfMeasureName: "Each",
  UnitOfMeasureAbbreviation: "ea",
  PatientLicenseNumber: null,
  ItemFromFacilityLicenseNumber: null,
  ItemFromFacilityName: null,
  Note: null,
  PackagedDate: "2026-04-20",
  ExpirationDate: null,
  SellByDate: null,
  UseByDate: null,
  InitialLabTestingState: "TestPassed",
  LabTestingState: "TestPassed",
  LabTestingStateDate: "2026-04-22",
  LabTestingPerformedDate: null,
  LabTestResultExpirationDateTime: null,
  LabTestingRecordedDate: null,
  LabTestStageId: null,
  LabTestStage: null,
  IsProductionBatch: false,
  ProductionBatchNumber: null,
  SourceProductionBatchNumbers: null,
  IsTradeSample: false,
  IsTradeSamplePersistent: false,
  SourcePackageIsTradeSample: false,
  IsDonation: false,
  IsDonationPersistent: false,
  SourcePackageIsDonation: false,
  IsTestingSample: false,
  IsProcessValidationTestingSample: false,
  ProductRequiresRemediation: false,
  ContainsRemediatedProduct: false,
  RemediationDate: null,
  ProductRequiresDecontamination: false,
  ContainsDecontaminatedProduct: false,
  DecontaminationDate: null,
  ContainsPreTreatedProduct: false,
  PreTreatmentDate: null,
  ReceivedDateTime: null,
  ReceivedFromManifestNumber: null,
  ReceivedFromFacilityLicenseNumber: null,
  ReceivedFromFacilityName: null,
  IsOnHold: false,
  IsOnHoldCombined: false,
  IsOnInvestigation: false,
  IsOnInvestigationHold: false,
  IsOnInvestigationRecall: false,
  IsOnRecall: null,
  IsOnRecallCombined: false,
  ArchivedDate: null,
  IsFinished: false,
  FinishedDate: null,
  IsFinishedGood: false,
  IsOnRetailerDelivery: false,
  PackageForProductDestruction: null,
  LabelsLastGeneratedDateTime: null,
  LastModified: "2026-04-28T10:00:00Z",
  Item: DEFAULT_ITEM_A,
  ProductLabel: DEFAULT_PRODUCT_LABEL,
};

const DEFAULT_ACTIVE_PACKAGE_B: MetrcActivePackage = {
  ...DEFAULT_ACTIVE_PACKAGE_A,
  Id: 5002,
  Label: "1A4FF0300000001000000102",
  LocationId: 2,
  LocationName: "Vault",
  Quantity: 10,
  Item: {
    ...DEFAULT_ITEM_A,
    Id: 2,
    Name: "Mock Pre-Roll 1g",
    ProductCategoryName: "Pre-Rolls",
    StrainId: 2,
    StrainName: "Mock Strain B",
  },
};

const DEFAULT_INACTIVE_PACKAGE: MetrcActivePackage = {
  ...DEFAULT_ACTIVE_PACKAGE_A,
  Id: 6001,
  Label: "1A4FF0300000001000000201",
  LocationName: "Vault",
  IsFinished: true,
  FinishedDate: "2026-03-15",
  Quantity: 0,
  ArchivedDate: "2026-03-16",
};

const DEFAULT_ON_HOLD_PACKAGE: MetrcActivePackage = {
  ...DEFAULT_ACTIVE_PACKAGE_A,
  Id: 6002,
  Label: "1A4FF0300000001000000202",
  LocationName: "Fulfillment",
  IsOnHold: true,
  IsOnHoldCombined: true,
};

const DEFAULT_PACKAGE_TYPES: string[] = ["Product", "ImmaturePlant", "VegetativePlant"];

const DEFAULT_PACKAGE_ADJUST_REASONS: MetrcPackageAdjustReason[] = [
  {
    Name: "Mandatory State Destruction",
    RequiresNote: true,
    RequiresWasteWeight: true,
    RequiresImmatureWasteWeight: false,
    RequiresMatureWasteWeight: false,
  },
  {
    Name: "Spoilage",
    RequiresNote: false,
    RequiresWasteWeight: false,
    RequiresImmatureWasteWeight: false,
    RequiresMatureWasteWeight: false,
  },
];

const DEFAULT_PACKAGE_DETAILS_BY_ID: Record<number, MetrcActivePackage> = {
  [DEFAULT_ACTIVE_PACKAGE_A.Id]: DEFAULT_ACTIVE_PACKAGE_A,
};

const DEFAULT_PACKAGE_DETAILS_BY_LABEL: Record<string, MetrcActivePackage> = {
  [DEFAULT_ACTIVE_PACKAGE_A.Label]: DEFAULT_ACTIVE_PACKAGE_A,
};

const DEFAULT_ITEM_CATALOG_A: MetrcItem = {
  Id: 1,
  Name: "Mock Flower 3.5g",
  ProductCategoryName: "Bud/Flower - Each",
  ProductCategoryType: "Buds",
  QuantityType: "CountBased",
  UnitOfMeasureName: "Each",
  StrainId: 1,
  StrainName: "Mock Strain",
  ItemBrandId: 0,
  ItemBrandName: "Mock Brand",
  ApprovalStatus: "Approved",
  ApprovalStatusDateTime: "2026-01-01T00:00:00+00:00",
  IsUsed: true,
};

const DEFAULT_ITEM_CATALOG_B: MetrcItem = {
  Id: 2,
  Name: "Mock Pre-Roll 1g",
  ProductCategoryName: "Raw Pre-Roll - Each",
  ProductCategoryType: "Buds",
  QuantityType: "CountBased",
  UnitOfMeasureName: "Each",
  StrainId: 2,
  StrainName: "Mock Strain B",
  ItemBrandId: 0,
  ItemBrandName: null,
  ApprovalStatus: "Approved",
  ApprovalStatusDateTime: "2026-01-15T00:00:00+00:00",
  IsUsed: true,
};

const DEFAULT_ITEM_CATEGORY_FLOWER: MetrcItemCategory = {
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
};

const DEFAULT_ITEM_CATEGORY_PREROLL: MetrcItemCategory = {
  Name: "Raw Pre-Roll - Each",
  ProductCategoryType: "Buds",
  QuantityType: "CountBased",
  CanBeDecontaminated: false,
  CanBeDestroyed: true,
  CanBePreTreated: false,
  CanBeRemediated: false,
  CanContainSeeds: false,
  RequiresStrain: true,
  RequiresItemBrand: false,
};

const DEFAULT_SALES_TRANSACTION = {
  PackageId: 5001,
  PackageLabel: "1A4FF0300000001000000101",
  ProductName: "Mock Flower 3.5g",
  ProductCategoryName: "Bud/Flower - Each",
  ItemStrainName: "Mock Strain",
  QuantitySold: 2,
  UnitOfMeasureName: "Each",
  UnitOfMeasureAbbreviation: "ea",
  TotalPrice: 80,
  InvoiceNumber: "INV-MOCK-1",
  RecordedDateTime: "2026-05-01T12:00:00+00:00",
  RecordedByUserName: "mock-cashier",
  LastModified: "2026-05-01T12:00:00+00:00",
};

const DEFAULT_RECEIPT_LIST_ENTRY: MetrcSalesReceipt = {
  Id: 7001,
  ReceiptNumber: "0000007001",
  ExternalReceiptNumber: "mock-ext-7001",
  SalesDateTime: "2026-05-01T12:00:00",
  SalesCustomerType: "Consumer",
  PatientLicenseNumber: "",
  CaregiverLicenseNumber: "",
  IdentificationMethod: "",
  PatientRegistrationLocationId: null,
  TotalPackages: 1,
  TotalPrice: 80,
  Transactions: [], // METRC list endpoint always returns empty transactions
  IsFinal: false,
  ArchivedDate: null,
  RecordedDateTime: "2026-05-01T12:00:00+00:00",
  RecordedByUserName: "mock-cashier",
  LastModified: "2026-05-01T12:00:00+00:00",
};

const DEFAULT_RECEIPT_DETAIL_7001: MetrcSalesReceiptDetail = {
  ...DEFAULT_RECEIPT_LIST_ENTRY,
  Transactions: [DEFAULT_SALES_TRANSACTION],
};

const DEFAULT_SALES_CUSTOMER_TYPES: string[] = ["Consumer", "PatientLicense", "CaregiverLicense"];

const DEFAULT_TRANSFER_TYPE: MetrcTransferType = {
  Name: "Wholesale Manifest",
  TransactionType: "Standard",
  BypassApproval: false,
  ExternalIncomingCanRecordExternalIdentifier: false,
  ExternalIncomingExternalIdentifierRequired: false,
  ExternalOutgoingCanRecordExternalIdentifier: false,
  ExternalOutgoingExternalIdentifierRequired: false,
  ForExternalIncomingShipments: false,
  ForExternalOutgoingShipments: false,
  ForLicensedShipments: true,
  RequiresDestinationGrossWeight: false,
  RequiresInvoiceNumber: false,
  RequiresPDFDocument: false,
  RequiresPackagesGrossWeight: false,
  RequiresVehicleRegistrationNumber: false,
};

export const DEFAULT_MOCK_FIXTURES: MockFixtures = {
  transfers: [DEFAULT_TRANSFER],
  outgoingTransfers: [DEFAULT_OUTGOING_TRANSFER],
  rejectedTransfers: [],
  transferTypes: [DEFAULT_TRANSFER_TYPE],
  packagesByDeliveryId: { 1001: [DEFAULT_PACKAGE_A, DEFAULT_PACKAGE_B] },
  locations: [DEFAULT_LOCATION_FULFILLMENT, DEFAULT_LOCATION_VAULT],
  activePackages: [DEFAULT_ACTIVE_PACKAGE_A, DEFAULT_ACTIVE_PACKAGE_B],
  inactivePackages: [DEFAULT_INACTIVE_PACKAGE],
  onHoldPackages: [DEFAULT_ON_HOLD_PACKAGE],
  packageTypes: DEFAULT_PACKAGE_TYPES,
  packageAdjustReasons: DEFAULT_PACKAGE_ADJUST_REASONS,
  packageDetailsById: DEFAULT_PACKAGE_DETAILS_BY_ID,
  packageDetailsByLabel: DEFAULT_PACKAGE_DETAILS_BY_LABEL,
  items: [DEFAULT_ITEM_CATALOG_A, DEFAULT_ITEM_CATALOG_B],
  salesReceipts: [DEFAULT_RECEIPT_LIST_ENTRY],
  salesReceiptDetailsById: { 7001: DEFAULT_RECEIPT_DETAIL_7001 },
  itemCategories: [DEFAULT_ITEM_CATEGORY_FLOWER, DEFAULT_ITEM_CATEGORY_PREROLL],
  salesCustomerTypes: DEFAULT_SALES_CUSTOMER_TYPES,
};

export function createMockMetrcClient(fixtures: MockFixtures = DEFAULT_MOCK_FIXTURES): MetrcClient {
  return {
    async getIncomingTransfers(): Promise<MetrcTransfer[]> {
      return [...fixtures.transfers];
    },
    async getOutgoingTransfers(): Promise<MetrcOutgoingTransfer[]> {
      return [...fixtures.outgoingTransfers];
    },
    async getRejectedTransfers(): Promise<MetrcOutgoingTransfer[]> {
      return [...fixtures.rejectedTransfers];
    },
    async getTransferTypes(): Promise<MetrcTransferType[]> {
      return [...fixtures.transferTypes];
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
    async getActiveLocations(): Promise<MetrcLocation[]> {
      return [...fixtures.locations];
    },
    async getActivePackages(): Promise<MetrcActivePackage[]> {
      return [...fixtures.activePackages];
    },
    async getInactivePackages(): Promise<MetrcActivePackage[]> {
      return [...fixtures.inactivePackages];
    },
    async getOnHoldPackages(): Promise<MetrcActivePackage[]> {
      return [...fixtures.onHoldPackages];
    },
    async getPackageTypes(): Promise<string[]> {
      return [...fixtures.packageTypes];
    },
    async getPackageAdjustReasons(): Promise<MetrcPackageAdjustReason[]> {
      return [...fixtures.packageAdjustReasons];
    },
    async getPackageById(id: number): Promise<MetrcActivePackage> {
      const pkg = fixtures.packageDetailsById[id];
      if (!pkg) throw new Error(`mock: no package fixture for id ${id}`);
      return { ...pkg };
    },
    async getPackageByLabel(label: string): Promise<MetrcActivePackage> {
      const pkg = fixtures.packageDetailsByLabel[label];
      if (!pkg) throw new Error(`mock: no package fixture for label ${label}`);
      return { ...pkg };
    },
    async getActiveItems(): Promise<MetrcItem[]> {
      return [...fixtures.items];
    },
    async getItemCategories(): Promise<MetrcItemCategory[]> {
      return [...fixtures.itemCategories];
    },
    async getActiveSalesReceipts(_window: SalesReceiptsWindow): Promise<MetrcSalesReceipt[]> {
      void _window;
      return [...fixtures.salesReceipts];
    },
    async getSalesReceiptById(id: number): Promise<MetrcSalesReceiptDetail> {
      const detail = fixtures.salesReceiptDetailsById[id];
      if (!detail) {
        throw new Error(`mock: no sales receipt fixture for id ${id}`);
      }
      return { ...detail, Transactions: [...detail.Transactions] };
    },
    async getSalesCustomerTypes(): Promise<string[]> {
      return [...fixtures.salesCustomerTypes];
    },
  };
}
