"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";

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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const [userData, setUserData] = useState({
    name: "Loading...",
    email: "Loading...",
    avatar: "/avatars/shadcn.jpg",
  });

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubDoc) {
        try { unsubDoc(); } catch (e) {}
        unsubDoc = null;
      }

      if (user) {
        try {
          const studentRef = doc(db, "students", user.uid);
          unsubDoc = onSnapshot(studentRef, (snap) => {
            if (snap.exists()) {
              const data: any = snap.data();
              setUserData({
                name: `${data.firstName} ${data.lastName}`,
                email: data.email,
                avatar: data.avatar || data.profilePicture || "/avatars/shadcn.jpg",
              });
            } else {
              setUserData((u) => ({ ...u, name: user.displayName || "User", email: user.email || "" }));
            }
          });
        } catch (err) {
          console.warn("Could not subscribe to user profile:", err);
        }
      } else {
        setUserData({
          name: "Loading...",
          email: "Loading...",
          avatar: "/avatars/shadcn.jpg",
        });
      }
    });

    return () => {
      if (unsubDoc) try { unsubDoc(); } catch(e) {}
      unsubscribeAuth();
    };
  }, []);

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-sidebar-border h-16 border-b">
        <NavUser user={userData} />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <DatePicker />
        <SidebarSeparator className="mx-0" />
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/clients/students/dashboard/validation-request">
              <SidebarMenuButton
                className={cn(
                  pathname.includes("validation-request") ? "bg-red-700 text-white" : ""
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
                  pathname.includes("user-info") ? "bg-red-700 text-white" : ""
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
                  pathname.includes("feedback") ? "bg-red-700 text-white" : ""
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
