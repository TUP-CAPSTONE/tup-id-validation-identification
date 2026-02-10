import { adminDB } from "@/lib/firebaseAdmin"

/**
 * Check if the ID validation period is currently active
 * 
 * This function should be called in API routes or server components
 * to determine if students can submit ID validation requests
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
    const settingsRef = adminDB.collection("system_settings").doc("idValidation")
    const settingsDoc = await settingsRef.get()

    if (!settingsDoc.exists) {
      return {
        isActive: false,
        message: "ID validation period has not been configured by administrators",
      }
    }

    const data = settingsDoc.data()
    const startDate = data?.startDate
    const endDate = data?.endDate

    if (!startDate || !endDate) {
      return {
        isActive: false,
        message: "ID validation period has not been configured by administrators",
      }
    }

    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Check if current time is within the validation period
    const isActive = now >= start && now <= end

    if (now < start) {
      return {
        isActive: false,
        startDate,
        endDate,
        message: `ID validation period will open on ${start.toLocaleString()}`,
      }
    }

    if (now > end) {
      return {
        isActive: false,
        startDate,
        endDate,
        message: `ID validation period ended on ${end.toLocaleString()}`,
      }
    }

    return {
      isActive: true,
      startDate,
      endDate,
      message: `ID validation is currently active until ${end.toLocaleString()}`,
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
 * Client-side version - calls the API endpoint
 * Use this in client components
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