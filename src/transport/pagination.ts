import { MetrcResponseError } from "../errors.js";

export interface PaginatedResponse<T> {
  Data: T[];
  Total: number;
  TotalRecords: number;
  PageSize: number;
  RecordsOnPage: number;
  Page: number;
  CurrentPage: number;
  TotalPages: number;
}

export type FetchPage<T> = (pageNumber: number) => Promise<PaginatedResponse<T>>;

function isPaginated<T>(r: unknown): r is PaginatedResponse<T> {
  return !!r && typeof r === "object" && "Data" in r && Array.isArray((r as { Data: unknown }).Data);
}

export async function fetchAllPages<T>(fetchPage: FetchPage<T>): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const resp = await fetchPage(page);
    if (!isPaginated<T>(resp)) {
      throw new MetrcResponseError("METRC API returned unexpected response shape", {
        endpoint: "(pagination)",
        method: "GET",
      });
    }
    all.push(...resp.Data);
    totalPages = resp.TotalPages || 1;
    page = (resp.CurrentPage || resp.Page || page) + 1;
  } while (page <= totalPages);
  return all;
}
