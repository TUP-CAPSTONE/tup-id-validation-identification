"use client";

<<<<<<< HEAD
import { useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
=======
import { auth, db } from "@/lib/firebaseConfig";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, query, collection, where, getDocs, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
>>>>>>> a1693b0e2831bd91664095258bcc11ddd988d959
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
        // User is logged in, check if they're approved
        try {
          // Check if user is in students_approved
          const approvedRef = doc(db, "students_approved", user.uid);
          const approvedSnap = await getDoc(approvedRef);
          
          if (approvedSnap.exists()) {
            const data = approvedSnap.data();
            setCurrentUser({
              uid: user.uid,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              email: data.email || user.email || "",
            });
          } else {
            // Check if user is in students_pending
            const pendingRef = doc(db, "students_pending", user.uid);
            const pendingSnap = await getDoc(pendingRef);
            
            if (pendingSnap.exists()) {
              const data = pendingSnap.data();
              if (data.status === "rejected") {
                // Account is rejected, sign out
                await signOut(auth);
                setError("Your account has been rejected. Please contact support.");
              } else if (data.status === "pending") {
                // Account is pending, redirect to pending page
                router.push("/clients/students/pending");
              }
            } else {
              // User not found in either collection, sign out
              await signOut(auth);
            }
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

<<<<<<< HEAD
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
=======
      let email = formData.emailOrStudentId;

      // Check if input is email or student ID
      if (!formData.emailOrStudentId.includes("@")) {
        // It's a student ID, find the corresponding email
        console.log("Input is student ID, looking up email...");
        
        // First check students_approved
        let q = query(
          collection(db, "students_approved"),
          where("studentId", "==", formData.emailOrStudentId)
        );
        let snap = await getDocs(q);

        if (snap.empty) {
          // Check students_pending
          q = query(
            collection(db, "students_pending"),
            where("studentId", "==", formData.emailOrStudentId)
          );
          snap = await getDocs(q);
        }

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

      // Check if user is in students_approved
      const approvedRef = doc(db, "students_approved", user.uid);
      const approvedSnap = await getDoc(approvedRef);

      if (approvedSnap.exists()) {
        // User is approved, allow access
        try {
          await updateDoc(approvedRef, {
            lastLogin: new Date(),
          });
        } catch (err) {
          console.warn("Could not update last login:", err);
        }
        router.push("/clients/students/dashboard");
      } else {
        // Check if user is in students_pending
        const pendingRef = doc(db, "students_pending", user.uid);
        const pendingSnap = await getDoc(pendingRef);

        if (pendingSnap.exists()) {
          const data = pendingSnap.data();
          if (data.status === "rejected") {
            // Account is rejected
            await signOut(auth);
            throw new Error("Your account has been rejected. Please contact support.");
          } else if (data.status === "pending") {
            // Account is pending
            await signOut(auth);
            router.push("/clients/students/pending");
            return;
          }
        } else {
          // User not found in either collection
          await signOut(auth);
          throw new Error("Account not found. Please contact support.");
        }
      }

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
>>>>>>> a1693b0e2831bd91664095258bcc11ddd988d959
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
