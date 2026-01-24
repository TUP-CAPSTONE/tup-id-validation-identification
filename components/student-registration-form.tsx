"use client";

import { auth, db } from "@/lib/firebaseConfig";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs, getDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

  const STUDENTS_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_STUDENTS_COLLECTION || "students";
  const REG_REQUESTS_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_REG_REQUESTS_COLLECTION || "registration_requests";
  const formatDateTime = () => {
    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    const datePart = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const timePart = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
    return `${dayName} | ${datePart} | ${timePart}`;
  };

  const [formData, setFormData] = useState({
    fullName: "",
    firstName: "",
    lastName: "",
    email: "",
    guardianEmail: "",
    studentId: "",
    birthDate: "",
    address: "",
    course: "",
    section: "",
    yearLevel: "",
    phone: "",
    password: "",
    confirmPassword: "",
    remarks: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleForm, setShowGoogleForm] = useState(false);
  const [googleUserData, setGoogleUserData] = useState<{ uid: string; email: string; displayName: string } | null>(null);
  

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    // Validation
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.studentId ||
      !formData.birthDate ||
      !formData.address ||
      !formData.yearLevel ||
      !formData.course ||
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
      const [derivedFirstName, ...restName] = formData.fullName.trim().split(/\s+/);
      const derivedLastName = restName.join(" ");

      // OPTIONAL: check if student already exists in students collection
      const qStudents = query(collection(db, STUDENTS_COLLECTION), where("studentId", "==", formData.studentId));
      const snapStudents = await getDocs(qStudents);
      if (!snapStudents.empty) {
        throw new Error("This Student ID is already registered. Contact admin if this is a mistake.");
      }

      // OPTIONAL: check for existing registration requests for same studentNumber
      const qReqs = query(collection(db, REG_REQUESTS_COLLECTION), where("studentNumber", "==", formData.studentId));
      const snapReqs = await getDocs(qReqs);
      if (!snapReqs.empty) {
        // if any existing request is Pending or Approved, block duplicate
        const existing = snapReqs.docs.map(d => d.data());
        const hasActive = existing.some((r: any) => r.status === "Pending" || r.status === "Approved");
        if (hasActive) throw new Error("A registration request for this Student ID already exists.");
      }

      // Create Auth user now (account will exist but access is gated by admin approval)
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Optional: set display name
      await updateProfile(user, { displayName: formData.fullName.trim() });

      // Create registration request in registration_requests collection
      await setDoc(doc(db, REG_REQUESTS_COLLECTION, user.uid), {
        uid: user.uid,
        email: formData.email,
        guardianEmail: formData.guardianEmail || null,
        firstName: derivedFirstName,
        lastName: derivedLastName || null,
        studentNumber: formData.studentId,
        status: "Pending",
        course: formData.course || null,
        yearLevel: formData.yearLevel ? Number(formData.yearLevel) : null,
        remarks: null,
        reviewBy: null,
        createdAt: serverTimestamp(),
      });

      // Send verification email
      await sendEmailVerification(user);

      setSuccess("Registration submitted. Check your email for verification. Your account will be activated after admin approval.");

      // clear form
      setFormData({
        fullName: "",
        firstName: "",
        lastName: "",
        email: "",
        guardianEmail: "",
        studentId: "",
        birthDate: "",
        address: "",
        course: "",
        section: "",
        yearLevel: "",
        phone: "",
        password: "",
        confirmPassword: "",
        remarks: "",
      });

    } catch (err) {
      const e: any = err;
      setError(e?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already has a student profile
      const studentRef = doc(db, STUDENTS_COLLECTION, user.uid);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        setError("This Google account is already registered. Please use the login page.");
        await user.delete(); // Remove the auth user since they should login instead
        return;
      }

      // Check if registration request already exists
      const qReqs = query(collection(db, REG_REQUESTS_COLLECTION), where("uid", "==", user.uid));
      const snapReqs = await getDocs(qReqs);
      if (!snapReqs.empty) {
        setError("A registration request for this Google account already exists. Please wait for admin approval.");
        return;
      }

      // Extract names from display name
      // For multiple names, put first two parts in firstName, rest in lastName
      const nameParts = (user.displayName || "").split(" ").filter(part => part.trim());
      let firstName = "";
      let lastName = "";
      
      if (nameParts.length === 1) {
        firstName = nameParts[0];
      } else if (nameParts.length === 2) {
        firstName = nameParts[0];
        lastName = nameParts[1];
      } else {
        // 3+ parts: first two go to firstName, rest to lastName
        firstName = nameParts.slice(0, 2).join(" ");
        lastName = nameParts.slice(2).join(" ");
      }

      // Store Google user data and show additional fields form
      setGoogleUserData({
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || ""
      });
      setFormData({
        ...formData,
        firstName,
        lastName,
        email: user.email || "",
        password: "",
        confirmPassword: ""
      });
      setShowGoogleForm(true);

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

  const handleGoogleFormSubmit = async () => {
    if (!googleUserData) return;

    setError("");
    setLoading(true);

    // Validation for Google registration
    if (!formData.firstName || !formData.lastName || !formData.studentId) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    try {
      // Check if student ID already exists
      const qStudents = query(collection(db, STUDENTS_COLLECTION), where("studentId", "==", formData.studentId));
      const snapStudents = await getDocs(qStudents);
      if (!snapStudents.empty) {
        throw new Error("This Student ID is already registered. Contact admin if this is a mistake.");
      }

      // Check for existing registration requests with same studentNumber
      const qReqs = query(collection(db, REG_REQUESTS_COLLECTION), where("studentNumber", "==", formData.studentId));
      const snapReqs = await getDocs(qReqs);
      if (!snapReqs.empty) {
        const existing = snapReqs.docs.map(d => d.data());
        const hasActive = existing.some((r: any) => r.status === "Pending" || r.status === "Approved");
        if (hasActive) throw new Error("A registration request for this Student ID already exists.");
      }

      // Update profile
      await updateProfile(auth.currentUser!, { displayName: `${formData.firstName} ${formData.lastName}` });

      // Create registration request
      await setDoc(doc(db, REG_REQUESTS_COLLECTION, googleUserData.uid), {
        uid: googleUserData.uid,
        email: googleUserData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        studentNumber: formData.studentId,
        phone: formData.phone || null,
        status: "Pending",
        course: formData.course || null,
        section: formData.section || null,
        yearLevel: formData.yearLevel ? Number(formData.yearLevel) : null,
        remarks: null,
        reviewBy: null,
        createdAt: serverTimestamp(),
        authProvider: "google"
      });

      setSuccess("Registration submitted with Google account. Your account will be activated after admin approval.");

      // Clear form and Google data
      setFormData({
        fullName: "",
        firstName: "",
        lastName: "",
        email: "",
        guardianEmail: "",
        studentId: "",
        birthDate: "",
        address: "",
        course: "",
        section: "",
        yearLevel: "",
        phone: "",
        password: "",
        confirmPassword: "",
        remarks: "",
      });
      setShowGoogleForm(false);
      setGoogleUserData(null);

    } catch (err) {
      const e: any = err;
      setError(e?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    setCurrentTime(formatDateTime());
  }, []);

  return (
    <div className={cn("w-full bg-white", className)} {...props}>
      <div className="bg-white rounded-lg border border-red-100 shadow-md overflow-hidden">
        {/* Form Header Section */}
        <div className="bg-gradient-to-r from-red-50 to-red-25 border-b border-red-100 px-6 md:px-8 py-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#b32032] tracking-tight mb-2">Create Your Account</h2>
              <p className="text-sm text-gray-600">Fill in your information below to register as a student</p>
            </div>
            <div className="text-right whitespace-nowrap">
              <p className="text-sm font-semibold text-[#b32032]">{currentTime}</p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-6 md:px-8 py-8">
          <FieldGroup className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                <AlertDescription>{error}</AlertDescription>
              </div>
            )}

            {success && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm font-medium">{success}</div>
            )}

            {showGoogleForm && googleUserData && (
              <div className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-blue-800">
                <p className="font-semibold mb-1">Signing up with Google</p>
                <p className="text-sm">{googleUserData.email}</p>
                <p className="text-xs mt-2">Please complete the required information below</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  disabled={loading || (showGoogleForm && !!googleUserData)}
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
                  disabled={loading || (showGoogleForm && !!googleUserData)}
                  required
                />
              </Field>
            </div>

            {/* Academic Information Section */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#b32032] mb-4 flex items-center">
                <span className="w-1 h-1 rounded-full bg-[#b32032] mr-3"></span>
                Academic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="studentId">TUP-ID *</FieldLabel>
                  <Input
                    id="studentId"
                    type="text"
                    placeholder="TUPM-22-1234"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value.toUpperCase() })}
                    disabled={loading}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="course">Course *</FieldLabel>
                  <select
                    id="course"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    disabled={loading}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  >
                    <option value="" disabled>
                      Select course
                    </option>
                    {[
                      "BSCS",
                      "BSIT",
                      "BSECE",
                      "BSEE",
                      "BSME",
                      "BSCE",
                    ].map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="yearLevel">Year Level *</FieldLabel>
                  <select
                    id="yearLevel"
                    value={formData.yearLevel}
                    onChange={(e) => setFormData({ ...formData, yearLevel: e.target.value })}
                    disabled={loading}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  >
                    <option value="" disabled>
                      Select year level
                    </option>
                    {["1", "2", "3", "4", "5"].map((year) => (
                      <option key={year} value={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {!showGoogleForm && (
              <>
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
                  <FieldLabel htmlFor="confirmPassword">
                    Confirm Password
                  </FieldLabel>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    disabled={loading}
                    required
                  />
                </Field>
              </>
            )}
            <Field>
              {!showGoogleForm ? (
                <>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || googleLoading}
                    className="w-full bg-[#b32032] hover:bg-[#951928]"
                  >
                    {loading ? "Creating account..." : "Register"}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={loading || googleLoading}
                    className="w-full"
                    onClick={handleGoogleRegister}
                  >
                    {googleLoading ? "Signing in with Google..." : "Register with Google"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleGoogleFormSubmit}
                    disabled={loading}
                    className="w-full bg-[#b32032] hover:bg-[#951928]"
                  >
                    {loading ? "Submitting..." : "Complete Registration"}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={loading}
                    className="w-full"
                    onClick={() => {
                      setShowGoogleForm(false);
                      setGoogleUserData(null);
                      setFormData({
                        fullName: "",
                        firstName: "",
                        lastName: "",
                        email: "",
                        guardianEmail: "",
                        studentId: "",
                        birthDate: "",
                        address: "",
                        course: "",
                        section: "",
                        yearLevel: "",
                        phone: "",
                        password: "",
                        confirmPassword: "",
                        remarks: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
              <FieldDescription className="text-center mt-4">
                Already have an account?{" "}
                <a
                  href="/clients/students/login"
                  className="font-semibold text-[#b32032] hover:text-[#8b1828] transition"
                >
                  Login here
                </a>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}

