"use client"

import { signOut, onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebaseConfig"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ChevronsUpDown,
  LogOut,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function AdminNavUser() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [user, setUser] = useState({
    name: "Loading...",
    email: "Loading...",
    avatar: "/avatars/shadcn.jpg",
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      // Check if session cookie exists (admin is logged in via session)
      try {
        const sessionRes = await fetch("/api/auth/verify-session", {
          method: "GET",
          credentials: "include",
        })

        if (sessionRes.ok) {
          // Session is valid, set user info
          setUser({
            name: authUser?.displayName || "Admin",
            email: authUser?.email || "admin@tup.edu.ph",
            avatar: "/avatars/shadcn.jpg",
          })
          return
        }
      } catch (err) {
        console.log("Session check failed")
      }

      // No session, redirect to login
      if (!authUser) {
        router.replace("/clients/admin/login")
        return
      }

      // Auth user exists but no session - logout
      try {
        await signOut(auth)
        router.replace("/clients/admin/login")
      } catch (err) {
        console.error("Logout error:", err)
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleLogout = async () => {
    try {
      // Clear session cookie on server
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      })

      // Sign out from Firebase client
      await signOut(auth)
      router.replace("/clients/admin/login")
    } catch (err) {
      console.error("Logout error:", err)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild suppressHydrationWarning>
            <SidebarMenuButton
              size="lg"
              suppressHydrationWarning
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">AD</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            suppressHydrationWarning
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">AD</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
