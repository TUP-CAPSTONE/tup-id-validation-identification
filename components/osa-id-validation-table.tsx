"use client"

import { Eye, ArrowUpDown } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/osa-data-table"
import { IdValidationDialog } from "./osa-id-validation-dialog"

export type ValidationRequest = {
  id?: string
  requestId: string
  studentId: string
  studentName: string
  tupId: string
  email: string
  phoneNumber: string
  idPicture: string
  selfiePictures: {
    front: string
    left: string
    back: string
  }
  corFile: string;
  status: "pending" | "accepted" | "rejected"
  requestTime: string
  rejectRemarks?: string
}

interface Props {
  requests: ValidationRequest[]
  onUpdate?: () => void
}

export function IdValidationTable({ requests, onUpdate }: Props) {
  const [selected, setSelected] =
    useState<ValidationRequest | null>(null)
  const [open, setOpen] = useState(false)

  const handleUpdate = () => {
    setOpen(false)
    setSelected(null)
    if (onUpdate) onUpdate()
  }

  const cellBase = "flex items-center h-full"
  const sortableHeader =
    "flex items-center gap-1 cursor-pointer select-none hover:text-primary"

  const columns: ColumnDef<ValidationRequest>[] = [
    // ✅ STUDENT NAME — SORTABLE
    {
      accessorKey: "studentName",
      header: ({ column }) => (
        <div
          className={`${cellBase} ${sortableHeader}`}
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === "asc")
          }
        >
          Student Name
          <ArrowUpDown className="h-4 w-4" />
        </div>
      ),
      cell: ({ row }) => row.original.studentName,
    },

    // ❌ NOT SORTABLE
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

    // ✅ REQUESTED AT — SORTABLE
    {
      accessorKey: "requestTime",
      header: ({ column }) => (
        <div
          className={`${cellBase} ${sortableHeader}`}
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === "asc")
          }
        >
          Requested At
          <ArrowUpDown className="h-4 w-4" />
        </div>
      ),
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

    // ❌ NOT SORTABLE
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

    // ❌ NOT SORTABLE
    {
      id: "action",
      header: () => (
        <div className="flex justify-center">Action</div>
      ),
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
      <DataTable columns={columns} data={requests} />

      <IdValidationDialog
        open={open}
        onClose={() => setOpen(false)}
        request={selected}
        onUpdate={handleUpdate}
      />
    </>
  )
}
