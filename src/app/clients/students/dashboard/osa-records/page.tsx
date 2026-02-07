"use client";

import { AppSidebar } from "@/components/student-app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import StudentMyOffenses from "@/components/student-my-offenses";

export default function OSARecordsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-linear-to-b from-[#c62c3f] to-[#b32032] text-white sticky top-0 flex h-20 items-center justify-center shadow-md px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow-sm">
                  My Offenses
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 gap-6 p-4">
          <StudentMyOffenses />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
