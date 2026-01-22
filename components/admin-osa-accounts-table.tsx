"use client"

import { useState } from "react"
import { Trash2, Edit2, Loader2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { EditOsaAccountDialog } from "@/components/admin-edit-osa-account-dialog"
import { OsaAccount } from "@/components/admin-manage-osa-accounts"

interface OsaAccountsTableProps {
  accounts: OsaAccount[]
  loading: boolean
  onAccountsChanged: () => void
}

export function OsaAccountsTable({ accounts, loading, onAccountsChanged }: OsaAccountsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<OsaAccount | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteClick = (account: OsaAccount) => {
    setSelectedAccount(account)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
  if (!selectedAccount) return

  setDeleting(true)
  try {
    const response = await fetch("/api/admin/delete-osa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: selectedAccount.id,
      }),
    })

    if (!response.ok) {
      throw new Error("Deletion failed")
    }

    setDeleteDialogOpen(false)
    setSelectedAccount(null)
    onAccountsChanged()
  } catch (error) {
    console.error("Delete error:", error)
    alert("Failed to delete OSA account")
  } finally {
    setDeleting(false)
  }
}


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div>
          <p className="text-gray-600 text-lg font-medium">No OSA accounts found</p>
          <p className="text-gray-400 text-sm">Create your first OSA account to get started</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Created</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id} className="hover:bg-gray-50">
                <TableCell className="font-medium text-gray-900">{account.name}</TableCell>
                <TableCell className="text-gray-600">{account.email}</TableCell>
                <TableCell>
                  <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-sm font-medium">
                    {account.role}
                  </span>
                </TableCell>
                <TableCell className="text-gray-600">
                  {account.createdAt
                    ? new Date(account.createdAt.seconds * 1000).toLocaleDateString()
                    : "N/A"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <EditOsaAccountDialog 
                      account={account}
                      onAccountUpdated={onAccountsChanged}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </EditOsaAccountDialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(account)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete OSA Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the account for <strong>{selectedAccount?.email}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
