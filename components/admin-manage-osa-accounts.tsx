"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OsaAccountsTable } from "@/components/admin-osa-accounts-table"
import { CreateOsaAccountDialog } from "@/components/create-osa-account-dialog"
import { collection, getDocs, query } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

export interface OsaAccount {
  id: string
  email: string
  name: string
  createdAt: any
  role: string
}

export function ManageOsaAccounts() {
  const [accounts, setAccounts] = useState<OsaAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [openCreateDialog, setOpenCreateDialog] = useState(false)

  const fetchOsaAccounts = async () => {
    try {
      setLoading(true)
      const usersRef = collection(db, "users")
      const q = query(usersRef)
      const snapshot = await getDocs(q)
      
      const osaNonAdmins = snapshot.docs
        .filter(doc => doc.data().role === "OSA")
        .map(doc => ({
          id: doc.id,
          email: doc.data().email || "",
          name: doc.data().name || "",
          createdAt: doc.data().createdAt,
          role: doc.data().role,
        }))
      
      setAccounts(osaNonAdmins)
    } catch (err) {
      console.error("Error fetching OSA accounts:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOsaAccounts()
  }, [])

  const handleAccountCreated = () => {
    fetchOsaAccounts()
    setOpenCreateDialog(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Manage OSA Accounts</CardTitle>
            <CardDescription>Create, edit, and manage OSA staff accounts</CardDescription>
          </div>
          <CreateOsaAccountDialog 
            open={openCreateDialog}
            onOpenChange={setOpenCreateDialog}
            onAccountCreated={handleAccountCreated}
          >
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create OSA Account
            </Button>
          </CreateOsaAccountDialog>
        </CardHeader>
        <CardContent>
          <OsaAccountsTable 
            accounts={accounts} 
            loading={loading}
            onAccountsChanged={fetchOsaAccounts}
          />
        </CardContent>
      </Card>
    </div>
  )
}
