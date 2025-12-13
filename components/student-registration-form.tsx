"use client";

import { auth, db } from "@/lib/firebaseConfig";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
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

export function StudentRegistrationForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    studentId: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    // Validation
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.studentId ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    try {
      console.log("Starting registration for:", formData.studentId);

      // Check for existing studentId
      const q = query(collection(db, "students"), where("studentId", "==", formData.studentId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error("This Student ID is already registered. Contact admin if this is a mistake.");
      }

      // Create Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;
      console.log("Firebase user created:", user.uid);

      // Set display name
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`,
      });

      // Create Firestore profile doc (uid as doc id)
      await setDoc(doc(db, "students", user.uid), {
        uid: user.uid,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        studentId: formData.studentId,
        phone: formData.phone || null,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      console.log("Firestore profile created");

      // Send verification email
      await sendEmailVerification(user);
      console.log("Verification email sent to:", formData.email);

      setSuccess(
        "Registration successful! Redirecting to login page..."
      );

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        studentId: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        router.push("/clients/students/login");
      }, 2000);

    } catch (err: any) {
      console.error("Registration error:", err);

      // Firebase specific error handling
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please login instead.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Use at least 8 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email format.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Email/password authentication is not enabled. Contact support.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your connection.");
      } else {
        setError(err.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-bold">
            Student Registration
          </CardTitle>
          <CardDescription>Create your student account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="firstName">First Name *</FieldLabel>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Juan"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  disabled={loading}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="lastName">Last Name *</FieldLabel>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Dela Cruz"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  disabled={loading}
                  required
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="studentId">Student ID *</FieldLabel>
              <Input
                id="studentId"
                type="text"
                placeholder="TUPM-22-1234"
                value={formData.studentId}
                onChange={(e) =>
                  setFormData({ ...formData, studentId: e.target.value.toUpperCase() })
                }
                disabled={loading}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="email">Email *</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="student@tup.edu.ph"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={loading}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="phone">Phone Number (Optional)</FieldLabel>
              <Input
                id="phone"
                type="tel"
                placeholder="+63 912 345 6789"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                disabled={loading}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password *</FieldLabel>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                disabled={loading}
                required
              />
              <FieldDescription>Must be at least 8 characters long</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword">Confirm Password *</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
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
                {loading ? "Creating account..." : "Register"}
              </Button>
              <Button
                variant="outline"
                type="button"
                disabled={loading}
                className="w-full"
              >
                Register with Google
              </Button>
              <FieldDescription className="text-center mt-4">
                Already have an account?{" "}
                <a
                  href="/clients/students/login"
                  className="underline underline-offset-4 hover:text-primary font-semibold"
                >
                  Login here
                </a>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}
