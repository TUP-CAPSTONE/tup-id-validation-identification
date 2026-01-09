"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RegistrationRequest } from "@/components/admin-manage-registration-requests"
import { RejectRemarksDialog } from "@/components/admin-reject-remarks-dialog"

interface Props {
  request: RegistrationRequest
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionComplete: () => void
}

export function ReviewRegistrationDialog({ request, open, onOpenChange, onActionComplete }: Props) {
  const [processing, setProcessing] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const handleAccept = async () => {
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Registration Request</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            {Object.entries(request).map(([key, value]) => (
              key !== "id" && (
                <div key={key} className="flex justify-between">
                  <span className="font-medium capitalize">{key}</span>
                  <span className="text-gray-600">{String(value)}</span>
                </div>
              )
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="destructive"
              onClick={() => setRejectOpen(true)}
              disabled={processing}
            >
              Reject
            </Button>
            <Button onClick={handleAccept} disabled={processing}>
              {processing ? "Processing..." : "Accept"}
            </Button>
          </div>
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