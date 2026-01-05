"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
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
        const approvedRef = doc(db, "students_approved", user.uid);
        const approvedSnap = await getDoc(approvedRef);

        if (approvedSnap.exists()) {
          const data = approvedSnap.data() as any;
          try {
            await updateDoc(approvedRef, { lastLogin: new Date() as any });
          } catch (e) {
            // ignore update errors
          }
          setCurrentUser({ uid: user.uid, firstName: data.firstName || "", lastName: data.lastName || "", email: data.email || user.email || "" });
          router.replace("/clients/students/dashboard");
          setCheckingAuth(false);
          return;
        }

        const pendingRef = doc(db, "students_pending", user.uid);
        const pendingSnap = await getDoc(pendingRef);
        if (pendingSnap.exists()) {
          const data = pendingSnap.data() as any;
          if (data.status === "rejected") {
            await signOut(auth);
            setError("Your account has been rejected. Please contact support.");
            setCheckingAuth(false);
            return;
          }
          if (data.status === "pending") {
            await signOut(auth);
            router.replace("/clients/students/pending");
            setCheckingAuth(false);
            return;
          }
        }

        // Not approved or pending - sign out for safety
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
    const q = query(collection(db, "students"), where("studentId", "==", val));
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
      // onAuthStateChanged will redirect
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-bold">Student Login</CardTitle>
          <CardDescription>{currentUser && !checkingAuth ? "You are already signed in" : "Sign in with your email or student ID"}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {currentUser && !checkingAuth && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 mb-3"><strong>Currently signed in as:</strong></p>
                <div className="bg-white rounded p-3 mb-3">
                  <p className="font-semibold text-gray-800">{currentUser.firstName} {currentUser.lastName}</p>
                  <p className="text-sm text-gray-600">{currentUser.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleContinueAsUser} className="flex-1" variant="default">Continue as this user</Button>
                  <Button onClick={handleLogoutAndLogin} className="flex-1" variant="outline">Sign in as different user</Button>
                </div>
              </div>
            )}

            {!currentUser && !checkingAuth && (
              <>
                <Field>
                  <FieldLabel htmlFor="emailOrStudentId">Email or Student ID</FieldLabel>
                  <Input id="emailOrStudentId" type="text" placeholder="student@tup.edu.ph or TUPM-22-1234" value={formData.emailOrStudentId} onChange={(e) => setFormData({ ...formData, emailOrStudentId: e.target.value })} disabled={loading} required />
                  <FieldDescription>Enter your email address or student ID</FieldDescription>
                </Field>

                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <a href="/clients/students/forgot" className="ml-auto inline-block text-sm underline-offset-4 hover:underline">Forgot your password?</a>
                  </div>
                  <Input id="password" type="password" placeholder="Enter your password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} disabled={loading} required />
                </Field>

                <Field>
                  <Button onClick={handleSubmit} disabled={loading} className="w-full">{loading ? "Logging in..." : "Login"}</Button>
                  <Button variant="outline" type="button" disabled={loading} className="w-full">Login with Google</Button>
                  <FieldDescription className="text-center mt-4">Don't have an account? <a href="/clients/students/register" className="underline underline-offset-4 hover:text-primary font-semibold">Sign up</a></FieldDescription>
                </Field>
              </>
            )}

            {checkingAuth && (
              <div className="text-center py-8"><p className="text-gray-600">Checking authentication...</p></div>
            )}
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}

