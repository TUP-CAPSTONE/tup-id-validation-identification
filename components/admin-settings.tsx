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
  Tag,
} from "lucide-react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

interface ValidationPeriod {
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface StickerClaimingPeriod {
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface SemesterInfo {
  schoolYear: string;   // e.g. "2024-2025"
  semester: "1st" | "2nd" | "";
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
  const [stickerClaimingPeriod, setStickerClaimingPeriod] = useState<StickerClaimingPeriod>({
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
  const [savingSticker, setSavingSticker] = useState(false);
  const [backing, setBacking] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extendingSticker, setExtendingSticker] = useState(false);
  const [startingNewSemester, setStartingNewSemester] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Dialog states
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [showNewSemesterDialog, setShowNewSemesterDialog] = useState(false);
  const [showNewSemesterConfirmDialog, setShowNewSemesterConfirmDialog] = useState(false);
  const [showSavePeriodDialog, setShowSavePeriodDialog] = useState(false);
  const [showSaveStickerDialog, setShowSaveStickerDialog] = useState(false);

  // Extension settings
  const [extensionDays, setExtensionDays] = useState<number>(7);
  const [extensionDaysSticker, setExtensionDaysSticker] = useState<number>(7);

  // New Semester state
  const [newSemesterInfo, setNewSemesterInfo] = useState<SemesterInfo>({
    schoolYear: "",
    semester: "",
  });
  const [autoDetectedSemester, setAutoDetectedSemester] = useState<SemesterInfo | null>(null);
  const [semesterConflictError, setSemesterConflictError] = useState<string | null>(null);

  // Sticker period validation errors
  const [stickerErrors, setStickerErrors] = useState<{ startDate?: string; endDate?: string }>({});

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

      if (data.stickerClaimingPeriod) {
        setStickerClaimingPeriod({
          startDate: data.stickerClaimingPeriod.startDate
            ? toLocalInputValue(data.stickerClaimingPeriod.startDate)
            : "",
          endDate: data.stickerClaimingPeriod.endDate
            ? toLocalInputValue(data.stickerClaimingPeriod.endDate)
            : "",
          isActive: data.stickerClaimingPeriod.isActive ?? false,
        });
      }

      setBackupInfo(data.backupInfo);

      // Auto-detect next semester from previous
      if (data.currentSemester) {
        const prev: SemesterInfo = data.currentSemester;
        let nextSemester: "1st" | "2nd" = "1st";
        let nextSchoolYear = prev.schoolYear;

        if (prev.semester === "1st") {
          nextSemester = "2nd";
        } else {
          // After 2nd semester -> next year's 1st semester
          nextSemester = "1st";
          const [startYr] = prev.schoolYear.split("-").map(Number);
          nextSchoolYear = `${startYr + 1}-${startYr + 2}`;
        }

        setAutoDetectedSemester({ schoolYear: nextSchoolYear, semester: nextSemester });
        setNewSemesterInfo({ schoolYear: nextSchoolYear, semester: nextSemester });
      }
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
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  // ─── Sticker Period Validation ───────────────────────────────────────────────
  function validateStickerPeriod(
    stickerStart: string,
    stickerEnd: string,
    validationStart: string,
    validationEnd: string
  ): { startDate?: string; endDate?: string } {
    const errors: { startDate?: string; endDate?: string } = {};

    if (!validationStart || !validationEnd) return errors;

    const vsDate = new Date(validationStart);
    const veDate = new Date(validationEnd);

    if (stickerStart) {
      const ssDate = new Date(stickerStart);
      if (ssDate < vsDate) {
        errors.startDate = `Sticker claiming cannot start before the ID validation start date (${new Date(validationStart).toLocaleString()})`;
      }
    }

    if (stickerEnd) {
      const seDate = new Date(stickerEnd);
      if (seDate < veDate) {
        errors.endDate = `Sticker claiming cannot end before the ID validation end date (${new Date(validationEnd).toLocaleString()})`;
      }
    }

    if (stickerStart && stickerEnd) {
      const ssDate = new Date(stickerStart);
      const seDate = new Date(stickerEnd);
      if (seDate <= ssDate) {
        errors.endDate = errors.endDate ?? "End date must be after start date";
      }
    }

    return errors;
  }

  const handleStickerFieldChange = (field: "startDate" | "endDate", value: string) => {
    const updated = { ...stickerClaimingPeriod, [field]: value };
    setStickerClaimingPeriod(updated);
    const errors = validateStickerPeriod(
      updated.startDate,
      updated.endDate,
      validationPeriod.startDate,
      validationPeriod.endDate
    );
    setStickerErrors(errors);
  };

  // ─── Save Validation Period ──────────────────────────────────────────────────
  const handleSavePeriod = async (skipDialog = false) => {
    if (validationPeriod.startDate && validationPeriod.endDate) {
      const start = new Date(validationPeriod.startDate);
      const end = new Date(validationPeriod.endDate);
      if (end < start) {
        showMessage("error", "End date must be after start date");
        return;
      }
    }

    if (!skipDialog) {
      try {
        const response = await fetch("/api/admin/settings");
        if (response.ok) {
          const data = await response.json();
          const hasSavedPeriod =
            data.validationPeriod.startDate !== "" ||
            data.validationPeriod.endDate !== "";
          if (hasSavedPeriod) {
            setShowSavePeriodDialog(true);
            return;
          }
        }
      } catch (error) {
        console.error("Error checking existing period:", error);
      }
    }

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
      await loadSettings();
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
    handleSavePeriod(true);
  };

  // ─── Save Sticker Claiming Period ────────────────────────────────────────────
  const handleSaveStickerPeriod = async (skipDialog = false) => {
    const errors = validateStickerPeriod(
      stickerClaimingPeriod.startDate,
      stickerClaimingPeriod.endDate,
      validationPeriod.startDate,
      validationPeriod.endDate
    );
    setStickerErrors(errors);
    if (errors.startDate || errors.endDate) return;

    if (!skipDialog) {
      try {
        const response = await fetch("/api/admin/settings");
        if (response.ok) {
          const data = await response.json();
          const hasSaved =
            data.stickerClaimingPeriod?.startDate ||
            data.stickerClaimingPeriod?.endDate;
          if (hasSaved) {
            setShowSaveStickerDialog(true);
            return;
          }
        }
      } catch (error) {
        console.error("Error checking sticker period:", error);
      }
    }

    setSavingSticker(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stickerClaimingPeriod }),
      });
      if (!response.ok) throw new Error("Failed to save sticker claiming period");
      showMessage("success", "Sticker claiming period updated successfully");
      await loadSettings();
      setShowSaveStickerDialog(false);
    } catch (error) {
      console.error("Error saving sticker period:", error);
      showMessage("error", "Failed to save sticker claiming period");
    } finally {
      setSavingSticker(false);
    }
  };

  const confirmSaveStickerPeriod = () => {
    setShowSaveStickerDialog(false);
    handleSaveStickerPeriod(true);
  };

  // ─── Extend Periods ──────────────────────────────────────────────────────────
  const handleExtendPeriod = async () => {
    if (!validationPeriod.endDate) {
      showMessage("error", "No current period to extend");
      return;
    }
    if (extensionDays < 1 || extensionDays > 90) {
      showMessage("error", "Extension must be between 1 and 90 days");
      return;
    }
    if (!confirm(`Extend the validation period by ${extensionDays} days?`)) return;

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
        `Period extended by ${extensionDays} days. New end date: ${new Date(result.newEndDate).toLocaleString()}`
      );
      await loadSettings();
    } catch (error: any) {
      showMessage("error", error.message || "Failed to extend period");
    } finally {
      setExtending(false);
    }
  };

  const handleExtendStickerPeriod = async () => {
    if (!stickerClaimingPeriod.endDate) {
      showMessage("error", "No current sticker claiming period to extend");
      return;
    }
    if (extensionDaysSticker < 1 || extensionDaysSticker > 90) {
      showMessage("error", "Extension must be between 1 and 90 days");
      return;
    }
    if (!confirm(`Extend the sticker claiming period by ${extensionDaysSticker} days?`)) return;

    setExtendingSticker(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/extend-sticker-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extensionDays: extensionDaysSticker }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extend sticker period");
      }
      const result = await response.json();
      showMessage(
        "success",
        `Sticker period extended by ${extensionDaysSticker} days. New end date: ${new Date(result.newEndDate).toLocaleString()}`
      );
      await loadSettings();
    } catch (error: any) {
      showMessage("error", error.message || "Failed to extend sticker period");
    } finally {
      setExtendingSticker(false);
    }
  };

  // ─── New Semester ────────────────────────────────────────────────────────────
  // Phase 1: open the form modal to collect school year + semester
  const handleOpenNewSemesterDialog = () => {
    setSemesterConflictError(null);
    setShowNewSemesterDialog(true);
  };

  // Phase 1 → Phase 2: validate the form, then open the ConfirmationDialog
  const handleProceedToConfirmNewSemester = () => {
    setSemesterConflictError(null);

    if (!newSemesterInfo.schoolYear || !newSemesterInfo.semester) {
      setSemesterConflictError("Please provide a school year and semester.");
      return;
    }

    const schoolYearRegex = /^\d{4}-\d{4}$/;
    if (!schoolYearRegex.test(newSemesterInfo.schoolYear)) {
      setSemesterConflictError("School year must be in the format YYYY-YYYY (e.g. 2024-2025).");
      return;
    }

    const [startYr, endYr] = newSemesterInfo.schoolYear.split("-").map(Number);
    if (endYr !== startYr + 1) {
      setSemesterConflictError("School year years must be consecutive (e.g. 2024-2025).");
      return;
    }

    // Close form modal, open confirmation dialog
    setShowNewSemesterDialog(false);
    setShowNewSemesterConfirmDialog(true);
  };

  // Phase 2: actually call the API after all confirmation steps are done
  const handleStartNewSemester = async () => {
    setShowNewSemesterConfirmDialog(false);
    setStartingNewSemester(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/new-semester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolYear: newSemesterInfo.schoolYear,
          semester: newSemesterInfo.semester,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          // Re-open form modal so admin can fix the duplicate
          setSemesterConflictError(
            error.error || `${newSemesterInfo.semester} semester of ${newSemesterInfo.schoolYear} already exists.`
          );
          setShowNewSemesterDialog(true);
          return;
        }
        throw new Error(error.error || "Failed to start new semester");
      }

      const result = await response.json();
      showMessage(
        "success",
        `New semester started! ${result.resetCount} student profiles have been reset. Please set a new validation period.`
      );
      await loadSettings();
    } catch (error: any) {
      showMessage("error", error.message || "Failed to start new semester");
    } finally {
      setStartingNewSemester(false);
    }
  };

  // ─── Backup & Cleanup ────────────────────────────────────────────────────────
  const handleBackupData = async () => {
    setBacking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/backup", { method: "POST" });
      if (!response.ok) throw new Error("Failed to create backup");
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
      await loadSettings();
    } catch (error) {
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
      const response = await fetch("/api/admin/cleanup", { method: "POST" });
      if (!response.ok) throw new Error("Failed to clean data");
      const result = await response.json();
      showMessage("success", `Successfully deleted ${result.deletedCount} old records`);
      await loadSettings();
    } catch (error) {
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
  const isStickerActive = stickerClaimingPeriod.isActive;
  const now = new Date();
  const startDate = validationPeriod.startDate ? new Date(validationPeriod.startDate) : null;
  const endDate = validationPeriod.endDate ? new Date(validationPeriod.endDate) : null;
  const hasPeriod = validationPeriod.startDate && validationPeriod.endDate;

  // Computed preview of new sticker end date
  const stickerEndPreview =
    stickerClaimingPeriod.endDate
      ? new Date(
          new Date(stickerClaimingPeriod.endDate).getTime() +
            extensionDaysSticker * 24 * 60 * 60 * 1000
        ).toLocaleString()
      : null;

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

      {/* ── ID Validation Period ─────────────────────────────────────────────── */}
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
                          (1000 * 60 * 60 * 24)
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
                          (1000 * 60 * 60 * 24)
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
                        ? "Active – Accepting Requests"
                        : "Inactive – Not Accepting Requests"}
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

      {/* ── Sticker Claiming Period ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            <CardTitle>ID Sticker Claiming Period</CardTitle>
          </div>
          <CardDescription>
            Set the date range during which students can claim their ID
            validation stickers.
            {isStickerActive && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Active Now
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Rule hint */}
          {validationPeriod.startDate && validationPeriod.endDate && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
              <span className="font-medium">Rules:</span> The sticker claiming
              start date cannot be before the validation start date (
              {new Date(validationPeriod.startDate).toLocaleString()}), and the
              end date cannot be before the validation end date (
              {new Date(validationPeriod.endDate).toLocaleString()}).
            </div>
          )}

          {!validationPeriod.startDate && !validationPeriod.endDate && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-700">
              Please set the ID Validation Period first before configuring the
              sticker claiming period.
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveStickerPeriod(false);
            }}
          >
            <FieldGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field>
                  <FieldLabel htmlFor="stickerStartDate">Start Date</FieldLabel>
                  <FieldDescription>
                    Students can start claiming stickers from this date
                  </FieldDescription>
                  <Input
                    id="stickerStartDate"
                    type="datetime-local"
                    value={stickerClaimingPeriod.startDate}
                    min={validationPeriod.startDate || undefined}
                    onChange={(e) =>
                      handleStickerFieldChange("startDate", e.target.value)
                    }
                    disabled={savingSticker || !validationPeriod.startDate}
                  />
                  {stickerErrors.startDate && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {stickerErrors.startDate}
                    </p>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="stickerEndDate">End Date</FieldLabel>
                  <FieldDescription>
                    Sticker claiming closes after this date
                  </FieldDescription>
                  <Input
                    id="stickerEndDate"
                    type="datetime-local"
                    value={stickerClaimingPeriod.endDate}
                    min={validationPeriod.endDate || undefined}
                    onChange={(e) =>
                      handleStickerFieldChange("endDate", e.target.value)
                    }
                    disabled={savingSticker || !validationPeriod.endDate}
                  />
                  {stickerErrors.endDate && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {stickerErrors.endDate}
                    </p>
                  )}
                </Field>
              </div>

              {/* Sticker Status */}
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  Current Sticker Claiming Status
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600">
                    <span className="font-medium">Status:</span>{" "}
                    <span
                      className={
                        isStickerActive
                          ? "text-blue-600 font-medium"
                          : "text-gray-500"
                      }
                    >
                      {isStickerActive
                        ? "Active – Accepting Sticker Claims"
                        : "Inactive – Not Accepting Claims"}
                    </span>
                  </p>
                  {stickerClaimingPeriod.startDate && (
                    <p className="text-gray-600">
                      <span className="font-medium">Start:</span>{" "}
                      {new Date(stickerClaimingPeriod.startDate).toLocaleString()}
                    </p>
                  )}
                  {stickerClaimingPeriod.endDate && (
                    <p className="text-gray-600">
                      <span className="font-medium">End:</span>{" "}
                      {new Date(stickerClaimingPeriod.endDate).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={
                    savingSticker ||
                    !validationPeriod.startDate ||
                    !validationPeriod.endDate ||
                    !!stickerErrors.startDate ||
                    !!stickerErrors.endDate
                  }
                >
                  {savingSticker ? "Saving..." : "Save Sticker Period"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* ── Period Management Actions ────────────────────────────────────────── */}
      {hasPeriod && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              <CardTitle>Period Management</CardTitle>
            </div>
            <CardDescription>
              Extend the current periods or start a new semester
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {/* Extend Validation Period */}
              <Field>
                <FieldLabel>Extend ID Validation Period</FieldLabel>
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
                  Enter number of days (1–90)
                </p>
                {validationPeriod.endDate && (
                  <p className="text-sm text-blue-600 mt-2">
                    New end date will be:{" "}
                    {new Date(
                      new Date(validationPeriod.endDate).getTime() +
                        extensionDays * 24 * 60 * 60 * 1000
                    ).toLocaleString()}
                  </p>
                )}
              </Field>

              {/* Extend Sticker Claiming Period */}
              {stickerClaimingPeriod.endDate && (
                <Field>
                  <FieldLabel>Extend Sticker Claiming Period</FieldLabel>
                  <FieldDescription>
                    Add additional days to the sticker claiming period.
                  </FieldDescription>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 max-w-xs">
                      <Input
                        type="number"
                        min="1"
                        max="90"
                        value={extensionDaysSticker}
                        onChange={(e) =>
                          setExtensionDaysSticker(parseInt(e.target.value) || 7)
                        }
                        placeholder="Days to extend"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleExtendStickerPeriod}
                      disabled={extendingSticker}
                      variant="outline"
                      className="border-teal-200 text-teal-700 hover:bg-teal-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {extendingSticker
                        ? "Extending..."
                        : `Extend by ${extensionDaysSticker} Days`}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter number of days (1–90)
                  </p>
                  {stickerEndPreview && (
                    <p className="text-sm text-teal-600 mt-2">
                      New sticker end date will be: {stickerEndPreview}
                    </p>
                  )}
                </Field>
              )}

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
                  onClick={handleOpenNewSemesterDialog}
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

      {/* ── Data Management ──────────────────────────────────────────────────── */}
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

            <FieldGroup>
              <Field>
                <FieldLabel>Backup Data</FieldLabel>
                <FieldDescription>
                  Download a complete backup of all ID validation records as a
                  JSON file.
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
                  Permanently delete all ID validation records outside the
                  current validation period.
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

      {/* ── New Semester Dialog (custom inline modal) ────────────────────────── */}
      {showNewSemesterDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Start New Semester
              </h2>
            </div>

            {autoDetectedSemester ? (
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-100 text-sm text-purple-700">
                <span className="font-medium">Auto-detected next semester:</span>{" "}
                {autoDetectedSemester.semester} Semester,{" "}
                {autoDetectedSemester.schoolYear}. You can adjust below if
                needed.
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-700">
                No previous semester found. Please enter the school year and
                semester manually.
              </div>
            )}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="newSchoolYear">School Year</FieldLabel>
                <FieldDescription>Format: YYYY-YYYY (e.g. 2024-2025)</FieldDescription>
                <Input
                  id="newSchoolYear"
                  type="text"
                  placeholder="2024-2025"
                  value={newSemesterInfo.schoolYear}
                  onChange={(e) => {
                    setNewSemesterInfo({
                      ...newSemesterInfo,
                      schoolYear: e.target.value,
                    });
                    setSemesterConflictError(null);
                  }}
                />
              </Field>

              <Field>
                <FieldLabel>Semester</FieldLabel>
                <div className="flex gap-3 mt-1">
                  {(["1st", "2nd"] as const).map((sem) => (
                    <button
                      key={sem}
                      type="button"
                      onClick={() => {
                        setNewSemesterInfo({
                          ...newSemesterInfo,
                          semester: sem,
                        });
                        setSemesterConflictError(null);
                      }}
                      className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                        newSemesterInfo.semester === sem
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "bg-white border-gray-300 text-gray-700 hover:border-purple-300"
                      }`}
                    >
                      {sem} Semester
                    </button>
                  ))}
                </div>
              </Field>
            </FieldGroup>

            {/* Conflict / Validation Error */}
            {semesterConflictError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{semesterConflictError}</span>
              </div>
            )}

            {/* Consequences summary */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-800">What will happen:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>All student validation statuses will be reset</li>
                <li>Current validation and sticker periods will be cleared</li>
                <li>You will need to set new period dates</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewSemesterDialog(false);
                  setSemesterConflictError(null);
                }}
                disabled={startingNewSemester}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleProceedToConfirmNewSemester}
                disabled={
                  startingNewSemester ||
                  !newSemesterInfo.schoolYear ||
                  !newSemesterInfo.semester
                }
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Existing Confirmation Dialogs ────────────────────────────────────── */}
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
              "You are about to change the existing validation period.",
            type: "warning",
            bullets: [
              `New period: ${validationPeriod.startDate ? new Date(validationPeriod.startDate).toLocaleString() : "Not set"} – ${validationPeriod.endDate ? new Date(validationPeriod.endDate).toLocaleString() : "Not set"}`,
              isPeriodActive
                ? "⚠️ The validation period is currently ACTIVE"
                : "The validation period is currently inactive",
              "Changing the dates will immediately affect student access",
            ],
            checklist: [
              "I have verified the new start and end dates are correct",
              "I understand this will change when students can submit validation requests",
              isPeriodActive
                ? "I understand students may currently be submitting requests"
                : "I understand this may activate or deactivate the period",
            ],
          },
        ]}
      />

      <ConfirmationDialog
        isOpen={showSaveStickerDialog}
        onClose={() => setShowSaveStickerDialog(false)}
        onConfirm={confirmSaveStickerPeriod}
        isLoading={savingSticker}
        confirmText="Update Sticker Period"
        requiresTyping={false}
        steps={[
          {
            title: "🏷️ Update Sticker Claiming Period",
            description:
              "You are about to change the existing sticker claiming period.",
            type: "warning",
            bullets: [
              `New period: ${stickerClaimingPeriod.startDate ? new Date(stickerClaimingPeriod.startDate).toLocaleString() : "Not set"} – ${stickerClaimingPeriod.endDate ? new Date(stickerClaimingPeriod.endDate).toLocaleString() : "Not set"}`,
              isStickerActive
                ? "⚠️ Sticker claiming is currently ACTIVE"
                : "Sticker claiming is currently inactive",
              "Changing these dates will immediately affect when students can claim stickers",
            ],
            checklist: [
              "I have verified the new sticker claiming dates are correct",
              "I understand this change takes effect immediately",
            ],
          },
        ]}
      />

      {/* New Semester Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showNewSemesterConfirmDialog}
        onClose={() => setShowNewSemesterConfirmDialog(false)}
        onConfirm={handleStartNewSemester}
        isLoading={startingNewSemester}
        confirmText="Start New Semester"
        requiresTyping={true}
        typingText="NEW SEMESTER"
        steps={[
          {
            title: "📚 Review New Semester Details",
            description: `You are about to start the ${newSemesterInfo.semester} Semester of School Year ${newSemesterInfo.schoolYear}. Please review what will happen before proceeding.`,
            type: "info",
            bullets: [
              `Semester: ${newSemesterInfo.semester} Semester, S.Y. ${newSemesterInfo.schoolYear}`,
              "All students will be marked as 'not validated'",
              "The current ID validation period will be cleared",
              "The current sticker claiming period will be cleared",
              "Students will need to resubmit their validation requests",
            ],
            checklist: [
              "I have verified the school year and semester are correct",
              "I understand ALL students will need to revalidate their IDs",
              "I have created a backup of the current semester's data",
            ],
          },
          {
            title: "⚠️ Mass Student Reset Warning",
            description: `This will immediately reset the validation status of all ${backupInfo.totalRecords.toLocaleString()} student records. Every student in the system will be affected.`,
            type: "warning",
            bullets: [
              "Every student profile's validation status will be set to 'not validated'",
              "All validatedAt and validatedBy fields will be cleared",
              "Both the ID validation period and sticker claiming period will be wiped",
              "Students will be unable to claim stickers until new periods are configured",
              "This operation is logged for audit purposes",
            ],
            checklist: [
              "I have informed or will inform students about the new semester requirement",
              "I am ready to set new ID validation and sticker claiming periods after this",
              "I understand this change takes effect immediately for all users",
            ],
          },
          {
            title: "🔴 Final Confirmation — New Semester",
            description: `Last chance to cancel. Type "NEW SEMESTER" below to confirm starting ${newSemesterInfo.semester} Semester, S.Y. ${newSemesterInfo.schoolYear}.`,
            type: "danger",
            bullets: [
              "This action cannot be undone without restoring from a backup",
              "Students will need to go through the full validation process again",
              "The system will be ready for the new semester immediately after",
            ],
          },
        ]}
      />
    </div>
  );
}