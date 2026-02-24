"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { toast } from "sonner"
import { RegistrationRequestsTable } from "@/components/admin-registration-requests-table"
import Confetti from "react-confetti"
import { useWindowSize } from "react-use"
import { getEffectsSettings, type EffectsSettings } from "@/components/admin-nav-user"

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
  college: string
  course: string
  section: string
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

  // ── Effects ──────────────────────────────────────────────────────────────
  const [showConfetti, setShowConfetti] = useState(false)
  const [rejectFlash, setRejectFlash] = useState(false)
  const [flashCount, setFlashCount] = useState(0)
  const [effectsSettings, setEffectsSettings] = useState<EffectsSettings>({
    soundEnabled: true,
    visualEnabled: true,
  })
  const { width, height } = useWindowSize()

  // Preloaded audio refs — initialized once on mount, ready to fire instantly
  const acceptAudioRef = useRef<HTMLAudioElement | null>(null)
  const rejectAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    acceptAudioRef.current = new Audio("/sound_effects/accept.mp3")
    acceptAudioRef.current.load()
    rejectAudioRef.current = new Audio("/sound_effects/reject.mp3")
    rejectAudioRef.current.load()
  }, [])

  useEffect(() => {
    setEffectsSettings(getEffectsSettings())
    const handler = (e: Event) =>
      setEffectsSettings((e as CustomEvent<EffectsSettings>).detail)
    window.addEventListener("effectsSettingsChanged", handler)
    return () => window.removeEventListener("effectsSettingsChanged", handler)
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
  // ─────────────────────────────────────────────────────────────────────────

  const fetchRequests = async (
    cursor: string | null = null,
    newPageSize: number = pageSize,
    newStatus?: string
  ) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ pageSize: newPageSize.toString() })
      if (cursor) params.append("lastRequestId", cursor)
      if (newStatus) params.append("status", newStatus)

      const response = await fetch(`/api/admin/registration-requests?${params.toString()}`)

      if (!response.ok) {
        if (response.status === 429) {
          const data = await response.json()
          toast.error("Rate limit exceeded", {
            description: data.error || "Too many requests. Please try again later.",
          })
          return
        }
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

  const handlePageChange = (cursor: string | null) => fetchRequests(cursor, pageSize, statusFilter)
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    fetchRequests(null, newSize, statusFilter)
  }
  const handleStatusFilterChange = (newStatus: string | undefined) => {
    setStatusFilter(newStatus)
    fetchRequests(null, pageSize, newStatus)
  }
  const handleUpdate = () => fetchRequests(null, pageSize, statusFilter)

  return (
    <>
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
        onAcceptSuccess={triggerCelebration}
        onRejectSuccess={triggerReject}
      />
    </>
  )
}