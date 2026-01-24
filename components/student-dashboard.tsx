"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { auth } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
import { ChevronDown, ChevronUp, AlertCircle, ArrowRight, CheckCircle2, Clock } from "lucide-react";

export default function StudentDashboard() {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#b32032] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 px-4 py-6">
      {error && (
        <Alert variant="destructive" className="shadow-lg">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="font-medium">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-[#b32032] to-[#8b1828] text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <CardHeader className="relative space-y-2">
          <CardTitle className="text-2xl md:text-3xl font-bold">Welcome back!</CardTitle>
          <CardDescription className="text-white/90 text-base">Manage your ID validation, feedback, and account information.</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex flex-wrap gap-3 items-center bg-white/15 border border-white/25 backdrop-blur-sm rounded-lg px-4 py-3 w-fit">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-semibold">{user?.email || "Student"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className="border-[#e9b3bd] shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
          onClick={() => router.push("/clients/students/dashboard/validation-request")}
        >
          <CardHeader className="bg-gradient-to-br from-[#fdf1f3] to-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-[#b32032] group-hover:text-[#8b1828] transition-colors">ID Validation Request</CardTitle>
                <CardDescription className="mt-2">Submit or check your validation status</CardDescription>
              </div>
              <ArrowRight className="w-6 h-6 text-[#b32032] group-hover:translate-x-1 transition-transform" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Clock className="w-5 h-5 text-blue-700" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Status</p>
                <p className="text-xs text-blue-700">Not yet submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-[#e9b3bd] shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
          onClick={() => router.push("/clients/students/dashboard/user-info")}
        >
          <CardHeader className="bg-gradient-to-br from-[#fdf1f3] to-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-[#b32032] group-hover:text-[#8b1828] transition-colors">User Information</CardTitle>
                <CardDescription className="mt-2">View and update your profile</CardDescription>
              </div>
              <ArrowRight className="w-6 h-6 text-[#b32032] group-hover:translate-x-1 transition-transform" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-900">Profile</p>
                <p className="text-xs text-green-700">Complete and verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#e9b3bd] shadow-md">
        <CardHeader
          className="cursor-pointer bg-gradient-to-br from-[#fdf1f3] to-white hover:from-[#f8dfe4] hover:to-white transition-all"
          onClick={() => toggleSection("feedback")}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-[#b32032]">Give Feedback</CardTitle>
              <CardDescription className="mt-1">Share your experience and suggestions</CardDescription>
            </div>
            <div className="bg-white rounded-full p-2 shadow-sm">
              {expandedSections["feedback"] ? (
                <ChevronUp className="w-5 h-5 text-[#b32032]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#b32032]" />
              )}
            </div>
          </div>
        </CardHeader>
        {expandedSections["feedback"] && (
          <CardContent className="pt-6">
            <div className="space-y-6">
              <p className="text-sm text-gray-700 leading-relaxed">
                Help us improve our services by providing your feedback. Your input is valuable to us and helps enhance the student experience.
              </p>

              <div className="bg-gray-50 rounded-lg p-5">
                <label className="block text-sm font-semibold text-gray-900 mb-4">
                  How would you rate your experience?
                </label>
                <div className="flex gap-3 justify-center md:justify-start">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className="text-4xl hover:scale-125 transition-transform duration-200 focus:outline-none focus:scale-125"
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Your Feedback
                </label>
                <textarea
                  placeholder="Write your feedback here... (minimum 10 characters)"
                  className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent resize-none transition-all"
                  rows={5}
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Please be specific and constructive in your feedback.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Feedback Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {["Suggestion", "Bug Report", "Complaint", "Compliment"].map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-3 cursor-pointer bg-white border-2 border-gray-200 rounded-lg px-4 py-3 hover:border-[#b32032] hover:bg-[#fdf1f3] transition-all"
                    >
                      <input
                        type="radio"
                        name="feedbackType"
                        value={type}
                        className="w-4 h-4 text-[#b32032] focus:ring-[#b32032]"
                      />
                      <span className="text-sm font-medium text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button className="bg-[#b32032] hover:bg-[#8b1828] text-white w-full py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                Submit Feedback
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
