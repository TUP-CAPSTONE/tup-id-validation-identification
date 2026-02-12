"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { RegistrationRequestsTable } from "@/components/admin-registration-requests-table"

export interface RegistrationRequest {
  id: string
  name: string
  fullName: string
  studentNumber: string
  email: string
  phone: string
  bday?: string
  guardianEmail: string
  guardianPhone: string
  uid: string
  requestedAt: any
  requestedAtISO?: string
  status: "Pending" | "Accepted" | "Rejected"
  remarks?: string | null
  reviewedBy?: string | null
  facePhotos?: {
    neutral?: string
    smile?: string
    left?: string
    right?: string
    up?: string
    down?: string
  } | null
}

interface RegistrationResponse {
  requests: RegistrationRequest[]
  hasMore: boolean
  lastRequestId: string | null
  totalFetched: number
}

export function ManageRegistrationRequests() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [lastRequestId, setLastRequestId] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

  const fetchRequests = async (
    cursor: string | null = null,
    newPageSize: number = pageSize,
    newStatus?: string
  ) => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        pageSize: newPageSize.toString(),
      })

      if (cursor) {
        params.append("lastRequestId", cursor)
      }

      if (newStatus) {
        params.append("status", newStatus)
      }

      const response = await fetch(`/api/admin/registration-requests?${params.toString()}`)

      if (!response.ok) {
        if (response.status === 429) {
          const data = await response.json()
          toast.error("Rate limit exceeded", {
            description: data.error || "Too many requests. Please try again later.",
          })
          return
        }

        const errorText = await response.text()
        console.error("API Error Response:", errorText)
        console.error("Status:", response.status)

        toast.error("Error", {
          description: `Failed to fetch registration requests (Status: ${response.status})`,
        })
        return
      }

      const data: RegistrationResponse = await response.json()
      setRequests(data.requests)
      setHasMore(data.hasMore)
      setLastRequestId(data.lastRequestId)
    } catch (error) {
      console.error("Error fetching requests:", error)
      toast.error("Error", {
        description: "Failed to load registration requests. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handlePageChange = (cursor: string | null) => {
    fetchRequests(cursor, pageSize, statusFilter)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    fetchRequests(null, newSize, statusFilter)
  }

  const handleStatusFilterChange = (newStatus: string | undefined) => {
    setStatusFilter(newStatus)
    fetchRequests(null, pageSize, newStatus)
  }

  const handleUpdate = () => {
    // Refresh the current page
    fetchRequests(null, pageSize, statusFilter)
  }

  return (
    <RegistrationRequestsTable
      requests={requests}
      loading={loading}
      onRequestsChanged={handleUpdate}
      hasMore={hasMore}
      lastRequestId={lastRequestId}
      onPageChange={handlePageChange}
      pageSize={pageSize}
      onPageSizeChange={handlePageSizeChange}
      statusFilter={statusFilter}
      onStatusFilterChange={handleStatusFilterChange}
    />
  )
}