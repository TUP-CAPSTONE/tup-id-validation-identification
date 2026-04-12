"use client"

import { Eye, Search } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { useState, useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/osa-data-table"
import { AdminIdValidationDialog } from "@/components/admin-id-validation-dialog"

export type ValidationRequest = {
  id?: string
  requestId: string
  studentId: string
  studentName: string
  tupId: string
  email: string
  phoneNumber: string
  course: string
  section: string
  yearLevel: string
  college: string
  idPicture: string
  selfiePictures: {
    properHaircut?: string
    hairColor?: string
    front?: string
    left?: string
    back?: string
  }
  corFile: string
  status: "pending" | "accepted" | "rejected"
  requestTime: string
  rejectRemarks?: string
}

interface Props {
  requests: ValidationRequest[]
  onUpdate?: () => void
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
  onAcceptSuccess: () => void
  onRejectSuccess: () => void
}

export function AdminIdValidationTable({
  requests,
  onUpdate,
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
  onAcceptSuccess,
  onRejectSuccess,
}: Props) {
  const [selected, setSelected] = useState<ValidationRequest | null>(null)
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return requests
    return requests.filter(
      (r) =>
        r.studentName?.toLowerCase().includes(q) ||
        r.tupId?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q)
    )
  }, [requests, searchQuery])

  const handleUpdate = () => {
    setOpen(false)
    setSelected(null)
    if (onUpdate) onUpdate()
  }

  const cellBase = "flex items-center h-full"

  const columns: ColumnDef<ValidationRequest>[] = [
    {
      accessorKey: "studentName",
      header: () => <div className={cellBase}>Student Name</div>,
      cell: ({ row }) => row.original.studentName,
    },
    {
      accessorKey: "tupId",
      header: () => <div className={cellBase}>TUP ID</div>,
      enableSorting: false,
    },
    {
      accessorKey: "email",
      header: () => <div className={cellBase}>Email</div>,
      enableSorting: false,
    },
    {
      accessorKey: "yearLevel",
      header: () => <div className={cellBase}>Year Level</div>,
      cell: ({ row }) => row.original.yearLevel,
    },
    {
      accessorKey: "requestTime",
      header: () => <div className={cellBase}>Requested At</div>,
      cell: ({ row }) => {
        const date = new Date(row.original.requestTime)
        return date.toLocaleString("en-PH", {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      },
    },
    {
      accessorKey: "status",
      header: () => <div className={cellBase}>Status</div>,
      cell: ({ row }) => (
        <Badge
          className={
            row.original.status === "pending"
              ? "bg-yellow-500 text-black"
              : row.original.status === "accepted"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }
        >
          {row.original.status.toUpperCase()}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      id: "action",
      header: () => <div className="flex justify-center">Action</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelected(row.original)
              setOpen(true)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ]

  return (
    <>
      {/* Search Bar */}
      <div className="relative w-full max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          placeholder="Search by name, TUP ID, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredRequests}
        hasMore={hasMore}
        lastRequestId={lastRequestId}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        loading={loading}
      />

      <AdminIdValidationDialog
        open={open}
        onClose={() => setOpen(false)}
        request={selected}
        onUpdate={handleUpdate}
        onAcceptSuccess={onAcceptSuccess}
        onRejectSuccess={onRejectSuccess}
      />
    </>
  )
}