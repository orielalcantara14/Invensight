import { ChevronLeft, ChevronRight } from "lucide-react";

export type OrdersStyleTablePaginationProps = {
  itemCount: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: number) => void;
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
}: OrdersStyleTablePaginationProps) {
  if (itemCount === 0) return null;

  const totalPages = Math.max(1, Math.ceil(itemCount / itemsPerPage));
  const page = Math.min(currentPage, totalPages);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">Show</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={3}>3</option>
          <option value={5}>5</option>
          <option value={10}>10</option>
        </select>
        <span className="text-sm text-gray-600 dark:text-gray-400">entries</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`px-3 py-1 rounded border text-sm ${
                p === page
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="p-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
