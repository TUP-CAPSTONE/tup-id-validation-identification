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
import { db, auth } from "@/lib/firebaseConfig";
import { collection, query, getDocs, doc, updateDoc, orderBy, where, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Search, Loader2, CheckCircle, AlertTriangle,  XCircle, RefreshCw } from "lucide-react";

interface Offense {
  id: string;
  studentUid: string;
  studentNumber: string;
  studentName: string;
  studentEmail: string;
  offenseNumber: string;
  offenseTitle: string;
  offenseType: "major" | "minor";
  offenseDescription: string;
  sanction: string;
  sanctionLevel: string;
  dateCommitted: any;
  dateRecorded: any;
  status: "active" | "resolved";
  resolvedAt?: any;
  resolvedBy?: string;
  resolutionRemarks?: string;
}

export function OSAManageOffenses() {
  const [offenses, setOffenses] = useState<Offense[]>([]);
  const [filteredOffenses, setFilteredOffenses] = useState<Offense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("active");
  const [typeFilter, setTypeFilter] = useState<"all" | "major" | "minor">("all");
  
  // Resolve dialog state
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedOffense, setSelectedOffense] = useState<Offense | null>(null);
  const [resolutionRemarks, setResolutionRemarks] = useState("");
  const [resolving, setResolving] = useState(false);

  /**
   * Fetch all offenses from Firestore
   */
  const fetchOffenses = async () => {
    try {
      setLoading(true);
      const offensesRef = collection(db, "student_offenses");
      const q = query(offensesRef, orderBy("dateRecorded", "desc"));
      const snapshot = await getDocs(q);
      
      const offensesList: Offense[] = [];
      snapshot.forEach((docSnap) => {
        offensesList.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as Offense);
      });
      
      setOffenses(offensesList);
    } catch (error) {
      console.error("Error fetching offenses:", error);
      toast.error("Failed to load offenses");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter offenses based on search and filters
   */
  useEffect(() => {
    let filtered = [...offenses];
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }
    
    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((o) => o.offenseType === typeFilter);
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.studentName?.toLowerCase().includes(query) ||
          o.studentNumber?.toLowerCase().includes(query) ||
          o.studentEmail?.toLowerCase().includes(query) ||
          o.offenseTitle?.toLowerCase().includes(query)
      );
    }
    
    setFilteredOffenses(filtered);
  }, [offenses, statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchOffenses();
  }, []);

  /**
   * Open resolve dialog for an offense
   */
  const handleOpenResolve = (offense: Offense) => {
    setSelectedOffense(offense);
    setResolutionRemarks("");
    setResolveDialogOpen(true);
  };

  /**
   * Resolve/Lift an offense
   */
  const handleResolveOffense = async () => {
    if (!selectedOffense) return;
    
    if (!resolutionRemarks.trim()) {
      toast.error("Please enter resolution remarks");
      return;
    }

    setResolving(true);

    try {
      const offenseRef = doc(db, "student_offenses", selectedOffense.id);
      await updateDoc(offenseRef, {
        status: "resolved",
        resolvedAt: serverTimestamp(),
        resolvedBy: auth.currentUser?.email || "OSA",
        resolutionRemarks: resolutionRemarks.trim(),
      });

      toast.success("Offense resolved successfully", {
        description: `Offense for ${selectedOffense.studentName} has been resolved.`,
      });

      // Update local state
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

  /**
   * Reopen a resolved offense
   */
  const handleReopenOffense = async (offense: Offense) => {
    try {
      const offenseRef = doc(db, "student_offenses", offense.id);
      await updateDoc(offenseRef, {
        status: "active",
        resolvedAt: null,
        resolvedBy: null,
        resolutionRemarks: null,
      });

      toast.success("Offense reopened", {
        description: `Offense for ${offense.studentName} has been reopened.`,
      });

      // Update local state
      setOffenses((prev) =>
        prev.map((o) =>
          o.id === offense.id
            ? { ...o, status: "active", resolutionRemarks: undefined }
            : o
        )
      );
    } catch (error) {
      console.error("Error reopening offense:", error);
      toast.error("Failed to reopen offense");
    }
  };

  const activeCount = offenses.filter((o) => o.status === "active").length;
  const resolvedCount = offenses.filter((o) => o.status === "resolved").length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{offenses.length}</p>
                <p className="text-sm text-gray-600">Total Offenses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{activeCount}</p>
                <p className="text-sm text-gray-600">Active Offenses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{resolvedCount}</p>
                <p className="text-sm text-gray-600">Resolved Offenses</p>
              </div>
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
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="resolved">Resolved Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Offense Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="major">Major Offenses</SelectItem>
                <SelectItem value="minor">Minor Offenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOffenses}
            className="mt-4"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Offenses List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-700">Student Offenses</CardTitle>
          <CardDescription>
            {filteredOffenses.length} offense(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredOffenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No offenses found matching your criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOffenses.map((offense) => (
                <div
                  key={offense.id}
                  className={`border rounded-lg p-4 transition-all ${
                    offense.status === "active"
                      ? "border-red-300 bg-red-50"
                      : "border-green-300 bg-green-50"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left: Offense Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            offense.offenseType === "major"
                              ? "bg-red-600 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {offense.offenseType}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            offense.status === "active"
                              ? "bg-red-200 text-red-800"
                              : "bg-green-200 text-green-800"
                          }`}
                        >
                          {offense.status.toUpperCase()}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 mb-1">
                        {offense.offenseTitle}
                      </h3>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>Student:</strong> {offense.studentName} ({offense.studentNumber})
                        </p>
                        <p>
                          <strong>Email:</strong> {offense.studentEmail}
                        </p>
                        <p>
                          <strong>Sanction:</strong> {offense.sanction}
                        </p>
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
                          <p className="mt-2">
                            <strong>Description:</strong> {offense.offenseDescription}
                          </p>
                        )}
                      </div>

                      {offense.status === "resolved" && offense.resolutionRemarks && (
                        <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded">
                          <p className="text-sm text-green-800">
                            <strong>Resolution:</strong> {offense.resolutionRemarks}
                          </p>
                          {offense.resolvedBy && (
                            <p className="text-xs text-green-700 mt-1">
                              Resolved by: {offense.resolvedBy}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-row lg:flex-col gap-2">
                      {offense.status === "active" ? (
                        <Button
                          onClick={() => handleOpenResolve(offense)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Resolve
                        </Button>
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
            <Button
              variant="outline"
              onClick={() => setResolveDialogOpen(false)}
              disabled={resolving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolveOffense}
              disabled={resolving || !resolutionRemarks.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {resolving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                "Resolve Offense"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
