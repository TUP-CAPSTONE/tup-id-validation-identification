import { adminDB } from "@/lib/firebaseAdmin"
import { Timestamp } from "firebase-admin/firestore"

export interface TimeSlot {
  label: string
  startHour: number
  endHour: number
}

export interface ClaimSchedule {
  date: Date
  dateLabel: string
  timeSlot: TimeSlot
  slotKey: string
}

export type ClaimPeriodError =
  | { reason: "not_set" }
  | { reason: "expired"; endDate: string }

export interface AssignResult {
  success: true
  schedule: ClaimSchedule
}

export interface AssignError {
  success: false
  error: ClaimPeriodError
}

const TIME_SLOTS: TimeSlot[] = [
  { label: "8:00 AM – 11:00 AM", startHour: 8,  endHour: 11 },
  { label: "1:00 PM – 4:00 PM",  startHour: 13, endHour: 16 },
  { label: "5:00 PM – 7:00 PM",  startHour: 17, endHour: 19 },
]

const MAX_PER_SLOT = 100

function isValidDay(date: Date): boolean {
  const day = date.getDay()
  return day >= 1 && day <= 6
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export async function assignClaimSchedule(): Promise<AssignResult | AssignError> {
  const settingsSnap = await adminDB
    .collection("system_settings")
    .doc("stickerClaiming")
    .get()

  // No document at all, or both fields are empty/missing
  if (!settingsSnap.exists) {
    return { success: false, error: { reason: "not_set" } }
  }

  const settings = settingsSnap.data()!
  const rawStart = settings.startDate
  const rawEnd = settings.endDate

  // Treat empty string, null, undefined as "not set"
  const isEmpty = (v: any) =>
    v === null || v === undefined || v === ""

  if (isEmpty(rawStart) || isEmpty(rawEnd)) {
    return { success: false, error: { reason: "not_set" } }
  }

  const startDate: Date =
    rawStart instanceof Timestamp ? rawStart.toDate() : new Date(rawStart)
  const endDate: Date =
    rawEnd instanceof Timestamp ? rawEnd.toDate() : new Date(rawEnd)

  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 999)

  const now = new Date()

  // Entire period is in the past
  if (endDate < now) {
    return {
      success: false,
      error: {
        reason: "expired",
        endDate: endDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      },
    }
  }

  // Find next available slot
  const cursor = new Date(startDate)

  while (cursor <= endDate) {
    if (isValidDay(cursor)) {
      const dateKey = toDateKey(cursor)

      for (let slotIndex = 0; slotIndex < TIME_SLOTS.length; slotIndex++) {
        const slotKey = `${dateKey}_slot${slotIndex}`
        const slotRef = adminDB.collection("sticker_claim_slots").doc(slotKey)

        const assigned = await adminDB.runTransaction(async (tx) => {
          const slotSnap = await tx.get(slotRef)
          const count = slotSnap.exists ? (slotSnap.data()!.count as number) : 0

          if (count < MAX_PER_SLOT) {
            tx.set(
              slotRef,
              {
                date: dateKey,
                slotIndex,
                count: count + 1,
                updatedAt: new Date(),
              },
              { merge: true }
            )
            return true
          }
          return false
        })

        if (assigned) {
          const slotDate = new Date(cursor)
          const dateLabel = slotDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })

          return {
            success: true,
            schedule: {
              date: slotDate,
              dateLabel,
              timeSlot: TIME_SLOTS[slotIndex],
              slotKey,
            },
          }
        }
      }
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  // All slots within the period are full — treat as expired/full
  return {
    success: false,
    error: {
      reason: "expired",
      endDate: endDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    },
  }
}