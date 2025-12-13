"use client";

import { auth, db } from "@/lib/firebaseConfig";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, query, collection, where, getDocs, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  const router = useRouter();
  const [formData, setFormData] = useState({
    emailOrStudentId: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is logged in, fetch their profile data
        try {
          const studentRef = doc(db, "students", user.uid);
          const studentSnap = await getDoc(studentRef);
          if (studentSnap.exists()) {
            const data = studentSnap.data();
            setCurrentUser({
              uid: user.uid,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              email: data.email || user.email || "",
            });
          }
        } catch (err) {
          console.warn("Could not fetch user profile:", err);
        }
      } else {
        setCurrentUser(null);
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleContinueAsUser = async () => {
    // User already logged in, just redirect to dashboard
    router.push("/clients/students/dashboard");
  };

  const handleLogoutAndLogin = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setFormData({ emailOrStudentId: "", password: "" });
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    // Validation
    if (!formData.emailOrStudentId || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      console.log("Login attempt for:", formData.emailOrStudentId);

      let email = formData.emailOrStudentId;

      // Check if input is email or student ID
      if (!formData.emailOrStudentId.includes("@")) {
        // It's a student ID, find the corresponding email
        console.log("Input is student ID, looking up email...");
        const q = query(
          collection(db, "students"),
          where("studentId", "==", formData.emailOrStudentId)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          throw new Error(
            "Student ID not found. Please check your input or create an account."
          );
        }

        const studentData = snap.docs[0].data();
        email = studentData.email;
        console.log("Found email:", email);
      }

      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        formData.password
      );
      const user = userCredential.user;

      console.log("Login successful for:", user.uid);

      // Update last login in Firestore
      try {
        const studentRef = doc(db, "students", user.uid);
        await updateDoc(studentRef, {
          lastLogin: new Date(),
        });
      } catch (err) {
        console.warn("Could not update last login:", err);
      }

      // Redirect to dashboard
      router.push("/clients/students/dashboard");

    } catch (err: any) {
      console.error("Login error:", err);

      // Firebase specific error handling
      if (err.code === "auth/user-not-found") {
        setError(
          "User not found. Please check your email/student ID or create an account."
        );
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Invalid email/student ID or password. Please try again.");
      } else if (err.code === "auth/user-disabled") {
        setError("Your account has been disabled. Contact support.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many login attempts. Please try again later.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your connection.");
      } else {
        setError(err.message || "Login failed. Please try again.");
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
            Student Login
          </CardTitle>
          <CardDescription>
            {currentUser && !checkingAuth
              ? "You are already signed in"
              : "Sign in with your email or student ID"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Show current user info if logged in */}
            {currentUser && !checkingAuth && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 mb-3">
                  <strong>Currently signed in as:</strong>
                </p>
                <div className="bg-white rounded p-3 mb-3">
                  <p className="font-semibold text-gray-800">
                    {currentUser.firstName} {currentUser.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{currentUser.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleContinueAsUser}
                    className="flex-1"
                    variant="default"
                  >
                    Continue as this user
                  </Button>
                  <Button
                    onClick={handleLogoutAndLogin}
                    className="flex-1"
                    variant="outline"
                  >
                    Sign in as different user
                  </Button>
                </div>
              </div>
            )}

            {/* Show login form if not logged in */}
            {!currentUser && !checkingAuth && (
              <>
                <Field>
                  <FieldLabel htmlFor="emailOrStudentId">
                    Email or Student ID
                  </FieldLabel>
                  <Input
                    id="emailOrStudentId"
                    type="text"
                    placeholder="student@tup.edu.ph or TUPM-22-1234"
                    value={formData.emailOrStudentId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emailOrStudentId: e.target.value,
                      })
                    }
                    disabled={loading}
                    required
                  />
                  <FieldDescription>
                    Enter your email address or student ID
                  </FieldDescription>
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
                    placeholder="Enter your password"
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
                  <FieldDescription className="text-center mt-4">
                    Don't have an account?{" "}
                    <a
                      href="/clients/students/register"
                      className="underline underline-offset-4 hover:text-primary font-semibold"
                    >
                      Sign up
                    </a>
                  </FieldDescription>
                </Field>
              </>
            )}

            {/* Show loading state */}
            {checkingAuth && (
              <div className="text-center py-8">
                <p className="text-gray-600">Checking authentication...</p>
              </div>
            )}
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}
