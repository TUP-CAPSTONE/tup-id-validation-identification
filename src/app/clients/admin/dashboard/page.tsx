import { AdminDashboard } from "@/components/admin-dashboard";

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage student registration approvals</p>
        </div>
        <AdminDashboard />
      </div>
    </div>
  );
}
