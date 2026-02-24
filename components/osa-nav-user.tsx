"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronsUpDown,
  LogOut,
  Settings,
  Volume2,
  VolumeX,
  Sparkles,
  EyeOff,
} from "lucide-react"

import { auth } from "@/lib/firebaseConfig"
import { signOut, onAuthStateChanged } from "firebase/auth"

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

// Reuse the same storage key and helpers as the admin portal
export const OSA_EFFECTS_STORAGE_KEY = "osa_effects_settings"

export type OsaEffectsSettings = {
  soundEnabled: boolean
  visualEnabled: boolean
}

export function getOsaEffectsSettings(): OsaEffectsSettings {
  if (typeof window === "undefined") return { soundEnabled: true, visualEnabled: true }
  try {
    const stored = localStorage.getItem(OSA_EFFECTS_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return { soundEnabled: true, visualEnabled: true }
}

export function saveOsaEffectsSettings(settings: OsaEffectsSettings) {
  localStorage.setItem(OSA_EFFECTS_STORAGE_KEY, JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent("osaEffectsSettingsChanged", { detail: settings }))
}

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

export function NavUser() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [effects, setEffects] = useState<OsaEffectsSettings>({ soundEnabled: true, visualEnabled: true })

  const [user, setUser] = useState<{
    fullName: string
    email: string
    avatar: string
  } | null>(null)

  useEffect(() => {
    setEffects(getOsaEffectsSettings())
  }, [])

  const updateEffects = (updated: OsaEffectsSettings) => {
    setEffects(updated)
    saveOsaEffectsSettings(updated)
  }

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch("/api/osa/me")
      if (!res.ok) {
        router.replace("/clients/OSA/login")
        return
      }
      const data = await res.json()
      setUser({
        fullName: data.fullName || "OSA Staff",
        email: data.email,
        avatar: data.photoURL || "",
      })
    }
    fetchUser()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      await signOut(auth)
      router.replace("/clients/OSA/login")
    } catch (err) {
      console.error("Logout error:", err)
    }
  }

  if (!user) return null

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.fullName} />
                  <AvatarFallback className="rounded-lg">OSA</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.fullName}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="start"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.fullName} />
                    <AvatarFallback className="rounded-lg">OSA</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.fullName}</span>
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
              OSA Settings
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Customize your OSA panel experience.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1 mb-3">
              Feedback Effects
            </p>

            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-3">
                {effects.soundEnabled
                  ? <Volume2 className="h-5 w-5 text-blue-500" />
                  : <VolumeX className="h-5 w-5 text-gray-400" />
                }
                <div>
                  <p className="text-sm font-medium text-gray-800">Sound Effects</p>
                  <p className="text-xs text-gray-500">Play audio on accept &amp; reject actions</p>
                </div>
              </div>
              <Toggle
                enabled={effects.soundEnabled}
                onToggle={() => updateEffects({ ...effects, soundEnabled: !effects.soundEnabled })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-3">
                {effects.visualEnabled
                  ? <Sparkles className="h-5 w-5 text-blue-500" />
                  : <EyeOff className="h-5 w-5 text-gray-400" />
                }
                <div>
                  <p className="text-sm font-medium text-gray-800">Visual Effects</p>
                  <p className="text-xs text-gray-500">Confetti on accept, red flash on reject</p>
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