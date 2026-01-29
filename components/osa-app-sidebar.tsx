"use client";

import * as React from "react";

import Link from "next/link";

import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  IdCardIcon,
  Users2Icon,
  MessageCircleMore,
} from "lucide-react";

import { DatePicker } from "@/components/date-picker";

import { NavUser } from "@/components/osa-nav-user";

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

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar {...props} className="border-r border-gray-200 w-80">
      {/* Header */}

      <SidebarHeader className="border-b border-gray-200 h-16 px-4 py-2 bg-white">
        <NavUser />
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto bg-white px-0 py-4">
        {/* Date Picker */}

        <div className="px-4 mb-3">
          <DatePicker />
        </div>

        <SidebarSeparator className="mx-0 my-3" />

        <SidebarMenu className="gap-0 px-2">
          {/* Dashboard */}

          <SidebarMenuItem>
            <Link href="/clients/OSA/dashboard">
              <SidebarMenuButton
                className={cn(
                  "rounded-md transition-colors h-12",

                  pathname === "/clients/OSA/dashboard"
                    ? "bg-blue-100 text-blue-900 hover:bg-blue-200"
                    : "text-gray-700 hover:bg-gray-100",
                )}
              >
                <LayoutDashboard className="w-5 h-5" />

                <span className="font-medium text-base">Dashboard</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          {/* ID Validation */}

          <SidebarMenuItem>
            <Link href="/clients/OSA/dashboard/id-validation">
              <SidebarMenuButton
                className={cn(
                  "rounded-md transition-colors h-12",

                  pathname.includes("id-validation")
                    ? "bg-blue-100 text-blue-900 hover:bg-blue-200"
                    : "text-gray-700 hover:bg-gray-100",
                )}
              >
                <IdCardIcon className="w-5 h-5" />

                <span className="font-medium text-base">
                  Validation Requests
                </span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          {/* Students List */}

          <SidebarMenuItem>
            <Link href="/clients/OSA/dashboard/students-list">
              <SidebarMenuButton
                className={cn(
                  "rounded-md transition-colors h-12",

                  pathname.includes("students-list")
                    ? "bg-blue-100 text-blue-900 hover:bg-blue-200"
                    : "text-gray-700 hover:bg-gray-100",
                )}
              >
                <Users2Icon className="w-5 h-5" />

                <span className="font-medium text-base">Students List</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          {/* Feedbacks */}

          <SidebarMenuItem>
            <Link href="/clients/OSA/dashboard/feedbacks-reports">
              <SidebarMenuButton
                className={cn(
                  "rounded-md transition-colors h-12",

                  pathname.includes("feedbacks")
                    ? "bg-blue-100 text-blue-900 hover:bg-blue-200"
                    : "text-gray-700 hover:bg-gray-100",
                )}
              >
                <MessageCircleMore className="w-5 h-5" />

                <span className="font-medium text-base">Feedbacks & Bug Reports</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
