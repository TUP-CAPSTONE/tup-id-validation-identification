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
import { ref, getDownloadURL, uploadBytes, deleteObject, getBlob, getMetadata } from "firebase/storage"

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
   * Copy images from ID_Validation_Files to Validation_Success folder (same bucket)
   */
  const copyImagesToValidatedFolder = async (): Promise<{
    cor: string;
    idPicture: string;
    selfiePictures: {
      front: string;
      left: string;
      back: string;
    };
  }> => {
    console.log('Copying images from ID_Validation_Files to Validation_Success...');
    console.log('Request data:', {
      cor: request.corFile || request.cor,
      idPicture: request.idPicture,
      selfiePictures: request.selfiePictures
    });
    
    // Validate all required fields exist
    const corSourceUrl = request.corFile || request.cor;
    if (!corSourceUrl) {
      throw new Error('COR file URL is missing');
    }
    if (!request.idPicture) {
      throw new Error('ID Picture URL is missing');
    }
    if (!request.selfiePictures?.front || !request.selfiePictures?.left || !request.selfiePictures?.back) {
      throw new Error('One or more selfie pictures are missing');
    }
    
    // Use same bucket, different folder
    const basePath = `Validation_Success/${request.tupId}`;
    
    // Helper function to copy a file using Firebase Storage references
    const copyFile = async (sourceUrl: string, destinationPath: string): Promise<string> => {
      console.log(`\n[COPY] Starting copy: ${destinationPath}`);
      console.log(`[COPY] Source URL: ${sourceUrl}`);
      
      // Validate URL
      if (!sourceUrl || typeof sourceUrl !== 'string') {
        console.error(`[COPY] Invalid source URL type: ${typeof sourceUrl}`);
        throw new Error(`Invalid source URL: ${sourceUrl}`);
      }
      
      // Check if it's a valid URL
      if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
        console.error(`[COPY] Source URL is not HTTP(S): ${sourceUrl.substring(0, 100)}`);
        throw new Error(`Source URL must be a valid HTTP/HTTPS URL. Got: ${sourceUrl.substring(0, 100)}`);
      }
      
      try {
        // Extract the storage path from the URL
        const urlObj = new URL(sourceUrl);
        const pathMatch = urlObj.pathname.match(/o\/(.+?)(\?|$)/);
        
        if (!pathMatch) {
          console.error(`[COPY] Could not parse storage path from URL`);
          throw new Error(`Could not extract storage path from URL: ${sourceUrl}`);
        }
        
        const sourcePath = decodeURIComponent(pathMatch[1]);
        console.log(`[COPY] Extracted source path: ${sourcePath}`);
        console.log(`[COPY] Destination path: ${destinationPath}`);
        
        // Check if file is already in Validation_Success folder (already approved)
        if (sourcePath.startsWith('Validation_Success/')) {
          console.log(`[COPY] File already in Validation_Success, returning existing URL`);
          return sourceUrl;
        }
        
        // Both are in same bucket
        const sourceRef = ref(storage, sourcePath);
        
        // Check if source file exists
        console.log(`[COPY] Checking if source file exists...`);
        try {
          const metadata = await getMetadata(sourceRef);
          console.log(`[COPY] Source file exists: ${metadata.size} bytes`);
        } catch (err: any) {
          if (err.code === 'storage/object-not-found') {
            console.warn(`[COPY] Source file not found at: ${sourcePath}`);
            console.warn(`[COPY] This is expected for old requests - returning original URL`);
            return sourceUrl;
          }
          throw err;
        }
        
        // Download the blob from source
        console.log(`[COPY] Downloading blob from source...`);
        const blob = await getBlob(sourceRef);
        console.log(`[COPY] Downloaded: ${blob.size} bytes, type: ${blob.type}`);
        
        // Upload to destination in same bucket
        console.log(`[COPY] Uploading to destination: ${destinationPath}`);
        const destRef = ref(storage, destinationPath);
        const uploadResult = await uploadBytes(destRef, blob);
        console.log(`[COPY] Upload successful`);
        
        // Get the new download URL
        const newUrl = await getDownloadURL(uploadResult.ref);
        console.log(`[COPY] ✓ File copied successfully`);
        console.log(`[COPY] New URL: ${newUrl}`);
        return newUrl;
      } catch (error: any) {
        console.error(`[COPY] ✗ Error during copy:`, error);
        console.error(`[COPY] Error code:`, error.code);
        console.error(`[COPY] Error message:`, error.message);
        throw new Error(`Failed to copy file to ${destinationPath}: ${error.message}`);
      }
    };
    
    // Copy all images to Validation_Success folder
    const [corUrl, idPictureUrl, frontUrl, leftUrl, backUrl] = await Promise.all([
      copyFile(corSourceUrl, `${basePath}/cor.pdf`),
      copyFile(request.idPicture, `${basePath}/id-picture.jpg`),
      copyFile(request.selfiePictures.front, `${basePath}/selfie-front.jpg`),
      copyFile(request.selfiePictures.left, `${basePath}/selfie-left.jpg`),
      copyFile(request.selfiePictures.back, `${basePath}/selfie-back.jpg`),
    ]);
    
    console.log('✓ All images copied to Validation_Success folder');
    
    return {
      cor: corUrl,
      idPicture: idPictureUrl,
      selfiePictures: {
        front: frontUrl,
        left: leftUrl,
        back: backUrl,
      },
    };
  };

  /**
   * Delete images from ID_Validation_Files folder
   */
  const deleteImagesFromOngoingFolder = async () => {
    console.log('Deleting images from ID_Validation_Files...');
    
    try {
      // Extract file paths from URLs and delete them
      const deleteFile = async (url: string) => {
        try {
          // Extract path from Firebase Storage URL
          const urlObj = new URL(url);
          const pathMatch = urlObj.pathname.match(/o\/(.+?)(\?|$)/);
          if (pathMatch) {
            const filePath = decodeURIComponent(pathMatch[1]);
            const fileRef = ref(storage, filePath);
            await deleteObject(fileRef);
            console.log(`  Deleted: ${filePath}`);
          }
        } catch (err) {
          console.warn('Could not delete file:', url, err);
        }
      };
      
      await Promise.all([
        deleteFile(request.corFile || request.cor),
        deleteFile(request.idPicture),
        deleteFile(request.selfiePictures.front),
        deleteFile(request.selfiePictures.left),
        deleteFile(request.selfiePictures.back),
      ]);
      
      console.log('✓ Old images deleted from ID_Validation_Files');
    } catch (error) {
      console.error('Error deleting old images:', error);
      // Don't throw - deletion failure shouldn't block approval
    }
  };

  /**
   * Approve the validation request
   */
  const handleApprove = async () => {
    if (!request.id) return

    setProcessing(true)
    try {
      console.log('Starting approval process...');
      console.log('Request ID:', request.id);
      console.log('Request data:', request);
      
      // Simply update request status to accepted
      // Keep the existing URLs (they're already in Firebase Storage)
      const requestRef = doc(db, 'validation_requests2', request.id);
      
      console.log('Updating Firestore document...');
      await updateDoc(requestRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        rejectRemarks: null,
      });
      
      console.log('✓ Request status updated to accepted');

      alert('Request approved successfully!');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request: ' + (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

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

            <div>
              <p className="font-semibold">Course</p>
              <p>{request.course || 'N/A'}</p>
            </div>

            <div>
              <p className="font-semibold">Section</p>
              <p>{request.section || 'N/A'}</p>
            </div>

            <div>
              <p className="font-semibold">Year Level</p>
              <p>{request.yearLevel || 'N/A'}</p>
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
              {request.selfiePictures && Object.entries(request.selfiePictures).map(([key, img]) => (
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
