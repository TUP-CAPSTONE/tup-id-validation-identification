"use client"

import { signOut, onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebaseConfig"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ChevronsUpDown,
  LogOut,
  Settings,
  Volume2,
  VolumeX,
  Sparkles,
  EyeOff,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

// ─── Shared settings store ─────────────────────────────────────────────────
// Export so other components can read these preferences
export const EFFECTS_STORAGE_KEY = "admin_effects_settings"

export type EffectsSettings = {
  soundEnabled: boolean
  visualEnabled: boolean
}

export function getEffectsSettings(): EffectsSettings {
  if (typeof window === "undefined") return { soundEnabled: true, visualEnabled: true }
  try {
    const stored = localStorage.getItem(EFFECTS_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return { soundEnabled: true, visualEnabled: true }
}

export function saveEffectsSettings(settings: EffectsSettings) {
  localStorage.setItem(EFFECTS_STORAGE_KEY, JSON.stringify(settings))
  // Dispatch a custom event so other components can react without prop drilling
  window.dispatchEvent(new CustomEvent("effectsSettingsChanged", { detail: settings }))
}
// ──────────────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
        enabled ? "bg-blue-600" : "bg-gray-300"
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}

export function AdminNavUser() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [user, setUser] = useState({
    name: "Loading...",
    email: "Loading...",
    avatar: "/avatars/shadcn.jpg",
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [effects, setEffects] = useState<EffectsSettings>({ soundEnabled: true, visualEnabled: true })

  // Load persisted settings on mount
  useEffect(() => {
    setEffects(getEffectsSettings())
  }, [])

  const updateEffects = (updated: EffectsSettings) => {
    setEffects(updated)
    saveEffectsSettings(updated)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        const sessionRes = await fetch("/api/auth/verify-session", {
          method: "GET",
          credentials: "include",
        })
        if (sessionRes.ok) {
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

      if (!authUser) {
        router.replace("/clients/admin/login")
        return
      }

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
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      await signOut(auth)
      router.replace("/clients/admin/login")
    } catch (err) {
      console.error("Logout error:", err)
    }
  }

  return (
    <>
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
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Settings className="h-5 w-5 text-gray-500" />
              Admin Settings
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Customize your admin panel experience.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1 mb-3">
              Feedback Effects
            </p>

            {/* Sound toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-3">
                {effects.soundEnabled
                  ? <Volume2 className="h-5 w-5 text-blue-500" />
                  : <VolumeX className="h-5 w-5 text-gray-400" />
                }
                <div>
                  <p className="text-sm font-medium text-gray-800">Sound Effects</p>
                  <p className="text-xs text-gray-500">
                    Play audio on accept &amp; reject actions
                  </p>
                </div>
              </div>
              <Toggle
                enabled={effects.soundEnabled}
                onToggle={() => updateEffects({ ...effects, soundEnabled: !effects.soundEnabled })}
              />
            </div>

            {/* Visual toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-3">
                {effects.visualEnabled
                  ? <Sparkles className="h-5 w-5 text-blue-500" />
                  : <EyeOff className="h-5 w-5 text-gray-400" />
                }
                <div>
                  <p className="text-sm font-medium text-gray-800">Visual Effects</p>
                  <p className="text-xs text-gray-500">
                    Confetti on accept, red flash on reject
                  </p>
                </div>
              </div>
              <Toggle
                enabled={effects.visualEnabled}
                onToggle={() => updateEffects({ ...effects, visualEnabled: !effects.visualEnabled })}
              />
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            Settings are saved automatically and persist across sessions.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}