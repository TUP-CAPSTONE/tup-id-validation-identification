"use client"

import { useState } from "react"
import { Eye } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminDataTable } from "@/components/admin-data-table"
import { ReviewRegistrationDialog } from "@/components/admin-review-registration-dialog"
import { RegistrationRequest } from "@/components/admin-manage-registration-requests"

interface Props {
  requests: RegistrationRequest[]
  loading: boolean
  onRequestsChanged: () => void
  hasMore: boolean
  lastRequestId: string | null
  onPageChange: (cursor: string | null) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
  statusFilter?: string
  onStatusFilterChange: (status: string | undefined) => void
  onAcceptSuccess: () => void  
  onRejectSuccess: () => void  
}

export function RegistrationRequestsTable({
  requests,
  loading,
  onRequestsChanged,
  hasMore,
  lastRequestId,
  onPageChange,
  pageSize,
  onPageSizeChange,
  statusFilter,
  onStatusFilterChange,
  onAcceptSuccess,
  onRejectSuccess,
}: Props) {
  const [selected, setSelected] = useState<RegistrationRequest | null>(null)

  const columns: ColumnDef<RegistrationRequest>[] = [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "studentNumber",
      header: "Student No.",
    },
    {
      accessorKey: "requestedAt",
      header: "Requested",
      cell: ({ row }) => {
        const requestedAt = row.original.requestedAt
        return requestedAt?.seconds
          ? new Date(requestedAt.seconds * 1000).toLocaleString()
          : "N/A"
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status

        const statusConfig = {
          Accepted: "bg-green-600 hover:bg-green-600 text-white",
          Rejected: "bg-red-500 hover:bg-red-600 text-white",
          Pending: "bg-yellow-500 hover:bg-yellow-600 text-black",
        }

        return (
          <Badge
            className={statusConfig[status] || "bg-gray-500"}
          >
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "actions",
      header: () => <div className="flex justify-center">Action</div>,
      cell: ({ row }) => (
        <div className="text-center font-semibold">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(row.original)}
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
      <AdminDataTable
        columns={columns}
        data={requests}
        hasMore={hasMore}
        lastRequestId={lastRequestId}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        loading={loading}
      />

      {selected && (
        <ReviewRegistrationDialog
          request={selected}
          open={!!selected}
          onOpenChange={() => setSelected(null)}
          onActionComplete={onRequestsChanged}
          onAcceptSuccess={onAcceptSuccess}
          onRejectSuccess={onRejectSuccess}
        />
      )}
    </>
  )
}