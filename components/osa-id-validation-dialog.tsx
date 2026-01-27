"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ImagePreviewDialog } from "./osa-image-preview-dialog"
import { ValidationRequest } from "./osa-id-validation-table"

interface Props {
  open: boolean
  onClose: () => void
  request: ValidationRequest | null
}

export function IdValidationDialog({ open, onClose, request }: Props) {
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState("")

  if (!request) return null

  const openPreview = (img: string, title: string) => {
    setPreviewImage(img)
    setPreviewTitle(title)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>ID Validation Review</DialogTitle>
          </DialogHeader>

          {/* STUDENT INFO */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Student Name</p>
              <p>{request.studentName}</p>
            </div>

            <div>
              <p className="font-semibold">Requested At</p>
              <p>{request.requestTime}</p>
            </div>

            <div>
              <p className="font-semibold">TUP ID</p>
              <p>{request.tupId}</p>
            </div>

            <div>
              <p className="font-semibold">Email</p>
              <p>{request.email}</p>
            </div>

            <div>
              <p className="font-semibold">Phone Number</p>
              <p>{request.phoneNumber}</p>
            </div>

            <div>
              <p className="font-semibold">Status</p>
              <p className="uppercase">{request.status}</p>
            </div>
          </div>

          <Separator />

          {/* IMAGES */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Submitted Images</h3>

            <div className="grid grid-cols-4 gap-4">
              {/* ID */}
              <div className="space-y-1 text-center">
                <p className="text-xs">TUP ID</p>
                <Image
                  src={request.idPicture}
                  alt="ID"
                  width={150}
                  height={150}
                  className="rounded-md cursor-pointer hover:opacity-80"
                  onClick={() => openPreview(request.idPicture, "TUP ID")}
                />
              </div>

              {/* COR */}
              <div className="space-y-1 text-center">
                <p className="text-xs">COR</p>
                <Image
                  src={request.corFile}
                  alt="COR"
                  width={150}
                  height={150}
                  className="rounded-md cursor-pointer hover:opacity-80"
                  onClick={() => openPreview(request.corFile, "COR")}
                />
              </div>

              {/* SELFIES */}
              {Object.entries(request.selfiePictures).map(([key, img]) => (
                <div key={key} className="space-y-1 text-center">
                  <p className="text-xs capitalize">{key} selfie</p>
                  <Image
                    src={img}
                    alt={key}
                    width={150}
                    height={150}
                    className="rounded-md cursor-pointer hover:opacity-80"
                    onClick={() => openPreview(img, `${key} selfie`)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3">
            <Button variant="destructive">Reject</Button>

            <Button className="bg-green-600 hover:bg-green-700">Accept</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* IMAGE ZOOM */}
      {previewImage && (
        <ImagePreviewDialog
          open={!!previewImage}
          onClose={() => setPreviewImage(null)}
          image={previewImage}
          title={previewTitle}
        />
      )}
    </>
  );
}
