"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
import Confetti from "react-confetti"
import { useWindowSize } from "react-use"

import {
  IdValidationTable,
  ValidationRequest,
} from "@/components/osa-id-validation-table"
import {
  getOsaEffectsSettings,
  type OsaEffectsSettings,
} from "@/components/osa-nav-user"

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

  // ── Effects ────────────────────────────────────────────────────────────────
  const [showConfetti, setShowConfetti] = useState(false)
  const [rejectFlash, setRejectFlash] = useState(false)
  const [flashCount, setFlashCount] = useState(0)
  const [effectsSettings, setEffectsSettings] = useState<OsaEffectsSettings>({
    soundEnabled: true,
    visualEnabled: true,
  })
  const { width, height } = useWindowSize()

  const acceptAudioRef = useRef<HTMLAudioElement | null>(null)
  const rejectAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    acceptAudioRef.current = new Audio("/sound_effects/accept.mp3")
    acceptAudioRef.current.load()
    rejectAudioRef.current = new Audio("/sound_effects/reject.mp3")
    rejectAudioRef.current.load()
  }, [])

  useEffect(() => {
    setEffectsSettings(getOsaEffectsSettings())
    const handler = (e: Event) =>
      setEffectsSettings((e as CustomEvent<OsaEffectsSettings>).detail)
    window.addEventListener("osaEffectsSettingsChanged", handler)
    return () => window.removeEventListener("osaEffectsSettingsChanged", handler)
  }, [])

  useEffect(() => {
    if (flashCount <= 0) return
    const BLINK_DURATION = 150
    setRejectFlash(true)
    let count = 0
    const interval = setInterval(() => {
      count++
      setRejectFlash((prev) => !prev)
      if (count >= 10) {
        clearInterval(interval)
        setRejectFlash(false)
        setFlashCount(0)
      }
    }, BLINK_DURATION)
    return () => clearInterval(interval)
  }, [flashCount])

  const triggerCelebration = useCallback(() => {
    if (effectsSettings.soundEnabled && acceptAudioRef.current) {
      acceptAudioRef.current.currentTime = 0
      acceptAudioRef.current.play().catch((err) => console.error("Error playing sound:", err))
    }
    if (effectsSettings.visualEnabled) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)
    }
  }, [effectsSettings])

  const triggerReject = useCallback(() => {
    if (effectsSettings.soundEnabled && rejectAudioRef.current) {
      rejectAudioRef.current.currentTime = 0
      rejectAudioRef.current.play().catch((err) => console.error("Error playing sound:", err))
    }
    if (effectsSettings.visualEnabled) {
      setFlashCount((prev) => prev + 1)
    }
  }, [effectsSettings])
  // ──────────────────────────────────────────────────────────────────────────

  const fetchRequests = async (
    cursor: string | null = null,
    newPageSize: number = pageSize,
    newStatus?: string,
    newSortBy?: string,
    newSortOrder?: "asc" | "desc"
  ) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ pageSize: newPageSize.toString() })
      if (cursor) params.append("lastRequestId", cursor)
      if (newStatus) params.append("status", newStatus)
      if (newSortBy) params.append("sortBy", newSortBy)
      if (newSortOrder) params.append("sortOrder", newSortOrder)

      const response = await fetch(`/api/osa/validation-requests?${params.toString()}`)

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

  const handlePageChange = (cursor: string | null) =>
    fetchRequests(cursor, pageSize, statusFilter, sortBy, sortOrder)
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
  const handleUpdate = () =>
    fetchRequests(null, pageSize, statusFilter, sortBy, sortOrder)

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "20rem" } as React.CSSProperties}
    >
      <AppSidebar />
      <SidebarInset>
        {showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={500}
            gravity={0.3}
            style={{ position: "fixed", top: 0, left: 0, zIndex: 9999 }}
          />
        )}

        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(220, 38, 38, 0.45)",
            opacity: rejectFlash ? 1 : 0,
            transition: rejectFlash ? "none" : "opacity 80ms ease-out",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        />

        <header className="sticky top-0 flex h-16 items-center gap-2 border-b px-4 bg-background z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-lg font-bold">
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
              onAcceptSuccess={triggerCelebration}
              onRejectSuccess={triggerReject}
            />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}