"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  IdCardIcon,
  Users2Icon,
  MessageCircleMore,
} from "lucide-react"

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

// This is sample data.
const data = {
  user: {
    name: "OSA Admin",
    email: "osa@tup.edu.ph",
    avatar: "/avatars/shadcn.jpg",
  },
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-sidebar-border h-16 border-b">
        <NavUser user={data.user} />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <DatePicker />
        <SidebarSeparator className="mx-0" />
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/clients/OSA/dashboard">
              <SidebarMenuButton
                className={cn(
                  pathname === "/clients/OSA/dashboard" ? "bg-primary text-primary-foreground" : ""
                )}
              >
                <LayoutDashboard />
                Dashboard
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/clients/OSA/dashboard/id-validation">
              <SidebarMenuButton
                className={cn(
                  pathname.includes("id-validation") ? "bg-primary text-primary-foreground" : ""
                )}
              >
                <IdCardIcon />
                Validation Requests
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/clients/OSA/dashboard/students-list">
              <SidebarMenuButton
                className={cn(
                  pathname.includes("students-list") ? "bg-primary text-primary-foreground" : ""
                )}
              >
                <Users2Icon />
                Students List
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/clients/OSA/dashboard/feedbacks">
              <SidebarMenuButton
                className={cn(
                  pathname.includes("feedbacks") ? "bg-primary text-primary-foreground" : ""
                )}
              >
                <MessageCircleMore />
                Feedbacks
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}