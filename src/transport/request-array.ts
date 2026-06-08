import { type Requester } from "./request.js";
import { MetrcResponseError } from "../errors.js";

/**
 * Variant of `request` for endpoints that return a bare JSON array
 * (no Data/Total/Page envelope). Today's only known example is
 * `/packages/v2/types`. Validates ONLY that the top-level value is
 * an array; per-element validation is the caller's responsibility.
 *
 * The caller MUST apply `validateArray(schema, ..., endpoint)` (or
 * an equivalent per-element check) when they want
 * `validateResponses: true` to actually enforce the per-element
 * contract — otherwise the strongly-typed return is a TypeScript
 * lie that the runtime won't catch.
 *
 * Uses the same Requester transport as paginated endpoints; auth,
 * rate-limiting, and retry are reused.
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
