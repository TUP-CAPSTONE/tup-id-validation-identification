"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RegistrationRequest } from "@/components/admin-manage-registration-requests"
import { RejectRemarksDialog } from "@/components/admin-reject-remarks-dialog"
import { cn } from "@/lib/utils"

interface Props {
  request: RegistrationRequest
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionComplete: () => void
}

export function ReviewRegistrationDialog({
  request,
  open,
  onOpenChange,
  onActionComplete,
}: Props) {
  const [processing, setProcessing] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const isFinalized = request.status !== "Pending"

  const handleAccept = async () => {
    if (isFinalized) return

    setProcessing(true)
    await fetch("/api/admin/manage-requests/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ requestId: request.id }),
    })
    setProcessing(false)
    onOpenChange(false)
    onActionComplete()
  }

  const statusColor = {
    Pending: "bg-yellow-100 text-yellow-800",
    Accepted: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
  }[request.status]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8 text-xl font-bold">
              Review Registration Request
              <Badge className={cn("capitalize px-3 py-1 text-sm", statusColor)}>
                {request.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Details */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-lg">
            <Detail label="Full Name" value={`${request.firstName} ${request.lastName}`} />
            <Detail label="Student Number" value={request.studentNumber} />
            <Detail label="Section" value={request.section} />
            <Detail label="Course" value={request.course} />
            <Detail label="Year Level" value={String(request.yearLevel)} />
            <Detail label="Phone" value={request.phone} />
            <Detail
              label="Requested At"
              value={new Date(request.requestedAt.seconds * 1000).toLocaleString()}
              full
            />
            <Detail label="Remarks" value={request.remarks || "—"} full />
            <Detail label="Reviewed By" value={request.reviewedBy || "—"} full />
          </div>

          {/* Actions */}
          {!isFinalized && (
            <div className="flex justify-end gap-2 pt-6">
              <Button
                variant="destructive"
                onClick={() => setRejectOpen(true)}
                disabled={processing}
              >
                Reject
              </Button>
              <Button 
                onClick={handleAccept} 
                disabled={processing}
                className="bg-green-600 hover:bg-green-700 text-white"
                >
                {processing ? "Processing..." : "Accept"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RejectRemarksDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        requestId={request.id}
        onRejected={() => {
          onOpenChange(false)
          onActionComplete()
        }}
      />
    </>
  )
}

function Detail({
  label,
  value,
  full = false,
}: {
  label: string
  value: string
  full?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", full && "col-span-2")}>
      <span className="text-sm font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="text-lg font-medium">{value}</span>
    </div>
  )
}
