"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { SystemAccount } from "@/components/types/system-accounts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast, Toaster } from "sonner" // <-- Sonner

interface Props {
  account: SystemAccount
  onUpdated: () => void
  children: React.ReactNode
}

export function AdminEditSystemAccountDialog({
  account,
  onUpdated,
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  const [accountStatus, setAccountStatus] = useState<"active" | "disabled">(
    account.accountStatus ?? "active"
  )

  const [form, setForm] = useState({
    fullName: account.fullName || "",
    gateName: account.gateName || "",
    location: account.location || "",
    deviceID: account.deviceID || "",
  })

  useEffect(() => {
    setForm({
      fullName: account.fullName || "",
      gateName: account.gateName || "",
      location: account.location || "",
      deviceID: account.deviceID || "",
    })
    setAccountStatus(account.accountStatus ?? "active")
  }, [account])

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/admin/edit-system-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: account.uid,
          role: account.role,
          ...form,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast("Account updated successfully") // ✅ default blue/info toast
      setTimeout(() => {
        setOpen(false)
        onUpdated()
      }, 1000)
    } catch (err: any) {
      toast.error(err.message || "Failed to update account") // ✅ red/error toast
    } finally {
      setLoading(false)
    }
  }

  // Toggle account status
  const handleToggleStatus = async () => {
    setStatusLoading(true)

    try {
      const newStatus: "active" | "disabled" =
        accountStatus === "active" ? "disabled" : "active"

      const res = await fetch("/api/admin/update-system-account-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: account.uid,
          accountStatus: newStatus,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setAccountStatus(newStatus)

      if (newStatus === "disabled") {
        toast.error("Account disabled successfully") // red toast
      } else {
        toast.success("Account enabled successfully") // green toast
      }

      onUpdated()
    } catch (err: any) {
      toast.error(err.message || "Failed to update account status")
    } finally {
      setStatusLoading(false)
    }
  }

  const isDisabled = accountStatus === "disabled"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Toaster /> {/* <-- toast container */}
      <div onClick={() => setOpen(true)}>{children}</div>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>Edit System Account</DialogTitle>
              <DialogDescription>{account.email}</DialogDescription>
            </div>

            <Badge variant={isDisabled ? "destructive" : "default"}>
              {isDisabled ? "Disabled" : "Active"}
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Account status */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Account Status</p>
                <p className="text-xs text-muted-foreground">
                  Status will be saved as accountStatus in Firestore.
                </p>
              </div>

              <Button
                type="button"
                variant={isDisabled ? "outline" : "destructive"}
                onClick={handleToggleStatus}
                disabled={statusLoading}
              >
                {statusLoading && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {isDisabled ? "Enable" : "Disable"}
              </Button>
            </div>
          </div>

          {account.role === "OSA" && (
            <>
              <Label>Full Name</Label>
              <Input
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
              />
            </>
          )}

          {account.role === "Gate" && (
            <>
              <Label>Gate Name</Label>
              <Input
                value={form.gateName}
                onChange={(e) =>
                  setForm({ ...form, gateName: e.target.value })
                }
              />

              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
              />

              <Label>Device ID</Label>
              <Input
                value={form.deviceID}
                onChange={(e) =>
                  setForm({ ...form, deviceID: e.target.value })
                }
              />
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
