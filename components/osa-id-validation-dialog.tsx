"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ImagePreviewDialog } from "./osa-image-preview-dialog"
import { ValidationRequest } from "./osa-id-validation-table"
import { db, storage } from "@/lib/firebaseConfig"
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore"
import { ref, uploadString } from "firebase/storage"

interface Props {
  open: boolean
  onClose: () => void
  request: ValidationRequest | null
  onUpdate: () => void
}

export function IdValidationDialog({ open, onClose, request, onUpdate }: Props) {
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState("")
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectRemarks, setRejectRemarks] = useState("")
  const [processing, setProcessing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!request) return null

  const openPreview = (img: string, title: string) => {
    setPreviewImage(img)
    setPreviewTitle(title)
  }

  /**
   * Upload images to Firebase Storage
   */
  const uploadImagesToStorage = async () => {
    const uploadPromises = []
    const basePath = `validated-ids/${request.tupId}`

    // Upload COR (stored as 'cor' in Firestore)
    const corData = request.corFile || request.cor
    if (corData) {
      const corRef = ref(storage, `${basePath}/cor`)
      uploadPromises.push(uploadString(corRef, corData, 'data_url'))
    }

    // Upload ID Picture
    if (request.idPicture) {
      const idRef = ref(storage, `${basePath}/id-picture`)
      uploadPromises.push(uploadString(idRef, request.idPicture, 'data_url'))
    }

    // Upload Selfies
    const selfies = request.selfiePictures
    if (selfies.front) {
      const frontRef = ref(storage, `${basePath}/selfie-front`)
      uploadPromises.push(uploadString(frontRef, selfies.front, 'data_url'))
    }
    if (selfies.left) {
      const leftRef = ref(storage, `${basePath}/selfie-left`)
      uploadPromises.push(uploadString(leftRef, selfies.left, 'data_url'))
    }
    if (selfies.back) {
      const backRef = ref(storage, `${basePath}/selfie-back`)
      uploadPromises.push(uploadString(backRef, selfies.back, 'data_url'))
    }

    await Promise.all(uploadPromises)
  }

  /**
   * Approve the validation request
   */
  const handleApprove = async () => {
    if (!request.id) return

    setProcessing(true)
    try {
      // Upload images to Firebase Storage
      await uploadImagesToStorage()

      // Update request status to accepted
      const requestRef = doc(db, 'validation_requests2', request.id)
      await updateDoc(requestRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        rejectRemarks: null
      })

      alert('Request accepted successfully!')
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error approving request:', error)
      alert('Failed to approve request')
    } finally {
      setProcessing(false)
    }
  }

  /**
   * Reject the validation request
   */
  const handleReject = async () => {
    if (!request.id || !rejectRemarks.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setProcessing(true)
    try {
      const requestRef = doc(db, 'validation_requests2', request.id)
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectRemarks: rejectRemarks.trim()
      })

      alert('Request rejected')
      setShowRejectDialog(false)
      setRejectRemarks("")
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('Failed to reject request')
    } finally {
      setProcessing(false)
    }
  }

  /**
   * Delete the validation request
   */
  const handleDelete = async () => {
    if (!request.id) return

    setProcessing(true)
    try {
      const requestRef = doc(db, 'validation_requests2', request.id)
      await deleteDoc(requestRef)

      alert('Request deleted successfully')
      setShowDeleteConfirm(false)
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error deleting request:', error)
      alert('Failed to delete request')
    } finally {
      setProcessing(false)
    }
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
              {request.idPicture && (
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
              )}

              {/* COR */}
              {request.corFile ? (
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
              ) : (
                <div className="space-y-1 text-center">
                  <p className="text-xs">COR</p>
                  <p className="text-gray-500 italic">No COR image</p>
                </div>
              )}

              {/* SELFIES */}
              {Object.entries(request.selfiePictures).map(([key, img]) => (
                img && (
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
                )
              ))}
            </div>
          </div>

          <Separator />

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={processing}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Delete
            </Button>
            
            <Button 
              variant="destructive"
              onClick={() => setShowRejectDialog(true)}
              disabled={processing}
            >
              Reject
            </Button>

            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Accept'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* REJECT DIALOG */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Validation Request</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason for Rejection
              </label>
              <Textarea
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="Enter the reason why this request is being rejected..."
                rows={4}
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowRejectDialog(false)
                  setRejectRemarks("")
                }}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleReject}
                disabled={processing || !rejectRemarks.trim()}
              >
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Validation Request</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this validation request? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDelete}
                disabled={processing}
              >
                {processing ? 'Deleting...' : 'Delete Request'}
              </Button>
            </div>
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
