import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-amber-50 to-orange-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-amber-100 p-3">
              <svg
                className="h-8 w-8 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Your Account is Pending</CardTitle>
          <CardDescription>Awaiting administrator approval</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
            <p className="text-sm text-amber-900 leading-relaxed">
              Your account is currently <strong>awaiting approval</strong> from an administrator. You will not be able to log in until your account has been approved.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Status: PENDING</h3>
            <p className="text-xs text-gray-600">
              Your registration was successful, but your account requires administrator approval before you can access the system. This is part of our verification process to ensure account security.
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <p className="text-xs text-blue-900">
              <strong>What happens next?</strong><br />
              An administrator will review your account details and approve or reject your registration. You will receive an email notification about the decision.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/clients/students/login" className="w-full">
              <Button className="w-full" variant="outline">
                Back to Login
              </Button>
            </Link>
            <Link href="/" className="w-full">
              <Button className="w-full" variant="ghost">
                Go to Home Page
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
