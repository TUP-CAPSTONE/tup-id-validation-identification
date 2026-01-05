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
import { signInWithEmailAndPassword, signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebaseConfig"
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore"
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
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Check if user exists in staffs collection and has admin role
      const staffRef = doc(db, "staffs", user.uid)
      const staffSnap = await getDoc(staffRef)

      if (!staffSnap.exists()) {
        setError("You are not registered as staff")
        await signOut(auth)
        return
      }

      const staffData = staffSnap.data()
      if (staffData.role !== "admin") {
        setError("You do not have admin privileges")
        await signOut(auth)
        return
      }

      // Check if another admin is already logged in
      const adminSessionRef = doc(db, "admin_session", "active")
      const adminSessionSnap = await getDoc(adminSessionRef)

      if (adminSessionSnap.exists()) {
        const activeAdminUid = adminSessionSnap.data().uid
        // Sign out the previously logged-in admin
        await signOut(auth)
        // Delete the old session
        await deleteDoc(adminSessionRef)
      }

      // Create new admin session
      await setDoc(adminSessionRef, {
        uid: user.uid,
        email: user.email,
        name: staffData.name,
        loginTime: new Date(),
      })

      // Redirect to admin dashboard
      router.push("/clients/admin")
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError("Email not found")
      } else if (err.code === "auth/wrong-password") {
        setError("Invalid password")
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address")
      } else {
        setError("Login failed. Please try again.")
      }
      console.error("Login error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-bold">Admin Login</CardTitle>
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
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                </div>
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
