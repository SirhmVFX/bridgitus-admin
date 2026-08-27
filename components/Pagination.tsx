"use client";

import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { pageNumbers, type PageSlice } from "@/lib/pagination";

interface Props {
  /** Result of paginate() — used for meta + controls */
  slice: Pick<PageSlice<unknown>, "page" | "totalPages" | "total" | "start" | "end">;
  onPageChange: (page: number) => void;
  /** Hide when only one page (default true) */
  hideIfSingle?: boolean;
  className?: string;
}

export default function Pagination({
  slice,
  onPageChange,
  hideIfSingle = true,
  className = "",
}: Props) {
  const { page, totalPages, total, start, end } = slice;
  if (total === 0) return null;
  if (hideIfSingle && totalPages <= 1) return null;

  const nums = pageNumbers(page, totalPages);

  return (
    <div className={`pagination ${className}`}>
      <p className="pagination-meta">
        Showing {start}–{end} of {total}
      </p>
      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <MdChevronLeft size={18} />
        </button>
        {nums.map((n, i) =>
          n === 0 ? (
            <span key={`e-${i}`} className="px-1 text-slate-400 text-sm">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              className={`pagination-btn${n === page ? " active" : ""}`}
              onClick={() => onPageChange(n)}
              aria-label={`Page ${n}`}
              aria-current={n === page ? "page" : undefined}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <MdChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
