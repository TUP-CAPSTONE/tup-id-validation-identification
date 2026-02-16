"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/osa-app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { QRScanner } from "@/components/osa-qr-scanner"
import { StudentModal } from "@/components/osa-qr-student-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, AlertCircle, QrCode } from "lucide-react"
import { toast } from "sonner"

interface StudentInfo {
  id: string
  tupId: string
  name: string
  course: string
  section: string
  email: string
  phone: string
  profilePicture: string | null
  isValidated: boolean
}

interface ScanResult {
  success: boolean
  message: string
  type: "success" | "error" | "warning"
}

export default function ScanValidationPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [qrCodeId, setQrCodeId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const handleScanSuccess = async (qrString: string) => {
    try {
      setIsVerifying(true)
      setScanResult(null)

      // Call verify API
      const response = await fetch("/api/osa/scan-validation/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrString }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429) {
          setScanResult({
            success: false,
            message: "Too many scan attempts. Please wait a moment.",
            type: "warning",
          })
          toast.error("Rate Limit Exceeded", {
            description: "Please wait before scanning again.",
          })
          return
        }

        setScanResult({
          success: false,
          message: data.error || "Failed to verify QR code",
          type: "error",
        })
        toast.error("Verification Failed", {
          description: data.error || "Invalid QR code",
        })
        return
      }

      // Success - show student modal
      setStudentInfo(data.student)
      setQrCodeId(data.qrCodeId)
      setExpiresAt(data.expiresAt)
      setIsModalOpen(true)

      setScanResult({
        success: true,
        message: `QR code verified for ${data.student.name}`,
        type: "success",
      })

    } catch (error: any) {
      console.error("Scan error:", error)
      setScanResult({
        success: false,
        message: "Network error. Please try again.",
        type: "error",
      })
      toast.error("Error", {
        description: "Failed to verify QR code",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleScanError = (error: string) => {
    setScanResult({
      success: false,
      message: error,
      type: "error",
    })
  }

  const handleComplete = async (requirementsComplete: boolean) => {
    try {
      const response = await fetch("/api/osa/scan-validation/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCodeId,
          studentId: studentInfo?.id,
          requirementsComplete,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete validation")
      }

      if (requirementsComplete) {
        toast.success("Validation Complete", {
          description: `${studentInfo?.name} has been successfully validated.`,
        })
        setScanResult({
          success: true,
          message: `${studentInfo?.name} validated successfully`,
          type: "success",
        })
      } else {
        toast.error("Requirements Incomplete", {
          description: "Student needs to complete requirements first.",
        })
        setScanResult({
          success: false,
          message: "Requirements incomplete",
          type: "warning",
        })
      }

      // Reset state
      setStudentInfo(null)
      setQrCodeId(null)
      setExpiresAt(null)

    } catch (error: any) {
      throw new Error(error.message || "Failed to complete validation")
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    // Don't reset studentInfo immediately to allow animation
    setTimeout(() => {
      setStudentInfo(null)
      setQrCodeId(null)
      setExpiresAt(null)
    }, 300)
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "20rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4 z-50">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-lg font-bold">
                  QR Code Validation
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="mx-auto w-full max-w-4xl space-y-6">
            {/* Page Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <QrCode className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">
                      Student ID Validation Scanner
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Scan student QR codes to verify and complete ID validation
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Scan Result Alert */}
            {scanResult && (
              <Alert
                variant={scanResult.type === "error" ? "destructive" : "default"}
                className={
                  scanResult.type === "success"
                    ? "border-green-200 bg-green-50 text-green-900"
                    : scanResult.type === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : ""
                }
              >
                {scanResult.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : scanResult.type === "warning" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription className="font-medium">
                  {scanResult.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Scanner Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">QR Code Scanner</CardTitle>
                <CardDescription>
                  Position the student's QR code within the camera frame
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isVerifying ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                      <p className="text-sm text-slate-600 font-medium">
                        Verifying QR code...
                      </p>
                    </div>
                  </div>
                ) : (
                  <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onScanError={handleScanError}
                  />
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-slate-50 border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Validation Process</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <span>
                      <strong>Scan QR Code:</strong> Ask the student to show
                      their validation QR code from their email
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <span>
                      <strong>Verify Information:</strong> Check that the
                      student's details match their ID and COR
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <span>
                      <strong>Check Requirements:</strong> Ensure student has
                      both their Student ID and Certificate of Registration
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      4
                    </span>
                    <span>
                      <strong>Complete Validation:</strong> If all requirements
                      are met, click "Yes" to validate the student
                    </span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Student Modal */}
        <StudentModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          student={studentInfo}
          qrCodeId={qrCodeId}
          expiresAt={expiresAt}
          onComplete={handleComplete}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}