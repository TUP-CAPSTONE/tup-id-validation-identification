"use client";

import { StudentRegistrationForm } from "@/components/student-registration-form";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export default function StudentRegistrationPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-linear-to-b from-[#c62c3f] to-[#b32032] text-white sticky top-0 z-[100] flex h-16 md:h-20 items-center justify-center shadow-md px-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xl md:text-4xl font-bold tracking-tight text-white drop-shadow-sm">Student Registration</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] items-start md:items-center justify-center bg-gray-50 p-3 md:p-4 pt-4">
        <div className="w-full max-w-3xl">
          <StudentRegistrationForm />
        </div>
      </div>
    </div>
  );
}

