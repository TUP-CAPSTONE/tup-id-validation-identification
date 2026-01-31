"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Loader2, ShieldPlus } from "lucide-react"
import { toast } from "sonner"

type Role = "OSA" | "Gate"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccountCreated?: () => void
  children?: React.ReactNode
}

const initialForm = {
  fullName: "",
  gateName: "",
  location: "",
  deviceID: "",
  email: "",
  password: "",
}

export function CreateSystemAccountDialog({
  open,
  onOpenChange,
  onAccountCreated,
  children,
}: Props) {
  const [role, setRole] = useState<Role>("OSA")
  const [form, setForm] = useState({ ...initialForm })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ Reset dialog state every time it opens (fixes your bug)
  useEffect(() => {
    if (open) {
      setRole("OSA")
      setForm({ ...initialForm })
      setError(null)
      setIsSubmitting(false)
    }
  }, [open])

  // Clear role-specific fields when switching role
  useEffect(() => {
    setError(null)
    setForm((prev) => ({
      ...prev,
      fullName: role === "OSA" ? prev.fullName : "",
      gateName: role === "Gate" ? prev.gateName : "",
      location: role === "Gate" ? prev.location : "",
      deviceID: role === "Gate" ? prev.deviceID : "",
    }))
  }, [role])

  const isValid = useMemo(() => {
    if (!form.email.trim()) return false
    if (!form.password.trim()) return false

    if (role === "OSA") return !!form.fullName.trim()

    if (role === "Gate") {
      return (
        !!form.gateName.trim() &&
        !!form.location.trim() &&
        !!form.deviceID.trim()
      )
    }

    return false
  }, [form, role])

  const submit = async () => {
    if (isSubmitting) return
    setError(null)

    if (!isValid) {
      setError("Please complete all required fields.")
      toast.error("Missing fields", {
        description: "Please complete all required fields before creating.",
      })
      return
    }

    const payload =
      role === "OSA"
        ? {
            role,
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            password: form.password,
          }
        : {
            role,
            gateName: form.gateName.trim(),
            location: form.location.trim(),
            deviceID: form.deviceID.trim(),
            email: form.email.trim(),
            password: form.password,
          }

    try {
      setIsSubmitting(true)

      const res = await fetch("/api/admin/create-system-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      // safe parse (handles HTML error pages too)
      const text = await res.text()
      let data: any = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = { error: text || "Unexpected server response." }
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create account.")
      }

      toast.success("Account created successfully", {
        description:
          role === "OSA"
            ? `OSA account created for ${payload.fullName}`
            : `Gate account created: ${payload.gateName}`,
      })

      onOpenChange(false)
      onAccountCreated?.()
    } catch (e: any) {
      const msg = e?.message || "Something went wrong."
      setError(msg)

      toast.error("Failed to create account", {
        description: msg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? (
        <div onClick={() => onOpenChange(true)} className="inline-block">
          {children}
        </div>
      ) : null}

      <DialogContent className="sm:max-w-130 p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b bg-linear-to-b from-muted/70 to-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10">
                <ShieldPlus className="h-5 w-5 text-primary" />
              </span>
              Create System Account
            </DialogTitle>
            <DialogDescription className="text-sm">
              Create an account for OSA staff or a Gate device operator.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 pt-5 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm">Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as Role)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OSA">OSA</SelectItem>
                <SelectItem value="Gate">Gate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === "OSA" && (
            <div className="space-y-2">
              <Label className="text-sm">Full Name</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="e.g. Juan Dela Cruz"
                className="h-11"
                disabled={isSubmitting}
              />
            </div>
          )}

          {role === "Gate" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Gate Name</Label>
                <Input
                  value={form.gateName}
                  onChange={(e) =>
                    setForm({ ...form, gateName: e.target.value })
                  }
                  placeholder="e.g. Main Gate"
                  className="h-11"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Location</Label>
                  <Input
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    placeholder="e.g. North Wing"
                    className="h-11"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Device ID</Label>
                  <Input
                    value={form.deviceID}
                    onChange={(e) =>
                      setForm({ ...form, deviceID: e.target.value })
                    }
                    placeholder="e.g. GATE-001"
                    className="h-11"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@domain.com"
                className="h-11"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="h-11"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-11 rounded-2xl"
          >
            Cancel
          </Button>

          <Button
            onClick={submit}
            disabled={!isValid || isSubmitting}
            className="h-11 rounded-2xl min-w-40"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
