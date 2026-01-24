"use client"

import { useState } from "react"
import { Eye, Loader2 } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/osa-data-table"
import { ReviewRegistrationDialog } from "@/components/admin-review-registration-dialog"
import { RegistrationRequest } from "@/components/admin-manage-registration-requests"

interface Props {
  requests: RegistrationRequest[]
  loading: boolean
  onRequestsChanged: () => void
}

export function RegistrationRequestsTable({
  requests,
  loading,
  onRequestsChanged,
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

  /* ---------- loading state ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  /* ---------- empty state ---------- */
  if (!requests.length) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No registration requests found
      </div>
    )
  }

  return (
    <>
      <DataTable columns={columns} data={requests} />

      {selected && (
        <ReviewRegistrationDialog
          request={selected}
          open={!!selected}
          onOpenChange={() => setSelected(null)}
          onActionComplete={onRequestsChanged}
        />
      )}
    </>
  )
}
