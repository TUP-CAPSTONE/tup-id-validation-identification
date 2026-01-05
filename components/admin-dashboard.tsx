"use client";

import { auth, db } from "@/lib/firebaseConfig";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
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

  // Fetch pending accounts
  const fetchPendingAccounts = async () => {
    try {
      setLoading(true);
      setError("");

      // Query students_pending collection for pending status
      const q = query(
        collection(db, "students_pending"),
        where("status", "==", "pending")
      );
      const snap = await getDocs(q);

      const accounts: PendingAccount[] = [];
      snap.forEach((doc) => {
        accounts.push({
          uid: doc.id,
          ...doc.data(),
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

  // Approve account
  const handleApprove = async (account: PendingAccount) => {
    try {
      setApproving(account.uid);

      // Copy to students_approved
      const approvedRef = doc(db, "students_approved", account.uid);
      await setDoc(approvedRef, {
        ...account,
        status: "approved",
        approvedAt: new Date(),
      });

      // Delete from students_pending
      const pendingRef = doc(db, "students_pending", account.uid);
      await deleteDoc(pendingRef);

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

      // Update status to rejected in students_pending
      const pendingRef = doc(db, "students_pending", account.uid);
      await updateDoc(pendingRef, {
        status: "rejected",
        rejectedAt: new Date(),
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
        <CardHeader>
          <CardTitle className="text-2xl">Pending Account Approvals</CardTitle>
          <CardDescription>
            Review and approve new student registration requests
          </CardDescription>
        </CardHeader>
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
            <div className="border rounded-lg overflow-x-auto">
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
                      <TableCell>
                        {account.createdAt
                          ? new Date(account.createdAt.toDate()).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
