export const DEFAULT_PAGE_SIZE = 10;

export interface PageSlice<T> {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  start: number;
  end: number;
  items: T[];
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): PageSlice<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const slice = items.slice(startIdx, startIdx + pageSize);
  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    start: total === 0 ? 0 : startIdx + 1,
    end: startIdx + slice.length,
    items: slice,
  };
}

/** Compact page number list with ellipsis markers (0 = ellipsis). */
export function pageNumbers(current: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, totalPages, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push(0);
    out.push(sorted[i]);
  }
  return out;
}
