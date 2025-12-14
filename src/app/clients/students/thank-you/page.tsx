import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Thank You for Registering!</CardTitle>
          <CardDescription>Your account is pending approval</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <p className="text-sm text-blue-900 leading-relaxed">
              Your account has been successfully created and is now <strong>pending approval</strong> from an administrator. You will be notified via email once your account has been reviewed and approved.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">What happens next?</h3>
            <ul className="text-sm text-gray-700 space-y-1 ml-4">
              <li>✓ Your account details have been saved</li>
              <li>✓ A verification email has been sent to your email address</li>
              <li>✓ An administrator will review your account</li>
              <li>✓ You will receive an email once your account is approved</li>
            </ul>
          </div>

          <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
            <p className="text-xs text-amber-900">
              <strong>Note:</strong> You will not be able to log in until your account is approved by an administrator. Please check your email for approval updates.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/clients/students/login" className="w-full">
              <Button className="w-full" variant="outline">
                Return to Login
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
