"use client";

import { AppSidebar } from "@/components/student-app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
        <header className="bg-linear-to-b from-[#c62c3f] to-[#b32032] text-white sticky top-0 flex h-20 items-center justify-center shadow-md px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow-sm">User Information</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="mx-auto w-full max-w-6xl">
            <StudentUserInfo />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}