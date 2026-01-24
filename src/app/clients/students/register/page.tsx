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
      <header className="bg-gradient-to-b from-[#c62c3f] to-[#b32032] text-white sticky top-0 flex h-20 items-center justify-center shadow-md px-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow-sm">Student Registration</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 pt-0">
        <div className="w-full max-w-3xl">
          <StudentRegistrationForm />
        </div>
      </div>
    </div>
  );
}

