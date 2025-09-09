import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchColumn?: string;
  searchPlaceholder?: string;
  globalFilter?: boolean;
  employees?: any[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = "Search...",
  globalFilter = false,
  employees = []
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilterValue, setGlobalFilterValue] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilterValue,
    onPaginationChange: setPagination,
    enableGlobalFilter: true,
    globalFilterFn: (row, columnId, value) => {
      if (!value || value.trim() === '') return true;
      
      const searchTerm = String(value).toLowerCase().trim();
      const rowData = row.original as any;
      
      // Create a comprehensive search string from all relevant fields
      let searchableContent = '';
      
      // Handle attendance report data (has nested user object)
      if (rowData?.user) {
        const user = rowData.user;
        searchableContent = [
          user.firstName || '',
          user.lastName || '',
          user.email || '',
          user.position || '',
          user.username || '',
          `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        ].filter(Boolean).join(' ').toLowerCase();
      } else {
        // Handle direct employee data or other structures
        searchableContent = [
          rowData.firstName || '',
          rowData.lastName || '',
          rowData.employeeName || '', // Added for attendance records
          rowData.email || '',
          rowData.position || '',
          rowData.username || '',
          rowData.type || '',
          rowData.reason || '',
          rowData.status || '',
          `${rowData.firstName || ''} ${rowData.lastName || ''}`.trim(),
        ].filter(Boolean).join(' ').toLowerCase();
      }
      
      // Perform the search
      return searchableContent.includes(searchTerm);
    },
    state: {
      sorting,
      columnFilters,
      globalFilter: globalFilterValue,
      pagination,
    },
  });

  return (
    <div>
      {/* Table search and filters */}
      {(searchColumn || globalFilter) && (
        <div className="flex items-center py-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ? (globalFilterValue ?? "") : (table.getColumn(searchColumn!)?.getFilterValue() as string) ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                if (globalFilter) {
                  setGlobalFilterValue(value);
                  table.setGlobalFilter(value);
                } else {
                  table.getColumn(searchColumn!)?.setFilterValue(value);
                }
              }}
              className="max-w-sm pl-8"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-slate-700">
            Rows per page:
          </p>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(value) => {
              table.setPageSize(parseInt(value));
            }}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue placeholder={pagination.pageSize.toString()} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="text-sm text-slate-700">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
