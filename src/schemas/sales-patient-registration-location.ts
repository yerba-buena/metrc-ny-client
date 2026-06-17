import { z } from "zod";

/**
 * A patient-registration location lookup entry.
 * Returned by `/sales/v2/patientregistration/locations` as a bare array.
 */
export const metrcSalesPatientRegistrationLocationSchema = z.object({
  Id: z.number(),
  Name: z.string(),
});

export type MetrcSalesPatientRegistrationLocation = z.infer<typeof metrcSalesPatientRegistrationLocationSchema>;
