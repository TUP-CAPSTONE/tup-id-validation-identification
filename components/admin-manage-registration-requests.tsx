"use client"

import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { RegistrationRequestsTable } from "@/components/admin-registration-requests-table"

export interface RegistrationRequest {
  id: string
  name: string
  fullName: string
  studentNumber: string
  email: string
  phone: string
  bday?: string
  uid: string
  requestedAt: any
  status: "Pending" | "Accepted" | "Rejected"
  remarks?: string | null
  reviewedBy?: string | null
}

export function ManageRegistrationRequests() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = async () => {
    setLoading(true)

    try {
      const snap = await getDocs(
        collection(db, "registration_requests")
      )

      const data: RegistrationRequest[] = snap.docs.map((doc) => {
        const d = doc.data()

        const name = d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim()
        const status =
          d.status === "pending"
            ? "Pending"
            : d.status === "accepted"
            ? "Accepted"
            : d.status === "rejected"
            ? "Rejected"
            : d.status

        return {
          id: doc.id,
          name,
          fullName: name,
          studentNumber: d.tup_id || d.studentNumber || doc.id,
          email: d.student_email || d.email || "",
          phone: d.student_phone_num || d.phone || "",
          bday: d.bday || d.birthDate,
          uid: d.uid || "",
          requestedAt: d.createdAt || d.requestedAt,
          status,
          remarks: d.remarks || null,
          reviewedBy: d.reviewedBy || null,
        }
      }) as RegistrationRequest[]

      data.sort((a, b) => {
        const aTime = a.requestedAt?.seconds
          ? a.requestedAt.seconds * 1000
          : a.requestedAt?.toMillis
          ? a.requestedAt.toMillis()
          : 0
        const bTime = b.requestedAt?.seconds
          ? b.requestedAt.seconds * 1000
          : b.requestedAt?.toMillis
          ? b.requestedAt.toMillis()
          : 0
        return bTime - aTime
      })

      setRequests(data)
    } catch (error) {
      console.error("Error fetching requests:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  return (
    <RegistrationRequestsTable
      requests={requests}
      loading={loading}
      onRequestsChanged={fetchRequests}
    />
  )
}
