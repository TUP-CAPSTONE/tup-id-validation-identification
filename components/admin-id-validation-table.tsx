"use client"

import { Eye } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  idPicture: string
  selfiePictures: {
    properHaircut?: string
    hairColor?: string
    // Legacy fields for backward compatibility
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
}: Props) {
  const [selected, setSelected] = useState<ValidationRequest | null>(null)
  const [open, setOpen] = useState(false)

  const handleUpdate = () => {
    setOpen(false)
    setSelected(null)
    if (onUpdate) onUpdate()
  }

  const cellBase = "flex items-center h-full"

  const columns: ColumnDef<ValidationRequest>[] = [
    // STUDENT NAME — SORTABLE
    {
      accessorKey: "studentName",
      header: () => <div className={cellBase}>Student Name</div>,
      cell: ({ row }) => row.original.studentName,
    },

    // NOT SORTABLE
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

    // REQUESTED AT — SORTABLE
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

    // NOT SORTABLE
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

    // NOT SORTABLE
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
      <DataTable
        columns={columns}
        data={requests}
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
      />
    </>
  )
}