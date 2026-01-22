"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { RegistrationRequestsTable } from "@/components/admin-registration-requests-table"

export interface RegistrationRequest {
  id: string
  firstName: string
  lastName: string
  fullName: string
  studentNumber: string
  email: string
  course: string
  yearLevel: number
  section: string
  phone: string
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

    const q = query(
      collection(db, "registration_requests"),
      orderBy("requestedAt", "desc")
    )

    const snap = await getDocs(q)

    const data: RegistrationRequest[] = snap.docs.map((doc) => {
      const d = doc.data()

      return {
        id: doc.id,
        ...d,
        fullName: `${d.firstName} ${d.lastName}`,
      }
    }) as RegistrationRequest[]

    setRequests(data)
    setLoading(false)
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
