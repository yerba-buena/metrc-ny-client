import { type Requester } from "./request.js";
import { MetrcResponseError } from "../errors.js";

/**
 * Variant of `request` for endpoints that return a bare JSON array
 * (no Data/Total/Page envelope). Today's only known example is
 * `/packages/v2/types`. Validates the top-level shape but leaves
 * per-element validation to the caller (via a Zod schema applied
 * to the returned array, same pattern as validateArray in live.ts).
 *
 * Uses the same Requester transport as paginated endpoints. The
 * passed `request` should be the `Requester` already constructed
 * inside `createLiveMetrcClient` so auth / rate-limiting / retry
 * are reused.
 */
export async function requestArray<T>(
  request: Requester,
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  const response = await request<unknown>(endpoint, params);
  if (!Array.isArray(response)) {
    throw new MetrcResponseError(
      "METRC API returned non-array response for a bare-array endpoint",
      { endpoint, method: "GET" },
    );
  }
  return response as T[];
}
