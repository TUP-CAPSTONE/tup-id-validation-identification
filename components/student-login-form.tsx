"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AlertDescription } from "@/components/ui/alert";

// Firestore collection constants
const USERS_COLLECTION = "users";

export function StudentLoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCheckingAuth(true);
      if (!user) {
        setCheckingAuth(false);
        return;
      }

      try {
        // Fetch user document from users collection (doc id is TUPID)
        let userData: any = null;
        const userQuery = query(
          collection(db, USERS_COLLECTION),
          where("uid", "==", user.uid),
        );
        const userSnap = await getDocs(userQuery);

        if (!userSnap.empty) {
          userData = userSnap.docs[0].data();
        } else {
          // Fallback for older records that used UID as document id
          const legacyRef = doc(db, USERS_COLLECTION, user.uid);
          const legacySnap = await getDoc(legacyRef);
          if (legacySnap.exists()) {
            userData = legacySnap.data();
          }
        }

        if (!userData) {
          // User not found in users collection - sign out
          await signOut(auth);
          setError("User account not found. Please contact support.");
          setCheckingAuth(false);
          return;
        }

        // Role Guard: Check if role is "student"
        if (userData.role !== "student") {
          // Immediately sign out if role is not student
          await signOut(auth);
          setError("Unauthorized Access: This login is for students only.");
          setCheckingAuth(false);
          return;
        }

        // Account Status Check
        if (userData.accountStatus === "disabled") {
          await signOut(auth);
          setError(
            "This account is disabled. Contact the Admin for more information.",
          );
          setCheckingAuth(false);
          return;
        }

        // Role is student - allow access and redirect to dashboard
        router.replace("/clients/students/dashboard");
        setCheckingAuth(false);
      } catch (err) {
        console.error("Auth check error:", err);
        await signOut(auth);
        setError("An error occurred during authentication. Please try again.");
        setCheckingAuth(false);
      }
    });

    return () => unsub();
  }, [router]);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      // First, authenticate with Firebase on the client side
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password,
      );

      const user = userCredential.user;

      // Then validate user role and status via API
      const response = await fetch("/api/student/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Sign out if validation fails
        await signOut(auth);
        setError(data.error || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // If validation successful, onAuthStateChanged will handle redirect
    } catch (err: any) {
      console.error("Login error:", err);
      
      // Handle Firebase Auth errors
      if (err?.code === "auth/user-not-found") {
        setError("User not found. Please check your credentials.");
      } else if (err?.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (err?.code === "auth/invalid-credential") {
        setError("Invalid credentials. Please try again.");
      } else if (err?.code === "auth/user-disabled") {
        setError("Your account has been disabled. Contact support.");
      } else if (err?.code === "auth/too-many-requests") {
        setError("Too many login attempts. Please try again later.");
      } else if (err?.code === "auth/network-request-failed") {
        setError("Network error. Please check your connection.");
      } else {
        setError(err?.message || "Login failed. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Validate user role and status via API
      const response = await fetch("/api/student/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Sign out if validation fails
        await signOut(auth);
        setError(data.error || "Google sign-in failed. Please try again.");
        setGoogleLoading(false);
        return;
      }

      // If validation successful, onAuthStateChanged will handle redirect
    } catch (err) {
      const e: any = err;
      if (e?.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled. Please try again.");
      } else if (e?.code === "auth/popup-blocked") {
        setError("Pop-up blocked. Please allow pop-ups for this site.");
      } else if (e?.code === "auth/cancelled-popup-request") {
        setError("");
      } else {
        setError(e?.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className={cn("w-full bg-white", className)} {...props}>
      {/* Warning Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-500 mt-0.5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-semibold text-amber-800 mb-1">
              Demonstration System Notice
            </h3>
            <p className="text-sm text-amber-700">
              This system is for <strong>thesis demonstration purposes only</strong>. 
              Please <strong>do not register or login with any important, confidential, or 
              sensitive personal information</strong>. Use test data only.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-red-100 shadow-md overflow-hidden">
        {/* Form Header Section */}
        <div className="bg-linear-to-r from-red-50 to-red-25 border-b border-red-100 px-6 md:px-8 py-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#b32032] tracking-tight mb-2">
            Student Login
          </h2>
          <p className="text-sm text-gray-600">
            Sign in to access your student account
          </p>
        </div>

        {/* Form Content */}
        <div className="px-6 md:px-8 py-8">
          <FieldGroup className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium mb-6">
                <AlertDescription>{error}</AlertDescription>
              </div>
            )}

            {!checkingAuth && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                className="space-y-6"
              >
                {/* Email Field */}
                <Field>
                  <FieldLabel
                    className="text-sm font-semibold text-gray-700 mb-2 block"
                    htmlFor="email"
                  >
                    Email *
                  </FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@tup.edu.ph"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={loading}
                    className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  />
                  <FieldDescription className="text-xs text-gray-500 mt-1.5">
                    Enter your registered email address
                  </FieldDescription>
                </Field>

                {/* Password Field */}
                <Field>
                  <div className="flex items-center justify-between mb-2">
                    <FieldLabel
                      className="text-sm font-semibold text-gray-700"
                      htmlFor="password"
                    >
                      Password (TUP ID) *
                    </FieldLabel>
                    <a
                      href="/clients/students/forgot"
                      className="text-xs font-medium text-[#b32032] hover:text-[#8b1828] transition"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your TUP ID"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    disabled={loading}
                    className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  />
                  <FieldDescription className="text-xs text-gray-500 mt-1.5">
                    Use your TUP ID as your password (e.g., TUPM-22-1234)
                  </FieldDescription>
                </Field>

                {/* Login Button */}
                <Button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full h-11 bg-[#b32032] hover:bg-[#951928] text-white font-semibold shadow-md hover:shadow-lg transition mt-8"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>

                {/* Divider */}
                <div className="relative mb-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 text-gray-500">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Google Login */}
                <Button
                  variant="outline"
                  type="button"
                  disabled={loading || googleLoading}
                  className="w-full h-11"
                  onClick={handleGoogleLogin}
                >
                  {googleLoading
                    ? "Signing in with Google..."
                    : "Login with Google"}
                </Button>

                {/* Sign up link */}
                <p className="text-center text-sm text-gray-600 mt-6">
                  Don't have an account?{" "}
                  <a
                    href="/clients/students/register"
                    className="font-semibold text-[#b32032] hover:text-[#8b1828] transition"
                  >
                    Sign up
                  </a>
                </p>
              </form>
            )}

            {checkingAuth && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#b32032] mb-4"></div>
                <p className="text-gray-600 text-sm">
                  Checking authentication...
                </p>
              </div>
            )}
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}