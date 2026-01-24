"use client";

import { Eye, ArrowUpDown } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/osa-data-table";

export type ValidationRequest = {
  requestId: string;
  studentId: string;
  studentName: string;
  tupId: string;
  email: string;
  phoneNumber: string;
  idPicture: string;
  selfiePictures: {
    front: string;
    left: string;
    back: string;
  };
  status: "pending" | "accepted" | "rejected";
  requestTime: string; // ✅ STRING
};

interface Props {
  requests: ValidationRequest[];
}

export function IdValidationTable({ requests }: Props) {
  const cellBase = "flex items-center h-full";

  const columns: ColumnDef<ValidationRequest>[] = [
    {
      accessorKey: "studentName",
      header: ({ column }) => (
        <div className={cellBase}>
          <Button
            variant="ghost"
            className="px-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Student Name
            <ArrowUpDown className="ml-1 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className={cellBase}>{row.original.studentName}</div>
      ),
    },

    {
      accessorKey: "tupId",
      header: () => <div className={cellBase}>TUP ID</div>,
      cell: ({ row }) => <div className={cellBase}>{row.original.tupId}</div>,
      enableSorting: false,
    },

    {
      accessorKey: "email",
      header: () => <div className={cellBase}>Email</div>,
      cell: ({ row }) => <div className={cellBase}>{row.original.email}</div>,
      enableSorting: false,
    },

    {
      accessorKey: "requestTime",
      header: ({ column }) => (
        <div className={cellBase}>
          <Button
            variant="ghost"
            className="px-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Requested At
            <ArrowUpDown className="ml-1 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const date = new Date(row.original.requestTime);

        return (
          <div className={cellBase}>
            {date.toLocaleString("en-PH", {
              month: "short",
              day: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        );
      },
    },

    {
      accessorKey: "status",
      header: () => <div className={cellBase}>Status</div>,
      cell: ({ row }) => (
        <div className={cellBase}>
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
        </div>
      ),
      enableSorting: false,
    },

    {
      id: "action",
      header: () => <div className={`${cellBase} justify-center`}>Action</div>,
      cell: () => (
        <div className={`${cellBase} justify-center`}>
          <Button size="sm" variant="ghost">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ];

  return <DataTable columns={columns} data={requests} />;
}
