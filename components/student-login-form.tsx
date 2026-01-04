"use client";

import { useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
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

export function StudentLoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [formData, setFormData] = useState({
    studentId: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    // Validation
    if (!formData.studentId || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      // TODO: Replace with your actual API call
      const response = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {
        // ignore parse errors, we'll handle based on status
      }

      if (!response.ok) {
        // Check backend-provided flag first
        if (data?.error === "not_approved" || response.status === 403) {
          setError("Account has yet to be approved");
          setLoading(false);
          return;
        }

        // Fallback: look for a pending registration request in Firestore
        try {
          const REG_REQUESTS_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_REG_REQUESTS_COLLECTION || "registration_requests";
          const q = query(collection(db, REG_REQUESTS_COLLECTION), where("studentNumber", "==", formData.studentId));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const hasPending = snap.docs.some(d => {
              const r: any = d.data();
              return r.status === "Pending" || r.status === "pending";
            });
            if (hasPending) {
              setError("Account has yet to be approved");
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          // ignore Firestore errors and fallthrough to generic message
        }

        throw new Error(data?.message || "Invalid credentials");
      }

      if (data?.approved === false) {
        setError("Account has yet to be approved");
        setLoading(false);
        return;
      }

      console.log("Login successful:", data);
      
      // TODO: Redirect to dashboard or save token
      // window.location.href = "/student/dashboard";
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-bold">Student Login</CardTitle>
          <CardDescription>
            Enter your student ID and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Field>
              <FieldLabel htmlFor="studentId">Student ID</FieldLabel>
              <Input
                id="studentId"
                type="text"
                placeholder="TUPM-22-1234"
                value={formData.studentId}
                onChange={(e) =>
                  setFormData({ ...formData, studentId: e.target.value })
                }
                disabled={loading}
                required
              />
            </Field>

            <Field>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <a
                  href="/clients/students/forgot"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                disabled={loading}
                required
              />
            </Field>

            <Field>
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="w-full"
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
              <Button 
                variant="outline" 
                type="button" 
                disabled={loading}
                className="w-full"
              >
                Login with Google
              </Button>
              <FieldDescription className="text-center">
                Don't have an account?{" "}
                <a href="/clients/students/register" className="underline underline-offset-4 hover:text-primary">
                  Sign up
                </a>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}
