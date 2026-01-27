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

export function OsaLoginForm({
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
       * 3️⃣ Verify OSA role via backend
       */
      const res = await fetch("/api/osa/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        await signOut(auth)
        throw new Error("You do not have OSA privileges")
      }

      /**
       * 4️⃣ Success → redirect
       */
      router.replace("/clients/OSA/dashboard")
    } catch (err) {
      console.error("OSA login error:", err)
      setError("Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-bold">
            OSA Login
          </CardTitle>
          <CardDescription>
            Enter your credentials below to login to your OSA account
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
                  placeholder="osa@tup.edu.ph"
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
