"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Camera, CameraOff, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanError?: (error: string) => void
}

export function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScannedRef = useRef(false)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch((err) => console.error("Error stopping scanner:", err))
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setError(null)
      isScannedRef.current = false

      // Initialize scanner
      const html5QrCode = new Html5Qrcode("qr-reader")
      scannerRef.current = html5QrCode

      // Start scanning with config
      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10, // Frames per second
          qrbox: { width: 250, height: 250 }, // QR box size
          aspectRatio: 1.0, // Square aspect ratio
        },
        (decodedText) => {
          // Success callback - prevent multiple scans
          if (!isScannedRef.current) {
            isScannedRef.current = true
            stopScanning()
            onScanSuccess(decodedText)
          }
        },
        (errorMessage) => {
          // Error callback - silent, scanning errors are normal when no QR is in view
        }
      )

      setIsScanning(true)
    } catch (err: any) {
      console.error("Scanner error:", err)
      const errorMsg = err.message || "Failed to start camera"
      setError(errorMsg)
      onScanError?.(errorMsg)
      setIsScanning(false)
    }
  }

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      }
      setIsScanning(false)
    } catch (err) {
      console.error("Error stopping scanner:", err)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Scanner Container */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-300 bg-black">
        {!isScanning && (
          <div className="aspect-square flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
            <div className="text-center space-y-4 p-8">
              <Camera className="w-16 h-16 mx-auto text-slate-400" />
              <p className="text-sm text-slate-600 font-medium">
                Click the button below to start scanning
              </p>
            </div>
          </div>
        )}
        
        {/* QR Reader - html5-qrcode will render video element here */}
        <div
          id="qr-reader"
          className={isScanning ? "block" : "hidden"}
        />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3">
        {!isScanning ? (
          <Button
            onClick={startScanning}
            className="flex-1 h-12 text-base font-semibold"
            size="lg"
          >
            <Camera className="mr-2 h-5 w-5" />
            Start Scanning
          </Button>
        ) : (
          <Button
            onClick={stopScanning}
            variant="destructive"
            className="flex-1 h-12 text-base font-semibold"
            size="lg"
          >
            <CameraOff className="mr-2 h-5 w-5" />
            Stop Scanning
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-900 font-medium mb-2">
          📱 Scanning Instructions:
        </p>
        <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
          <li>Allow camera access when prompted</li>
          <li>Hold the QR code steady within the frame</li>
          <li>Ensure good lighting for best results</li>
          <li>The scanner will automatically detect the QR code</li>
        </ul>
      </div>

      {/* Add global styles for html5-qrcode video element */}
      <style jsx global>{`
        #qr-reader {
          width: 100%;
        }
        #qr-reader video {
          width: 100% !important;
          height: auto !important;
          border-radius: 0;
          display: block;
        }
        #qr-reader__dashboard_section_csr {
          display: none !important;
        }
        #qr-reader__scan_region {
          width: 100% !important;
        }
      `}</style>
    </div>
  )
}