"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Student } from "@/components/types/students"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface StudentAccountsTableProps {
  students: Student[]
  loading: boolean
  onStudentsChanged: () => void
}

export function StudentAccountsTable({
  students,
  loading,
  onStudentsChanged,
}: StudentAccountsTableProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleStatusToggle = async () => {
    if (!selectedStudent) return

    const newStatus =
      selectedStudent.accountStatus === "active" ? "disabled" : "active"

    try {
      setActionLoading(true)

      const res = await fetch("/api/admin/update-student-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: selectedStudent.uid,
          accountStatus: newStatus,
        }),
      })

      if (!res.ok) throw new Error("Failed to update status")

      toast.success(
        `Student account ${newStatus === "active" ? "activated" : "disabled"} successfully`
      )
      onStudentsChanged()
    } catch (error) {
      console.error(error)
      toast.error("Failed to update student account status")
    } finally {
      setActionLoading(false)
      setDialogOpen(false)
      setSelectedStudent(null)
    }
  }

  const openDialog = (student: Student) => {
    setSelectedStudent(student)
    setDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No student accounts found
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">TUP ID</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.uid}>
                <TableCell className="font-medium">{student.tupId}</TableCell>
                <TableCell>{student.fullName}</TableCell>
                <TableCell className="text-gray-600">{student.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      student.accountStatus === "active"
                        ? "default"
                        : "secondary"
                    }
                    className={
                      student.accountStatus === "active"
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : "bg-red-100 text-red-800 hover:bg-red-100"
                    }
                  >
                    {student.accountStatus === "active" ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant={
                      student.accountStatus === "active"
                        ? "destructive"
                        : "default"
                    }
                    size="sm"
                    onClick={() => openDialog(student)}
                    className="rounded-lg"
                  >
                    {student.accountStatus === "active" ? "Disable" : "Enable"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedStudent?.accountStatus === "active"
                ? "Disable Student Account"
                : "Enable Student Account"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStudent?.accountStatus === "active"
                ? `Are you sure you want to disable the account for ${selectedStudent?.fullName}? They will no longer be able to access the system.`
                : `Are you sure you want to enable the account for ${selectedStudent?.fullName}? They will be able to access the system again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusToggle}
              disabled={actionLoading}
              className={
                selectedStudent?.accountStatus === "active"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : selectedStudent?.accountStatus === "active" ? (
                "Disable Account"
              ) : (
                "Enable Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}