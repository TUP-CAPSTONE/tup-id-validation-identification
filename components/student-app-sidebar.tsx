"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  IdCardLanyardIcon,
  UserIcon,
  SendIcon,
} from "lucide-react"

import { DatePicker } from "@/components/date-picker";
import { NavUser } from "@/components/student-nav-user";
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
    name: "Juan Dela Cruz",
    email: "student@tup.edu.ph",
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
            <Link href="/clients/students/dashboard/validation-request">
              <SidebarMenuButton
                className={cn(
                  pathname.includes("validation-request") ? "bg-primary text-primary-foreground" : ""
                )}
              >
                <IdCardLanyardIcon />
                ID Validation Request
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/clients/students/dashboard/user-info">
              <SidebarMenuButton
                className={cn(
                  pathname.includes("user-info") ? "bg-primary text-primary-foreground" : ""
                )}
              >
                <UserIcon />
                User Information
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/clients/students/dashboard/feedback">
              <SidebarMenuButton
                className={cn(
                  pathname.includes("feedback") ? "bg-primary text-primary-foreground" : ""
                )}
              >
                <SendIcon />
                Give Feedback
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
