"use client";

import { AppSidebar } from "@/components/student-app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import StudentValidationRequest from "@/components/student-validation-request";

export default function ValidationRequestPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-gradient-to-b from-[#c62c3f] to-[#b32032] text-white sticky top-0 flex h-20 items-center justify-center shadow-md px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow-sm">ID Validation Request</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="mx-auto w-full max-w-6xl">
            <StudentValidationRequest />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}