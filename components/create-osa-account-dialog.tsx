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

interface CreateOsaAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccountCreated: () => void
  children: React.ReactNode
}

export function CreateOsaAccountDialog({
  open,
  onOpenChange,
  onAccountCreated,
  children,
}: CreateOsaAccountDialogProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) return setError("Name is required")
    if (!email.trim()) return setError("Email is required")
    if (!password) return setError("Password is required")
    if (password.length < 6)
      return setError("Password must be at least 6 characters")
    if (password !== confirmPassword)
      return setError("Passwords do not match")

    setLoading(true)

    try {
      const res = await fetch("/api/admin/create-osa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account")
      }

      setName("")
      setEmail("")
      setPassword("")
      setConfirmPassword("")

      onOpenChange(false)
      onAccountCreated()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div onClick={() => onOpenChange(true)}>{children}</div>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create OSA Account</DialogTitle>
          <DialogDescription>
            Create a new OSA staff account
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateAccount} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
