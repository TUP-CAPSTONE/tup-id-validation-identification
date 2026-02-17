import { NextRequest, NextResponse } from "next/server"
import { checkValidationPeriod } from "@/lib/validation-period-utils"

/**
 * GET /api/validation-period
 * Public endpoint for students to check if ID validation is currently active
 */
export async function GET(req: NextRequest) {
  try {
    const periodStatus = await checkValidationPeriod()
    return NextResponse.json(periodStatus)
  } catch (error) {
    console.error("Error in validation-period endpoint:", error)
    return NextResponse.json(
      {
        isActive: false,
        message: "Error checking validation period. Please try again later.",
      },
      { status: 500 }
    )
  }
} 