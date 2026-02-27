"use client";

import { useState, useEffect, useRef } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { query, collection, where, getDocs } from "firebase/firestore";
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
import { FacePhotoCapture, FacePhotos } from "@/components/face-photo-capture";

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
    college: "",
    course: "",
    section: "",
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

  // ── Terms & Conditions state ──────────────────────────────────────────────
  const [showTCDialog, setShowTCDialog] = useState(false);
  const [hasScrolledTC, setHasScrolledTC] = useState(false);
  const [tcAccepted, setTcAccepted] = useState(false);
  const tcScrollRef = useRef<HTMLDivElement>(null);

  const handleTCScroll = () => {
    const el = tcScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
    if (atBottom) setHasScrolledTC(true);
  };

  const handleTCCheckboxClick = () => {
    if (tcAccepted) {
      // Allow unchecking without reopening dialog
      setTcAccepted(false);
      setHasScrolledTC(false);
      return;
    }
    // Open dialog so user must read T&C
    setHasScrolledTC(false);
    setShowTCDialog(true);
  };

  const handleAcceptTC = () => {
    setTcAccepted(true);
    setShowTCDialog(false);
  };

  const handleCloseTCDialog = () => {
    setShowTCDialog(false);
    // Don't mark accepted if they close without scrolling + clicking accept
  };
  // ─────────────────────────────────────────────────────────────────────────

  // Face photos state
  const [facePhotos, setFacePhotos] = useState<FacePhotos>({
    neutral: null,
    smile: null,
    left: null,
    right: null,
    up: null,
    down: null,
  });

  // ✅ College to Courses Mapping
  const collegeCoursesMap: { [key: string]: string[] } = {
    'COS': [
      'BS Computer Science',
      'BS Information Technology',
      'BS Information Systems',
      'BS Environmental Science',
      'BAS Laboratory Technology'
    ],
    'COE': [
      'BS Civil Engineering',
      'BS Mechanical Engineering',
      'BS Electrical Engineering',
      'BS Electronics Engineering'
    ],
    'CAFA': [
      'BS Architecture',
      'Bachelor of Fine Arts',
      'BGT - Architecture Technology',
      'BGT - Industrial Design',
      'BGT - Mechanical Drafting Technology',
    ],
    'CIE': [
      'BSIE - ICT',
      'BSIE - Home Economics',
      'BSIE - Industrial Arts',
      'BTVTE - Animation',
      'BTVTE - Automotive',
      'BTVTE - Beauty Care and Wellness',
      'BTVTE - Computer Programming',
      'BTVTE - Electrical',
      'BTVTE - Electronics',
      'BTVTE - Food Service Management',
      'BTVTE - Fashion and Garment',
      'BTVTE - Heat Ventilation and Air Conditioning',
    ],
    'CLA': [
      'BS Business Management - Industrial Management',
      'BS Entrepreneurship',
      'BS Hospitality Management',
    ],
    'CIT': [
      'BS Food Technology',
      'BET - Civil Technology',
      'BET - Electronics Technology',
      'BET - Computer Engineering Technology',
      'BET - Electronic Communication Technology',
      'BET - Instrumentation and Control Technology',
      'BET - Mechanical Technology',
      'BET - Mechatronics Technology',
      'BET - Railway Technology',
      'BET - Mechanical Engineering Technology',
      'BT - Apparel and Fashion',
      'BT - Culinary Technology',
      'BT - Print Media Technology',
    ]
  };

  const getCoursesForCollege = (): string[] => {
    if (!formData.college) return [];
    return collegeCoursesMap[formData.college] || [];
  };

  const allFacePhotosCaptured = Object.values(facePhotos).every((photo) => photo !== null);

  const validateGuardianEmail = async (email: string): Promise<boolean> => {
    if (!email || !email.includes("@")) return false;
    setValidatingGuardianEmail(true);
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return false;
      const domain = email.split('@')[1];
      const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'tup.edu.ph'];
      return commonDomains.includes(domain.toLowerCase()) || domain.toLowerCase().endsWith('.edu.ph');
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

    if (!tcAccepted) {
      setError("Please read and accept the Terms and Conditions before proceeding.");
      setSendingCodes(false);
      return;
    }

    if (
      !formData.name || !formData.tup_id || !formData.bday ||
      !formData.student_email || !formData.student_phone_num ||
      !formData.guardian_email || !formData.guardian_phone_number ||
      !formData.college || !formData.course || !formData.section
    ) {
      setError("Please fill in all required fields");
      setSendingCodes(false);
      return;
    }

    if (!allFacePhotosCaptured) {
      setError("Please capture all 6 face photos before submitting");
      setSendingCodes(false);
      return;
    }

    const isGuardianEmailValid = await validateGuardianEmail(formData.guardian_email);
    if (!isGuardianEmailValid) {
      setError("Guardian email is invalid or not recognized. Please use a valid email address.");
      setSendingCodes(false);
      return;
    }

    try {
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
      if (!response.ok) throw new Error(data.error || 'Failed to send verification codes');
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
    if (verificationCodes.student !== sentCodes.student || verificationCodes.guardian !== sentCodes.guardian) {
      setError("Invalid verification codes. Please check your emails and try again.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/student/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, facePhotos })
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) throw new Error("Too many registration attempts. Please try again later.");
        throw new Error(data.error || 'Registration failed');
      }
      setSuccess("Registration submitted successfully! Your emails have been verified and your information has been saved. You will be notified once your account is approved.");
      setShowSuccessDialog(true);
      setFormData({ name: "", tup_id: "", bday: "", student_email: "", student_phone_num: "", guardian_email: "", guardian_phone_number: "", college: "", course: "", section: "" });
      setFacePhotos({ neutral: null, smile: null, left: null, right: null, up: null, down: null });
      setShowVerification(false);
      setVerificationCodes({ student: "", guardian: "" });
      setSentCodes({ student: "", guardian: "" });
      setTcAccepted(false);
      setHasScrolledTC(false);
    } catch (err) {
      const e: any = err;
      setError(e?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (!tcAccepted) {
      setError("Please read and accept the Terms and Conditions before proceeding.");
      return;
    }
    setError("");
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      setGoogleUserData({ uid: user.uid, email: user.email || "", displayName: user.displayName || "" });
      setFormData({ ...formData, student_email: user.email || "" });
      setShowGoogleForm(true);
    } catch (err) {
      const e: any = err;
      if (e?.code === "auth/popup-closed-by-user") setError("Sign-in cancelled. Please try again.");
      else if (e?.code === "auth/popup-blocked") setError("Pop-up blocked. Please allow pop-ups for this site.");
      else if (e?.code === "auth/cancelled-popup-request") setError("");
      else setError(e?.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleFormSubmit = async () => {
    if (!googleUserData) return;
    setError("");
    setLoading(true);
    if (!formData.name || !formData.tup_id || !formData.bday || !formData.guardian_email || !formData.guardian_phone_number || !formData.college || !formData.course || !formData.section) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }
    if (!allFacePhotosCaptured) {
      setError("Please capture all 6 face photos before submitting");
      setLoading(false);
      return;
    }
    const isGuardianEmailValid = await validateGuardianEmail(formData.guardian_email);
    if (!isGuardianEmailValid) {
      setError("Guardian email is invalid or not recognized. Please use a valid email address.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/student/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, facePhotos, uid: googleUserData.uid, authProvider: "google" })
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) throw new Error("Too many registration attempts. Please try again later.");
        throw new Error(data.error || 'Registration failed');
      }
      setSuccess("Registration submitted with Google account! Your information has been saved. You will be notified once your account is approved.");
      setShowSuccessDialog(true);
      setFormData({ name: "", tup_id: "", bday: "", student_email: "", student_phone_num: "", guardian_email: "", guardian_phone_number: "", college: "", course: "", section: "" });
      setFacePhotos({ neutral: null, smile: null, left: null, right: null, up: null, down: null });
      setShowGoogleForm(false);
      setGoogleUserData(null);
      setTcAccepted(false);
      setHasScrolledTC(false);
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
    const interval = setInterval(() => setCurrentTime(formatDateTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("w-full bg-white", className)} {...props}>
      <div className="bg-white rounded-lg border border-red-100 shadow-md relative isolate">
        {/* Form Header */}
        <div className="bg-linear-to-r from-red-50 to-red-25 border-b border-red-100 px-4 md:px-8 py-4 md:py-6 relative z-50 bg-white">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4">
            <div>
              <h2 className="text-xl md:text-3xl font-bold text-[#b32032] tracking-tight mb-1 md:mb-2">Create Your Account</h2>
              <p className="text-xs md:text-sm text-gray-600">Fill in your information below to register as a student</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs md:text-sm font-semibold text-[#b32032]">{currentTime}</p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-4 md:px-8 py-4 md:py-8 relative z-0">
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
                    <FieldLabel className="text-sm font-semibold text-gray-700 mb-2">Student Email Verification Code</FieldLabel>
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCodes.student}
                      onChange={(e) => setVerificationCodes({ ...verificationCodes, student: e.target.value })}
                      disabled={loading}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3"
                      maxLength={6}
                    />
                    <FieldDescription className="text-xs text-gray-600 mt-1">Code sent to: {formData.student_email}</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel className="text-sm font-semibold text-gray-700 mb-2">Guardian Email Verification Code</FieldLabel>
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCodes.guardian}
                      onChange={(e) => setVerificationCodes({ ...verificationCodes, guardian: e.target.value })}
                      disabled={loading}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3"
                      maxLength={6}
                    />
                    <FieldDescription className="text-xs text-gray-600 mt-1">Code sent to: {formData.guardian_email}</FieldDescription>
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
                      onClick={() => { setShowVerification(false); setVerificationCodes({ student: "", guardian: "" }); setError(""); }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full" onClick={sendVerificationCodes} disabled={sendingCodes}>
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
                <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="name">Full Name *</FieldLabel>
                <Input
                  id="name" type="text" placeholder="Juan Dela Cruz"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={loading || showVerification || (showGoogleForm && !!googleUserData)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="tup_id">TUP ID *</FieldLabel>
                <Input
                  id="tup_id" type="text" placeholder="TUPM-22-1234"
                  value={formData.tup_id}
                  onChange={(e) => setFormData({ ...formData, tup_id: e.target.value.toUpperCase() })}
                  disabled={loading || showVerification || (showGoogleForm && !!googleUserData)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="bday">Birth Date *</FieldLabel>
                <Input
                  id="bday" type="date"
                  value={formData.bday}
                  onChange={(e) => setFormData({ ...formData, bday: e.target.value })}
                  disabled={loading || showVerification || (showGoogleForm && !!googleUserData)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="student_email">Student Email *</FieldLabel>
                <Input
                  id="student_email" type="email" placeholder="student@tup.edu.ph"
                  value={formData.student_email}
                  onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                  disabled={loading || showVerification || (showGoogleForm && !!googleUserData)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="student_phone_num">Student Phone Number *</FieldLabel>
                <Input
                  id="student_phone_num" type="tel" placeholder="09123456789"
                  value={formData.student_phone_num}
                  onChange={(e) => setFormData({ ...formData, student_phone_num: e.target.value })}
                  disabled={loading || showVerification || (showGoogleForm && !!googleUserData)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                  required
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="college">College *</FieldLabel>
                  <select
                    id="college"
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value, course: "" })}
                    disabled={loading || showVerification}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  >
                    <option value="">Select College</option>
                    <option value="COS">COS - College of Science</option>
                    <option value="COE">COE - College of Engineering</option>
                    <option value="CAFA">CAFA - College of Architecture and Fine Arts</option>
                    <option value="CIE">CIE - College of Industrial Education</option>
                    <option value="CLA">CLA - College of Liberal Arts</option>
                    <option value="CIT">CIT - College of Industrial Technology</option>
                  </select>
                </Field>

                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="course">Course *</FieldLabel>
                  <select
                    id="course"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    disabled={!formData.college || loading || showVerification}
                    className={`h-10 w-full rounded-md border border-gray-300 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition ${!formData.college ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                    required
                  >
                    <option value="">{!formData.college ? 'Select a college first' : 'Select Course'}</option>
                    {getCoursesForCollege().map((courseOption) => (
                      <option key={courseOption} value={courseOption}>{courseOption}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field>
                <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="section">Section *</FieldLabel>
                <select
                  id="section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  disabled={loading || showVerification}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                  required
                >
                  <option value="">Select Section</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                </select>
              </Field>
            </div>

            {/* Face Photo Capture */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#b32032] mb-4 flex items-center">
                <span className="w-1 h-1 rounded-full bg-[#b32032] mr-3"></span>
                Face Photo Verification
              </h3>
              <FacePhotoCapture photos={facePhotos} onPhotosChange={setFacePhotos} disabled={loading || showVerification} />
            </div>

            {/* Guardian Information */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#b32032] mb-4 flex items-center">
                <span className="w-1 h-1 rounded-full bg-[#b32032] mr-3"></span>
                Guardian Information
              </h3>
              <div className="space-y-5">
                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="guardian_email">Guardian Email *</FieldLabel>
                  <Input
                    id="guardian_email" type="email" placeholder="guardian@example.com"
                    value={formData.guardian_email}
                    onChange={(e) => setFormData({ ...formData, guardian_email: e.target.value })}
                    disabled={loading || showVerification || validatingGuardianEmail}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  />
                  <FieldDescription className="text-xs text-gray-500 mt-1">A verification code will be sent to this email</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel className="text-sm font-semibold text-gray-700 mb-2" htmlFor="guardian_phone_number">Guardian Phone Number *</FieldLabel>
                  <Input
                    id="guardian_phone_number" type="tel" placeholder="09123456789"
                    value={formData.guardian_phone_number}
                    onChange={(e) => setFormData({ ...formData, guardian_phone_number: e.target.value })}
                    disabled={loading || showVerification || (showGoogleForm && !!googleUserData)}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent transition"
                    required
                  />
                </Field>
              </div>
            </div>

            {/* ── Terms & Conditions Checkbox ─────────────────────────────────── */}
            <div className="pt-2">
              <div
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                  tcAccepted
                    ? "bg-green-50 border-green-300"
                    : "bg-gray-50 border-gray-200 hover:border-[#b32032]/40"
                )}
              >
                {/* Custom checkbox */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={tcAccepted}
                  onClick={handleTCCheckboxClick}
                  disabled={loading || showVerification}
                  className={cn(
                    "mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:ring-offset-1",
                    tcAccepted
                      ? "bg-[#b32032] border-[#b32032]"
                      : "bg-white border-gray-400 hover:border-[#b32032]",
                    (loading || showVerification) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {tcAccepted && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 text-sm leading-relaxed">
                  <span className="text-gray-700">I have read and agree to the </span>
                  <button
                    type="button"
                    onClick={() => { setHasScrolledTC(false); setShowTCDialog(true); }}
                    disabled={loading || showVerification}
                    className="font-semibold text-[#b32032] underline underline-offset-2 hover:text-[#8b1828] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Terms and Conditions
                  </button>
                  <span className="text-gray-700"> and </span>
                  <button
                    type="button"
                    onClick={() => { setHasScrolledTC(false); setShowTCDialog(true); }}
                    disabled={loading || showVerification}
                    className="font-semibold text-[#b32032] underline underline-offset-2 hover:text-[#8b1828] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Privacy Policy
                  </button>
                  <span className="text-red-600 font-semibold"> *</span>
                  {!tcAccepted && (
                    <p className="text-xs text-gray-500 mt-1">
                      Click the checkbox or the links above to read and accept the Terms and Conditions.
                    </p>
                  )}
                  {tcAccepted && (
                    <p className="text-xs text-green-700 mt-1 font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10.28 2.28a.75.75 0 00-1.06 0L4.5 7 2.78 5.28a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25a.75.75 0 000-1.06z"/>
                      </svg>
                      Terms and Conditions accepted
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* ────────────────────────────────────────────────────────────────── */}

            {/* Action Buttons */}
            <Field>
              {!showGoogleForm && !showVerification ? (
                <>
                  <Button
                    onClick={sendVerificationCodes}
                    disabled={loading || googleLoading || sendingCodes || !tcAccepted}
                    className={cn(
                      "w-full transition-all",
                      tcAccepted
                        ? "bg-[#b32032] hover:bg-[#951928]"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    )}
                    title={!tcAccepted ? "Please accept the Terms and Conditions to proceed" : undefined}
                  >
                    {sendingCodes ? "Sending Codes..." : "Send Verification Codes"}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={loading || googleLoading || !tcAccepted}
                    className={cn("w-full", !tcAccepted && "opacity-50 cursor-not-allowed")}
                    onClick={handleGoogleRegister}
                    title={!tcAccepted ? "Please accept the Terms and Conditions to proceed" : undefined}
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
                      setFormData({ name: "", tup_id: "", bday: "", student_email: "", student_phone_num: "", guardian_email: "", guardian_phone_number: "", college: "", course: "", section: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : null}

              <FieldDescription className="text-center mt-4">
                Already have an account?{" "}
                <a href="/clients/students/login" className="font-semibold text-[#b32032] hover:text-[#8b1828] transition">
                  Login here
                </a>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </div>
      </div>

      {/* ── Terms & Conditions Dialog ─────────────────────────────────────── */}
      <Dialog open={showTCDialog} onOpenChange={handleCloseTCDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 shrink-0">
            <DialogTitle className="text-xl font-bold text-[#b32032] flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Terms and Conditions &amp; Privacy Policy
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              Please read the entire document before accepting.
            </p>
          </DialogHeader>

          {/* Scroll indicator banner */}
          {!hasScrolledTC && (
            <div className="flex items-center gap-2 px-6 py-2 bg-amber-50 border-b border-amber-200 shrink-0">
              <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
              <p className="text-xs text-amber-700 font-medium">
                Scroll to the bottom to enable the Accept button.
              </p>
            </div>
          )}
          {hasScrolledTC && (
            <div className="flex items-center gap-2 px-6 py-2 bg-green-50 border-b border-green-200 shrink-0">
              <svg className="w-4 h-4 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 12 12">
                <path d="M10.28 2.28a.75.75 0 00-1.06 0L4.5 7 2.78 5.28a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25a.75.75 0 000-1.06z"/>
              </svg>
              <p className="text-xs text-green-700 font-medium">
                You've reached the end. You may now accept the Terms and Conditions.
              </p>
            </div>
          )}

          {/* Scrollable content */}
          <div
            ref={tcScrollRef}
            onScroll={handleTCScroll}
            className="flex-1 overflow-y-auto px-6 py-4 text-sm text-gray-700 space-y-5 min-h-0"
            style={{ maxHeight: "55vh" }}
          >
            <section>
              <h3 className="font-bold text-gray-900 text-base mb-2">1. Acceptance of Terms</h3>
              <p>
                By registering as a student of the Technological University of the Philippines (TUP) system, you agree to be bound by these Terms and Conditions. If you do not agree to all the terms and conditions of this agreement, you may not register or access the system.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-2">2. Registration and Account Security</h3>
              <p className="mb-2">
                When you register, you agree to provide accurate, current, and complete information. You are responsible for:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Immediately notifying us of any unauthorized use of your account</li>
                <li>Ensuring your TUP ID and personal details are accurate and valid</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-2">3. Privacy Policy and Data Collection</h3>
              <p className="mb-2">
                We collect and process personal information in accordance with the Data Privacy Act of 2012 (Republic Act 10173). The information we collect includes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
                <li>Full name, TUP ID, and date of birth</li>
                <li>Student and guardian email addresses and phone numbers</li>
                <li>College, course, and section information</li>
                <li>Facial biometric data (photos) for identity verification purposes</li>
              </ul>
              <p className="mt-2">
                This information is used solely for the purpose of student account management, identity verification, and communication within the TUP system. We will not sell, trade, or otherwise transfer your personally identifiable information to outside parties without your consent, except as required by law.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-2">4. Biometric Data Consent</h3>
              <p>
                By completing registration, you expressly consent to the collection and processing of your facial biometric data. These photos will be used exclusively for:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2 mt-2">
                <li>Identity verification and authentication</li>
                <li>Attendance monitoring and access control within campus facilities</li>
                <li>Security purposes as authorized by TUP administration</li>
              </ul>
              <p className="mt-2">
                Biometric data will be stored securely and will not be shared with third parties without your explicit consent, except as required by applicable laws and regulations.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-2">5. Guardian Information</h3>
              <p>
                You confirm that the guardian information provided is accurate and that your guardian has consented to being contacted by TUP for academic and emergency-related communications. The guardian's email will be used to send a verification code during registration.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-2">6. Acceptable Use Policy</h3>
              <p className="mb-2">You agree not to:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
                <li>Use the system for any unlawful purpose or in violation of any regulations</li>
                <li>Submit false, misleading, or fraudulent registration information</li>
                <li>Impersonate any person or entity, or falsely state your affiliation</li>
                <li>Attempt to gain unauthorized access to any part of the system</li>
                <li>Interfere with or disrupt the integrity or performance of the system</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-2">7. Account Approval and Access</h3>
              <p>
                Registration does not guarantee immediate access to the system. All registrations are subject to review and approval by the TUP administration. You will be notified via email once your account has been reviewed. TUP reserves the right to reject any registration request at its sole discretion.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-2">8. Data Retention and Deletion</h3>
              <p>
                Your personal data will be retained for the duration of your enrollment at TUP and for a period required by institutional and legal obligations thereafter. You have the right to request access to your data or request its deletion, subject to applicable laws and university policies. To exercise these rights, contact the TUP Data Privacy Officer.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-2">9. Modifications to Terms</h3>
              <p>
                TUP reserves the right to modify these Terms and Conditions at any time. Changes will be posted on the official TUP website. Continued use of the system after such changes constitutes your acceptance of the new terms.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-2">10. Governing Law</h3>
              <p>
                These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes arising from the use of this system shall be subject to the exclusive jurisdiction of the courts of the Philippines.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 text-base mb-2">11. Contact Information</h3>
              <p>
                For questions regarding these Terms and Conditions or our Privacy Policy, please contact the System Developers and TUP Office of Student Affairs (OSA) or the University Information Technology Center (UITC) at the Technological University of the Philippines, Ayala Blvd., Ermita, Manila, Philippines.
              </p>
            </section>

            {/* Spacer so users truly scroll to the bottom */}
            <div className="pt-4 pb-2 text-center text-xs text-gray-400 border-t border-gray-100">
              — End of Terms and Conditions —
            </div>
          </div>

          {/* Dialog footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3 shrink-0 bg-gray-50">
            <Button
              onClick={handleAcceptTC}
              disabled={!hasScrolledTC}
              className={cn(
                "flex-1 transition-all",
                hasScrolledTC
                  ? "bg-[#b32032] hover:bg-[#951928] text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
              title={!hasScrolledTC ? "Please scroll to the bottom to enable this button" : undefined}
            >
              {hasScrolledTC ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  I Accept the Terms and Conditions
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  Scroll down to accept
                </span>
              )}
            </Button>
            <Button variant="outline" onClick={handleCloseTCDialog} className="sm:w-auto">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ──────────────────────────────────────────────────────────────────── */}

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#b32032]">Thank you for registering!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-base text-gray-700">
            <p>Your registration request has been received. Your account is now waiting for approval by the administrator.</p>
            <p>Please check your email for updates. You may close this window and wait for confirmation.</p>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowSuccessDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}