import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function TablePagination({
  currentPage = 1,
  pageSize = 100,
  pageCount = 1,
  totalItems = 0,
  setPage,
  setPageSize
}) {
  const isAll = pageSize >= 10000;
  const startIdx = isAll ? 1 : Math.min(totalItems, (currentPage - 1) * pageSize + 1);
  const endIdx = isAll ? totalItems : Math.min(totalItems, currentPage * pageSize);

  const PAGE_SIZES = [100, 250, 500];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 px-2 border-t border-slate-200/80 text-xs text-slate-600">
      {/* 1. Page Size Selector Pills */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-500">Per page:</span>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100/70">
          {PAGE_SIZES.map((sz) => (
            <button
              key={sz}
              onClick={() => {
                setPageSize(sz);
                setPage(1);
              }}
              type="button"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                pageSize === sz && !isAll
                  ? 'bg-white text-amber-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {sz}
            </button>
          ))}
          <button
            onClick={() => {
              setPageSize(50000);
              setPage(1);
            }}
            type="button"
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              isAll
                ? 'bg-white text-amber-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* 2. Item Range Summary */}
      <div className="text-slate-500 font-medium">
        {totalItems > 0 ? (
          <span>
            Showing <strong className="text-slate-800">{startIdx}</strong>–<strong className="text-slate-800">{endIdx}</strong> of <strong className="text-slate-800">{totalItems}</strong> leads
          </span>
        ) : (
          <span>0 leads</span>
        )}
      </div>

      {/* 3. Navigation Controls */}
      {!isAll && pageCount > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(1)}
            disabled={currentPage <= 1}
            type="button"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            type="button"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 font-semibold text-slate-700">
            Page {currentPage} of {pageCount}
          </span>

          <button
            onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage >= pageCount}
            type="button"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(pageCount)}
            disabled={currentPage >= pageCount}
            type="button"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
