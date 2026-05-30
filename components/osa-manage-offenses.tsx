"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Mail,
  FileDown,
  Printer,
} from "lucide-react";
import { generateOffensePDF, printOffensePDF } from "@/lib/offense-pdf-generator";

interface Offense {
  id: string;
  studentUid: string;
  studentNumber: string;
  studentName: string;
  studentEmail: string;
  offenseNumber: string;
  offenseTitle: string;
  offenseType: "major" | "minor";
  offenseItems?: string[];
  offenseDescription: string;
  sanction: string;
  sanctionLevel: string;
  dateCommitted: any;
  dateRecorded: any;
  recordedByEmail?: string;
  status: "active" | "resolved";
  resolvedAt?: any;
  resolvedBy?: string;
  resolutionRemarks?: string;
  guardianNotifiedAt?: any;
  guardianNotifiedBy?: string;
  guardianEmail?: string;
}

export function OSAManageOffenses() {
  const [offenses, setOffenses] = useState<Offense[]>([]);
  const [filteredOffenses, setFilteredOffenses] = useState<Offense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("active");
  const [typeFilter, setTypeFilter] = useState<"all" | "major" | "minor">("all");

  // Resolve dialog
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedOffense, setSelectedOffense] = useState<Offense | null>(null);
  const [resolutionRemarks, setResolutionRemarks] = useState("");
  const [resolving, setResolving] = useState(false);

  // Email guardian
  const [emailingGuardian, setEmailingGuardian] = useState<string | null>(null);
  const [guardianDialogOpen, setGuardianDialogOpen] = useState(false);
  const [guardianTargetOffense, setGuardianTargetOffense] = useState<Offense | null>(null);

  // PDF actions — track per-offense loading separately for download vs print
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const [printingPDF, setPrintingPDF] = useState<string | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchOffenses = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "student_offenses"), orderBy("dateRecorded", "desc"));
      const snapshot = await getDocs(q);
      const list: Offense[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Offense));
      setOffenses(list);
    } catch (error) {
      console.error("Error fetching offenses:", error);
      toast.error("Failed to load offenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...offenses];
    if (statusFilter !== "all") filtered = filtered.filter((o) => o.status === statusFilter);
    if (typeFilter !== "all") filtered = filtered.filter((o) => o.offenseType === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.studentName?.toLowerCase().includes(q) ||
          o.studentNumber?.toLowerCase().includes(q) ||
          o.studentEmail?.toLowerCase().includes(q) ||
          o.offenseTitle?.toLowerCase().includes(q)
      );
    }
    setFilteredOffenses(filtered);
  }, [offenses, statusFilter, typeFilter, searchQuery]);

  useEffect(() => { fetchOffenses(); }, []);

  // ── Resolve ─────────────────────────────────────────────────────────────────

  const handleOpenResolve = (offense: Offense) => {
    setSelectedOffense(offense);
    setResolutionRemarks("");
    setResolveDialogOpen(true);
  };

  const handleResolveOffense = async () => {
    if (!selectedOffense || !resolutionRemarks.trim()) {
      toast.error("Please enter resolution remarks");
      return;
    }
    setResolving(true);
    try {
      await updateDoc(doc(db, "student_offenses", selectedOffense.id), {
        status: "resolved",
        resolvedAt: serverTimestamp(),
        resolvedBy: selectedOffense.studentEmail || "OSA",
        resolutionRemarks: resolutionRemarks.trim(),
      });
      toast.success("Offense resolved successfully", {
        description: `Offense for ${selectedOffense.studentName} has been resolved.`,
      });
      setOffenses((prev) =>
        prev.map((o) =>
          o.id === selectedOffense.id
            ? { ...o, status: "resolved", resolutionRemarks: resolutionRemarks.trim() }
            : o
        )
      );
      setResolveDialogOpen(false);
      setSelectedOffense(null);
      setResolutionRemarks("");
    } catch (error) {
      console.error("Error resolving offense:", error);
      toast.error("Failed to resolve offense");
    } finally {
      setResolving(false);
    }
  };

  const handleReopenOffense = async (offense: Offense) => {
    try {
      await updateDoc(doc(db, "student_offenses", offense.id), {
        status: "active", resolvedAt: null, resolvedBy: null, resolutionRemarks: null,
      });
      toast.success("Offense reopened", {
        description: `Offense for ${offense.studentName} has been reopened.`,
      });
      setOffenses((prev) =>
        prev.map((o) => o.id === offense.id ? { ...o, status: "active", resolutionRemarks: undefined } : o)
      );
    } catch (error) {
      console.error("Error reopening offense:", error);
      toast.error("Failed to reopen offense");
    }
  };

  // ── Email guardian ──────────────────────────────────────────────────────────

  const handleOpenEmailGuardian = (offense: Offense) => {
    setGuardianTargetOffense(offense);
    setGuardianDialogOpen(true);
  };

  const handleEmailGuardian = async () => {
    if (!guardianTargetOffense) return;
    setEmailingGuardian(guardianTargetOffense.id);
    setGuardianDialogOpen(false);
    try {
      const res = await fetch("/api/osa/offenses/email-guardian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offenseId: guardianTargetOffense.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send guardian email");
      toast.success("Guardian notified successfully", {
        description: `Email sent to guardian of ${guardianTargetOffense.studentName}.`,
      });
      setOffenses((prev) =>
        prev.map((o) =>
          o.id === guardianTargetOffense.id
            ? { ...o, guardianNotifiedAt: new Date(), guardianEmail: data.guardianEmail }
            : o
        )
      );
    } catch (error: any) {
      console.error("Error emailing guardian:", error);
      toast.error("Failed to notify guardian", { description: error.message || "Please try again" });
    } finally {
      setEmailingGuardian(null);
      setGuardianTargetOffense(null);
    }
  };

  // ── PDF: download ───────────────────────────────────────────────────────────

  const handleDownloadPDF = async (offense: Offense) => {
    setDownloadingPDF(offense.id);
    try {
      await import("jspdf");
      generateOffensePDF(offense);
      toast.success("PDF downloaded", {
        description: `Offense report for ${offense.studentName} saved to your downloads.`,
      });
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF", { description: error.message || "Please try again" });
    } finally {
      setDownloadingPDF(null);
    }
  };

  // ── PDF: print ──────────────────────────────────────────────────────────────

  const handlePrintPDF = async (offense: Offense) => {
    setPrintingPDF(offense.id);
    try {
      await import("jspdf");
      printOffensePDF(offense);
      // Give the iframe a moment to load before clearing the spinner
      setTimeout(() => setPrintingPDF(null), 1500);
    } catch (error: any) {
      console.error("Error printing PDF:", error);
      toast.error("Failed to open print dialog", { description: error.message || "Please try again" });
      setPrintingPDF(null);
    }
  };

  // ── Counts ──────────────────────────────────────────────────────────────────

  const activeCount = offenses.filter((o) => o.status === "active").length;
  const resolvedCount = offenses.filter((o) => o.status === "resolved").length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><AlertTriangle className="w-6 h-6 text-blue-700" /></div>
              <div><p className="text-2xl font-bold">{offenses.length}</p><p className="text-sm text-gray-600">Total Offenses</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><XCircle className="w-6 h-6 text-red-700" /></div>
              <div><p className="text-2xl font-bold text-red-700">{activeCount}</p><p className="text-sm text-gray-600">Active Offenses</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-6 h-6 text-green-700" /></div>
              <div><p className="text-2xl font-bold text-green-700">{resolvedCount}</p><p className="text-sm text-gray-600">Resolved Offenses</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter offenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search by name, student number, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="resolved">Resolved Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
              <SelectTrigger><SelectValue placeholder="Offense Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="major">Major Offenses</SelectItem>
                <SelectItem value="minor">Minor Offenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOffenses} className="mt-4" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Offenses List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-700">Student Offenses</CardTitle>
          <CardDescription>{filteredOffenses.length} offense(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredOffenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No offenses found matching your criteria.</div>
          ) : (
            <div className="space-y-4">
              {filteredOffenses.map((offense) => (
                <div
                  key={offense.id}
                  className={`border rounded-lg p-4 transition-all ${
                    offense.status === "active" ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">

                    {/* ── Left: info ── */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          offense.offenseType === "major" ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                        }`}>
                          {offense.offenseType}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          offense.status === "active" ? "bg-red-200 text-red-800" : "bg-green-200 text-green-800"
                        }`}>
                          {offense.status.toUpperCase()}
                        </span>
                        {offense.guardianNotifiedAt && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Guardian Notified
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-gray-900 mb-1">{offense.offenseTitle}</h3>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Student:</strong> {offense.studentName} ({offense.studentNumber})</p>
                        <p><strong>Email:</strong> {offense.studentEmail}</p>
                        <p><strong>Sanction:</strong> {offense.sanction}</p>
                        {offense.dateCommitted && (
                          <p>
                            <strong>Date Committed:</strong>{" "}
                            {new Date(
                              offense.dateCommitted.toDate
                                ? offense.dateCommitted.toDate()
                                : offense.dateCommitted
                            ).toLocaleDateString()}
                          </p>
                        )}
                        {offense.offenseDescription && (
                          <p className="mt-2"><strong>Description:</strong> {offense.offenseDescription}</p>
                        )}
                      </div>

                      {offense.status === "resolved" && offense.resolutionRemarks && (
                        <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded">
                          <p className="text-sm text-green-800">
                            <strong>Resolution:</strong> {offense.resolutionRemarks}
                          </p>
                          {offense.resolvedBy && (
                            <p className="text-xs text-green-700 mt-1">Resolved by: {offense.resolvedBy}</p>
                          )}
                        </div>
                      )}

                      {offense.guardianNotifiedAt && offense.guardianEmail && (
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs text-blue-700">
                            <strong>Guardian notified:</strong> {offense.guardianEmail}
                            {offense.guardianNotifiedBy && <> · by {offense.guardianNotifiedBy}</>}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── Right: actions ── */}
                    <div className="flex flex-row lg:flex-col gap-2 shrink-0">

                      {/* Download PDF — all offenses */}
                      <Button
                        onClick={() => handleDownloadPDF(offense)}
                        size="sm"
                        variant="outline"
                        disabled={downloadingPDF === offense.id || printingPDF === offense.id}
                        className="border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        {downloadingPDF === offense.id ? (
                          <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Generating...</>
                        ) : (
                          <><FileDown className="w-4 h-4 mr-1" />Download PDF</>
                        )}
                      </Button>

                      {/* Print — all offenses */}
                      <Button
                        onClick={() => handlePrintPDF(offense)}
                        size="sm"
                        variant="outline"
                        disabled={printingPDF === offense.id || downloadingPDF === offense.id}
                        className="border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        {printingPDF === offense.id ? (
                          <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Opening...</>
                        ) : (
                          <><Printer className="w-4 h-4 mr-1" />Print</>
                        )}
                      </Button>

                      {/* Status-dependent actions */}
                      {offense.status === "active" ? (
                        <>
                          <Button
                            onClick={() => handleOpenResolve(offense)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Resolve
                          </Button>

                          <Button
                            onClick={() => handleOpenEmailGuardian(offense)}
                            size="sm"
                            variant="outline"
                            disabled={emailingGuardian === offense.id}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            {emailingGuardian === offense.id ? (
                              <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Sending...</>
                            ) : (
                              <><Mail className="w-4 h-4 mr-1" />{offense.guardianNotifiedAt ? "Re-notify Guardian" : "Notify Guardian"}</>
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => handleReopenOffense(offense)}
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-100"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Reopen
                        </Button>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Offense</DialogTitle>
            <DialogDescription>
              Mark this offense as resolved. The student will be able to request ID validation again.
            </DialogDescription>
          </DialogHeader>
          {selectedOffense && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 border rounded-lg">
                <p className="font-semibold">{selectedOffense.offenseTitle}</p>
                <p className="text-sm text-gray-600">
                  Student: {selectedOffense.studentName} ({selectedOffense.studentNumber})
                </p>
              </div>
              <div>
                <Label htmlFor="remarks">Resolution Remarks *</Label>
                <Textarea
                  id="remarks"
                  placeholder="Enter the resolution details (e.g., sanction completed, warning given, etc.)"
                  value={resolutionRemarks}
                  onChange={(e) => setResolutionRemarks(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)} disabled={resolving}>Cancel</Button>
            <Button onClick={handleResolveOffense} disabled={resolving || !resolutionRemarks.trim()} className="bg-green-600 hover:bg-green-700">
              {resolving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resolving...</> : "Resolve Offense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Guardian Dialog */}
      <Dialog open={guardianDialogOpen} onOpenChange={setGuardianDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Notify Guardian
            </DialogTitle>
            <DialogDescription>
              This will send an email to the student's registered guardian with the full offense details and narrative.
            </DialogDescription>
          </DialogHeader>
          {guardianTargetOffense && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 border rounded-lg">
                <p className="font-semibold">{guardianTargetOffense.offenseTitle}</p>
                <p className="text-sm text-gray-600">
                  Student: {guardianTargetOffense.studentName} ({guardianTargetOffense.studentNumber})
                </p>
              </div>
              {guardianTargetOffense.guardianNotifiedAt && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 font-medium">
                    ⚠️ A guardian notification was already sent for this offense. Proceeding will send another email.
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500">
                The guardian's email will be retrieved from the student's profile. Make sure the profile has a valid{" "}
                <code className="bg-gray-100 px-1 rounded">guardianEmail</code> on record.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuardianDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEmailGuardian} className="bg-blue-600 hover:bg-blue-700">
              <Mail className="w-4 h-4 mr-2" />
              Send Guardian Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}