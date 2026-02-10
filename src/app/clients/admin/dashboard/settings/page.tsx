import { AdminSettings } from "@/components/admin-settings"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function SettingsPage() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="min-h-full p-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-10">
                <h1 className="text-5xl font-bold text-gray-900 mb-2">System Settings</h1>
                <p className="text-gray-600 text-lg">Manage ID validation periods and data backups</p>
              </div>
              <div className="space-y-6">
                <AdminSettings />
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}