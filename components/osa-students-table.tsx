"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChevronLeft, ChevronRight, Download, Printer } from "lucide-react";
import { toast } from "sonner";

interface Student {
  studentNumber: string;
  fullName: string;
  college: string;
  course: string;
  section: string;
  status: "Validated" | "Not Validated" | "Request Pending";
  validatedAt: string | null;
  email: string;
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

// College to Courses mapping
const COLLEGE_COURSES: Record<string, string[]> = {
  'COS': [
    'BS Computer Science',
    'BS Information Technology',
    'BS Information Systems',
    'BS Environmental Science',
    'BAS Laboratory Technology'
  ],
  'COE': [
    'BS Civil Engineering',
    'BS Mechanical Engineering',
    'BS Electrical Engineering',
    'BS Electronics Engineering'
  ],
  'CAFA': [
    'BS Architecture',
    'Bachelor of Fine Arts',
    'BGT - Architecture Technology',
    'BGT - Industrial Design',
    'BGT - Mechanical Drafting Technology'
  ],
  'CIE': [
    'BSIE - ICT',
    'BSIE - Home Economics',
    'BSIE - Industrial Arts',
    'BTVTE - Animation',
    'BTVTE - Automotive',
    'BTVTE - Beauty Care and Wellness',
    'BTVTE - Computer Programming',
    'BTVTE - Electrical',
    'BTVTE - Electronics',
    'BTVTE - Food Service Management',
    'BTVTE - Fashion and Garment',
    'BTVTE - Heat Ventilation and Air Conditioning'
  ],
  'CLA': [
    'BS Business Management - Industrial Management',
    'BS Entrepreneurship',
    'BS Hospitality Management'
  ],
  'CIT': [
    'BS Food Technology',
    'BET - Civil Technology',
    'BET - Electronics Technology',
    'BET - Computer Engineering Technology',
    'BET - Electronic Communication Technology',
    'BET - Instrumentation and Control Technology',
    'BET - Mechanical Technology',
    'BET - Mechatronics Technology',
    'BET - Railway Technology',
    'BET - Mechanical Engineering Technology',
    'BT - Apparel and Fashion',
    'BT - Culinary Technology',
    'BT - Print Media Technology'
  ]
};

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

  const fetchStudents = async (
    cursor: string | null = null,
    isNextPage = true,
    filters?: {
      search?: string;
      college?: string;
      course?: string;
      section?: string;
      status?: string;
    }
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pageSize: pageSize.toString(),
      });

      if (cursor) {
        params.append("lastStudentNumber", cursor);
      }

      // Use provided filters or fall back to component state
      const search = filters?.search !== undefined ? filters.search : searchQuery;
      const college = filters?.college !== undefined ? filters.college : collegeFilter;
      const course = filters?.course !== undefined ? filters.course : courseFilter;
      const section = filters?.section !== undefined ? filters.section : sectionFilter;
      const status = filters?.status !== undefined ? filters.status : statusFilter;

      if (search) {
        params.append("search", search);
      }

      if (college) {
        params.append("college", college);
      }

      if (course) {
        params.append("course", course);
      }

      if (section) {
        params.append("section", section);
      }

      if (status !== "all") {
        params.append("status", status);
      }

      const response = await fetch(`/api/osa/students?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 429) {
          const data = await response.json();
          toast.error("Rate limit exceeded", {
            description: data.error || "Too many requests. Please try again later.",
          });
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

      // Update page history for back navigation
      if (isNextPage && data.lastStudentNumber) {
        setPageHistory(prev => [...prev, data.lastStudentNumber]);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Error", {
        description: "Failed to load students. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

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
      newHistory.pop(); // Remove current page
      setPageHistory(newHistory);
      const cursor = newHistory[newHistory.length - 1];
      fetchStudents(cursor, false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setPageHistory([null]);
    // Only search, don't apply current filters
    fetchStudents(null, true, {
      search: searchQuery,
      college: "",
      course: "",
      section: "",
      status: "all",
    });
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    setPageHistory([null]);
    // Only apply filters, don't include search query
    fetchStudents(null, true, {
      search: "",
      college: collegeFilter,
      course: courseFilter,
      section: sectionFilter,
      status: statusFilter,
    });
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCollegeFilter("");
    setCourseFilter("");
    setSectionFilter("");
    setStatusFilter("all");
    setCurrentPage(1);
    setPageHistory([null]);
    // Pass empty filters explicitly
    fetchStudents(null, true, {
      search: "",
      college: "",
      course: "",
      section: "",
      status: "all",
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: Student["status"]) => {
    switch (status) {
      case "Validated":
        return <Badge className="bg-green-500 hover:bg-green-600">Validated</Badge>;
      case "Request Pending":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Request Pending</Badge>;
      case "Not Validated":
        return <Badge variant="secondary">Not Validated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const fetchAllStudents = async (
    filtersToUse?: {
      search?: string;
      college?: string;
      course?: string;
      section?: string;
      status?: string;
    }
  ) => {
    setGeneratingPDF(true);
    const allFetchedStudents: Student[] = [];
    let cursor: string | null = null;
    let hasMoreData = true;

    try {
      // Use provided filters or fall back to component state
      const search = filtersToUse?.search !== undefined ? filtersToUse.search : searchQuery;
      const college = filtersToUse?.college !== undefined ? filtersToUse.college : collegeFilter;
      const course = filtersToUse?.course !== undefined ? filtersToUse.course : courseFilter;
      const section = filtersToUse?.section !== undefined ? filtersToUse.section : sectionFilter;
      const status = filtersToUse?.status !== undefined ? filtersToUse.status : statusFilter;

      while (hasMoreData) {
        const params = new URLSearchParams({
          pageSize: "100", // Fetch 100 at a time for efficiency
        });

        if (cursor) {
          params.append("lastStudentNumber", cursor);
        }

        if (search) {
          params.append("search", search);
        }

        if (college) {
          params.append("college", college);
        }

        if (course) {
          params.append("course", course);
        }

        if (section) {
          params.append("section", section);
        }

        if (status !== "all") {
          params.append("status", status);
        }

        const response = await fetch(`/api/osa/students?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch students");
        }

        const data: StudentResponse = await response.json();
        allFetchedStudents.push(...data.students);
        
        hasMoreData = data.hasMore;
        cursor = data.lastStudentNumber;

        // Add a small delay to avoid rate limiting
        if (hasMoreData) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setAllStudents(allFetchedStudents);
      return allFetchedStudents;
    } catch (error) {
      console.error("Error fetching all students:", error);
      toast.error("Error", {
        description: "Failed to fetch all students for PDF generation.",
      });
      return null;
    } finally {
      setGeneratingPDF(false);
    }
  };

  const generatePDF = async (
    filtersToUse?: {
      search?: string;
      college?: string;
      course?: string;
      section?: string;
      status?: string;
    }
  ) => {
    // Dynamically import jsPDF and autoTable
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const studentsToExport = await fetchAllStudents(filtersToUse);
    
    if (!studentsToExport || studentsToExport.length === 0) {
      toast.error("No data to export");
      return null;
    }

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text("ID Validation Student List Report", 14, 15);
    
    // Add generation date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Total Students: ${studentsToExport.length}`, 14, 28);

    // Prepare table data
    const tableData = studentsToExport.map(student => [
      student.studentNumber,
      student.fullName,
      student.college,
      student.course,
      student.section,
      student.status,
      formatDate(student.validatedAt),
    ]);

    // Add table using autoTable
    autoTable(doc, {
      head: [["TUP ID", "Full Name", "College", "Course", "Section", "Status", "Date of Validation"]],
      body: tableData,
      startY: 35,
      theme: "grid",
      headStyles: {
        fillColor: [59, 130, 246], // Blue
        textColor: 255,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 22 }, // TUP ID
        1: { cellWidth: 30 }, // Full Name
        2: { cellWidth: 20 }, // College
        3: { cellWidth: 35 }, // Course
        4: { cellWidth: 15 }, // Section
        5: { cellWidth: 18 }, // Status
        6: { cellWidth: 25 }, // Date
      },
    });

    return doc;
  };

  const handleDownloadPDF = async () => {
    const doc = await generatePDF({
      search: "",
      college: collegeFilter,
      course: courseFilter,
      section: sectionFilter,
      status: statusFilter,
    });
    if (doc) {
      doc.save(`student-list-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF downloaded successfully");
    }
  };

  const handlePrintPDF = async () => {
    const doc = await generatePDF({
      search: "",
      college: collegeFilter,
      course: courseFilter,
      section: sectionFilter,
      status: statusFilter,
    });
    if (doc) {
      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");
      toast.success("Print dialog opened");
    }
  };

  return (
    <Card>
      <CardContent>
        {/* Search and Filter Bar */}
        <form onSubmit={handleSearch} className="mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name or TUP ID..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </form>

        {/* Filters */}
        <div className="mb-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">College (Priority 1)</label>
              <select
                value={collegeFilter}
                onChange={(e) => {
                  setCollegeFilter(e.target.value);
                  setCourseFilter("");
                  setSectionFilter("");
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">All Colleges</option>
                {availableColleges.map(college => (
                  <option key={college} value={college}>{college}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Status (Priority 2)</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="Validated">Validated</option>
                <option value="Not Validated">Not Validated</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Course (Priority 3)</label>
              <select
                value={courseFilter}
                onChange={(e) => {
                  setCourseFilter(e.target.value);
                }}
                disabled={!collegeFilter}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <option value="">All Courses</option>
                {collegeFilter && COLLEGE_COURSES[collegeFilter]?.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Section (Priority 4)</label>
              <select
                value={sectionFilter}
                onChange={(e) => {
                  setSectionFilter(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">All Sections</option>
                {availableSections.map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center gap-2">
            <div className="flex gap-2">
              <Button
                onClick={handleFilterChange}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  "Apply Filters"
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="border-red-300 hover:bg-red-50 text-red-700"
              >
                Reset All Filters
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintPDF}
                disabled={generatingPDF}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading students...</p>
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No students found</p>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.studentNumber}>
                    <TableCell className="font-medium">
                      {student.studentNumber}
                    </TableCell>
                    <TableCell>{student.fullName}</TableCell>
                    <TableCell>{student.college}</TableCell>
                    <TableCell>{student.course}</TableCell>
                    <TableCell>{student.section}</TableCell>
                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                    <TableCell>{formatDate(student.validatedAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} {hasMore && "of many"}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!hasMore || loading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
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
  );
}