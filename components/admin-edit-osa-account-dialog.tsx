"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { OsaAccount } from "@/components/admin-manage-osa-accounts"

interface EditOsaAccountDialogProps {
  account: OsaAccount
  onAccountUpdated: () => void
  children: React.ReactNode
}

export function EditOsaAccountDialog({
  account,
  onAccountUpdated,
  children,
}: EditOsaAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(account.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    setLoading(true)

    try {
      const staffRef = doc(db, "users", account.id)
      await updateDoc(staffRef, {
        name: name.trim(),
      })

      setSuccess("Account updated successfully")
      setTimeout(() => {
        setOpen(false)
        setName(account.name)
        onAccountUpdated()
      }, 1500)
    } catch (err: any) {
      setError("Failed to update account. Please try again.")
      console.error("Error updating account:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{children}</div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit OSA Account</DialogTitle>
          <DialogDescription>
            Update the name for {account.email}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpdateAccount} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email (Read-only)</Label>
            <Input
              id="email"
              type="email"
              value={account.email}
              disabled
              className="bg-gray-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
