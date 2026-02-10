"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Calendar, Download, Trash2, AlertCircle, CheckCircle2 } from "lucide-react"

interface ValidationPeriod {
  startDate: string
  endDate: string
  isActive: boolean
}

interface BackupInfo {
  lastBackup: string | null
  totalRecords: number
  backupSize: string
}

export function AdminSettings() {
  const [validationPeriod, setValidationPeriod] = useState<ValidationPeriod>({
    startDate: "",
    endDate: "",
    isActive: false,
  })
  const [backupInfo, setBackupInfo] = useState<BackupInfo>({
    lastBackup: null,
    totalRecords: 0,
    backupSize: "0 KB",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [backing, setBacking] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  // Load current settings
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings")
      if (!response.ok) throw new Error("Failed to load settings")
      
      const data = await response.json()
      setValidationPeriod(data.validationPeriod)
      setBackupInfo(data.backupInfo)
    } catch (error) {
      console.error("Error loading settings:", error)
      showMessage("error", "Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSavePeriod = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Validate dates
      if (validationPeriod.startDate && validationPeriod.endDate) {
        const start = new Date(validationPeriod.startDate)
        const end = new Date(validationPeriod.endDate)
        
        if (end < start) {
          showMessage("error", "End date must be after start date")
          setSaving(false)
          return
        }
      }

      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validationPeriod }),
      })

      if (!response.ok) throw new Error("Failed to save settings")

      showMessage("success", "ID validation period updated successfully")
      await loadSettings() // Reload to get updated isActive status
    } catch (error) {
      console.error("Error saving period:", error)
      showMessage("error", "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleBackupData = async () => {
    setBacking(true)
    setMessage(null)

    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to create backup")

      // Download the backup file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `id-validation-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showMessage("success", "Backup created and downloaded successfully")
      await loadSettings() // Reload backup info
    } catch (error) {
      console.error("Error creating backup:", error)
      showMessage("error", "Failed to create backup")
    } finally {
      setBacking(false)
    }
  }

  const handleCleanData = async () => {
    if (!confirm(
      "⚠️ WARNING: This will permanently delete all ID validation records that are outside the current validation period. This action cannot be undone.\n\nMake sure you have a backup before proceeding!\n\nAre you sure you want to continue?"
    )) {
      return
    }

    if (!confirm(
      "This is your final warning. All old data will be permanently deleted.\n\nClick OK to proceed with deletion."
    )) {
      return
    }

    setCleaning(true)
    setMessage(null)

    try {
      const response = await fetch("/api/admin/cleanup", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to clean data")

      const result = await response.json()
      showMessage(
        "success",
        `Successfully deleted ${result.deletedCount} old records`
      )
      await loadSettings() // Reload backup info
    } catch (error) {
      console.error("Error cleaning data:", error)
      showMessage("error", "Failed to clean data")
    } finally {
      setCleaning(false)
    }
  }

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    )
  }

  const isPeriodActive = validationPeriod.isActive
  const now = new Date()
  const startDate = validationPeriod.startDate ? new Date(validationPeriod.startDate) : null
  const endDate = validationPeriod.endDate ? new Date(validationPeriod.endDate) : null

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ID Validation Period */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>ID Validation Period</CardTitle>
          </div>
          <CardDescription>
            Set the start and end dates for when students can submit ID validation requests.
            {isPeriodActive && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active Now
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSavePeriod()
            }}
          >
            <FieldGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field>
                  <FieldLabel htmlFor="startDate">Start Date</FieldLabel>
                  <FieldDescription>
                    Students can begin submitting requests from this date
                  </FieldDescription>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={validationPeriod.startDate}
                    onChange={(e) =>
                      setValidationPeriod({
                        ...validationPeriod,
                        startDate: e.target.value,
                      })
                    }
                    disabled={saving}
                  />
                  {startDate && startDate > now && (
                    <p className="text-sm text-amber-600 mt-1">
                      Starts in {Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days
                    </p>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="endDate">End Date</FieldLabel>
                  <FieldDescription>
                    System will stop accepting requests after this date
                  </FieldDescription>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={validationPeriod.endDate}
                    onChange={(e) =>
                      setValidationPeriod({
                        ...validationPeriod,
                        endDate: e.target.value,
                      })
                    }
                    disabled={saving}
                  />
                  {endDate && endDate < now && (
                    <p className="text-sm text-red-600 mt-1">
                      Period ended {Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))} days ago
                    </p>
                  )}
                </Field>
              </div>

              {/* Current Status */}
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600">
                    <span className="font-medium">Period Status:</span>{" "}
                    <span
                      className={
                        isPeriodActive
                          ? "text-green-600 font-medium"
                          : "text-gray-500"
                      }
                    >
                      {isPeriodActive ? "Active - Accepting Requests" : "Inactive - Not Accepting Requests"}
                    </span>
                  </p>
                  {validationPeriod.startDate && (
                    <p className="text-gray-600">
                      <span className="font-medium">Start:</span>{" "}
                      {new Date(validationPeriod.startDate).toLocaleString()}
                    </p>
                  )}
                  {validationPeriod.endDate && (
                    <p className="text-gray-600">
                      <span className="font-medium">End:</span>{" "}
                      {new Date(validationPeriod.endDate).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Period Settings"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            <CardTitle>Data Management</CardTitle>
          </div>
          <CardDescription>
            Backup and clean up ID validation data to manage storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Backup Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Database Statistics</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Total Records</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {backupInfo.totalRecords.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Estimated Size</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {backupInfo.backupSize}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Last Backup</p>
                  <p className="text-lg font-medium text-gray-900">
                    {backupInfo.lastBackup
                      ? new Date(backupInfo.lastBackup).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
              </div>
            </div>

            {/* Backup Actions */}
            <FieldGroup>
              <Field>
                <FieldLabel>Backup Data</FieldLabel>
                <FieldDescription>
                  Download a complete backup of all ID validation records as a JSON file.
                  This backup can be used to restore data if needed.
                </FieldDescription>
                <Button
                  type="button"
                  onClick={handleBackupData}
                  disabled={backing}
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {backing ? "Creating Backup..." : "Download Backup"}
                </Button>
              </Field>

              <Field>
                <FieldLabel>Clean Old Data</FieldLabel>
                <FieldDescription>
                  Permanently delete all ID validation records that fall outside the current validation period.
                  <strong className="block mt-1 text-red-600">
                    ⚠️ Warning: This action cannot be undone. Create a backup first!
                  </strong>
                </FieldDescription>
                <Button
                  type="button"
                  onClick={handleCleanData}
                  disabled={cleaning || !validationPeriod.startDate || !validationPeriod.endDate}
                  variant="outline"
                  className="w-full md:w-auto border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {cleaning ? "Cleaning Data..." : "Delete Old Records"}
                </Button>
                {(!validationPeriod.startDate || !validationPeriod.endDate) && (
                  <p className="text-sm text-amber-600 mt-2">
                    Set validation period dates first before cleaning data
                  </p>
                )}
              </Field>
            </FieldGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}