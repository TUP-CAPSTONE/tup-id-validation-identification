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
      const res = await fetch("/api/admin/edit-osa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: account.id,
          name: name.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to update account")
      }

      setSuccess("Account updated successfully")

      setTimeout(() => {
        setOpen(false)
        onAccountUpdated()
      }, 1200)
    } catch (err: any) {
      console.error("Edit OSA error:", err)
      setError(err.message)
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
            <Label>Email (Read-only)</Label>
            <Input
              type="email"
              value={account.email}
              disabled
              className="bg-gray-100"
            />
          </div>

          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading} className="gap-2">
              {loading && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
