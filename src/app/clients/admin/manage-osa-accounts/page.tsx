import { ManageOsaAccounts } from "@/components/manage-osa-accounts"
import { AdminRouteProtector } from "@/components/admin-route-protector"

export default function ManageOsaAccountsPage() {
  return (
    <AdminRouteProtector>
      <ManageOsaAccounts />
    </AdminRouteProtector>
  )
}
