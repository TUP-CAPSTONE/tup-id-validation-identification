"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Plus,
} from "lucide-react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

interface ValidationPeriod {
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface BackupInfo {
  lastBackup: string | null;
  totalRecords: number;
  backupSize: string;
}

export function AdminSettings() {
  const [validationPeriod, setValidationPeriod] = useState<ValidationPeriod>({
    startDate: "",
    endDate: "",
    isActive: false,
  });
  const [backupInfo, setBackupInfo] = useState<BackupInfo>({
    lastBackup: null,
    totalRecords: 0,
    backupSize: "0 KB",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backing, setBacking] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [extending, setExtending] = useState(false);
  const [startingNewSemester, setStartingNewSemester] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Dialog states
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [showNewSemesterDialog, setShowNewSemesterDialog] = useState(false);
  const [showSavePeriodDialog, setShowSavePeriodDialog] = useState(false);

  // Extension settings
  const [extensionDays, setExtensionDays] = useState<number>(7);

  // Load current settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) throw new Error("Failed to load settings");

      const data = await response.json();
      setValidationPeriod({
        startDate: data.validationPeriod.startDate
          ? toLocalInputValue(data.validationPeriod.startDate)
          : "",
        endDate: data.validationPeriod.endDate
          ? toLocalInputValue(data.validationPeriod.endDate)
          : "",
        isActive: data.validationPeriod.isActive,
      });

      setBackupInfo(data.backupInfo);
    } catch (error) {
      console.error("Error loading settings:", error);
      showMessage("error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  // Convert ISO (UTC) -> datetime-local string
  function toLocalInputValue(isoString: string) {
    if (!isoString) return "";

    const date = new Date(isoString);

    // Adjust for timezone offset
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

    return local.toISOString().slice(0, 16);
  }

  const handleSavePeriod = async (skipDialog = false) => {
    // Validate dates
    if (validationPeriod.startDate && validationPeriod.endDate) {
      const start = new Date(validationPeriod.startDate);
      const end = new Date(validationPeriod.endDate);

      if (end < start) {
        showMessage("error", "End date must be after start date");
        return;
      }
    }

    // Check if there's already a saved period by fetching current data
    if (!skipDialog) {
      try {
        const response = await fetch("/api/admin/settings");
        if (response.ok) {
          const data = await response.json();
          const hasSavedPeriod =
            data.validationPeriod.startDate !== "" ||
            data.validationPeriod.endDate !== "";

          if (hasSavedPeriod) {
            // Show confirmation dialog
            setShowSavePeriodDialog(true);
            return;
          }
        }
      } catch (error) {
        console.error("Error checking existing period:", error);
      }
    }

    // Proceed with saving
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validationPeriod }),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      showMessage("success", "ID validation period updated successfully");
      await loadSettings(); // Reload to get updated isActive status
      setShowSavePeriodDialog(false);
    } catch (error) {
      console.error("Error saving period:", error);
      showMessage("error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const confirmSavePeriod = () => {
    setShowSavePeriodDialog(false);
    handleSavePeriod(true); // Skip dialog check on confirmation
  };

  const handleExtendPeriod = async () => {
    if (!validationPeriod.endDate) {
      showMessage("error", "No current period to extend");
      return;
    }

    if (extensionDays < 1 || extensionDays > 90) {
      showMessage("error", "Extension must be between 1 and 90 days");
      return;
    }

    if (
      !confirm(
        `Extend the validation period by ${extensionDays} days?\n\nThis will add ${extensionDays} days to the current end date.`,
      )
    ) {
      return;
    }

    setExtending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/extend-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extensionDays }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extend period");
      }

      const result = await response.json();
      showMessage(
        "success",
        `Period extended by ${extensionDays} days. New end date: ${new Date(result.newEndDate).toLocaleString()}`,
      );
      await loadSettings();
    } catch (error: any) {
      console.error("Error extending period:", error);
      showMessage("error", error.message || "Failed to extend period");
    } finally {
      setExtending(false);
    }
  };

  const handleStartNewSemester = async () => {
    setShowNewSemesterDialog(false);
    setStartingNewSemester(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/new-semester", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start new semester");
      }

      const result = await response.json();
      showMessage(
        "success",
        `New semester started! ${result.resetCount} student profiles have been reset. Please set a new validation period.`,
      );
      await loadSettings();
    } catch (error: any) {
      console.error("Error starting new semester:", error);
      showMessage("error", error.message || "Failed to start new semester");
    } finally {
      setStartingNewSemester(false);
    }
  };

  const handleBackupData = async () => {
    setBacking(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to create backup");

      // Download the backup file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `id-validation-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showMessage("success", "Backup created and downloaded successfully");
      await loadSettings(); // Reload backup info
    } catch (error) {
      console.error("Error creating backup:", error);
      showMessage("error", "Failed to create backup");
    } finally {
      setBacking(false);
    }
  };

  const handleCleanData = async () => {
    setShowCleanupDialog(false);
    setCleaning(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/cleanup", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to clean data");

      const result = await response.json();
      showMessage(
        "success",
        `Successfully deleted ${result.deletedCount} old records`,
      );
      await loadSettings(); // Reload backup info
    } catch (error) {
      console.error("Error cleaning data:", error);
      showMessage("error", "Failed to clean data");
    } finally {
      setCleaning(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  const isPeriodActive = validationPeriod.isActive;
  const now = new Date();
  const startDate = validationPeriod.startDate
    ? new Date(validationPeriod.startDate)
    : null;
  const endDate = validationPeriod.endDate
    ? new Date(validationPeriod.endDate)
    : null;
  const hasPeriod = validationPeriod.startDate && validationPeriod.endDate;

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
            Set the start and end dates for when students can submit ID
            validation requests.
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
              e.preventDefault();
              handleSavePeriod(false);
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
                      Starts in{" "}
                      {Math.ceil(
                        (startDate.getTime() - now.getTime()) /
                          (1000 * 60 * 60 * 24),
                      )}{" "}
                      days
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
                      Period ended{" "}
                      {Math.floor(
                        (now.getTime() - endDate.getTime()) /
                          (1000 * 60 * 60 * 24),
                      )}{" "}
                      days ago
                    </p>
                  )}
                </Field>
              </div>

              {/* Current Status */}
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  Current Status
                </h4>
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
                      {isPeriodActive
                        ? "Active - Accepting Requests"
                        : "Inactive - Not Accepting Requests"}
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

      {/* Period Management Actions */}
      {hasPeriod && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              <CardTitle>Period Management</CardTitle>
            </div>
            <CardDescription>
              Extend the current period or start a new semester
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {/* Extend Period */}
              <Field>
                <FieldLabel>Extend Current Period</FieldLabel>
                <FieldDescription>
                  Add additional days to the current validation period without
                  changing the start date.
                </FieldDescription>
                <div className="flex gap-3 items-end">
                  <div className="flex-1 max-w-xs">
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={extensionDays}
                      onChange={(e) =>
                        setExtensionDays(parseInt(e.target.value) || 7)
                      }
                      placeholder="Days to extend"
                      className="w-full"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleExtendPeriod}
                    disabled={extending || !validationPeriod.endDate}
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {extending
                      ? "Extending..."
                      : `Extend by ${extensionDays} Days`}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter number of days (1-90)
                </p>
                {validationPeriod.endDate && (
                  <p className="text-sm text-blue-600 mt-2">
                    New end date will be:{" "}
                    {new Date(
                      new Date(validationPeriod.endDate).getTime() +
                        extensionDays * 24 * 60 * 60 * 1000,
                    ).toLocaleString()}
                  </p>
                )}
              </Field>

              {/* Start New Semester */}
              <Field>
                <FieldLabel>Start New Semester</FieldLabel>
                <FieldDescription>
                  Reset all student validation statuses and clear the current
                  period. Use this when starting a new academic term.
                  <strong className="block mt-1 text-red-600">
                    ⚠️ Warning: This will reset validation status for ALL
                    students!
                  </strong>
                </FieldDescription>
                <Button
                  type="button"
                  onClick={() => setShowNewSemesterDialog(true)}
                  disabled={startingNewSemester}
                  variant="outline"
                  className="w-full md:w-auto border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {startingNewSemester
                    ? "Starting New Semester..."
                    : "Start New Semester"}
                </Button>
                <p className="text-sm text-amber-600 mt-2">
                  💡 Tip: Create a backup before starting a new semester
                </p>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

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
              <h4 className="font-medium text-gray-900 mb-3">
                Database Statistics
              </h4>
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
                  Download a complete backup of all ID validation records as a
                  JSON file. This backup can be used to restore data if needed.
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
                  Permanently delete all ID validation records that fall outside
                  the current validation period.
                  <strong className="block mt-1 text-red-600">
                    ⚠️ Warning: This action cannot be undone. Create a backup
                    first!
                  </strong>
                </FieldDescription>
                <Button
                  type="button"
                  onClick={() => setShowCleanupDialog(true)}
                  disabled={
                    cleaning ||
                    !validationPeriod.startDate ||
                    !validationPeriod.endDate
                  }
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

      {/* Cleanup Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showCleanupDialog}
        onClose={() => setShowCleanupDialog(false)}
        onConfirm={handleCleanData}
        isLoading={cleaning}
        confirmText="Delete Old Records"
        requiresTyping={true}
        typingText="DELETE"
        steps={[
          {
            title: "⚠️ Delete Old Validation Records",
            description:
              "You are about to permanently delete ID validation records that fall outside the current validation period.",
            type: "warning",
            bullets: [
              "All records created BEFORE the start date will be deleted",
              "All records created AFTER the end date will be deleted",
              "Records within the validation period will be kept",
            ],
            checklist: [
              "I understand this action is permanent and cannot be undone",
              "I have created a recent backup of the data",
              "I have verified the current validation period dates are correct",
            ],
          },
          {
            title: "🔴 Final Confirmation Required",
            description:
              "This is your last chance to cancel. Once confirmed, all old data will be permanently deleted from the database.",
            type: "danger",
            bullets: [
              "Database records will be permanently removed",
              "There is no way to recover deleted data without a backup",
              "This operation may take a few moments to complete",
            ],
          },
        ]}
      />

      {/* Save Period Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showSavePeriodDialog}
        onClose={() => setShowSavePeriodDialog(false)}
        onConfirm={confirmSavePeriod}
        isLoading={saving}
        confirmText="Update Period Settings"
        requiresTyping={false}
        steps={[
          {
            title: "📅 Update Validation Period",
            description:
              "You are about to change the existing validation period. This will affect when students can submit their ID validation requests.",
            type: "warning",
            bullets: [
              `Current period: ${validationPeriod.startDate ? new Date(validationPeriod.startDate).toLocaleString() : "Not set"} - ${validationPeriod.endDate ? new Date(validationPeriod.endDate).toLocaleString() : "Not set"}`,
              isPeriodActive
                ? "⚠️ The validation period is currently ACTIVE - students can submit requests right now"
                : "The validation period is currently inactive",
              "Changing the dates will immediately affect student access to validation submissions",
            ],
            checklist: [
              "I have verified the new start and end dates are correct",
              "I understand this will change when students can submit validation requests",
              isPeriodActive
                ? "I understand students may currently be submitting requests during the active period"
                : "I understand this may activate or deactivate the validation period",
            ],
          },
        ]}
      />

      {/* New Semester Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showNewSemesterDialog}
        onClose={() => setShowNewSemesterDialog(false)}
        onConfirm={handleStartNewSemester}
        isLoading={startingNewSemester}
        confirmText="Start New Semester"
        requiresTyping={true}
        typingText="NEW SEMESTER"
        steps={[
          {
            title: "📚 Start New Semester",
            description:
              "Starting a new semester will reset the validation status for all students in the system.",
            type: "info",
            bullets: [
              "All students will be marked as 'not validated'",
              "Current validation period will be cleared",
              "You will need to set a new validation period",
              "Students will need to resubmit validation requests",
            ],
            checklist: [
              "I understand ALL students will be affected by this action",
              "I have created a backup of current data",
              "I am ready to configure a new validation period",
            ],
          },
          {
            title: "⚠️ Confirm Mass Student Reset",
            description: `This will reset validation status for approximately ${backupInfo.totalRecords.toLocaleString()} student records. This action affects every student in the system.`,
            type: "warning",
            bullets: [
              "Every student profile will have their validation status reset to 'not validated'",
              "Students will see their validation as 'pending' or 'not started'",
              "This operation is logged for audit purposes",
            ],
            checklist: [
              "I have informed students about the new semester validation requirement",
              "I understand this change is immediate and affects all users",
            ],
          },
          {
            title: "🔴 Final Confirmation - New Semester",
            description:
              "This is the final step. After clicking confirm, all student validation statuses will be reset immediately.",
            type: "danger",
            bullets: [
              "This action cannot be undone without restoring from backup",
              "Students will need to go through validation process again",
              "System will be ready for new semester immediately after",
            ],
          },
        ]}
      />
    </div>
  );
}
