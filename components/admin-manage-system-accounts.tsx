"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { SystemAccount } from "@/components/types/system-accounts"
import { SystemAccountsTable } from "@/components/admin-system-accounts-table"
import { CreateSystemAccountDialog } from "@/components/create-system-account-dialog"

export function ManageSystemAccounts() {
  const [accounts, setAccounts] = useState<SystemAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const fetchAccounts = async () => {
    try {
      setLoading(true)

      const q = query(
        collection(db, "users"),
        where("role", "in", ["OSA", "Gate"])
      )

      const snapshot = await getDocs(q)

      const data = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      })) as SystemAccount[]

      data.sort((a, b) => {
        if (a.role === b.role) return 0
        return a.role === "OSA" ? -1 : 1
      })

      setAccounts(data)
    } catch (error) {
      console.error("Failed to fetch system accounts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold">
              Manage System Accounts
            </CardTitle>
            <CardDescription className="text-base">
              Create, update, and delete OSA & Gate accounts
            </CardDescription>
          </div>

          <CreateSystemAccountDialog
            open={open}
            onOpenChange={setOpen}
            onAccountCreated={fetchAccounts}
          >
            <Button className="gap-2 rounded-xl px-4">
              <Plus className="w-4 h-4" />
              Create System Account
            </Button>
          </CreateSystemAccountDialog>
        </CardHeader>

        <CardContent>
          <SystemAccountsTable
            accounts={accounts}
            loading={loading}
            onAccountsChanged={fetchAccounts}
          />
        </CardContent>
      </Card>
    </div>
  )
}
