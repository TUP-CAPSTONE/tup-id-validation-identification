import { StudentLoginForm } from "@/components/student-login-form";

export default function StudentLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <StudentLoginForm />
      </div>
    </div>
  );
}