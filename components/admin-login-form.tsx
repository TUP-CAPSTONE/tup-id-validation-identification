"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth"
import { auth } from "@/lib/firebaseConfig"
import { useRouter } from "next/navigation"

export function AdminLoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      /**
       * 1️⃣ Firebase Auth sign-in
       */
      const { user } = await signInWithEmailAndPassword(
        auth,
        email,
        password
      )

      /**
       * 2️⃣ Get ID token
       */
      const token = await user.getIdToken(true)

      /**
       * 3️⃣ Verify admin role via Admin SDK
       */
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      })

      console.log("Admin login response status:", res.status)

      if (!res.ok) {
        await signOut(auth)
        let errorMessage = "You do not have admin privileges"
        try {
          const errorData = await res.json()
          console.log("Admin login error data:", errorData)
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // JSON parse failed, use default message
        }
        throw new Error(errorMessage)
      }

      console.log("Admin login successful, redirecting...")

      /**
       * 4️⃣ Success → redirect
       */
      router.replace("/clients/admin/dashboard")
    } catch (err: any) {
      console.error("Admin login error:", err)
      setError(err instanceof Error ? err.message : "Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-bold">
            Admin Login
          </CardTitle>
          <CardDescription>
            Enter your credentials below to login to your admin account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@tup.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
