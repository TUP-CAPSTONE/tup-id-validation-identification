"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Users,
  CheckCircle,
  Building2,
  Key,
  LogIn,
  MessageSquare,
  LayoutDashboard,
} from "lucide-react"

import { AdminNavUser } from "@/components/admin-nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar {...props} className="border-r border-gray-200 w-80">
      <SidebarHeader className="border-b border-gray-200 h-16 px-4 py-2 bg-white">
        <AdminNavUser />
      </SidebarHeader>
      <SidebarContent className="overflow-y-auto bg-white px-0 py-4">
        <SidebarMenu className="gap-0 px-2">
          {/* Dashboard Link */}
          <SidebarMenuItem>
            <Link href="/clients/admin">
              <SidebarMenuButton
                className={cn(
                  "rounded-md transition-colors h-12",
                  pathname === "/clients/admin" 
                    ? "bg-blue-100 text-blue-900 hover:bg-blue-200" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium text-base">Dashboard</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarSeparator className="mx-0 my-3" />

          {/* Student Management Section */}
          <SidebarMenuItem>
            <Link href="/clients/admin/dashboard/manage-registrations">
              <SidebarMenuButton
                className={cn(
                  "rounded-md transition-colors h-12",
                  pathname.includes("manage-registrations") 
                    ? "bg-blue-100 text-blue-900 hover:bg-blue-200" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Users className="w-5 h-5" />
                <span className="font-medium text-base">Manage Student Registrations</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/clients/admin/manage-id-validation">
              <SidebarMenuButton
                className={cn(
                  "rounded-md transition-colors h-12",
                  pathname.includes("manage-id-validation") 
                    ? "bg-blue-100 text-blue-900 hover:bg-blue-200" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium text-base">Manage ID Validation Requests</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarSeparator className="mx-0 my-3" />

          {/* Account Management Section */}
          <SidebarMenuItem>
            <Link href="/clients/admin/dashboard/manage-system-accounts">
              <SidebarMenuButton
                className={cn(
                  "rounded-md transition-colors h-12",
                  pathname.includes("manage-system-accounts") 
                    ? "bg-blue-100 text-blue-900 hover:bg-blue-200" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium text-base">Manage System Accounts</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/clients/admin/dashboard/manage-osa-accounts">
              <SidebarMenuButton
                className={cn(
                  "rounded-md transition-colors h-12",
                  pathname.includes("manage-osa-accounts") 
                    ? "bg-blue-100 text-blue-900 hover:bg-blue-200" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium text-base">Manage OSA Accounts</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/clients/admin/manage-gate-accounts">
              <SidebarMenuButton
                className={cn(
                  "rounded-md transition-colors h-12",
                  pathname.includes("manage-gate-accounts") 
                    ? "bg-blue-100 text-blue-900 hover:bg-blue-200" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Key className="w-5 h-5" />
                <span className="font-medium text-base">Manage Gate Accounts</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarSeparator className="mx-0 my-3" />

          {/* Monitoring & Feedback Section */}
          <SidebarMenuItem>
            <Link href="/clients/admin/monitor-logs">
              <SidebarMenuButton
                className={cn(
                  "rounded-md transition-colors h-12",
                  pathname.includes("monitor-logs") 
                    ? "bg-blue-100 text-blue-900 hover:bg-blue-200" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <LogIn className="w-5 h-5" />
                <span className="font-medium text-base">Monitor Entrance & Exit Logs</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/clients/admin/dashboard/manage-feedbacks">
              <SidebarMenuButton
                className={cn(
                  "rounded-md transition-colors h-12",
                  pathname.includes("manage-feedbacks") 
                    ? "bg-blue-100 text-blue-900 hover:bg-blue-200" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium text-base">Manage Feedbacks & Bug Reports</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
