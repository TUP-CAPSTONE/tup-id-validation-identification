"use client"

import { useState, useEffect } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { toast } from "sonner"

import {
  AdminIdValidationTable,
  ValidationRequest,
} from "@/components/admin-id-validation-table"

interface ValidationResponse {
  requests: ValidationRequest[]
  hasMore: boolean
  lastRequestId: string | null
  totalFetched: number
}

export default function AdminValidationPage() {
  const [requests, setRequests] = useState<ValidationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [lastRequestId, setLastRequestId] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [sortBy, setSortBy] = useState("requestTime")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const fetchRequests = async (
    cursor: string | null = null,
    newPageSize: number = pageSize,
    newStatus?: string,
    newSortBy?: string,
    newSortOrder?: "asc" | "desc"
  ) => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        pageSize: newPageSize.toString(),
      })

      if (cursor) params.append("lastRequestId", cursor)
      if (newStatus) params.append("status", newStatus)
      if (newSortBy) params.append("sortBy", newSortBy)
      if (newSortOrder) params.append("sortOrder", newSortOrder)

      // ✅ Uses admin-specific route — verified by admin_session cookie server-side
      const response = await fetch(`/api/admin/validation-request?${params.toString()}`)

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
          description: `Failed to fetch validation requests (Status: ${response.status})`,
        })
        return
      }

      const data: ValidationResponse = await response.json()
      setRequests(data.requests)
      setHasMore(data.hasMore)
      setLastRequestId(data.lastRequestId)
    } catch (error) {
      console.error("Error fetching requests:", error)
      toast.error("Error", {
        description: "Failed to load validation requests. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handlePageChange = (cursor: string | null) => {
    fetchRequests(cursor, pageSize, statusFilter, sortBy, sortOrder)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    fetchRequests(null, newSize, statusFilter, sortBy, sortOrder)
  }

  const handleStatusFilterChange = (newStatus: string | undefined) => {
    setStatusFilter(newStatus)
    fetchRequests(null, pageSize, newStatus, sortBy, sortOrder)
  }

  const handleSortChange = (column: string, order: "asc" | "desc") => {
    setSortBy(column)
    setSortOrder(order)
    fetchRequests(null, pageSize, statusFilter, column, order)
  }

  const handleUpdate = () => {
    fetchRequests(null, pageSize, statusFilter, sortBy, sortOrder)
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="min-h-full p-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-10">
                <h1 className="text-5xl font-bold text-gray-900 mb-2">ID Validation Requests</h1>
                <p className="text-gray-600 text-lg">Review and manage student ID validation requests</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm">
                {loading && requests.length === 0 ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p>Loading requests...</p>
                    </div>
                  </div>
                ) : (
                  <AdminIdValidationTable
                    requests={requests}
                    onUpdate={handleUpdate}
                    hasMore={hasMore}
                    lastRequestId={lastRequestId}
                    onPageChange={handlePageChange}
                    pageSize={pageSize}
                    onPageSizeChange={handlePageSizeChange}
                    statusFilter={statusFilter}
                    onStatusFilterChange={handleStatusFilterChange}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={handleSortChange}
                    loading={loading}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}