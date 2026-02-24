"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RegistrationRequest } from "@/components/admin-manage-registration-requests"
import { RejectRemarksDialog } from "@/components/admin-reject-remarks-dialog"
import { ImagePreviewPanel } from "@/components/osa-image-preview-panel"
import { cn } from "@/lib/utils"
import { on } from "events"

interface Props {
  request: RegistrationRequest
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionComplete: () => void
  onAcceptSuccess: () => void
  onRejectSuccess: () => void
}

export function ReviewRegistrationDialog({
  request,
  open,
  onOpenChange,
  onActionComplete,
  onAcceptSuccess,
  onRejectSuccess,
}: Props) {
  const [processing, setProcessing] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState("")

  const isFinalized = request.status !== "Pending"

  // Clear preview when dialog closes
  useEffect(() => {
    if (!open) {
      setPreviewImage(null)
      setPreviewTitle("")
    }
  }, [open])

  // Preload images
  useEffect(() => {
    if (!request?.facePhotos) return

    const images = Object.values(request.facePhotos).filter(Boolean) as string[]
    images.forEach((src) => {
      const img = new window.Image()
      img.src = src
    })
  }, [request])

  const handleAccept = async () => {
    if (isFinalized) return

    setProcessing(true)
    try {
      const response = await fetch("/api/admin/manage-requests/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestId: request.id }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        console.error("Accept failed:", data.error)
        alert("Failed to accept registration: " + (data.error || "Unknown error"))
        setProcessing(false)
        return
      }
      
      console.log("Registration accepted successfully")
      onAcceptSuccess()
      // First call the callback to refetch data
      onActionComplete()
      
      // Then close the dialog after a brief delay to ensure data is fetched
      setTimeout(() => {
        onOpenChange(false)
      }, 500)
    } catch (error) {
      console.error("Accept error:", error)
      alert("Error accepting registration: " + String(error))
      setProcessing(false)
    }
  }

  const openPreview = (img: string, title: string) => {
    setPreviewImage(img)
    setPreviewTitle(title)
  }

  const statusColor = {
    Pending: "bg-yellow-100 text-yellow-800",
    Accepted: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
  }[request.status]

  const facePhotoLabels: Record<string, string> = {
    neutral: "Neutral",
    smile: "Smile",
    left: "Left View",
    right: "Right View",
    up: "Look Up",
    down: "Look Down",
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          showCloseButton={false}
          className="w-162.5 max-w-162.5 p-0 overflow-visible outline-none"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Main Form Card */}
          <div className="relative w-full">
            <div className="w-full max-h-[85vh] flex flex-col overflow-hidden rounded-lg border bg-background shadow-lg">
              {/* Header */}
              <div className="p-6 pb-2">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                  <DialogTitle className="flex items-center gap-3">
                    Review Registration Request
                    <Badge className={cn("capitalize px-3 py-1 text-sm", statusColor)}>
                      {request.status}
                    </Badge>
                  </DialogTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogHeader>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6 pt-2">
                {/* Student Info */}
                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                  <Detail label="Full Name" value={request.fullName} />
                  <Detail label="Student Number" value={request.studentNumber} />
                  <Detail label="Email" value={request.email} />
                  <Detail label="Phone" value={request.phone || "—"} />
                  <Detail label="Birth Date" value={request.bday || "—"} />
                  <Detail label="Guardian Email" value={request.guardianEmail || "—"} />
                  <Detail label="Guardian Phone" value={request.guardianPhone || "—"} />
                  <Detail label="College" value={request.college || "—"} />
                  <Detail label="Course" value={request.course || "—"} />
                  <Detail label="Section" value={request.section || "—"} />
                  <Detail
                    label="Requested At"
                    value={
                      request.requestedAt?.seconds
                        ? new Date(request.requestedAt.seconds * 1000).toLocaleString()
                        : "—"
                    }
                  />
                  {request.remarks && (
                    <Detail label="Remarks" value={request.remarks} full />
                  )}
                  {request.reviewedBy && (
                    <Detail label="Reviewed By" value={request.reviewedBy} full />
                  )}
                </div>

                {/* Face Photos Section */}
                {request.facePhotos && Object.values(request.facePhotos).some(Boolean) && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm">Face Photos</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {Object.entries(request.facePhotos).map(
                          ([key, img]) =>
                            img && (
                              <ImageBox
                                key={key}
                                label={facePhotoLabels[key] || key}
                                src={img}
                                onClick={openPreview}
                              />
                            )
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Separator className="my-4" />

                {/* Actions */}
                {!isFinalized && (
                  <div className="flex justify-end gap-3">
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
              </div>
            </div>

            {/* Image Preview Panel (appears to the right) */}
            {previewImage && (
              <div className="absolute left-full top-0 ml-4">
                <ImagePreviewPanel
                  open={!!previewImage}
                  image={previewImage}
                  title={previewTitle}
                  onClose={() => setPreviewImage(null)}
                  staticPosition
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RejectRemarksDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        requestId={request.id}
        onRejected={() => {
          onRejectSuccess()
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

function ImageBox({
  label,
  src,
  onClick,
}: {
  label: string
  src: string
  onClick: (src: string, title: string) => void
}) {
  const [imageError, setImageError] = useState(false)
  
  // Add cache-busting if URL doesn't already have query params
  const srcWithCacheBust = src.includes('?t=') ? src : `${src}${src.includes('?') ? '&' : '?'}t=${Date.now()}`
  
  return (
    <div className="space-y-1 text-center group">
      <p className="text-[10px] font-bold uppercase truncate">{label}</p>
      <div
        className={`relative aspect-square w-full rounded-md overflow-hidden border-2 border-transparent ${
          !imageError ? "cursor-pointer group-hover:border-primary" : "cursor-default"
        }`}
        onClick={() => !imageError && onClick(srcWithCacheBust, label)}
      >
        {imageError ? (
          <div className="flex flex-col items-center justify-center h-full bg-muted">
            <p className="text-[10px] text-muted-foreground text-center px-1">
              Image not available
            </p>
          </div>
        ) : (
          <Image 
            src={srcWithCacheBust}
            alt={label} 
            fill 
            priority 
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
        )}
      </div>
    </div>
  )
}
