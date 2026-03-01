"use client";

import { useState, useEffect } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, Search, ChevronLeft, ChevronRight, Download, Printer,
  History, ShieldCheck, ShieldX, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebaseConfig";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Student {
  studentNumber: string;
  fullName: string;
  college: string;
  course: string;
  section: string;
  status: "Validated" | "Not Validated" | "Request Pending";
  validatedAt: string | null;
  email: string;
  uid: string; // Firebase Auth UID = student_profiles doc ID
}

interface StudentResponse {
  students: Student[];
  hasMore: boolean;
  lastStudentNumber: string | null;
  totalFetched: number;
  availableColleges?: string[];
  availableCourses?: string[];
  availableSections?: string[];
}

interface ValidationHistoryEntry {
  id: string;
  semester: string;
  schoolYear: string;
  status: "validated" | "not_validated";
  date: any;
  validatedBy: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const COLLEGE_COURSES: Record<string, string[]> = {
  COS: ["BS Computer Science", "BS Information Technology", "BS Information Systems", "BS Environmental Science", "BAS Laboratory Technology"],
  COE: ["BS Civil Engineering", "BS Mechanical Engineering", "BS Electrical Engineering", "BS Electronics Engineering"],
  CAFA: ["BS Architecture", "Bachelor of Fine Arts", "BGT - Architecture Technology", "BGT - Industrial Design", "BGT - Mechanical Drafting Technology"],
  CIE: ["BSIE - ICT", "BSIE - Home Economics", "BSIE - Industrial Arts", "BTVTE - Animation", "BTVTE - Automotive", "BTVTE - Beauty Care and Wellness", "BTVTE - Computer Programming", "BTVTE - Electrical", "BTVTE - Electronics", "BTVTE - Food Service Management", "BTVTE - Fashion and Garment", "BTVTE - Heat Ventilation and Air Conditioning"],
  CLA: ["BS Business Management - Industrial Management", "BS Entrepreneurship", "BS Hospitality Management"],
  CIT: ["BS Food Technology", "BET - Civil Technology", "BET - Electronics Technology", "BET - Computer Engineering Technology", "BET - Electronic Communication Technology", "BET - Instrumentation and Control Technology", "BET - Mechanical Technology", "BET - Mechatronics Technology", "BET - Railway Technology", "BET - Mechanical Engineering Technology", "BT - Apparel and Fashion", "BT - Culinary Technology", "BT - Print Media Technology"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(val: any): string {
  if (!val) return "—";
  if (val?.toDate) return val.toDate().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateShort(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Validation History Dialog ─────────────────────────────────────────────────
function ValidationHistoryDialog({
  student,
  open,
  onClose,
}: {
  student: Student | null;
  open: boolean;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<ValidationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !student?.uid) return;

    async function fetchHistory() {
      setLoading(true);
      setHistory([]);
      try {
        // student_profiles doc ID = Firebase Auth UID (student.uid)
        const histRef = collection(db, "student_profiles", student!.uid, "validation_history");
        const snap = await getDocs(query(histRef, orderBy("date", "desc")));
        setHistory(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ValidationHistoryEntry, "id">) })));
      } catch (err) {
        console.error("Failed to fetch validation history:", err);
        toast.error("Failed to load validation history.");
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [open, student]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#b32032]">
            <History className="w-5 h-5" />
            Validation History
          </DialogTitle>
          {student && (
            <div className="text-sm text-gray-500 pt-1">
              <span className="font-semibold text-gray-700">{student.fullName}</span>
              &nbsp;·&nbsp;{student.studentNumber}
            </div>
          )}
        </DialogHeader>

        <div className="mt-2 max-h-105 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading history...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50">
              <Clock className="w-8 h-8 opacity-40" />
              <p className="text-sm font-medium">No validation history yet</p>
              <p className="text-xs">Records will appear here each semester.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => {
                const isValidated = entry.status === "validated";
                return (
                  <div
                    key={entry.id}
                    className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                      isValidated ? "border-green-200 bg-green-50" : "border-red-100 bg-red-50/40"
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 rounded-full p-1.5 ${isValidated ? "bg-green-100" : "bg-red-100"}`}>
                      {isValidated
                        ? <ShieldCheck className="w-4 h-4 text-green-600" />
                        : <ShieldX className="w-4 h-4 text-[#b32032]" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-gray-800">
                          {entry.semester} Semester — {entry.schoolYear}
                        </span>
                        <Badge className={`text-xs px-2 py-0.5 font-semibold border-0 ${isValidated ? "bg-green-600 text-white" : "bg-[#b32032] text-white"}`}>
                          {isValidated ? "Validated" : "Not Validated"}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>{formatDate(entry.date)}</span>
                        {isValidated && entry.validatedBy && (
                          <span>By: <span className="font-medium text-gray-700">{entry.validatedBy}</span></span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function OSAStudentsTable() {
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastStudentNumber, setLastStudentNumber] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageHistory, setPageHistory] = useState<(string | null)[]>([null]);
  const [collegeFilter, setCollegeFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [availableColleges, setAvailableColleges] = useState<string[]>([]);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const openHistoryDialog = (student: Student) => {
    setSelectedStudent(student);
    setHistoryDialogOpen(true);
  };

  const closeHistoryDialog = () => {
    setHistoryDialogOpen(false);
    setSelectedStudent(null);
  };

  const fetchStudents = async (
    cursor: string | null = null,
    isNextPage = true,
    filters?: { search?: string; college?: string; course?: string; section?: string; status?: string }
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: pageSize.toString() });
      if (cursor) params.append("lastStudentNumber", cursor);

      const search = filters?.search !== undefined ? filters.search : searchQuery;
      const college = filters?.college !== undefined ? filters.college : collegeFilter;
      const course = filters?.course !== undefined ? filters.course : courseFilter;
      const section = filters?.section !== undefined ? filters.section : sectionFilter;
      const status = filters?.status !== undefined ? filters.status : statusFilter;

      if (search) params.append("search", search);
      if (college) params.append("college", college);
      if (course) params.append("course", course);
      if (section) params.append("section", section);
      if (status !== "all") params.append("status", status);

      const response = await fetch(`/api/osa/students?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 429) {
          const data = await response.json();
          toast.error("Rate limit exceeded", { description: data.error });
          return;
        }
        throw new Error("Failed to fetch students");
      }

      const data: StudentResponse = await response.json();
      setStudents(data.students);
      setHasMore(data.hasMore);
      setLastStudentNumber(data.lastStudentNumber);
      setAvailableColleges(data.availableColleges || []);
      setAvailableCourses(data.availableCourses || []);
      setAvailableSections(data.availableSections || []);

      if (isNextPage && data.lastStudentNumber) {
        setPageHistory(prev => [...prev, data.lastStudentNumber]);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Error", { description: "Failed to load students. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleNextPage = () => {
    if (hasMore && lastStudentNumber) {
      setCurrentPage(prev => prev + 1);
      fetchStudents(lastStudentNumber, true);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      const newHistory = [...pageHistory];
      newHistory.pop();
      setPageHistory(newHistory);
      fetchStudents(newHistory[newHistory.length - 1], false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setPageHistory([null]);
    fetchStudents(null, true, { search: searchQuery, college: "", course: "", section: "", status: "all" });
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    setPageHistory([null]);
    fetchStudents(null, true, { search: "", college: collegeFilter, course: courseFilter, section: sectionFilter, status: statusFilter });
  };

  const handleResetFilters = () => {
    setSearchQuery(""); setCollegeFilter(""); setCourseFilter(""); setSectionFilter(""); setStatusFilter("all");
    setCurrentPage(1); setPageHistory([null]);
    fetchStudents(null, true, { search: "", college: "", course: "", section: "", status: "all" });
  };

  const fetchAllStudents = async (filtersToUse?: { search?: string; college?: string; course?: string; section?: string; status?: string }) => {
    setGeneratingPDF(true);
    const allFetched: Student[] = [];
    let cursor: string | null = null;
    let hasMoreData = true;

    try {
      const search = filtersToUse?.search !== undefined ? filtersToUse.search : searchQuery;
      const college = filtersToUse?.college !== undefined ? filtersToUse.college : collegeFilter;
      const course = filtersToUse?.course !== undefined ? filtersToUse.course : courseFilter;
      const section = filtersToUse?.section !== undefined ? filtersToUse.section : sectionFilter;
      const status = filtersToUse?.status !== undefined ? filtersToUse.status : statusFilter;

      while (hasMoreData) {
        const params = new URLSearchParams({ pageSize: "100" });
        if (cursor) params.append("lastStudentNumber", cursor);
        if (search) params.append("search", search);
        if (college) params.append("college", college);
        if (course) params.append("course", course);
        if (section) params.append("section", section);
        if (status !== "all") params.append("status", status);

        const response = await fetch(`/api/osa/students?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch students");

        const data: StudentResponse = await response.json();
        allFetched.push(...data.students);
        hasMoreData = data.hasMore;
        cursor = data.lastStudentNumber;
        if (hasMoreData) await new Promise(r => setTimeout(r, 100));
      }

      setAllStudents(allFetched);
      return allFetched;
    } catch (error) {
      toast.error("Error", { description: "Failed to fetch all students for PDF generation." });
      return null;
    } finally {
      setGeneratingPDF(false);
    }
  };

  const generatePDF = async (filtersToUse?: { search?: string; college?: string; course?: string; section?: string; status?: string }) => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const studentsToExport = await fetchAllStudents(filtersToUse);
    if (!studentsToExport || studentsToExport.length === 0) { toast.error("No data to export"); return null; }

    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("ID Validation Student List Report", 14, 15);
    doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Total Students: ${studentsToExport.length}`, 14, 28);

    autoTable(doc, {
      head: [["TUP ID", "Full Name", "College", "Course", "Section", "Status", "Date of Validation"]],
      body: studentsToExport.map(s => [s.studentNumber, s.fullName, s.college, s.course, s.section, s.status, formatDateShort(s.validatedAt)]),
      startY: 35, theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 30 }, 2: { cellWidth: 20 }, 3: { cellWidth: 35 }, 4: { cellWidth: 15 }, 5: { cellWidth: 18 }, 6: { cellWidth: 25 } },
    });
    return doc;
  };

  const handleDownloadPDF = async () => {
    const doc = await generatePDF({ search: "", college: collegeFilter, course: courseFilter, section: sectionFilter, status: statusFilter });
    if (doc) { doc.save(`student-list-${new Date().toISOString().split("T")[0]}.pdf`); toast.success("PDF downloaded successfully"); }
  };

  const handlePrintPDF = async () => {
    const doc = await generatePDF({ search: "", college: collegeFilter, course: courseFilter, section: sectionFilter, status: statusFilter });
    if (doc) { doc.autoPrint(); window.open(doc.output("bloburl"), "_blank"); toast.success("Print dialog opened"); }
  };

  const getStatusBadge = (status: Student["status"]) => {
    switch (status) {
      case "Validated": return <Badge className="bg-green-500 hover:bg-green-600">Validated</Badge>;
      case "Request Pending": return <Badge className="bg-yellow-500 hover:bg-yellow-600">Request Pending</Badge>;
      case "Not Validated": return <Badge variant="secondary">Not Validated</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <ValidationHistoryDialog student={selectedStudent} open={historyDialogOpen} onClose={closeHistoryDialog} />

      <Card>
        <CardContent>
          {/* Search */}
          <form onSubmit={handleSearch} className="mb-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search by name or TUP ID..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>
          </form>

          {/* Filters */}
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">College (Priority 1)</label>
                <select value={collegeFilter} onChange={(e) => { setCollegeFilter(e.target.value); setCourseFilter(""); setSectionFilter(""); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">All Colleges</option>
                  {availableColleges.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Status (Priority 2)</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="all">All Status</option>
                  <option value="Validated">Validated</option>
                  <option value="Not Validated">Not Validated</option>
                  <option value="Request Pending">Request Pending</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Course (Priority 3)</label>
                <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} disabled={!collegeFilter} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed">
                  <option value="">All Courses</option>
                  {collegeFilter && COLLEGE_COURSES[collegeFilter]?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Section (Priority 4)</label>
                <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">All Sections</option>
                  {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center gap-2">
              <div className="flex gap-2">
                <Button onClick={handleFilterChange} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Apply Filters
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="border-red-300 hover:bg-red-50 text-red-700">
                  Reset All Filters
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={generatingPDF}>
                  {generatingPDF ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrintPDF} disabled={generatingPDF}>
                  <Printer className="h-4 w-4 mr-2" />Print
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>TUP ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>College</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date of Validation</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading students...</p>
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No students found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.studentNumber}>
                      <TableCell className="font-medium">{student.studentNumber}</TableCell>
                      <TableCell>{student.fullName}</TableCell>
                      <TableCell>{student.college}</TableCell>
                      <TableCell>{student.course}</TableCell>
                      <TableCell>{student.section}</TableCell>
                      <TableCell>{getStatusBadge(student.status)}</TableCell>
                      <TableCell>{formatDateShort(student.validatedAt)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openHistoryDialog(student)}
                          className="gap-1.5 text-xs border-[#b32032]/30 text-[#b32032] hover:bg-[#b32032]/5 hover:border-[#b32032]"
                        >
                          <History className="w-3.5 h-3.5" />
                          History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Page {currentPage} {hasMore && "of many"}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1 || loading}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!hasMore || loading}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {loading && students.length > 0 && (
            <div className="flex justify-center mt-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}