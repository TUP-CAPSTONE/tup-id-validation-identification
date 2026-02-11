// types/validation.ts

export interface ValidationRequest {
  id: string
  studentId: string
  tupId: string
  studentName: string
  email: string
  course: string
  section: string
  status: "pending" | "accepted" | "rejected"
  acceptedAt?: string
  expiresAt?: string
  qrCodeId?: string
  reviewedBy?: string
  lastQRResent?: {
    resentBy: string
    resentAt: string
    expirationDays: number
  }
}

export interface QRCodeData {
  id: string
  studentId: string
  qrToken: string
  expiresAt: Date
  isUsed: boolean
  createdAt: Date
  studentInfo: {
    tupId: string
    name: string
    course: string
    section: string
  }
  resendInfo?: {
    isResend: boolean
    resentBy: string
    resentAt: Date
    previousQRCodeId: string | null
  }
  invalidatedAt?: Date
  invalidatedBy?: string
  invalidationReason?: string
}

export interface ResendQRRequest {
  requestId: string
  expirationDays: number
}

export interface ResendQRResponse {
  success: boolean
  message?: string
  qrCodeId?: string
  expiresAt?: string
  studentEmail?: string
  studentName?: string
  error?: string
}

export interface AdminActionLog {
  action: "resend_validation_qr"
  adminId: string
  adminName: string
  targetRequestId: string
  targetStudentId: string
  targetStudentEmail: string
  newQRCodeId: string
  oldQRCodeId: string | null
  expirationDays: number
  expirationDate: Date
  timestamp: Date
}