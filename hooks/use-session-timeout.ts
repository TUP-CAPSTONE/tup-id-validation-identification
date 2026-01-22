"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebaseConfig"
import { doc, deleteDoc } from "firebase/firestore"

const INACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes in milliseconds

export function useSessionTimeout() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const resetTimeout = () => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Update last activity time
    lastActivityRef.current = Date.now()

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      console.log("Session timeout due to inactivity")
      
      try {
        // Delete the admin session
        const adminSessionRef = doc(db, "admin_session", "active")
        await deleteDoc(adminSessionRef)
        
        // Sign out the user
        await signOut(auth)
        
        // Redirect to login
        router.push("/clients/admin/login")
      } catch (err) {
        console.error("Error during session timeout:", err)
        router.push("/clients/admin/login")
      }
    }, INACTIVITY_TIMEOUT)
  }

  useEffect(() => {
    // Initialize timeout
    resetTimeout()

    // Listen for user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"]

    const handleActivity = () => {
      resetTimeout()
    }

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [router])

  return null
}
