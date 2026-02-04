"use client";

import { auth, db } from "@/lib/firebaseConfig";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs } from "firebase/firestore";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function StudentRegistrationForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

  const REG_REQUESTS_COLLECTION = "registration_requests";
  const formatDateTime = () => {
    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    const datePart = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const timePart = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
    return `${dayName} | ${datePart} | ${timePart}`;
  };

  const [formData, setFormData] = useState({
    name: "",
    tup_id: "",
    bday: "",
    student_email: "",
    student_phone_num: "",
    guardian_email: "",
    guardian_phone_number: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingGuardianEmail, setValidatingGuardianEmail] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleForm, setShowGoogleForm] = useState(false);
  const [googleUserData, setGoogleUserData] = useState<{ uid: string; email: string; displayName: string } | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCodes, setVerificationCodes] = useState({ student: "", guardian: "" });
  const [sentCodes, setSentCodes] = useState({ student: "", guardian: "" });
  const [sendingCodes, setSendingCodes] = useState(false);
  
  // Guardian email validation function
  const validateGuardianEmail = async (email: string): Promise<boolean> => {
    if (!email || !email.includes("@")) return false;
    
    setValidatingGuardianEmail(true);
    try {
      // Basic format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return false;
      }

      // Additional validation: Check if domain exists (basic check)
      // For production, you might want to use an email validation API
      const domain = email.split('@')[1];
      const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'tup.edu.ph'];
      
      // For now, we'll accept common domains or any .edu.ph domain
      const isValid = commonDomains.includes(domain.toLowerCase()) || domain.toLowerCase().endsWith('.edu.ph');
      
      return isValid;
    } catch (err) {
      console.error("Guardian email validation error:", err);
      return false;
    } finally {
      setValidatingGuardianEmail(false);
    }
  };

  const sendVerificationCodes = async () => {
    setError("");
    setSendingCodes(true);

    // Validation
    if (
      !formData.name ||
      !formData.tup_id ||
      !formData.bday ||
      !formData.student_email ||
      !formData.student_phone_num ||
      !formData.guardian_email ||
      !formData.guardian_phone_number
    ) {
      setError("Please fill in all required fields");
      setSendingCodes(false);
      return;
    }

    // Validate guardian email format
    const isGuardianEmailValid = await validateGuardianEmail(formData.guardian_email);
    if (!isGuardianEmailValid) {
      setError("Guardian email is invalid or not recognized. Please use a valid email address.");
      setSendingCodes(false);
      return;
    }

    try {
      // Send verification codes to both emails
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: formData.student_email,
          guardianEmail: formData.guardian_email,
          studentName: formData.name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification codes');
      }

      // Store codes for verification (in production, codes should be stored server-side)
      setSentCodes({ student: data.studentCode, guardian: data.guardianCode });
      setShowVerification(true);
      setSuccess("Verification codes sent! Please check both email inboxes.");

    } catch (err: any) {
      setError(err?.message || "Failed to send verification codes. Please check if the emails are valid.");
    } finally {
      setSendingCodes(false);
    }
  };

  const verifyCodesAndSubmit = async () => {
    setError("");
    setLoading(true);

    // Verify codes
    if (verificationCodes.student !== sentCodes.student || verificationCodes.guardian !== sentCodes.guardian) {
      setError("Invalid verification codes. Please check your emails and try again.");
      setLoading(false);
      return;
    }

    try {
      // Check if TUP ID already exists in registration_requests
      const qReqs = query(
        collection(db, REG_REQUESTS_COLLECTION), 
        where("tup_id", "==", formData.tup_id)
      );
      const snapReqs = await getDocs(qReqs);
      if (!snapReqs.empty) {
        throw new Error("This TUP ID is already registered. Contact admin if this is a mistake.");
      }

      // Use TUP ID as document ID and save registration data (no auth account creation)
      await setDoc(doc(db, REG_REQUESTS_COLLECTION, formData.tup_id), {
        name: formData.name,
        tup_id: formData.tup_id,
        bday: formData.bday,
        student_email: formData.student_email,
        student_phone_num: formData.student_phone_num,
        guardian_email: formData.guardian_email,
        guardian_phone_number: formData.guardian_phone_number,
        createdAt: serverTimestamp(),
        status: "pending",
        emailsVerified: true
      });

      setSuccess("Registration submitted successfully! Your emails have been verified and your information has been saved. You will be notified once your account is approved.");

      // Clear form
      setFormData({
        name: "",
        tup_id: "",
        bday: "",
        student_email: "",
        student_phone_num: "",
        guardian_email: "",
        guardian_phone_number: "",
      });
      setShowVerification(false);
      setVerificationCodes({ student: "", guardian: "" });
      setSentCodes({ student: "", guardian: "" });

    } catch (err) {
      const e: any = err;
      setError(e?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    // Validation
    if (
      !formData.name ||
      !formData.tup_id ||
      !formData.bday ||
      !formData.student_email ||
      !formData.student_phone_num ||
      !formData.guardian_email ||
      !formData.guardian_phone_number
    ) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    // Validate guardian email
    const isGuardianEmailValid = await validateGuardianEmail(formData.guardian_email);
    if (!isGuardianEmailValid) {
      setError("Guardian email is invalid or not recognized. Please use a valid email address.");
      setLoading(false);
      return;
    }

    try {
      // Check if TUP ID already exists in registration_requests
      const qReqs = query(
        collection(db, REG_REQUESTS_COLLECTION), 
        where("tup_id", "==", formData.tup_id)
      );
      const snapReqs = await getDocs(qReqs);
      if (!snapReqs.empty) {
        throw new Error("This TUP ID is already registered. Contact admin if this is a mistake.");
      }

      // Use TUP ID as document ID and save registration data (no auth account creation)
      await setDoc(doc(db, REG_REQUESTS_COLLECTION, formData.tup_id), {
        name: formData.name,
        tup_id: formData.tup_id,
        bday: formData.bday,
        student_email: formData.student_email,
        student_phone_num: formData.student_phone_num,
        guardian_email: formData.guardian_email,
        guardian_phone_number: formData.guardian_phone_number,
        createdAt: serverTimestamp(),
        status: "pending",
      });

      setSuccess("Registration submitted successfully! Your information has been saved. You will be notified once your account is approved.");
      setShowSuccessDialog(true);

      // Clear form
      setFormData({
        name: "",
        tup_id: "",
        bday: "",
        student_email: "",
        student_phone_num: "",
        guardian_email: "",
        guardian_phone_number: "",
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

      // Store Google user data and show additional fields form
      setGoogleUserData({
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || ""
      });
      setFormData({
        ...formData,
        student_email: user.email || "",
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
    if (!formData.name || !formData.tup_id || !formData.bday || !formData.guardian_email || !formData.guardian_phone_number) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    // Validate guardian email
    const isGuardianEmailValid = await validateGuardianEmail(formData.guardian_email);
    if (!isGuardianEmailValid) {
      setError("Guardian email is invalid or not recognized. Please use a valid email address.");
      setLoading(false);
      return;
    }

    try {
      // Check if TUP ID already exists
      const qReqs = query(
        collection(db, REG_REQUESTS_COLLECTION), 
        where("tup_id", "==", formData.tup_id)
      );
      const snapReqs = await getDocs(qReqs);
      if (!snapReqs.empty) {
        throw new Error("This TUP ID is already registered. Contact admin if this is a mistake.");
      }

      // Save to registration_requests using TUP ID as document ID
      await setDoc(doc(db, REG_REQUESTS_COLLECTION, formData.tup_id), {
        name: formData.name,
        tup_id: formData.tup_id,
        bday: formData.bday,
        student_email: formData.student_email,
        student_phone_num: formData.student_phone_num,
        guardian_email: formData.guardian_email,
        guardian_phone_number: formData.guardian_phone_number,
        createdAt: serverTimestamp(),
        status: "pending",
        uid: googleUserData.uid,
        authProvider: "google"
      });

      setSuccess("Registration submitted with Google account! Your information has been saved. You will be notified once your account is approved.");
      setShowSuccessDialog(true);

      // Clear form and Google data
      setFormData({
        name: "",
        tup_id: "",
        bday: "",
        student_email: "",
        student_phone_num: "",
        guardian_email: "",
        guardian_phone_number: "",
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
    // Set initial time
    setCurrentTime(formatDateTime());
    
    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(formatDateTime());
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("w-full bg-white", className)} {...props}>
      <div className="bg-white rounded-lg border border-red-100 shadow-md overflow-hidden">
        {/* Form Header Section */}
        <div className="bg-linear-to-r from-red-50 to-red-25 border-b border-red-100 px-6 md:px-8 py-6">
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

            {showVerification && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">Email Verification Required</h3>
                <p className="text-sm text-blue-800 mb-4">
                  We've sent verification codes to both email addresses. Please enter them below to complete your registration.
                </p>
                <div className="space-y-3">
                  <Field>
                    <FieldLabel className="text-sm font-semibold text-gray-700 mb-2">
                      Student Email Verification Code
                    </FieldLabel>
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCodes.student}
                      onChange={(e) => setVerificationCodes({ ...verificationCodes, student: e.target.value })}
                      disabled={loading}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3"
                      maxLength={6}
                    />
                    <FieldDescription className="text-xs text-gray-600 mt-1">
                      Code sent to: {formData.student_email}
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel className="text-sm font-semibold text-gray-700 mb-2">
                      Guardian Email Verification Code
                    </FieldLabel>
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCodes.guardian}
                      onChange={(e) => setVerificationCodes({ ...verificationCodes, guardian: e.target.value })}
                      disabled={loading}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3"
                      maxLength={6}
                    />
                    <FieldDescription className="text-xs text-gray-600 mt-1">
                      Code sent to: {formData.guardian_email}
                    </FieldDescription>
                  </Field>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={verifyCodesAndSubmit}
                      disabled={loading || !verificationCodes.student || !verificationCodes.guardian}
                      className="flex-1 bg-[#b32032] hover:bg-[#951928]"
                    >
                      {loading ? "Verifying..." : "Verify and Complete Registration"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowVerification(false);
                        setVerificationCodes({ student: "", guardian: "" });
                        setError("");
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={sendVerificationCodes}
                    disabled={sendingCodes}
                  >
                    {sendingCodes ? "Resending..." : "Resend Codes"}
                  </Button>
                </div>
              </div>
            )}

            {showGoogleForm && googleUserData && (
              <div className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-blue-800">
                <p className="font-semibold mb-1">Signing up with Google</p>
                <p className="text-sm">{googleUserData.email}</p>
                <p className="text-xs mt-2">Please complete the required information below</p>
              </div>
            )}

            {/* Student Information */}
            <div className="space-y-5">
              <Field>
                <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="name">
                  Full Name *
                </FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="Juan Dela Cruz"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={loading || showVerification || (showGoogleForm && !!googleUserData)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="tup_id">
                  TUP ID *
                </FieldLabel>
                <Input
                  id="tup_id"
                  type="text"
                  placeholder="TUPM-22-1234"
                  value={formData.tup_id}
                  onChange={(e) => setFormData({ ...formData, tup_id: e.target.value.toUpperCase() })}
                  disabled={loading || showVerification || (showGoogleForm && !!googleUserData)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="bday">
                  Birth Date *
                </FieldLabel>
                <Input
                  id="bday"
                  type="date"
                  value={formData.bday}
                  onChange={(e) => setFormData({ ...formData, bday: e.target.value })}
                  disabled={loading || showVerification || (showGoogleForm && !!googleUserData)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="student_email">
                  Student Email *
                </FieldLabel>
                <Input
                  id="student_email"
                  type="email"
                  placeholder="student@tup.edu.ph"
                  value={formData.student_email}
                  onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                  disabled={loading || showVerification || (showGoogleForm && !!googleUserData)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="student_phone_num">
                  Student Phone Number *
                </FieldLabel>
                <Input
                  id="student_phone_num"
                  type="tel"
                  placeholder="09123456789"
                  value={formData.student_phone_num}
                  onChange={(e) => setFormData({ ...formData, student_phone_num: e.target.value })}
                  disabled={loading || showVerification || (showGoogleForm && !!googleUserData)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                  required
                />
              </Field>
            </div>

            {/* Guardian Information Section */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#b32032] mb-4 flex items-center">
                <span className="w-1 h-1 rounded-full bg-[#b32032] mr-3"></span>
                Guardian Information
              </h3>
              
              <div className="space-y-5">
                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="guardian_email">
                    Guardian Email *
                  </FieldLabel>
                  <Input
                    id="guardian_email"
                    type="email"
                    placeholder="guardian@example.com"
                    value={formData.guardian_email}
                    onChange={(e) => setFormData({ ...formData, guardian_email: e.target.value })}
                    disabled={loading || showVerification || validatingGuardianEmail}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  />
                  <FieldDescription className="text-xs text-gray-500 mt-1">
                    A verification code will be sent to this email
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="guardian_phone_number">
                    Guardian Phone Number *
                  </FieldLabel>
                  <Input
                    id="guardian_phone_number"
                    type="tel"
                    placeholder="09123456789"
                    value={formData.guardian_phone_number}
                    onChange={(e) => setFormData({ ...formData, guardian_phone_number: e.target.value })}
                    disabled={loading || showVerification || (showGoogleForm && !!googleUserData)}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  />
                </Field>
              </div>
            </div>

            <Field>
              {!showGoogleForm && !showVerification ? (
                <>
                  <Button
                    onClick={sendVerificationCodes}
                    disabled={loading || googleLoading || sendingCodes}
                    className="w-full bg-[#b32032] hover:bg-[#951928]"
                  >
                    {sendingCodes ? "Sending Codes..." : "Send Verification Codes"}
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
              ) : showGoogleForm ? (
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
                        name: "",
                        tup_id: "",
                        bday: "",
                        student_email: "",
                        student_phone_num: "",
                        guardian_email: "",
                        guardian_phone_number: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : null}
              
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

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#b32032]">
              Thank you for registering!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-base text-gray-700">
            <p>
              Your registration request has been received. Your account is now
              waiting for approval by the administrator.
            </p>
            <p>
              Please check your email for updates. You may close this window and
              wait for confirmation.
            </p>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowSuccessDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

