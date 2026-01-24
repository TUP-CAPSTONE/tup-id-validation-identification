"use client";

import { auth, db } from "@/lib/firebaseConfig";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
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
    email: "",
    guardianEmail: "",
    studentId: "",
    birthDate: "",
    address: "",
    course: "",
    yearLevel: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  const inputClass = "h-10 w-full rounded-sm border border-gray-300 bg-gray-100 px-3 shadow-[0_1px_2px_rgba(0,0,0,0.12)] focus:outline-none focus:ring-2 focus:ring-[#b32032]";
  const selectClass = "h-10 w-full rounded-sm border border-gray-300 bg-gray-100 px-3 py-2 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.12)] focus:outline-none focus:ring-2 focus:ring-[#b32032]";

  useEffect(() => {
    setCurrentTime(formatDateTime());
    const interval = setInterval(() => setCurrentTime(formatDateTime()), 1000);
    return () => clearInterval(interval);
  }, []);
  

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
        birthDate: formData.birthDate || null,
        address: formData.address || null,
        createdAt: serverTimestamp(),
      });

      // Send verification email
      await sendEmailVerification(user);

      setSuccess("Registration submitted. Check your email for verification. Your account will be activated after admin approval.");

      // clear form
      setFormData({
        fullName: "",
        email: "",
        guardianEmail: "",
        studentId: "",
        birthDate: "",
        address: "",
        course: "",
        yearLevel: "",
        password: "",
        confirmPassword: "",
      });

    } catch (err) {
      const e: any = err;
      setError(e?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

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

            {/* Personal Information Section */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#b32032] mb-4 flex items-center">
                <span className="w-1 h-1 rounded-full bg-[#b32032] mr-3"></span>
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="fullName">Full Name *</FieldLabel>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Juan Dela Cruz"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    disabled={loading}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="birthDate">Date of Birth *</FieldLabel>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    disabled={loading}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  />
                </Field>

                <Field className="md:col-span-2">
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="address">Address *</FieldLabel>
                  <Input
                    id="address"
                    type="text"
                    placeholder="Street, City, Province"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={loading}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  />
                </Field>
              </div>
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

            {/* Contact Information Section */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#b32032] mb-4 flex items-center">
                <span className="w-1 h-1 rounded-full bg-[#b32032] mr-3"></span>
                Contact Information
              </h3>
              <div className="space-y-5">
                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="email">Email *</FieldLabel>
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
                </Field>

                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="guardianEmail">Guardian Email <span className="text-gray-400 font-normal">(Optional)</span></FieldLabel>
                  <Input
                    id="guardianEmail"
                    type="email"
                    placeholder="guardian@email.com"
                    value={formData.guardianEmail}
                    onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                    disabled={loading}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                  />
                </Field>
              </div>
            </div>

            {/* Security Information Section */}
            <div className="pt-2 border-t border-gray-200">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#b32032] mb-4 flex items-center">
                <span className="w-1 h-1 rounded-full bg-[#b32032] mr-3"></span>
                Security Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="password">Password *</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={loading}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  />
                  <FieldDescription className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="confirmPassword">Confirm Password *</FieldLabel>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    disabled={loading}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  />
                </Field>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <FieldDescription className="text-sm text-gray-600">
                Already have an account? {" "}
                <a
                  href="/clients/students/login"
                  className="font-semibold text-[#b32032] hover:text-[#8b1828] transition"
                >
                  Login here
                </a>
              </FieldDescription>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-[#b32032] hover:bg-[#951928] px-8 py-2 text-base font-semibold text-white shadow-md hover:shadow-lg transition"
              >
                {loading ? "Submitting..." : "Register"}
              </Button>
            </div>
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}

