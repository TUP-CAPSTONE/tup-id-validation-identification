"use client"

import { useState } from "react"
import { Loader2, Eye } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RegistrationRequest } from "@/components/admin-manage-registration-requests"
import { ReviewRegistrationDialog } from "@/components/admin-review-registration-dialog"

interface Props {
  requests: RegistrationRequest[]
  loading: boolean
  onRequestsChanged: () => void
}

export function RegistrationRequestsTable({ requests, loading, onRequestsChanged }: Props) {
  const [selected, setSelected] = useState<RegistrationRequest | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <p className="text-gray-500">No registration requests found</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Student No.</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{req.fullName}</TableCell>
                <TableCell>{req.studentNumber}</TableCell>
                <TableCell>
                  {req.createdAt?.seconds
                    ? new Date(req.createdAt.seconds * 1000).toLocaleString()
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <Badge variant={req.status === "accepted" ? "default" : req.status === "rejected" ? "destructive" : "secondary"}>
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelected(req)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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