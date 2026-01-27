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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center">
          <Image
            src={image}
            alt={title}
            width={700}
            height={700}
            className="rounded-lg object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
