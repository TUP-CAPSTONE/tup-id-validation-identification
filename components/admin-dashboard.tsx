"use client";

import { auth, db } from "@/lib/firebaseConfig";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PendingAccount {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  phone?: string;
  createdAt?: any;
  status: string;
}

export function AdminDashboard() {
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);

  // Collections (use env fallbacks)
  const REG_REQUESTS_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_REG_REQUESTS_COLLECTION || "registration_requests";
  const STUDENTS_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_STUDENTS_COLLECTION || "students";

  // Fetch pending accounts
  const fetchPendingAccounts = async () => {
    try {
      setLoading(true);
      setError("");

      // Query registration requests collection for pending status
      const q = query(
        collection(db, REG_REQUESTS_COLLECTION),
        where("status", "in", ["Pending", "pending"]) // accept common casings
      );
      const snap = await getDocs(q);

      const accounts: PendingAccount[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        accounts.push({
          uid: d.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          studentId: data.studentNumber || data.studentId || "",
          phone: data.phone || null,
          createdAt: data.createdAt,
          status: data.status,
        } as PendingAccount);
      });

      setPendingAccounts(accounts);
      console.log("Fetched pending accounts:", accounts.length);
    } catch (err) {
      const e: any = err;
      console.error("Error fetching pending accounts:", e);
      setError(e?.message || "Failed to fetch pending accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingAccounts();
  }, []);

  /**
   * Expands/collapses sections like "ID Validation Request"
   */
  function toggleSection(sectionId: string) {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }

  /**
   * Formats dates consistently
   */
  function formatDate(date: any): string {
    if (!date) return "N/A";
    
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj);
    } catch (err) {
      return "Invalid date";
    }
  }

  /**
   * Makes the calendar/table responsive - detects screen size changes
   */
  function handleResize() {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
  }

  // Set up resize listener
  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Approve account
  const handleApprove = async (account: PendingAccount) => {
    try {
      setApproving(account.uid);

      // Create student profile in students collection
      const studentRef = doc(db, STUDENTS_COLLECTION, account.uid);
      await setDoc(studentRef, {
        uid: account.uid,
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        studentId: (account as any).studentId || null,
        phone: account.phone || null,
        status: "active",
        createdAt: account.createdAt || serverTimestamp(),
      });

      // Update registration request status to Approved
      const regReqRef = doc(db, REG_REQUESTS_COLLECTION, account.uid);
      await updateDoc(regReqRef, {
        status: "Approved",
        approvedAt: serverTimestamp(),
      });

      // Refresh the list
      await fetchPendingAccounts();
      console.log("Account approved:", account.uid);
    } catch (err) {
      const e: any = err;
      console.error("Error approving account:", e);
      setError(e?.message || "Failed to approve account");
    } finally {
      setApproving(null);
    }
  }; 

  // Reject account
  const handleReject = async (account: PendingAccount) => {
    try {
      setRejecting(account.uid);

      // Update status to Rejected in registration requests
      const regReqRef = doc(db, REG_REQUESTS_COLLECTION, account.uid);
      await updateDoc(regReqRef, {
        status: "Rejected",
        rejectedAt: serverTimestamp(),
      });

      // Refresh the list
      await fetchPendingAccounts();
      console.log("Account rejected:", account.uid);
    } catch (err) {
      const e: any = err;
      console.error("Error rejecting account:", e);
      setError(e?.message || "Failed to reject account");
    } finally {
      setRejecting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          className="cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
          onClick={() => toggleSection('pendingAccounts')}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Pending Account Approvals</CardTitle>
              <CardDescription>
                Review and approve new student registration requests
              </CardDescription>
            </div>
            <div>
              {expandedSections['pendingAccounts'] ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </div>
        </CardHeader>
        
        {expandedSections['pendingAccounts'] !== false && (
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading pending accounts...</p>
              </div>
            ) : pendingAccounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No pending accounts at this time</p>
              </div>
            ) : (
              <div className={`${isMobile ? 'space-y-4' : 'border rounded-lg overflow-x-auto'}`}>
                {isMobile ? (
                  // Mobile view - card layout
                  <div className="space-y-3">
                    {pendingAccounts.map((account) => (
                      <Card key={account.uid} className="border-gray-200">
                        <CardContent className="pt-6 space-y-3">
                          <div>
                            <p className="text-xs text-gray-500">Name</p>
                            <p className="font-semibold">{account.firstName} {account.lastName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-sm">{account.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Student ID</p>
                            <p className="text-sm">{account.studentId}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="text-sm">{account.phone || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Submitted</p>
                            <p className="text-sm">{formatDate(account.createdAt)}</p>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={() => handleApprove(account)}
                              disabled={approving === account.uid || rejecting === account.uid}
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {approving === account.uid ? "Approving..." : "Approve"}
                            </Button>
                            <Button
                              onClick={() => handleReject(account)}
                              disabled={approving === account.uid || rejecting === account.uid}
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                            >
                              {rejecting === account.uid ? "Rejecting..." : "Reject"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  // Desktop view - table layout
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingAccounts.map((account) => (
                        <TableRow key={account.uid} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {account.firstName} {account.lastName}
                          </TableCell>
                          <TableCell>{account.email}</TableCell>
                          <TableCell>{account.studentId}</TableCell>
                          <TableCell>{account.phone || "N/A"}</TableCell>
                          <TableCell>{formatDate(account.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                onClick={() => handleApprove(account)}
                                disabled={approving === account.uid || rejecting === account.uid}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {approving === account.uid ? "Approving..." : "Approve"}
                              </Button>
                              <Button
                                onClick={() => handleReject(account)}
                                disabled={approving === account.uid || rejecting === account.uid}
                                size="sm"
                                variant="destructive"
                              >
                                {rejecting === account.uid ? "Rejecting..." : "Reject"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
