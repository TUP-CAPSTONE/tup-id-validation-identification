"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/osa-app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"

import { db } from "@/lib/firebaseConfig"
import { collection, getDocs } from "firebase/firestore"

import {
  IdValidationTable,
  ValidationRequest,
} from "@/components/osa-id-validation-table"

export default function ValidationPage() {
  const [requests, setRequests] = useState<ValidationRequest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const snapshot = await getDocs(collection(db, "validation_requests2"))

      const data = snapshot.docs.map((doc) => {
        const docData = doc.data()

        return {
          id: doc.id,  // Add document ID for updates
          requestId: doc.id,
          studentId: docData.studentId,
          studentName: docData.studentName,
          tupId: docData.tupId,
          email: docData.email,
          phoneNumber: docData.phoneNumber,
          idPicture: docData.idPicture,
          corFile: docData.cor || docData.corFile,  // Use 'cor' first (student form field name)
          selfiePictures: docData.selfiePictures,
          status: docData.status,
          rejectRemarks: docData.rejectRemarks,

          // ✅ Firestore Timestamp → string
          requestTime: docData.requestTime
            ? docData.requestTime.toDate().toISOString()
            : "",
        }
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
    <SidebarProvider
      style={{
        "--sidebar-width": "20rem", // This matches your w-80 (20rem) sidebar
      } as React.CSSProperties}
    >
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 flex h-16 items-center gap-2 border-b px-4 bg-background z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />

          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-lg">
                  ID Validation Requests
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b32032] mx-auto mb-4"></div>
                <p>Loading requests...</p>
              </div>
            </div>
          ) : (
            <IdValidationTable requests={requests} onUpdate={fetchRequests} />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}