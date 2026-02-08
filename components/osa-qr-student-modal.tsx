"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  User,
  Mail,
  Phone,
  BookOpen,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

interface StudentModalProps {
  isOpen: boolean
  onClose: () => void
  student: StudentInfo | null
  qrCodeId: string | null
  expiresAt: string | null
  onComplete: (requirementsComplete: boolean) => Promise<void>
}

export function StudentModal({
  isOpen,
  onClose,
  student,
  qrCodeId,
  expiresAt,
  onComplete,
}: StudentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!student) return null

  const handleResponse = async (requirementsComplete: boolean) => {
    try {
      setError(null)
      setIsProcessing(true)
      await onComplete(requirementsComplete)
      
      // Close modal after short delay
      setTimeout(() => {
        onClose()
      }, requirementsComplete ? 2000 : 1000)
    } catch (err: any) {
      setError(err.message || "Failed to process validation")
    } finally {
      setIsProcessing(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Student Validation
          </DialogTitle>
          <DialogDescription>
            Review student information and confirm requirements
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Student Profile Header */}
          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <Avatar className="h-20 w-20 border-2 border-white shadow-md">
              <AvatarImage src={student.profilePicture || undefined} />
              <AvatarFallback className="text-lg font-bold bg-blue-600 text-white">
                {getInitials(student.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900">
                {student.name}
              </h3>
              <p className="text-sm text-slate-600 font-medium mt-1">
                {student.tupId}
              </p>
              
              <div className="mt-2">
                {student.isValidated ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Already Validated
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Pending Validation
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Student Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium">Course</p>
                <p className="text-sm font-semibold text-slate-900">
                  {student.course}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium">Section</p>
                <p className="text-sm font-semibold text-slate-900">
                  {student.section}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 font-medium">Email</p>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {student.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Phone className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium">Phone</p>
                <p className="text-sm font-semibold text-slate-900">
                  {student.phone}
                </p>
              </div>
            </div>
          </div>

          {/* QR Expiration Info */}
          {expiresAt && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">QR Code Expires:</span>{" "}
                {formatDate(expiresAt)}
              </p>
            </div>
          )}

          {/* Requirements Check */}
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <h4 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Requirements Verification
            </h4>
            <p className="text-sm text-blue-800 font-medium mb-4">
              Are the following requirements complete?
            </p>
            <ul className="space-y-2 text-sm text-blue-900">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                Student ID with old semester sticker
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                Certificate of Registration (COR)
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => handleResponse(false)}
              variant="outline"
              className="flex-1 h-12 font-semibold"
              disabled={isProcessing}
            >
              <XCircle className="mr-2 h-5 w-5" />
              No - Incomplete
            </Button>
            
            <Button
              onClick={() => handleResponse(true)}
              className="flex-1 h-12 font-semibold bg-green-600 hover:bg-green-700"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Yes - Complete
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}