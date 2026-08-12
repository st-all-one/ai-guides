export interface PaginationParams {
  page: number;
  perPage: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
}

export function parsePagination(url: URL): PaginationParams {
  return {
    page: Math.max(
      1,
      Number(url.searchParams.get("page") ?? "1"),
    ),
    perPage: Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("per_page") ?? "20")),
    ),
    sort: url.searchParams.get("sort") ?? undefined,
    order: (url.searchParams.get("order") as "asc" | "desc") ?? "asc",
    search: url.searchParams.get("q") ?? undefined,
  };
}

export function paginateResponse<T>(
  items: T[],
  total: number,
  params: PaginationParams,
) {
  return {
    data: items,
    meta: {
      total,
      page: params.page,
      per_page: params.perPage,
      total_pages: Math.ceil(total / params.perPage),
    },
  };
}
