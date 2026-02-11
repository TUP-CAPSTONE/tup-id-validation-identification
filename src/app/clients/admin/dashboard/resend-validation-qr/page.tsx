"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Search, Filter, AlertCircle, CheckCircle2, Clock, Calendar } from "lucide-react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import ValidationRequestCard from "@/components/admin-validation-request-card"
import ResendQRModal from "@/components/admin-resend-qr-modal"
import type { ValidationRequest } from "@/components/types/validation"

export default function ResendValidationQRPage() {
  const [requests, setRequests] = useState<ValidationRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<ValidationRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "expired">("all")
  const [selectedRequest, setSelectedRequest] = useState<ValidationRequest | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchRequests = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/resend-qr?status=accepted&limit=100")
      
      if (!response.ok) {
        throw new Error("Failed to fetch validation requests")
      }

      const data = await response.json()
      setRequests(data.requests)
      setFilteredRequests(data.requests)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  // Filter and search logic
  useEffect(() => {
    let filtered = [...requests]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (req) =>
          req.studentName.toLowerCase().includes(query) ||
          req.tupId.toLowerCase().includes(query) ||
          req.email.toLowerCase().includes(query) ||
          req.course.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((req) => {
        if (!req.expiresAt) return false
        const isExpired = new Date(req.expiresAt) < new Date()
        return filterStatus === "expired" ? isExpired : !isExpired
      })
    }

    setFilteredRequests(filtered)
  }, [searchQuery, filterStatus, requests])

  const handleResendClick = (request: ValidationRequest) => {
    setSelectedRequest(request)
    setIsModalOpen(true)
  }

  const handleResendSuccess = () => {
    setSuccessMessage(`QR code successfully resent to ${selectedRequest?.studentName}`)
    fetchRequests() // Refresh the list
    setTimeout(() => setSuccessMessage(null), 5000)
  }

  const getStats = () => {
    const total = requests.length
    const active = requests.filter(
      (req) => req.expiresAt && new Date(req.expiresAt) >= new Date()
    ).length
    const expired = total - active
    const expiringSoon = requests.filter((req) => {
      if (!req.expiresAt) return false
      const expiresAt = new Date(req.expiresAt)
      const now = new Date()
      const diff = expiresAt.getTime() - now.getTime()
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
      return days > 0 && days <= 3
    }).length

    return { total, active, expired, expiringSoon }
  }

  const stats = getStats()

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="min-h-full p-8">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-10">
                <h1 className="text-5xl font-bold text-gray-900 mb-2">
                  Resend Validation QR Codes
                </h1>
                <p className="text-gray-600 text-lg">
                  Manage and resend validation QR codes to students
                </p>
              </div>

              {/* Success Message */}
              {successMessage && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-green-800 font-medium">{successMessage}</p>
                  </div>
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className="text-green-600 hover:text-green-800 text-xl font-semibold"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Accepted</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Active QR Codes</p>
                      <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Expired</p>
                      <p className="text-3xl font-bold text-red-600">{stats.expired}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Expiring Soon</p>
                      <p className="text-3xl font-bold text-orange-600">{stats.expiringSoon}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, TUP ID, email, or course..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-gray-400 shrink-0" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active QR Codes</option>
                      <option value="expired">Expired QR Codes</option>
                    </select>
                    <button
                      onClick={fetchRequests}
                      disabled={isLoading}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Results Count */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold text-gray-900">{filteredRequests.length}</span> of{" "}
                    <span className="font-semibold text-gray-900">{requests.length}</span> accepted requests
                  </p>
                </div>
              </div>

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-red-800 font-medium">Error loading requests</p>
                      <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow-sm">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading validation requests...</p>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && filteredRequests.length === 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests found</h3>
                  <p className="text-gray-600">
                    {searchQuery || filterStatus !== "all"
                      ? "Try adjusting your search or filters"
                      : "No accepted validation requests yet"}
                  </p>
                </div>
              )}

              {/* Request Cards Grid */}
              {!isLoading && filteredRequests.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRequests.map((request) => (
                    <ValidationRequestCard
                      key={request.id}
                      request={request}
                      onResendClick={handleResendClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Resend QR Modal */}
      {selectedRequest && (
        <ResendQRModal
          request={selectedRequest}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedRequest(null)
          }}
          onSuccess={handleResendSuccess}
        />
      )}
    </SidebarProvider>
  )
}