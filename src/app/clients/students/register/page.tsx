import { StudentRegistrationForm } from "@/components/student-registration-form";

export default function StudentRegistrationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-3xl">
        <StudentRegistrationForm />
      </div>
    </div>
  );
}

