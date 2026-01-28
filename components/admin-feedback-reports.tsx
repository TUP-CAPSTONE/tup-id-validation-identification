"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Bug, MessageSquareText, CheckCircle2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ReportType = "feedback" | "bug"

type ReportItem = {
  id: string
  type: ReportType
  senderRole: string
  senderName: string
  senderEmail: string
  title: string
  status: string

  // feedback
  rating?: number
  category?: string
  experience?: string
  suggestions?: string

  // bug
  bugSeverity?: string
  stepsToReproduce?: string
  expectedBehavior?: string
  actualBehavior?: string
  deviceInfo?: string

  // resolution
  resolvedAt?: any
  resolutionNotes?: string
}

export function AdminFeedbackReports() {
  const [tab, setTab] = useState<ReportType>("feedback")
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<ReportItem[]>([])

  // resolve dialog
  const [resolveOpen, setResolveOpen] = useState(false)
  const [selectedBug, setSelectedBug] = useState<ReportItem | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [resolveLoading, setResolveLoading] = useState(false)

  async function fetchReports() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/feedback-reports", { method: "GET" })

      // in case endpoint is wrong, show the real response text
      const text = await res.text()
      let data: any = {}
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(
          "API did not return JSON. Check that /api/admin/feedback-reports exists."
        )
      }

      setReports(data?.reports ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const filtered = useMemo(() => reports.filter((r) => r.type === tab), [reports, tab])

  const overallRating = useMemo(() => {
    const feedbacks = reports.filter((r) => r.type === "feedback" && typeof r.rating === "number")
    if (feedbacks.length === 0) return null
    const avg = feedbacks.reduce((acc, r) => acc + (r.rating || 0), 0) / feedbacks.length
    return Number(avg.toFixed(2))
  }, [reports])

  const gradeLabel = useMemo(() => {
    if (overallRating === null) return "N/A"
    if (overallRating >= 4.5) return "Excellent"
    if (overallRating >= 3.5) return "Good"
    if (overallRating >= 2.5) return "Fair"
    return "Poor"
  }, [overallRating])

  function openResolveDialog(report: ReportItem) {
    setSelectedBug(report)
    setResolutionNotes(report.resolutionNotes || "")
    setResolveOpen(true)
  }

  async function resolveBugReport() {
    if (!selectedBug) return

    setResolveLoading(true)
    try {
      const res = await fetch("/api/admin/feedback-reports/resolved", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedBug.id,
          resolutionNotes,
        }),
      })

      const text = await res.text()
      let data: any = {}
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error("Resolve API did not return JSON.")
      }

      if (!res.ok) throw new Error(data?.error || "Failed to resolve bug report.")

      setResolveOpen(false)
      setSelectedBug(null)
      setResolutionNotes("")
      await fetchReports()
    } catch (err) {
      console.error(err)
      alert((err as any)?.message || "Something went wrong.")
    } finally {
      setResolveLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        
        <div className="flex gap-2 w-full">
          <Button
            variant={tab === "feedback" ? "default" : "outline"}
            className="flex-1 rounded-xl"
            onClick={() => setTab("feedback")}
          >
            <MessageSquareText className="mr-2 h-4 w-4" />
            Feedbacks
          </Button>

          <Button
            variant={tab === "bug" ? "default" : "outline"}
            className="flex-1 rounded-xl"
            onClick={() => setTab("bug")}
          >
            <Bug className="mr-2 h-4 w-4" />
            Bug Reports
          </Button>
        </div>
      </div>

      {/* Grade */}
      {tab === "feedback" ? (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Overall Feedback Grade</CardTitle>
            <CardDescription>Average rating from feedback submissions</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-4xl font-bold">
                {overallRating === null ? "--" : overallRating}
                <span className="text-base font-medium text-muted-foreground"> / 5</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Grade: <span className="font-semibold text-foreground">{gradeLabel}</span>
              </p>
            </div>

            <Badge className="text-sm px-4 py-2 rounded-xl">{gradeLabel}</Badge>
          </CardContent>
        </Card>
      ) : null}

      {/* List */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">
            {tab === "feedback" ? "Feedback Submissions" : "Bug Reports"}
          </CardTitle>
          <CardDescription>
            {tab === "feedback"
              ? "All feedback entries submitted by users."
              : "Resolve bugs and write resolution notes."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No {tab === "feedback" ? "feedbacks" : "bug reports"} yet.
            </p>
          ) : (
            filtered.map((r) => (
              <div key={r.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.senderName} ({r.senderRole}) • {r.senderEmail}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {r.type === "feedback" ? "Feedback" : "Bug Report"}
                    </Badge>
                    <Badge className="capitalize">{r.status || "open"}</Badge>
                  </div>
                </div>

                <Separator className="my-3" />

                {r.type === "feedback" ? (
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Rating:</span> {r.rating ?? "N/A"} / 5
                    </p>
                    <p>
                      <span className="font-medium">Category:</span> {r.category ?? "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Experience:</span> {r.experience ?? "—"}
                    </p>
                    {r.suggestions ? (
                      <p>
                        <span className="font-medium">Suggestions:</span> {r.suggestions}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Severity:</span> {r.bugSeverity ?? "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Steps to reproduce:</span>{" "}
                      {r.stepsToReproduce ?? "—"}
                    </p>
                    <p>
                      <span className="font-medium">Expected:</span> {r.expectedBehavior ?? "—"}
                    </p>
                    <p>
                      <span className="font-medium">Actual:</span> {r.actualBehavior ?? "—"}
                    </p>

                    {r.status === "resolved" ? (
                      <div className="pt-3 rounded-xl bg-muted p-3">
                        <p className="font-medium">Resolution Notes:</p>
                        <p className="text-muted-foreground">{r.resolutionNotes || "—"}</p>
                      </div>
                    ) : (
                      <div className="pt-3 flex justify-end">
                        <Button
                          className="rounded-xl"
                          onClick={() => openResolveDialog(r)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Resolve
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Bug Report</DialogTitle>
            <DialogDescription>
              Write how you resolved this issue. This will be stored in Firestore.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              {selectedBug?.title}
            </p>

            <Textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Ex: Updated face scanner script, fixed permission issue, deployed new version..."
              className="min-h-35"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setResolveOpen(false)}
              disabled={resolveLoading}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              onClick={resolveBugReport}
              disabled={resolveLoading || resolutionNotes.trim().length < 5}
            >
              {resolveLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Mark as Resolved"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
