"use client";

import { useState } from "react";
import { Trash2, Edit2, Loader2, Mail, Calendar } from "lucide-react";
import { SystemAccount } from "@/components/types/system-accounts";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { AdminEditSystemAccountDialog } from "@/components/admin-edit-system-account-dialog";
import { toast } from "sonner";
import { stat } from "fs";

interface Props {
  accounts: SystemAccount[];
  loading: boolean;
  onAccountsChanged: () => void;
}

export function SystemAccountsTable({
  accounts,
  loading,
  onAccountsChanged,
}: Props) {
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="py-4">Name</TableHead>
            <TableHead className="py-4">Email</TableHead>
            <TableHead className="py-4">Role</TableHead>
            <TableHead className="py-4">Created</TableHead>
            <TableHead className="py-4">Status</TableHead>
            <TableHead className="py-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {!accounts?.length ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="text-sm font-medium">
                    No system accounts found
                  </div>
                  <div className="text-xs">
                    Accounts you create will appear here.
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            accounts.map((acc) => {
              const displayName =
                acc.role === "OSA" ? acc.fullName : acc.gateName;

              const created = acc.createdAt?.seconds
                ? new Date(acc.createdAt.seconds * 1000).toLocaleDateString()
                : "N/A";

              const isDeleting = deletingUid === acc.uid;

              // fallback status if missing
              const rawStatus = ((acc as any).accountStatus || "")
                .toString()
                .toUpperCase();

              const isActive = rawStatus === "ACTIVE";

              // UI label + color
              const statusLabel = isActive ? "Active" : "Disabled";
              const statusBadgeClass = isActive
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200";

              return (
                <TableRow
                  key={acc.uid}
                  className="transition hover:bg-muted/30"
                >
                  {/* NAME */}
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-foreground">
                        {displayName || "Unnamed"}
                      </span>
                    </div>
                  </TableCell>

                  {/* EMAIL */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{acc.email}</span>
                    </div>
                  </TableCell>

                  {/* ROLE */}
                  <TableCell className="py-4">
                    <Badge
                      variant="secondary"
                      className={
                        acc.role === "OSA"
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : "bg-blue-100 text-blue-700 border border-blue-200"
                      }
                    >
                      {acc.role}
                    </Badge>
                  </TableCell>

                  {/* CREATED */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-foreground">{created}</span>
                    </div>
                  </TableCell>

                  {/* STATUS */}
                  <TableCell className="py-4">
                    <Badge variant="secondary" className={statusBadgeClass}>
                      {statusLabel}
                    </Badge>
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell className="py-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      {/* EDIT */}
                      <AdminEditSystemAccountDialog
                        account={acc}
                        onUpdated={onAccountsChanged}
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9"
                          title="Edit account"
                          disabled={isDeleting}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </AdminEditSystemAccountDialog>

                      {/* DELETE */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete account"
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete system account?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will
                              permanently delete the {acc.role} account.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>
                              Cancel
                            </AlertDialogCancel>

                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              disabled={isDeleting}
                              onClick={async () => {
                                if (isDeleting) return;

                                try {
                                  setDeletingUid(acc.uid);

                                  const res = await fetch(
                                    "/api/admin/delete-system-account",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        uid: acc.uid,
                                        role: acc.role,
                                      }),
                                    },
                                  );

                                  const text = await res.text();
                                  let data: any = null;
                                  try {
                                    data = text ? JSON.parse(text) : null;
                                  } catch {
                                    data = {
                                      error: text || "Unexpected response",
                                    };
                                  }

                                  if (!res.ok) {
                                    throw new Error(
                                      data?.error ||
                                        "Failed to delete account.",
                                    );
                                  }

                                  toast.success("Account deleted", {
                                    description: `${
                                      displayName || "Account"
                                    } has been removed successfully.`,
                                  });

                                  onAccountsChanged();
                                } catch (e: any) {
                                  toast.error("Delete failed", {
                                    description:
                                      e?.message || "Something went wrong.",
                                  });
                                } finally {
                                  setDeletingUid(null);
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
