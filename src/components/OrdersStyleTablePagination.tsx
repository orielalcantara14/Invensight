import { ChevronLeft, ChevronRight } from "lucide-react";

export type OrdersStyleTablePaginationProps = {
  itemCount: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: number) => void;
  pageSizeOptions?: number[];
};

/**
 * Footer pagination matching the Orders module: page size select, "Page X of Y", chevrons + numbered pages.
 */
export function OrdersStyleTablePagination({
  itemCount,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions,
}: OrdersStyleTablePaginationProps) {
  if (itemCount === 0) return null;

  const totalPages = Math.max(1, Math.ceil(itemCount / itemsPerPage));
  const page = Math.min(currentPage, totalPages);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const options = pageSizeOptions ?? [3, 5, 10, 25];

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-border border-border">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground dark:text-muted-foreground/70">Show</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="border border-border dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-card dark:bg-gray-700 text-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground dark:text-muted-foreground/70">entries</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground dark:text-muted-foreground/70">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-1 rounded border border-border dark:border-gray-600 disabled:opacity-50 hover:bg-muted dark:hover:bg-gray-700 text-muted-foreground dark:text-gray-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {pageNumbers.map((p, index) => (
            p === '...' ? (
              <span key={`ellipsis-${index}`} className="px-3 py-1 flex items-center justify-center text-sm text-muted-foreground">
                ...
              </span>
            ) : (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p as number)}
                className={`px-3 py-1 rounded border text-sm ${
                  p === page
                    ? "bg-primary text-white border-primary"
                    : "border-border dark:border-gray-600 hover:bg-muted dark:hover:bg-gray-700 text-muted-foreground dark:text-gray-300"
                }`}
              >
                {p}
              </button>
            )
          ))}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="p-1 rounded border border-border dark:border-gray-600 disabled:opacity-50 hover:bg-muted dark:hover:bg-gray-700 text-muted-foreground dark:text-gray-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
