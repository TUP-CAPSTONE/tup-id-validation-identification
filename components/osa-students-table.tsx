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
  status: "Validated" | "Not Validated" | "Request Pending";
  validatedAt: string | null;
  email: string;
}

interface StudentResponse {
  students: Student[];
  hasMore: boolean;
  lastStudentNumber: string | null;
  totalFetched: number;
}

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

  const fetchStudents = async (cursor: string | null = null, isNextPage = true) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pageSize: pageSize.toString(),
      });

      if (cursor) {
        params.append("lastStudentNumber", cursor);
      }

      if (searchQuery) {
        params.append("search", searchQuery);
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
    fetchStudents(null, true);
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

  const fetchAllStudents = async () => {
    setGeneratingPDF(true);
    const allFetchedStudents: Student[] = [];
    let cursor: string | null = null;
    let hasMoreData = true;

    try {
      while (hasMoreData) {
        const params = new URLSearchParams({
          pageSize: "100", // Fetch 100 at a time for efficiency
        });

        if (cursor) {
          params.append("lastStudentNumber", cursor);
        }

        if (searchQuery) {
          params.append("search", searchQuery);
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

  const generatePDF = async () => {
    // Dynamically import jsPDF and autoTable
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const studentsToExport = allStudents.length > 0 ? allStudents : await fetchAllStudents();
    
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
      student.status,
      formatDate(student.validatedAt),
    ]);

    // Add table using autoTable
    autoTable(doc, {
      head: [["TUP ID", "Full Name", "Status", "Date of Validation"]],
      body: tableData,
      startY: 35,
      theme: "grid",
      headStyles: {
        fillColor: [59, 130, 246], // Blue
        textColor: 255,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 30 }, // TUP ID
        1: { cellWidth: 50 }, // Full Name
        2: { cellWidth: 30 }, // Status
        3: { cellWidth: 30 }, // Date
      },
    });

    return doc;
  };

  const handleDownloadPDF = async () => {
    const doc = await generatePDF();
    if (doc) {
      doc.save(`student-list-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF downloaded successfully");
    }
  };

  const handlePrintPDF = async () => {
    const doc = await generatePDF();
    if (doc) {
      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");
      toast.success("Print dialog opened");
    }
  };

  return (
    <Card>
      <CardContent>
        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
          >
            {generatingPDF ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
          <Button
            variant="outline"
            onClick={handlePrintPDF}
            disabled={generatingPDF}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-4">
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

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>TUP ID</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date of Validation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading students...</p>
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
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