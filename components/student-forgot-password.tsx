"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function StudentForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    if (!identifier) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      // TODO: Replace with your actual API call
      const response = await fetch("/api/student/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });

      if (!response.ok) {
        throw new Error("Could not find an account with that ID or email");
      }

      const data = await response.json();
      console.log("Password reset successful:", data);
      setMessage("A password reset link has been sent to your email");
      
      // TODO: Redirect to login or show success page
      // window.location.href = "/student/login";
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)} {...props}>
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your student ID or email to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="space-y-6">
            {message && (
              <Alert className="mb-4">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Field>
              <FieldLabel htmlFor="identifier">Student ID or Email</FieldLabel>
              <Input
                id="identifier"
                type="text"
                placeholder="TUPM-22-1234 or email@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                required
                className="h-12 text-base"
              />
            </Field>

            <Field>
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="w-full h-12 text-base"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <FieldDescription className="text-center">
                Remember your password?{" "}
                <a href="/clients/students/login" className="underline underline-offset-4 hover:text-primary">
                  Back to Login
                </a>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}