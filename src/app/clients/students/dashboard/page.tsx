"use client";

import { AppSidebar } from "@/components/student-app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import StudentDashboard from "@/components/student-dashboard";

export default function DashboardPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-gradient-to-b from-[#c62c3f] to-[#b32032] text-white sticky top-0 flex h-20 items-center justify-center shadow-md px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow-sm">Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 gap-6 p-4">
          <StudentDashboard />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}