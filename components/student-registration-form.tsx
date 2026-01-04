"use client";

import { auth, db } from "@/lib/firebaseConfig";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs, addDoc } from "firebase/firestore";

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
  const STUDENTS_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_STUDENTS_COLLECTION || "students";
  const REG_REQUESTS_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_REG_REQUESTS_COLLECTION || "registration_requests";
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    studentId: "",
    phone: "",
    password: "",
    confirmPassword: "",
    // optional fields used for registration requests
    course: "",
    section: "",
    yearLevel: "",
    remarks: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    // Validation
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.studentId ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.course ||
      !formData.section ||
      !formData.yearLevel
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

      // Create Auth user now (account will exist but access is gated by 'students' status)
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // set display name
      await updateProfile(user, { displayName: `${formData.firstName} ${formData.lastName}` });

      // Create Firestore profile doc (uid as doc id) with pending status
      await setDoc(doc(db, STUDENTS_COLLECTION, user.uid), {
        uid: user.uid,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        studentId: formData.studentId,
        phone: formData.phone || null,
        status: "pending",
        course: formData.course || null,
        section: formData.section || null,
        yearLevel: formData.yearLevel ? Number(formData.yearLevel) : null,
        createdAt: serverTimestamp(),
      });

      // Create registration request document (admin will approve later)
      await addDoc(collection(db, REG_REQUESTS_COLLECTION), {
        uid: user.uid,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        studentNumber: formData.studentId,
        phone: formData.phone || null,
        requestedAt: serverTimestamp(),
        status: "Pending",
        course: formData.course || null,
        section: formData.section || null,
        yearLevel: formData.yearLevel ? Number(formData.yearLevel) : null,
        remarks: formData.remarks || null,
        reviewBy: null,
      });

      // Send verification email
      await sendEmailVerification(user);

      // Sign out immediately so user cannot access gated areas until admin approves
      await signOut(auth);

      setSuccess("Registration submitted. Check your email for verification. Your account will be activated after admin approval.");

    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-bold">
            Student Registration</CardTitle>
          <CardDescription>
            Create your student account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-4">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="firstName">First Name</FieldLabel>
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
                <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
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
              <FieldLabel htmlFor="email">Email</FieldLabel>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field>
                <FieldLabel htmlFor="course">Course</FieldLabel>
                <Input
                  id="course"
                  type="text"
                  placeholder="BSCS"
                  value={formData.course}
                  onChange={(e) =>
                    setFormData({ ...formData, course: e.target.value })
                  }
                  disabled={loading}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="section">Section</FieldLabel>
                <Input
                  id="section"
                  type="text"
                  placeholder="A"
                  value={formData.section}
                  onChange={(e) =>
                    setFormData({ ...formData, section: e.target.value })
                  }
                  disabled={loading}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="yearLevel">Year Level</FieldLabel>
                <Input
                  id="yearLevel"
                  type="number"
                  min={1}
                  max={6}
                  placeholder="3"
                  value={formData.yearLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, yearLevel: e.target.value })
                  }
                  disabled={loading}
                  required
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
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
              <FieldDescription>
                Must be at least 8 characters long
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
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
              <FieldDescription className="text-center">
                Already have an account?{" "}
                <a href="/clients/students/login" className="underline underline-offset-4 hover:text-primary">
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

