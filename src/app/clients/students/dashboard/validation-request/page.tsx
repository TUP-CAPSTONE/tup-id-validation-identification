"use client";

import { AppSidebar } from "@/components/student-app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
        <header className="bg-linear-to-b from-[#c62c3f] to-[#b32032] text-white sticky top-0 flex h-20 items-center shadow-md px-4 z-40">
          <SidebarTrigger className="md:hidden mr-3 size-10 rounded-full bg-white text-[#b32032] hover:bg-gray-100 transition shrink-0 shadow-md border border-white/50" />
          <div className="flex-1 flex justify-center md:justify-center">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-2xl md:text-4xl font-bold tracking-tight text-white drop-shadow-sm">ID Validation Request</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="w-10 md:hidden" />
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