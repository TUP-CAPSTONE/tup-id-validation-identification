"use client"

import { ColumnDef } from "@tanstack/react-table"
import Image from "next/image"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Requests = {
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
  status: "pending" | "accepted" | "rejected"
  requestTime: string
}

export const columns: ColumnDef<Requests>[] = [
  {
    accessorKey: "studentName",
    header: "Student Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "tupId",
    header: "TUP ID",
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone Number",
  },
  {
    accessorKey: "idPicture",
    header: "ID Picture",
    cell: ({ row }) => (
      <img
        src={`data:image/jpeg;base64,${row.getValue("idPicture")}`}
        alt="ID"
        width={50}
        height={50}
        className="rounded"
      />
    ),
  },
  {
    accessorKey: "selfiePictures",
    header: "Selfies",
    cell: ({ row }) => {
      const selfies = row.getValue("selfiePictures") as Requests["selfiePictures"]
      return (
        <div className="flex gap-2">
          <img
            src={`data:image/jpeg;base64,${selfies.front}`}
            alt="Front"
            width={40}
            height={40}
            className="rounded"
          />
          <img
            src={`data:image/jpeg;base64,${selfies.left}`}
            alt="Left"
            width={40}
            height={40}
            className="rounded"
          />
          <img
            src={`data:image/jpeg;base64,${selfies.back}`}
            alt="Back"
            width={40}
            height={40}
            className="rounded"
          />
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "requestTime",
    header: "Request Time",
  },
]