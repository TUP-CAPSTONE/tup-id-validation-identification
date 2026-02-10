"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Student } from "@/components/types/students"
import { StudentAccountsTable } from "@/components/admin-student-accounts-table"

export function ManageStudentAccounts() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStudents = async () => {
    try {
      setLoading(true)

      const q = query(collection(db, "users"), where("role", "==", "student"))

      const snapshot = await getDocs(q)

      const data = snapshot.docs.map((doc) => {
        const userData = doc.data()
        
        return {
          uid: doc.id,
          tupId: userData.studentNumber || "N/A",
          fullName: userData.fullName || "N/A",
          email: userData.email || "N/A",
          role: userData.role,
          accountStatus: userData.accountStatus || "active",
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        }
      }) as Student[]

      // Sort by name alphabetically (handle undefined names)
      data.sort((a, b) => {
        const nameA = a.fullName || ""
        const nameB = b.fullName || ""
        return nameA.localeCompare(nameB)
      })

      setStudents(data)
    } catch (error) {
      console.error("Failed to fetch student accounts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            Manage Student Accounts
          </CardTitle>
          <CardDescription className="text-base">
            View and manage student account statuses
          </CardDescription>
        </CardHeader>

        <CardContent>
          <StudentAccountsTable
            students={students}
            loading={loading}
            onStudentsChanged={fetchStudents}
          />
        </CardContent>
      </Card>
    </div>
  )
}