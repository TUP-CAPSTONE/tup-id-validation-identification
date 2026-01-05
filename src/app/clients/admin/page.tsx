import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminDashboard } from "@/components/admin-dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminRouteProtector } from "@/components/admin-route-protector";

export default function AdminPage() {
  return (
    <AdminRouteProtector>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AdminSidebar />
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="min-h-full p-8">
              <div className="max-w-7xl mx-auto">
                <div className="mb-10">
                  <h1 className="text-5xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                  <p className="text-gray-600 text-lg">Manage student registration approvals and system operations</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm">
                  <AdminDashboard />
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </AdminRouteProtector>
  );
}
