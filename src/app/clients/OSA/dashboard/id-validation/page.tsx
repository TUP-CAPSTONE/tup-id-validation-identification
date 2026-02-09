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
import { toast } from "sonner"

import {
  IdValidationTable,
  ValidationRequest,
} from "@/components/osa-id-validation-table"

interface ValidationResponse {
  requests: ValidationRequest[]
  hasMore: boolean
  lastRequestId: string | null
  totalFetched: number
}

export default function ValidationPage() {
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

      if (cursor) {
        params.append("lastRequestId", cursor)
      }

      if (newStatus) {
        params.append("status", newStatus)
      }

      if (newSortBy) {
        params.append("sortBy", newSortBy)
      }

      if (newSortOrder) {
        params.append("sortOrder", newSortOrder)
      }

      const response = await fetch(`/api/osa/validation-requests?${params.toString()}`)

      if (!response.ok) {
        if (response.status === 429) {
          const data = await response.json()
          toast.error("Rate limit exceeded", {
            description: data.error || "Too many requests. Please try again later.",
          })
          return
        }
        
        // Log the error details
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
    // Refresh the current page
    fetchRequests(null, pageSize, statusFilter, sortBy, sortOrder)
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "20rem",
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
          {loading && requests.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b32032] mx-auto mb-4"></div>
                <p>Loading requests...</p>
              </div>
            </div>
          ) : (
            <IdValidationTable
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
      </SidebarInset>
    </SidebarProvider>
  )
}