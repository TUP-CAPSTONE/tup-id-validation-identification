import { StudentForgotPasswordForm } from "@/components/student-forgot-password";

export default function StudentForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <StudentForgotPasswordForm />
      </div>
    </div>
  );
}