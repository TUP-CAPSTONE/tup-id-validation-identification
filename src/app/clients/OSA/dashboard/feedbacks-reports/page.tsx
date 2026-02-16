"use client";

import { AppSidebar } from "@/components/osa-app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

import { FeedbackReportForm } from "@/components/feedback-reports-form";

export default function FeedbacksPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "20rem", // This matches your w-80 (20rem) sidebar
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4 z-50">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-lg font-bold">
                  Feedback & Reports
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="mx-auto w-full max-w-5xl">
            <FeedbackReportForm senderRole="osa" />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
