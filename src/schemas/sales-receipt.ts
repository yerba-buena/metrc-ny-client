import { z } from "zod";

/**
 * A single line item inside a sales receipt's `Transactions[]`.
 *
 * Each transaction points back to the source package via `PackageId` /
 * `PackageLabel` and records how many units were sold. This is the bridge
 * between sales activity and the inventory catalog (Items / Packages).
 */
export const metrcSalesTransactionSchema = z.object({
  PackageId: z.number(),
  PackageLabel: z.string(),
  ProductName: z.string(),
  ProductCategoryName: z.string(),
  ItemStrainName: z.string().nullable(),
  QuantitySold: z.number(),
  UnitOfMeasureName: z.string(),
  UnitOfMeasureAbbreviation: z.string(),
  TotalPrice: z.number(),
  InvoiceNumber: z.string().nullable(),
  RecordedDateTime: z.string(),
  RecordedByUserName: z.string().nullable(),
  LastModified: z.string(),
}).passthrough();

export type MetrcSalesTransaction = z.infer<typeof metrcSalesTransactionSchema>;

/**
 * Shared base fields for a sales receipt. Returned by both the list endpoint
 * (`/sales/v2/receipts/active`) and the detail endpoint
 * (`/sales/v2/receipts/{id}`); the difference is whether `Transactions[]`
 * is populated.
 */
const salesReceiptBase = {
  Id: z.number(),
  ReceiptNumber: z.string(),
  ExternalReceiptNumber: z.string().nullable(),
  SalesDateTime: z.string(),
  SalesCustomerType: z.string(),
  PatientLicenseNumber: z.string().nullable(),
  CaregiverLicenseNumber: z.string().nullable(),
  IdentificationMethod: z.string().nullable(),
  PatientRegistrationLocationId: z.number().nullable(),
  TotalPackages: z.number(),
  TotalPrice: z.number(),
  IsFinal: z.boolean(),
  ArchivedDate: z.string().nullable(),
  RecordedDateTime: z.string(),
  RecordedByUserName: z.string().nullable(),
  LastModified: z.string(),
} as const;

/**
 * Schema for a receipt from the list endpoint `/sales/v2/receipts/active`.
 * METRC returns `Transactions: []` on every row here — fetch the detail
 * endpoint with `getSalesReceiptById` to get the populated line items.
 */
export const metrcSalesReceiptSchema = z.object({
  ...salesReceiptBase,
  Transactions: z.array(metrcSalesTransactionSchema),
}).passthrough();

export type MetrcSalesReceipt = z.infer<typeof metrcSalesReceiptSchema>;

/**
 * Schema for a single receipt from `/sales/v2/receipts/{id}`. Same shape
 * as the list entry, but `Transactions[]` is populated with line items.
 */
export const metrcSalesReceiptDetailSchema = z.object({
  ...salesReceiptBase,
  Transactions: z.array(metrcSalesTransactionSchema),
}).passthrough();

export type MetrcSalesReceiptDetail = z.infer<typeof metrcSalesReceiptDetailSchema>;
