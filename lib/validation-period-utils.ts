import { adminDB } from "@/lib/firebaseAdmin"

const PHT_OFFSET_MS = 8 * 60 * 60 * 1000 // UTC+8

/**
 * Format a UTC ISO string into a PHT-localized readable string.
 * Vercel servers run in UTC, so we manually shift +8h before formatting.
 *
 * Example: "2026-01-28T07:36:00.000Z" → "January 28, 2026 at 3:36:00 PM"
 */
function formatAsPHT(isoString: string): string {
  const utcMs = new Date(isoString).getTime()
  const phtDate = new Date(utcMs + PHT_OFFSET_MS)

  return phtDate.toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "UTC", // We already manually shifted, so tell it to treat as UTC
  })
}

/**
 * Check if the ID validation period is currently active.
 *
 * This function should be called in API routes or server components
 * to determine if students can submit ID validation requests.
 *
 * @returns {Promise<{ isActive: boolean, startDate?: string, endDate?: string, message?: string }>}
 */
export async function checkValidationPeriod(): Promise<{
  isActive: boolean
  startDate?: string
  endDate?: string
  message?: string
}> {
  try {
    const settingsRef = adminDB
      .collection("system_settings")
      .doc("idValidation")
    const settingsDoc = await settingsRef.get()

    if (!settingsDoc.exists) {
      return {
        isActive: false,
        message:
          "ID validation period has not been configured by administrators",
      }
    }

    const data = settingsDoc.data()
    const startDate = data?.startDate
    const endDate = data?.endDate

    if (!startDate || !endDate) {
      return {
        isActive: false,
        message:
          "ID validation period has not been configured by administrators",
      }
    }

    const now = new Date()
    const start = new Date(startDate) // stored as correct UTC ISO (from fixed settings API)
    const end = new Date(endDate)

    if (now < start) {
      return {
        isActive: false,
        startDate,
        endDate,
        message: `ID validation period will open on ${formatAsPHT(startDate)} PHT`,
      }
    }

    if (now > end) {
      return {
        isActive: false,
        startDate,
        endDate,
        message: `ID validation period ended on ${formatAsPHT(endDate)} PHT`,
      }
    }

    return {
      isActive: true,
      startDate,
      endDate,
      message: `ID validation is currently active until ${formatAsPHT(endDate)} PHT`,
    }
  } catch (error) {
    console.error("Error checking validation period:", error)
    return {
      isActive: false,
      message: "Error checking validation period. Please try again later.",
    }
  }
}

/**
 * Client-side version - calls the API endpoint.
 * Use this in client components.
 */
export async function checkValidationPeriodClient(): Promise<{
  isActive: boolean
  startDate?: string
  endDate?: string
  message?: string
}> {
  try {
    const response = await fetch("/api/validation-period")
    if (!response.ok) {
      throw new Error("Failed to check validation period")
    }
    return await response.json()
  } catch (error) {
    console.error("Error checking validation period:", error)
    return {
      isActive: false,
      message: "Error checking validation period. Please try again later.",
    }
  }
}