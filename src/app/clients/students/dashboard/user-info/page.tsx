"use client";

import { AppSidebar } from "@/components/student-app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import StudentUserInfo from "@/components/student-user-info";

export default function UserInfoPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-linear-to-b from-[#c62c3f] to-[#b32032] text-white sticky top-0 z-50 flex h-20 items-center shadow-md px-4">
          <SidebarTrigger className="md:hidden mr-3 size-10 rounded-full bg-white/20 text-white hover:bg-white/30 transition flex-shrink-0" />
          <div className="flex-1 flex justify-center md:justify-center">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-2xl md:text-4xl font-bold tracking-tight text-white drop-shadow-sm">User Information</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="w-10 md:hidden" />
        </header>

        <div className="flex flex-1 flex-col gap-4 p-3 md:p-6">
          <div className="mx-auto w-full max-w-6xl">
            <StudentUserInfo />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}