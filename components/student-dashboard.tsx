"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { auth, db } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { ChevronDown, ChevronUp, AlertCircle, ArrowRight, CheckCircle2, Clock, FileWarning, BookOpen } from "lucide-react";

export default function StudentDashboard() {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [validationStatus, setValidationStatus] = useState<
    "not_submitted" | "pending" | "accepted" | "rejected"
  >("not_submitted");
  const [activeOffensesCount, setActiveOffensesCount] = useState(0);
  const [schoolYear, setSchoolYear] = useState<string | null>(null);
  const [semester, setSemester] = useState<string | null>(null);

  const fetchValidationStatus = async (uid: string) => {
    try {
      const q = query(
        collection(db, "validation_requests2"),
        where("studentId", "==", uid)
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        setValidationStatus("not_submitted");
        return;
      }

      const docs = snap.docs.map((doc) => doc.data());
      docs.sort((a, b) => {
        const aTime = a.requestTime?.seconds
          ? a.requestTime.seconds * 1000
          : a.requestTime?.toMillis
          ? a.requestTime.toMillis()
          : 0;
        const bTime = b.requestTime?.seconds
          ? b.requestTime.seconds * 1000
          : b.requestTime?.toMillis
          ? b.requestTime.toMillis()
          : 0;
        return bTime - aTime;
      });

      const data = docs[0];
      const status = data.status || "pending";
      if (status === "accepted") setValidationStatus("accepted");
      else if (status === "rejected") setValidationStatus("rejected");
      else setValidationStatus("pending");
    } catch (err) {
      console.error("Failed to fetch validation status:", err);
    }
  };

  const fetchActiveOffenses = async (uid: string) => {
    try {
      const q = query(
        collection(db, "student_offenses"),
        where("studentUid", "==", uid),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      setActiveOffensesCount(snap.size);
    } catch (err) {
      console.error("Failed to fetch offenses:", err);
      setActiveOffensesCount(0);
    }
  };

  const fetchCurrentSemester = async () => {
    try {
      const docRef = doc(db, "system_settings", "currentSemester");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSchoolYear(data.schoolYear || null);
        setSemester(data.semester || null);
      }
    } catch (err) {
      console.error("Failed to fetch current semester:", err);
    }
  };

  /**
   * Sets up event listeners and loads initial data
   */
  async function initializePage() {
    try {
      setIsLoading(true);
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push('/clients/students/login');
        return;
      }
      setUser(currentUser);
      await Promise.all([
        fetchValidationStatus(currentUser.uid),
        fetchActiveOffenses(currentUser.uid),
        fetchCurrentSemester(),
      ]);
    } catch (err: any) {
      handleErrors(err);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Expands/collapses sections like "ID Validation Request" or "Give Feedback"
   */
  function toggleSection(sectionId: string) {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }

  /**
   * Clears session and redirects to login page
   */
  async function logoutUser() {
    try {
      setIsLoading(true);
      await signOut(auth);
      router.push('/clients/students/login');
    } catch (err: any) {
      handleErrors(err);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Displays user-friendly error messages for failed requests
   */
  function handleErrors(error: any) {
    let message = "An error occurred. Please try again.";
    
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          message = "User not found. Please check your credentials.";
          break;
        case 'auth/wrong-password':
          message = "Incorrect password.";
          break;
        case 'auth/invalid-email':
          message = "Invalid email address.";
          break;
        case 'auth/user-disabled':
          message = "This account has been disabled.";
          break;
        case 'auth/too-many-requests':
          message = "Too many failed login attempts. Please try again later.";
          break;
        case 'permission-denied':
          message = "You don't have permission to perform this action.";
          break;
        default:
          message = error.message || message;
      }
    } else if (error.message) {
      message = error.message;
    }

    console.error('Error:', error);
    setError(message);

    // Auto-clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  }

  useEffect(() => {
    initializePage();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#b32032] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    not_submitted: {
      label: "Not yet submitted",
      textClass: "text-blue-700",
      badgeClass: "bg-blue-50 border-blue-200",
      iconColor: "text-blue-700",
    },
    pending: {
      label: "Pending review",
      textClass: "text-yellow-700",
      badgeClass: "bg-yellow-50 border-yellow-200",
      iconColor: "text-yellow-700",
    },
    accepted: {
      label: "Accepted",
      textClass: "text-green-700",
      badgeClass: "bg-green-50 border-green-200",
      iconColor: "text-green-700",
    },
    rejected: {
      label: "Rejected",
      textClass: "text-red-700",
      badgeClass: "bg-red-50 border-red-200",
      iconColor: "text-red-700",
    },
  } as const;

  const currentStatus = statusConfig[validationStatus];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 md:space-y-6 px-2 md:px-4 py-4 md:py-6">
      {error && (
        <Alert variant="destructive" className="shadow-lg">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="font-medium">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="relative overflow-hidden border-none shadow-xl bg-linear-to-br from-[#b32032] to-[#8b1828] text-white">
        <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-white/10 rounded-full -mr-24 md:-mr-32 -mt-24 md:-mt-32" />
        <CardHeader className="relative space-y-2 p-4 md:p-6">
          <CardTitle className="text-xl md:text-3xl font-bold">Welcome back!</CardTitle>
          <CardDescription className="text-white/90 text-sm md:text-base">Manage your ID validation, feedback, and account information.</CardDescription>
        </CardHeader>
        <CardContent className="relative p-4 md:p-6 pt-0 md:pt-0 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 md:gap-3 items-center bg-white/15 border border-white/25 backdrop-blur-sm rounded-lg px-3 md:px-4 py-2 md:py-3 w-fit">
            <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
            <p className="font-semibold text-sm md:text-base truncate max-w-50 md:max-w-none">{user?.email || "Student"}</p>
          </div>

          {/* Current School Year & Semester Badge */}
          {(schoolYear || semester) && (
            <div className="flex items-center gap-3 bg-white text-[#b32032] rounded-xl px-4 md:px-6 py-3 md:py-4 shadow-lg w-fit border-2 border-white/80">
              <BookOpen className="w-6 h-6 md:w-8 md:h-8 shrink-0 text-[#b32032]" />
              <div>
                {schoolYear && (
                  <p className="text-xs md:text-sm font-semibold text-[#b32032]/70 leading-none uppercase tracking-wider">S.Y. {schoolYear}</p>
                )}
                {semester && (
                  <p className="font-extrabold text-lg md:text-2xl leading-tight text-[#b32032]">{semester} Semester</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card
          className="border-[#e9b3bd] shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
          onClick={() => router.push("/clients/students/dashboard/validation-request")}
        >
          <CardHeader className="bg-linear-to-br from-[#fdf1f3] to-white p-4 md:p-6">
            <div className="flex items-start justify-between gap-3 md:gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl text-[#b32032] group-hover:text-[#8b1828] transition-colors">ID Validation Request</CardTitle>
                <CardDescription className="mt-1 md:mt-2 text-sm">Submit or check your validation status</CardDescription>
              </div>
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-[#b32032] group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-4 md:pt-6">
            <div className={`flex items-center gap-3 rounded-lg p-3 md:p-4 border ${currentStatus.badgeClass}`}>
              <Clock className={`w-4 h-4 md:w-5 md:h-5 ${currentStatus.iconColor}`} />
              <div>
                <p className={`text-xs md:text-sm font-semibold ${currentStatus.textClass}`}>Status</p>
                <p className={`text-xs ${currentStatus.textClass}`}>{currentStatus.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-[#e9b3bd] shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
          onClick={() => router.push("/clients/students/dashboard/user-info")}
        >
          <CardHeader className="bg-linear-to-br from-[#fdf1f3] to-white p-4 md:p-6">
            <div className="flex items-start justify-between gap-3 md:gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl text-[#b32032] group-hover:text-[#8b1828] transition-colors">User Information</CardTitle>
                <CardDescription className="mt-1 md:mt-2 text-sm">View and update your profile</CardDescription>
              </div>
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-[#b32032] group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-4 md:pt-6">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
              <div>
                <p className="text-xs md:text-sm font-semibold text-green-900">Profile</p>
                <p className="text-xs text-green-700">Complete and verified</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Offenses Card */}
        <Card
          className={`border-[#e9b3bd] shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group ${activeOffensesCount > 0 ? 'border-red-400' : ''}`}
          onClick={() => router.push("/clients/students/dashboard/osa-records")}
        >
          <CardHeader className="bg-linear-to-br from-[#fdf1f3] to-white p-4 md:p-6">
            <div className="flex items-start justify-between gap-3 md:gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl text-[#b32032] group-hover:text-[#8b1828] transition-colors">My Offenses</CardTitle>
                <CardDescription className="mt-1 md:mt-2 text-sm">View your OSA disciplinary records</CardDescription>
              </div>
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-[#b32032] group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-4 md:pt-6">
            <div className={`flex items-center gap-3 rounded-lg p-3 md:p-4 border ${activeOffensesCount > 0 ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-200'}`}>
              <FileWarning className={`w-4 h-4 md:w-5 md:h-5 ${activeOffensesCount > 0 ? 'text-red-600' : 'text-green-600'}`} />
              <div>
                <p className={`text-xs md:text-sm font-semibold ${activeOffensesCount > 0 ? 'text-red-900' : 'text-green-900'}`}>
                  {activeOffensesCount > 0 ? 'Active Offense(s)' : 'Status'}
                </p>
                <p className={`text-xs ${activeOffensesCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {activeOffensesCount > 0 ? `${activeOffensesCount} unresolved offense(s)` : 'No active offenses'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Give Feedback Card */}
        <Card
          className="border-[#e9b3bd] shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
          onClick={() => router.push("/clients/students/dashboard/feedback-reports")}
        >
          <CardHeader className="bg-linear-to-br from-[#fdf1f3] to-white p-4 md:p-6">
            <div className="flex items-start justify-between gap-3 md:gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl text-[#b32032] group-hover:text-[#8b1828] transition-colors">Give Feedback</CardTitle>
                <CardDescription className="mt-1 md:mt-2 text-sm">Share your experience and suggestions</CardDescription>
              </div>
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-[#b32032] group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}