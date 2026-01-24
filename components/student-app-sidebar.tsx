"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";

import {
  IdCardLanyardIcon,
  UserIcon,
  SendIcon,
  PanelLeftClose,
  Paperclip,
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
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
    <Sidebar 
      {...props} 
      variant="sidebar"
      collapsible="offcanvas"
      style={{ "--sidebar-width": "280px" } as React.CSSProperties}
    >
      <SidebarHeader className="h-20 border-b border-[#dca0ad] bg-gradient-to-b from-[#c62c3f] to-[#b32032] text-white flex flex-row items-center justify-between px-3 shadow-sm">
        <NavUser user={userData} />
        <SidebarTrigger className="ml-auto size-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition" />
      </SidebarHeader>
      <SidebarContent className="overflow-y-auto overflow-x-hidden">
        <DatePicker />
        <SidebarSeparator className="mx-0" />
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/clients/students/dashboard/validation-request">
              <SidebarMenuButton>
                <IdCardLanyardIcon />
                ID Validation Request
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/clients/students/dashboard/user-info">
              <SidebarMenuButton>
                <UserIcon />
                User Information
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/clients/students/dashboard/feedback">
              <SidebarMenuButton>
                <SendIcon />
                Give Feedback
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail className="flex items-center justify-center">
        <span className="mt-2 mx-auto inline-flex size-8 items-center justify-center rounded-full border border-[#dca0ad] bg-white text-[#b32032] shadow-sm hover:bg-[#fdf1f3]">
          <Paperclip className="w-4 h-4" />
        </span>
      </SidebarRail>
    </Sidebar>
  );
}
