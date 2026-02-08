"use client"

import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Props {
  open: boolean
  onClose: () => void
  image: string
  title: string
}

export function ImagePreviewDialog({
  open,
  onClose,
  image,
  title,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* 
        We intentionally DO NOT use the default centered modal behavior.
        This dialog is a SIDE PANEL that sits beside the main dialog.
      */}
      <DialogContent
        className="
          fixed
          right-4
          top-1/2
          -translate-y-1/2
          h-[90vh]
          w-130
          max-w-none
          rounded-xl
          shadow-xl
          p-4
        "
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-sm font-semibold">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center h-full">
          <Image
            src={image}
            alt={title}
            width={900}
            height={900}
            className="max-h-full max-w-full object-contain rounded-lg"
            priority
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
