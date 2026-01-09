"use client"


import { useEffect, useState } from "react"
import { collection, getDocs, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { RegistrationRequestsTable } from "@/components/admin-registration-requests-table"


export interface RegistrationRequest {
    id: string
    fullName: string
    studentNumber: string
    email: string
    createdAt: any
    status: "pending" | "accepted" | "rejected"
    remarks?: string
    [key: string]: any
}


export function ManageRegistrationRequests() {
const [requests, setRequests] = useState<RegistrationRequest[]>([])
const [loading, setLoading] = useState(true)


const fetchRequests = async () => {
    setLoading(true)
    const q = query(
    collection(db, "registration_requests2"),
    orderBy("createdAt", "desc")
)
const snap = await getDocs(q)


const data: RegistrationRequest[] = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
})) as RegistrationRequest[]


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