"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

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

// Firestore collection constants
const USERS_COLLECTION = "users";

export function StudentLoginForm({ className, ...props }: React.ComponentProps<"div">) {
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
        // Fetch user document from users collection
        const userRef = doc(db, USERS_COLLECTION, user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // User not found in users collection - sign out
          await signOut(auth);
          setError("User account not found. Please contact support.");
          setCheckingAuth(false);
          return;
        }

        const userData = userSnap.data();
        
        // Role Guard: Check if role is "student"
        if (userData.role !== "student") {
          // Immediately sign out if role is not student
          await signOut(auth);
          setError("Unauthorized Access: This login is for students only.");
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
      // Credentials: email as username, tup_id as password
      // But we're using email/password authentication, so we expect:
      // - formData.email to be the user's email
      // - formData.password to be their TUP ID (used as password)
      
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email.trim(), 
        formData.password
      );
      
      const user = userCredential.user;

      // Fetch user from users collection
      const userRef = doc(db, USERS_COLLECTION, user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await signOut(auth);
        setError("User account not found. Please contact support.");
        setLoading(false);
        return;
      }

      const userData = userSnap.data();

      // Role Guard: Validate role === "student"
      if (userData.role !== "student") {
        await signOut(auth);
        setError("Unauthorized Access: This login is for students only.");
        setLoading(false);
        return;
      }

      // If role is student, onAuthStateChanged will handle redirect
      
    } catch (err) {
      const e: any = err;
      if (e?.code === "auth/user-not-found") {
        setError("User not found. Please check your credentials.");
      } else if (e?.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (e?.code === "auth/invalid-credential") {
        setError("Invalid credentials. Please try again.");
      } else if (e?.code === "auth/user-disabled") {
        setError("Your account has been disabled. Contact support.");
      } else if (e?.code === "auth/too-many-requests") {
        setError("Too many login attempts. Please try again later.");
      } else if (e?.code === "auth/network-request-failed") {
        setError("Network error. Please check your connection.");
      } else {
        setError(e?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle redirect
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

  // Removed "Continue as this user" actions to avoid showing
  // extra prompts when already authenticated.

  return (
    <div className={cn("w-full bg-white", className)} {...props}>
      <div className="bg-white rounded-lg border border-red-100 shadow-md overflow-hidden">
        {/* Form Header Section */}
        <div className="bg-gradient-to-r from-red-50 to-red-25 border-b border-red-100 px-6 md:px-8 py-6">
          <h2 className="text-2xl md:text-3xl font-bold text-[#b32032] tracking-tight mb-2">Student Login</h2>
          <p className="text-sm text-gray-600">Sign in to access your student account</p>
        </div>

        {/* Form Content */}
        <div className="px-6 md:px-8 py-8">
          <FieldGroup className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                <AlertDescription>{error}</AlertDescription>
              </div>
            )}

            {!checkingAuth && (
              <>
                <div className="space-y-5">
                  <Field>
                    <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="email">
                      Email *
                    </FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@tup.edu.ph"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={loading}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                      required
                    />
                    <FieldDescription className="text-xs text-gray-500 mt-1">
                      Enter your registered email address
                    </FieldDescription>
                  </Field>

                  <Field>
                    <div className="flex items-center justify-between mb-2">
                      <FieldLabel className="text-sm font-semibold text-gray-700" htmlFor="password">
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
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={loading}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                      required
                    />
                    <FieldDescription className="text-xs text-gray-500 mt-1">
                      Use your TUP ID as your password (e.g., TUPM-22-1234)
                    </FieldDescription>
                  </Field>
                </div>

                {/* Login Button */}
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || googleLoading} 
                  className="w-full h-10 bg-[#b32032] hover:bg-[#951928] text-white font-semibold shadow-md hover:shadow-lg transition"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative bg-white px-2 text-center text-sm text-gray-500">
                    Or continue with
                  </div>
                </div>

                {/* Google Login */}
                <Button 
                  variant="outline" 
                  type="button" 
                  disabled={loading || googleLoading} 
                  className="w-full" 
                  onClick={handleGoogleLogin}
                >
                  {googleLoading ? "Signing in with Google..." : "Login with Google"}
                </Button>

                <FieldDescription className="text-center mt-4">
                  Don't have an account?{" "}
                  <a href="/clients/students/register" className="font-semibold text-[#b32032] hover:text-[#8b1828] transition">
                    Sign up
                  </a>
                </FieldDescription>
              </>
            )}

            {checkingAuth && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b32032] mb-4"></div>
                <p className="text-gray-600 text-sm">Checking authentication...</p>
              </div>
            )}
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}
