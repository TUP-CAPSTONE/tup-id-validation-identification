"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
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
const STUDENTS_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_STUDENTS_COLLECTION || "students";
const REG_REQUESTS_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_REG_REQUESTS_COLLECTION || "registration_requests";

export function StudentLoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const [formData, setFormData] = useState({ emailOrStudentId: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ uid: string; firstName: string; lastName: string; email: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCheckingAuth(true);
      if (!user) {
        setCurrentUser(null);
        setCheckingAuth(false);
        return;
      }

      try {
        // Check if student's profile exists in the students collection
        const studentRef = doc(db, STUDENTS_COLLECTION, user.uid);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const sdata = studentSnap.data() as any;
          setCurrentUser({
            uid: user.uid,
            firstName: sdata.firstName || "",
            lastName: sdata.lastName || "",
            email: sdata.email || user.email || "",
          });
          router.replace("/clients/students/dashboard");
          setCheckingAuth(false);
          return;
        }

        // If no student profile, check registration requests for status
        const q = query(collection(db, REG_REQUESTS_COLLECTION), where("uid", "==", user.uid));
        const reqSnap = await getDocs(q);
        if (!reqSnap.empty) {
          const req = reqSnap.docs[0].data() as any;
          const status = (req.status || "").toString().toLowerCase();

          if (status === "approved") {
            // Admin marked approved but profile not yet created — sign out and inform user
            await signOut(auth);
            setError("Your account has been approved but your profile is not yet created. Please contact support.");
            setCheckingAuth(false);
            return;
          }

          if (status === "pending") {
            await signOut(auth);
            router.replace("/clients/students/pending");
            setCheckingAuth(false);
            return;
          }

          if (status === "rejected") {
            await signOut(auth);
            setError("Your registration request has been rejected. Please contact support.");
            setCheckingAuth(false);
            return;
          }
        }

        // Not approved, pending, or no request — sign out for safety
        await signOut(auth);
        setCheckingAuth(false);
      } catch (err) {
        console.error("Auth check error:", err);
        setCheckingAuth(false);
      }
    });

    return () => unsub();
  }, [router]);

  const resolveEmailFromId = async (val: string) => {
    const isEmail = val.includes("@");
    if (isEmail) return val;
    const q = query(collection(db, STUDENTS_COLLECTION), where("studentId", "==", val));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("No student found with that ID");
    const data = snap.docs[0].data() as any;
    return data.email;
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const email = await resolveEmailFromId(formData.emailOrStudentId.trim());
      await signInWithEmailAndPassword(auth, email, formData.password);
      // onAuthStateChanged will handle redirect
    } catch (err) {
      const e: any = err;
      if (e?.code === "auth/user-not-found") {
        setError("User not found. Please check your email/student ID or create an account.");
      } else if (e?.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (e?.code === "auth/invalid-credential") {
        setError("Invalid email/student ID or password. Please try again.");
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

  const handleContinueAsUser = () => router.push("/clients/students/dashboard");
  const handleLogoutAndLogin = async () => {
    await signOut(auth);
    setCurrentUser(null);
    router.replace("/clients/students/login");
  };

  return (
    <div className={cn("w-full bg-white", className)} {...props}>
      <div className="bg-white rounded-lg border border-red-100 shadow-md overflow-hidden">
        {/* Form Header Section */}
        <div className="bg-gradient-to-r from-red-50 to-red-25 border-b border-red-100 px-6 md:px-8 py-6">
          <h2 className="text-2xl md:text-3xl font-bold text-[#b32032] tracking-tight mb-2">Welcome Back</h2>
          <p className="text-sm text-gray-600">{currentUser && !checkingAuth ? "You are already signed in" : "Sign in to access your student account"}</p>
        </div>

        {/* Form Content */}
        <div className="px-6 md:px-8 py-8">
          <FieldGroup className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                <AlertDescription>{error}</AlertDescription>
              </div>
            )}

            {currentUser && !checkingAuth && (
              <div className="p-5 bg-green-50 rounded-lg border border-green-200 space-y-4">
                <p className="text-sm font-semibold text-green-800 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-600 mr-2"></span>
                  Currently signed in as:
                </p>
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <p className="font-semibold text-gray-900">{currentUser.firstName} {currentUser.lastName}</p>
                  <p className="text-sm text-gray-600 mt-1">{currentUser.email}</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button 
                    onClick={handleContinueAsUser} 
                    className="flex-1 bg-[#b32032] hover:bg-[#951928] text-white font-medium"
                  >
                    Continue as this user
                  </Button>
                  <Button 
                    onClick={handleLogoutAndLogin} 
                    className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
                    variant="outline"
                  >
                    Sign in differently
                  </Button>
                </div>
              </div>
            )}

            {!currentUser && !checkingAuth && (
              <>
                <div className="space-y-5">
                  <Field>
                    <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="emailOrStudentId">
                      Email or Student ID *
                    </FieldLabel>
                    <Input
                      id="emailOrStudentId"
                      type="text"
                      placeholder="student@tup.edu.ph or TUPM-22-1234"
                      value={formData.emailOrStudentId}
                      onChange={(e) => setFormData({ ...formData, emailOrStudentId: e.target.value })}
                      disabled={loading}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                      required
                    />
                    <FieldDescription className="text-xs text-gray-500 mt-1">
                      Enter your email address or student ID
                    </FieldDescription>
                  </Field>

                  <Field>
                    <div className="flex items-center justify-between mb-2">
                      <FieldLabel className="text-sm font-semibold text-gray-700" htmlFor="password">
                        Password *
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
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={loading}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                      required
                    />
                  </Field>
                </div>

                {/* Login Button */}
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading} 
                  className="w-full h-10 bg-[#b32032] hover:bg-[#951928] text-white font-semibold shadow-md hover:shadow-lg transition"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                {/* Google Login */}
                <Button 
                  variant="outline" 
                  type="button" 
                  disabled={loading} 
                  className="w-full h-10 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium transition"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </Button>

                {/* Sign Up Link */}
                <div className="text-center pt-2">
                  <FieldDescription className="text-sm text-gray-600">
                    Don't have an account? {" "}
                    <a 
                      href="/clients/students/register" 
                      className="font-semibold text-[#b32032] hover:text-[#8b1828] transition"
                    >
                      Sign up here
                    </a>
                  </FieldDescription>
                </div>
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
