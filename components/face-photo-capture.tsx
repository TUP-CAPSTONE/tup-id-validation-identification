"use client"

import React, { useRef, useState, useCallback } from "react"
import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  User,
  Smile,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface FacePhotos {
  neutral: string | null
  smile: string | null
  left: string | null
  right: string | null
  up: string | null
  down: string | null
}

interface FacePhotoCaptureProps {
  onPhotosChange: (photos: FacePhotos) => void
  photos: FacePhotos
  disabled?: boolean
}

type PhotoType = keyof FacePhotos

interface PhotoConfig {
  key: PhotoType
  label: string
  instruction: string
  icon: React.ReactNode
}

const photoConfigs: PhotoConfig[] = [
  {
    key: "neutral",
    label: "Neutral",
    instruction: "Look straight at the camera with a neutral expression",
    icon: <User className="w-5 h-5" />,
  },
  {
    key: "smile",
    label: "Slight Smile",
    instruction: "Give a natural, slight smile while looking at the camera",
    icon: <Smile className="w-5 h-5" />,
  },
  {
    key: "left",
    label: "Left View",
    instruction: "Turn your head slightly to show your left side",
    icon: <ArrowLeft className="w-5 h-5" />,
  },
  {
    key: "right",
    label: "Right View",
    instruction: "Turn your head slightly to show your right side",
    icon: <ArrowRight className="w-5 h-5" />,
  },
  {
    key: "up",
    label: "Look Up",
    instruction: "Tilt your head slightly upward while looking at the camera",
    icon: <ArrowUp className="w-5 h-5" />,
  },
  {
    key: "down",
    label: "Look Down",
    instruction: "Tilt your head slightly downward while looking at the camera",
    icon: <ArrowDown className="w-5 h-5" />,
  },
]

export function FacePhotoCapture({
  onPhotosChange,
  photos,
  disabled = false,
}: FacePhotoCaptureProps) {
  const webcamRef = useRef<Webcam>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentConfig = photoConfigs[currentPhotoIndex]
  const completedCount = Object.values(photos).filter(Boolean).length

  const videoConstraints = {
    facingMode: "user",
    width: { ideal: 640 },
    height: { ideal: 480 },
  }

  // Open modal to capture specific photo
  const openCaptureModal = (index: number) => {
    if (disabled) return
    setCurrentPhotoIndex(index)
    setCapturedImage(null)
    setError(null)
    setIsModalOpen(true)
  }

  // Capture photo from webcam
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      if (imageSrc.startsWith("data:image/")) {
        setCapturedImage(imageSrc)
        setError(null)
      } else {
        setError("Failed to capture image. Please try again.")
      }
    }
  }, [])

  // Confirm captured photo
  const handleConfirm = () => {
    if (capturedImage) {
      const newPhotos = { ...photos }
      newPhotos[currentConfig.key] = capturedImage
      onPhotosChange(newPhotos)
      
      // Auto-advance to next uncaptured photo
      const nextIndex = photoConfigs.findIndex(
        (config, idx) => idx > currentPhotoIndex && !photos[config.key]
      )
      
      if (nextIndex !== -1) {
        setCurrentPhotoIndex(nextIndex)
        setCapturedImage(null)
      } else {
        setIsModalOpen(false)
        setCapturedImage(null)
      }
    }
  }

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null)
  }

  // Close modal
  const handleClose = () => {
    setIsModalOpen(false)
    setCapturedImage(null)
    setError(null)
  }

  // Handle webcam errors
  const handleUserMediaError = (err: string | DOMException) => {
    console.error("Camera error:", err)
    setError("Unable to access camera. Please check permissions and try again.")
  }

  // Retake all photos
  const retakeAll = () => {
    onPhotosChange({
      neutral: null,
      smile: null,
      left: null,
      right: null,
      up: null,
      down: null,
    })
  }

  // Remove specific photo
  const removePhoto = (key: PhotoType) => {
    const newPhotos = { ...photos }
    newPhotos[key] = null
    onPhotosChange(newPhotos)
  }

  return (
    <>
      <Card className="border-red-200">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Camera className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-[#b32032]">Face Photo Capture</CardTitle>
              <CardDescription>
                Capture 6 clear photos of your face from different angles
              </CardDescription>
            </div>
            <Badge
              variant={completedCount === 6 ? "default" : "secondary"}
              className={cn(
                "ml-auto",
                completedCount === 6 && "bg-green-500"
              )}
            >
              {completedCount}/6 Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo Thumbnails Grid */}
          <div className="grid grid-cols-3 gap-3">
            {photoConfigs.map((config, index) => (
              <div key={config.key} className="space-y-2">
                <div
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  onClick={() => !disabled && openCaptureModal(index)}
                  onKeyDown={(e) => {
                    if (!disabled && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault()
                      openCaptureModal(index)
                    }
                  }}
                  className={cn(
                    "relative aspect-square w-full rounded-lg overflow-hidden border-2 transition-all hover:border-[#b32032] cursor-pointer",
                    photos[config.key]
                      ? "border-green-500"
                      : "border-gray-200 border-dashed",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {photos[config.key] ? (
                    <>
                      <img
                        src={photos[config.key]!}
                        alt={config.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 right-1">
                        <CheckCircle2 className="w-5 h-5 text-green-500 bg-white rounded-full" />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removePhoto(config.key)
                        }}
                        className="absolute top-1 left-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                        disabled={disabled}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center text-gray-400 p-2">
                      {config.icon}
                      <span className="text-xs mt-1">Click to capture</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-center font-medium text-gray-700">{config.label}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => openCaptureModal(
                photoConfigs.findIndex((config) => !photos[config.key]) !== -1 
                  ? photoConfigs.findIndex((config) => !photos[config.key])
                  : 0
              )}
              className="flex-1 bg-[#b32032] hover:bg-[#951928]"
              disabled={disabled || completedCount === 6}
            >
              <Camera className="w-4 h-4 mr-2" />
              {completedCount === 0 
                ? "Start Capturing" 
                : completedCount < 6 
                  ? `Capture Next (${completedCount}/6)` 
                  : "All Photos Captured"}
            </Button>
            {completedCount > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={retakeAll}
                disabled={disabled}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake All
              </Button>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-900 mb-2">📸 Photo Tips:</p>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Ensure good lighting on your face</li>
              <li>Remove glasses, hats, or anything covering your face</li>
              <li>Position your face in the center of the frame</li>
              <li>Follow the instructions for each photo angle</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Capture Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {currentConfig.icon}
                <h3 className="text-xl font-bold">{currentConfig.label}</h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">{currentConfig.instruction}</p>

            {error && (
              <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p>{error}</p>
                  <p className="text-sm mt-1">Make sure you allow camera access when prompted.</p>
                </div>
              </div>
            )}

            <div className="mb-4 bg-gray-900 rounded-lg overflow-hidden aspect-[4/3]">
              {!capturedImage ? (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  onUserMediaError={handleUserMediaError}
                  className="w-full h-full object-cover"
                  mirrored={true}
                />
              ) : (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Progress indicator */}
            <div className="flex gap-1 mb-4 justify-center">
              {photoConfigs.map((config, idx) => (
                <div
                  key={config.key}
                  className={cn(
                    "w-3 h-3 rounded-full",
                    idx === currentPhotoIndex
                      ? "bg-[#b32032]"
                      : photos[config.key]
                      ? "bg-green-500"
                      : "bg-gray-300"
                  )}
                  title={config.label}
                />
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              {!capturedImage ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={capture}
                    className="bg-[#b32032] hover:bg-[#951928]"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRetake}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Use This Photo
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
