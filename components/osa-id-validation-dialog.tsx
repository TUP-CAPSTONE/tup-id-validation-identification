"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ImagePreviewPanel } from "./osa-image-preview-panel"
import { ValidationRequest } from "./osa-id-validation-table"
import { toast } from "sonner"
import { on } from "events"

interface Props {
  open: boolean
  onClose: () => void
  request: ValidationRequest | null
  onUpdate: () => void
  onAcceptSuccess: () => void
  onRejectSuccess: () => void
}

export function IdValidationDialog({
  open,
  onClose,
  request,
  onUpdate,
  onAcceptSuccess,
  onRejectSuccess,
}: Props) {
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState("")
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectRemarks, setRejectRemarks] = useState("")
  const [processing, setProcessing] = useState(false)

  // Clear preview when dialog closes
  useEffect(() => {
    if (!open) {
      setPreviewImage(null)
      setPreviewTitle("")
    }
  }, [open])

  // Preload images
  useEffect(() => {
    if (!request) return

    const images = [
      request.idPicture,
      request.corFile,
      ...(request.selfiePictures
        ? Object.values(request.selfiePictures)
        : []),
    ].filter(Boolean) as string[]

    images.forEach((src) => {
      const img = new window.Image()
      img.src = src
    })
  }, [request])

  const formattedRequestedAt = useMemo(() => {
    if (!request?.requestTime) return "N/A"
    return new Date(request.requestTime).toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }, [request?.requestTime])

  if (!request) return null

  const isFinalized =
    request.status === "accepted" || request.status === "rejected"

  const openPreview = (img: string, title: string) => {
    setPreviewImage(img)
    setPreviewTitle(title)
  }

  return (
    <>
      {/* MAIN DIALOG */}
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          showCloseButton={false}
          className="w-162.5 max-w-162.5 p-0 overflow-visible outline-none"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Main Form Card - Fixed Width */}
          <div className="relative w-full">
            
            {/* 1. ACTUAL FORM CARD */}
            <div className="w-full max-h-[85vh] flex flex-col overflow-hidden rounded-lg border bg-background shadow-lg">
              {/* Header */}
              <div className="p-6 pb-2">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                  <DialogTitle>ID Validation Review</DialogTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogHeader>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6 pt-2">
                {/* STUDENT INFO */}
                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                  <Info label="Student Name" value={request.studentName} />
                  <Info label="Requested At" value={formattedRequestedAt} />
                  <Info label="TUP ID" value={request.tupId} />
                  <Info label="Email" value={request.email} />
                  <Info label="Phone Number" value={request.phoneNumber} />
                  <Info label="Status" value={request.status.toUpperCase()} />
                  <Info label="Course" value={request.course || "N/A"} />
                  <Info label="Section" value={request.section || "N/A"} />
                  <Info label="Year Level" value={request.yearLevel || "N/A"} />
                </div>

                <Separator className="my-4" />

                {/* IMAGES */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Submitted Images</h3>

                  <div className="grid grid-cols-5 gap-4">
                    {request.idPicture && (
                      <ImageBox
                        label="TUP ID"
                        src={request.idPicture}
                        onClick={openPreview}
                      />
                    )}

                    {request.corFile && (
                      <ImageBox
                        label="COR"
                        src={request.corFile}
                        onClick={openPreview}
                      />
                    )}

                    {request.selfiePictures &&
                      Object.entries(request.selfiePictures).map(
                        ([key, img]) =>
                          img && (
                            <ImageBox
                              key={key}
                              label={`${key[0].toUpperCase()}${key.slice(1)} Selfie`}
                              src={img as string}
                              onClick={openPreview}
                            />
                          )
                      )}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* ACTIONS */}
                {!isFinalized && (
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={processing}
                    >
                      Reject
                    </Button>

                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      disabled={processing}
                      onClick={async () => {
                        setProcessing(true)
                        try {
                          const res = await fetch(
                            "/api/osa/id-validation/accept",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ requestId: request.id }),
                            }
                          )
                          if (!res.ok) throw new Error()
                          toast.success("Request approved successfully")
                          onAcceptSuccess()
                          onUpdate()
                          onClose()
                        } catch {
                          toast.error("Failed to approve request")
                        } finally {
                          setProcessing(false)
                        }
                      }}
                    >
                      {processing ? "Processing..." : "Accept"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 2. IMAGE PREVIEW PANEL (Absolutely Positioned) */}
            {previewImage && (
              <div className="absolute left-[calc(100%+1.5rem)] top-0 w-100 shrink-0 animate-in fade-in slide-in-from-left-4 duration-300">
                <ImagePreviewPanel
                  open={!!previewImage}
                  image={previewImage}
                  title={previewTitle}
                  onClose={() => setPreviewImage(null)}
                  staticPosition={true}
                />
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>

      {/* REJECT DIALOG */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Validation Request</DialogTitle>
          </DialogHeader>

          <Textarea
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            rows={4}
            placeholder="Enter rejection reason..."
            className="mt-2"
          />

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectRemarks.trim() || processing}
              onClick={async () => {
                setProcessing(true)
                try {
                  const res = await fetch(
                    "/api/osa/id-validation/reject",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ 
                        requestId: request.id,
                        rejectRemarks: rejectRemarks.trim()
                      }),
                    }
                  )
                  if (!res.ok) throw new Error()
                  toast.success("Request rejected successfully")
                  setShowRejectDialog(false)
                  setRejectRemarks("")
                  onUpdate()
                  onClose()
                  onRejectSuccess()
                } catch {
                  toast.error("Failed to reject request")
                } finally {
                  setProcessing(false)
                }
              }}
            >
              {processing ? "Processing..." : "Confirm Rejection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* HELPERS */
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="font-semibold text-xs text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

// ⭐ UPDATED ImageBox with cache-busting and error handling
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