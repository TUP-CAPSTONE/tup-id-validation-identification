import { ManageOsaAccounts } from "@/components/admin-manage-osa-accounts"
import { AdminSidebar } from "@/components/admin-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";


export default function ManageOsaAccountsPage() {
  return (
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AdminSidebar />
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="min-h-full p-8">
              <div className="max-w-7xl mx-auto">
                <div className="mb-10">
                  <h1 className="text-5xl font-bold text-gray-900 mb-2">Manage OSA Accounts</h1>
                  <p className="text-gray-600 text-lg">Create, update, and delete OSA accounts</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm">
                  <ManageOsaAccounts />
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
  );
}