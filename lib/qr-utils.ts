import QRCode from "qrcode"
import { randomUUID } from "crypto"

export interface QRCodeData {
  token: string
  studentId: string
  timestamp: number
}

export interface ValidationQRCode {
  studentId: string
  qrToken: string
  expiresAt: Date
  isUsed: boolean
  createdAt: Date
  studentInfo: {
    name: string
    course: string
    section: string
  }
}

/**
 * Generate a unique QR token
 */
export function generateQRToken(): string {
  return randomUUID()
}

/**
 * Create QR code data object
 */
export function createQRData(studentId: string, token: string): QRCodeData {
  return {
    token,
    studentId,
    timestamp: Date.now(),
  }
}

/**
 * Generate QR code as base64 image
 */
export async function generateQRCodeImage(data: QRCodeData): Promise<string> {
  try {
    const jsonData = JSON.stringify(data)
    
    // Generate QR code as data URL (base64)
    const qrDataURL = await QRCode.toDataURL(jsonData, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 400,
      margin: 2,
      color: {
        dark: "#1a1a1a",
        light: "#ffffff",
      },
    })

    return qrDataURL
  } catch (error) {
    console.error("QR Code generation error:", error)
    throw new Error("Failed to generate QR code")
  }
}

/**
 * Parse QR code data from scanned string
 */
export function parseQRData(qrString: string): QRCodeData | null {
  try {
    const data = JSON.parse(qrString) as QRCodeData
    
    // Validate structure
    if (!data.token || !data.studentId || !data.timestamp) {
      return null
    }

    return data
  } catch (error) {
    console.error("QR parsing error:", error)
    return null
  }
}

/**
 * Calculate expiration date based on days
 */
export function calculateExpirationDate(days: number): Date {
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + days)
  return expirationDate
}

/**
 * Check if QR code is expired
 */
export function isQRExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}