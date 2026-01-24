"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  onRejected: () => void
}

export function RejectRemarksDialog({ open, onOpenChange, requestId, onRejected }: Props) {
  const [remarks, setRemarks] = useState("")
  const [loading, setLoading] = useState(false)

  const handleReject = async () => {
    setLoading(true)
    await fetch("/api/admin/manage-requests/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ requestId, remarks }),
    })
    setLoading(false)
    setRemarks("")
    onOpenChange(false)
    onRejected()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejection Remarks</DialogTitle>
        </DialogHeader>

        <Textarea
          placeholder="Enter reason for rejection"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleReject} disabled={!remarks || loading}>
            {loading ? "Submitting..." : "Reject"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}