"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Loader2,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  hasMore: boolean
  lastRequestId: string | null
  onPageChange: (cursor: string | null) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
  statusFilter?: string
  onStatusFilterChange: (status: string | undefined) => void
  sortBy: string
  sortOrder: "asc" | "desc"
  onSortChange: (column: string, order: "asc" | "desc") => void
  loading: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  hasMore,
  lastRequestId,
  onPageChange,
  pageSize,
  onPageSizeChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  sortOrder,
  onSortChange,
  loading,
}: DataTableProps<TData, TValue>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageHistory, setPageHistory] = useState<(string | null)[]>([null])

  // Reset to page 1 when filters or page size changes
  useEffect(() => {
    setCurrentPage(1)
    setPageHistory([null])
  }, [statusFilter, pageSize])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  })

  const handleNextPage = () => {
    if (hasMore && lastRequestId) {
      setCurrentPage((prev) => prev + 1)
      setPageHistory((prev) => [...prev, lastRequestId])
      onPageChange(lastRequestId)
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      const newHistory = [...pageHistory]
      newHistory.pop() // Remove current page
      setPageHistory(newHistory)
      const cursor = newHistory[newHistory.length - 1]
      onPageChange(cursor)
    }
  }

  const handleSortToggle = (column: string) => {
    if (sortBy === column) {
      // Toggle order
      const newOrder = sortOrder === "asc" ? "desc" : "asc"
      onSortChange(column, newOrder)
    } else {
      // New column, default to desc
      onSortChange(column, "desc")
    }
  }

  return (
    <div>
      {/* STATUS FILTER */}
      <div className="mb-3 flex items-center gap-3">
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) => {
            onStatusFilterChange(value === "all" ? undefined : value)
          }}
        >
          <SelectTrigger className="font-bold w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-bold">
              All statuses
            </SelectItem>
            <SelectItem value="pending" className="font-bold text-yellow-600">
              Pending
            </SelectItem>
            <SelectItem value="accepted" className="font-bold text-green-600">
              Accepted
            </SelectItem>
            <SelectItem value="rejected" className="font-bold text-red-600">
              Rejected
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnKey = header.column.id
                  const isSortable = ["studentName", "yearLevel", "requestTime"].includes(columnKey)

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : isSortable ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => handleSortToggle(columnKey)}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <ArrowUpDown
                            className={`h-4 w-4 ${
                              sortBy === columnKey ? "text-primary" : ""
                            }`}
                          />
                        </Button>
                      ) : (
                        <div className="text-center font-semibold">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </div>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-muted-foreground text-sm">
          Page {currentPage} {hasMore && "of many"}
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-17.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 25, 30, 40, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextPage}
              disabled={!hasMore || loading}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}