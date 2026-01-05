"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseConfig"
import { useSessionTimeout } from "@/hooks/use-session-timeout"

export function AdminRouteProtector({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  
  // Initialize session timeout hook
  useSessionTimeout()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not logged in, redirect to login
        router.push("/clients/admin/login")
        return
      }

      try {
        // Check if user is admin in staffs collection
        const staffRef = doc(db, "staffs", user.uid)
        const staffSnap = await getDoc(staffRef)

        if (!staffSnap.exists()) {
          console.error("User not found in staffs collection")
          router.push("/clients/admin/login")
          return
        }

        const staffData = staffSnap.data()
        
        // Check if user has admin role
        if (staffData.role !== "admin") {
          console.error("User does not have admin privileges")
          router.push("/clients/admin/login")
          return
        }

        // Check if this is the active admin session
        const adminSessionRef = doc(db, "admin_session", "active")
        const adminSessionSnap = await getDoc(adminSessionRef)

        if (!adminSessionSnap.exists() || adminSessionSnap.data().uid !== user.uid) {
          console.error("Not the active admin session")
          router.push("/clients/admin/login")
          return
        }
      } catch (err) {
        console.error("Error verifying admin status:", err)
        router.push("/clients/admin/login")
      }
    })

    return () => unsubscribe()
  }, [router])

  return <>{children}</>
}
