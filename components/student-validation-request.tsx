"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WebcamCapture from '@/components/webcam-capture';
import { auth, db, storage } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ArrowLeft, Clock, AlertCircle, Ban } from "lucide-react";

export default function StudentValidationRequest() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  
  // Validation Period State
  const [validationPeriod, setValidationPeriod] = useState<{
    isActive: boolean;
    message?: string;
    startDate?: string;
    endDate?: string;
  }>({
    isActive: false,
    message: "Checking validation period...",
  });
  const [periodLoading, setPeriodLoading] = useState(true);
  
  const [corFile, setCorFile] = useState<File | null>(null);
  const [corFilePreview, setCorFilePreview] = useState<string | null>(null);
  const [corFileName, setCorFileName] = useState<string | null>(null);
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [faceFront, setFaceFront] = useState<string | null>(null);
  const [faceLeft, setFaceLeft] = useState<string | null>(null);
  const [faceRight, setFaceRight] = useState<string | null>(null);
  
  const [course, setCourse] = useState<string>('');
  const [section, setSection] = useState<string>('');
  const [college, setCollege] = useState<string>('');
  const [yearLevel, setYearLevel] = useState<string>('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Offense blocking state
  const [hasActiveOffense, setHasActiveOffense] = useState(false);
  const [activeOffenses, setActiveOffenses] = useState<any[]>([]);
  const [offenseLoading, setOffenseLoading] = useState(true);

  const MAX_COR_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  const MAX_COR_SIZE_LABEL = "10MB";

  /**
   * College to Courses Mapping for TUP
   */
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
    if (!college) return [];
    return collegeCoursesMap[college] || [];
  };

  const checkValidationPeriod = async () => {
    try {
      const response = await fetch('/api/validation-period');
      if (response.ok) {
        const data = await response.json();
        setValidationPeriod(data);
      } else {
        setValidationPeriod({
          isActive: false,
          message: "Unable to check validation period status. Please try again later.",
        });
      }
    } catch (err) {
      console.error('Error checking validation period:', err);
      setValidationPeriod({
        isActive: false,
        message: "Unable to check validation period status. Please try again later.",
      });
    } finally {
      setPeriodLoading(false);
    }
  };

  const checkActiveOffenses = async (uid: string) => {
    try {
      setOffenseLoading(true);
      const offensesRef = collection(db, "student_offenses");
      const q = query(
        offensesRef, 
        where("studentUid", "==", uid),
        where("status", "==", "active")
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const offensesList: any[] = [];
        snapshot.forEach((doc) => {
          offensesList.push({ id: doc.id, ...doc.data() });
        });
        setActiveOffenses(offensesList);
        setHasActiveOffense(true);
      } else {
        setActiveOffenses([]);
        setHasActiveOffense(false);
      }
    } catch (err) {
      console.error("Error checking offenses:", err);
      setActiveOffenses([]);
      setHasActiveOffense(false);
    } finally {
      setOffenseLoading(false);
    }
  };

  const fetchData = async (token: string, uid: string) => {
    try {
      const profileResponse = await fetch('/api/student/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (profileResponse.ok) {
        const profileResult = await profileResponse.json();
        if (profileResult.success && profileResult.data) {
          setStudentProfile(profileResult.data);
        }
      }

      const statusResponse = await fetch('/api/student/validation-request/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (statusResponse.ok) {
        const statusResult = await statusResponse.json();
        if (statusResult.success && statusResult.data) {
          setExistingRequest(statusResult.data);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    checkValidationPeriod();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        setOffenseLoading(false);
        return;
      }

      setCurrentUser(user);

      try {
        const token = await user.getIdToken();
        setIdToken(token);
        await Promise.all([
          fetchData(token, user.uid),
          checkActiveOffenses(user.uid)
        ]);
      } catch (err) {
        console.error('Error in auth state change:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /**
  /**
   * Upload image to Firebase Storage and return download URL
   */
  const uploadImageToStorage = async (
    dataUrl: string,
    fileName: string,
    uid: string,
    imageType: 'cor' | 'id' | 'face'
  ): Promise<string> => {
    console.log(`📤 Uploading ${imageType} image: ${fileName}`);

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const uniqueFileName = `${uid}-${imageType}-${timestamp}-${fileName}`;
    const storageRef = ref(storage, `validation-requests/${uid}/${uniqueFileName}`);

    // Upload to Firebase Storage
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`✅ ${imageType} image uploaded: ${downloadURL}`);

    return downloadURL;
  };

  /**
   * Handle COR file upload — enforces 10MB limit client-side
   */

  const handleCorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ✅ Images only — reject PDFs and other file types
    if (!file.type.startsWith("image/")) {
      setError("Only image files are accepted for COR (JPG, PNG, WEBP). Please take a photo of your COR and upload it as an image.");
      e.target.value = "";
      return;
    }

    // ✅ 10MB client-side check
    if (file.size > MAX_COR_SIZE_BYTES) {
      setError(
        `COR file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). ` +
        `Maximum allowed size is ${MAX_COR_SIZE_LABEL}. Please compress or resize the file and try again.`
      );
      // Reset input so the user can select a different file
      e.target.value = "";
      setCorFile(null);
      setCorFilePreview(null);
      setCorFileName(null);
      return;
    }

    try {
      setError(null);
      setCorFile(file);
      setCorFileName(file.name);

      // Create a preview URL without base64 encoding
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        if (file.type.startsWith('image/')) {
          setCorFilePreview(preview);
        } else {
          setCorFilePreview(null);
        }
      };
      reader.readAsDataURL(file);

    } catch (err: any) {
      console.error('Error handling COR:', err);
      setError('Failed to process COR file');
    }
  };

  const handleSubmit = async () => {
    if (!currentUser || !idToken) {
      setError('You must be logged in');
      return;
    }

    if (!validationPeriod.isActive) {
      setError('Validation period is not currently active. Please check the period status above.');
      return;
    }

    if (hasActiveOffense) {
      setError('You cannot submit a validation request while you have unresolved offenses. Please resolve your offenses with the OSA first.');
      return;
    }

    if (!corFile || !corFilePreview || !idPhoto || !faceFront || !faceLeft || !faceRight) {
      setError('Please complete all required fields and captures');
      return;
    }

    if (!course.trim() || !section.trim() || !yearLevel.trim()) {
      setError('Please fill in college, course, section, and year level');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const fullName =
        studentProfile?.fullName ||
        studentProfile?.name ||
        `${studentProfile?.firstName || ''} ${studentProfile?.lastName || ''}`.trim() ||
        'Unknown';

      const studentNumber =
        studentProfile?.studentNumber ||
        studentProfile?.tup_id ||
        studentProfile?.studentId ||
        'unknown';

      console.log('📤 Starting image uploads to Firebase Storage...');

      // Upload all images to Firebase Storage
      const corUrl = await uploadImageToStorage(
        corFilePreview,
        corFile.name,
        currentUser.uid,
        'cor'
      );

      const idPhotoUrl = await uploadImageToStorage(
        idPhoto,
        'id-photo.jpg',
        currentUser.uid,
        'id'
      );

      const faceFrontUrl = await uploadImageToStorage(
        faceFront,
        'face-front.jpg',
        currentUser.uid,
        'face'
      );

      const faceLeftUrl = await uploadImageToStorage(
        faceLeft,
        'face-left.jpg',
        currentUser.uid,
        'face'
      );

      const faceRightUrl = await uploadImageToStorage(
        faceRight,
        'face-right.jpg',
        currentUser.uid,
        'face'
      );

      console.log('✅ All images uploaded successfully');
      console.log('📤 Submitting validation request...');

      const response = await fetch('/api/student/validation-request/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentNumber,
          studentName: fullName,
          email: currentUser.email,
          phoneNumber: studentProfile?.phone || studentProfile?.student_phone_num || '',
          course: course.trim(),
          section: section.trim(),
          yearLevel: yearLevel.trim(),
          corUrl,
          idPhotoUrl,
          faceFrontUrl,
          faceLeftUrl,
          faceRightUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit request');
      }

      if (result.success) {
        setSuccess(true);
        setCorFile(null);
        setCorFilePreview(null);
        setCorFileName(null);
        setIdPhoto(null);
        setFaceFront(null);
        setFaceLeft(null);
        setFaceRight(null);
        setCollege('');
        setCourse('');
        setSection('');
        setYearLevel('');
        setShowResubmitForm(false);
      } else {
        throw new Error(result.error || 'Submission failed');
      }

    } catch (err: any) {
      console.error('Error submitting:', err);
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToDashboard = () => {
    router.push('/clients/students/dashboard');
  };

  if (loading || periodLoading || offenseLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b32032] mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="max-w-md border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Authentication Required</CardTitle>
            <CardDescription>Please log in to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (hasActiveOffense && activeOffenses.length > 0) {
    return (
      <div className="w-full max-w-6xl space-y-6">
        <Button 
          variant="outline" 
          onClick={goBackToDashboard}
          className="flex items-center gap-2 border-red-200 hover:bg-red-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <Card className="border-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Ban className="h-5 w-5" />
              ID Validation Request Blocked
            </CardTitle>
            <CardDescription className="text-red-600">
              You have unresolved offense(s) on record. You cannot request ID validation until all offenses are resolved by the Office of Student Affairs (OSA).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-white border border-red-300 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-3">Active Offense(s):</h4>
                <div className="space-y-3">
                  {activeOffenses.map((offense) => (
                    <div 
                      key={offense.id} 
                      className={`p-3 rounded border ${
                        offense.offenseType === 'major' 
                          ? 'bg-red-100 border-red-400' 
                          : 'bg-amber-100 border-amber-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                          offense.offenseType === 'major' 
                            ? 'bg-red-600 text-white' 
                            : 'bg-amber-500 text-white'
                        }`}>
                          {offense.offenseType || 'minor'} offense
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {offense.offenseTitle || 'Offense'}
                      </p>
                      {offense.dateCommitted && (
                        <p className="text-xs text-gray-600 mt-1">
                          Date: {new Date(offense.dateCommitted.toDate ? offense.dateCommitted.toDate() : offense.dateCommitted).toLocaleDateString()}
                        </p>
                      )}
                      {offense.sanction && (
                        <p className="text-xs text-gray-700 mt-1">
                          <strong>Sanction:</strong> {offense.sanction}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ How to resolve:</strong> Please visit or contact the Office of Student Affairs (OSA) to discuss your offense(s) and fulfill any required sanctions. Once your offense(s) are resolved/lifted, you will be able to submit an ID validation request.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => router.push('/clients/students/dashboard/osa-records')}
                className="w-full border-red-200 hover:bg-red-100"
              >
                View My Full OSA Records
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validationPeriod.isActive && !existingRequest && !success) {
    const now = new Date();
    const startDate = validationPeriod.startDate ? new Date(validationPeriod.startDate) : null;
    const endDate = validationPeriod.endDate ? new Date(validationPeriod.endDate) : null;
    
    let statusType: "upcoming" | "ended" | "not-set" = "not-set";
    if (startDate && now < startDate) statusType = "upcoming";
    else if (endDate && now > endDate) statusType = "ended";

    return (
      <div className="w-full max-w-6xl space-y-6">
        <Button 
          variant="outline" 
          onClick={goBackToDashboard}
          className="flex items-center gap-2 border-red-200 hover:bg-red-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <Card className={`${
          statusType === "upcoming" ? "border-blue-200" : 
          statusType === "ended" ? "border-amber-200" : 
          "border-gray-200"
        }`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${
              statusType === "upcoming" ? "text-blue-700" : 
              statusType === "ended" ? "text-amber-700" : 
              "text-gray-700"
            }`}>
              {statusType === "upcoming" && <Clock className="h-5 w-5" />}
              {(statusType === "ended" || statusType === "not-set") && <AlertCircle className="h-5 w-5" />}
              ID Validation {statusType === "upcoming" ? "Coming Soon" : statusType === "ended" ? "Closed" : "Unavailable"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg border ${
              statusType === "upcoming" 
                ? "bg-blue-50 border-blue-200" 
                : statusType === "ended"
                ? "bg-amber-50 border-amber-200"
                : "bg-gray-50 border-gray-200"
            }`}>
              <p className={`${
                statusType === "upcoming" ? "text-blue-800" : 
                statusType === "ended" ? "text-amber-800" : "text-gray-800"
              }`}>
                {validationPeriod.message}
              </p>
              
              {startDate && statusType === "upcoming" && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Opens on:</strong> {startDate.toLocaleString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long',
                      day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {endDate && statusType === "ended" && (
                <div className="mt-4 pt-4 border-t border-amber-200">
                  <p className="text-sm text-amber-700">
                    <strong>Ended on:</strong> {endDate.toLocaleString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long',
                      day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingRequest && !success && !showResubmitForm) {
    return (
      <div className="w-full max-w-6xl space-y-6">
        <Button 
          variant="outline" 
          onClick={goBackToDashboard}
          className="flex items-center gap-2 border-red-200 hover:bg-red-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <Card className={`${
          existingRequest.status === 'pending' ? 'border-yellow-200 bg-yellow-50' :
          existingRequest.status === 'accepted' ? 'border-green-200 bg-green-50' :
          'border-red-200 bg-red-50'
        }`}>
          <CardHeader>
            <CardTitle className={`${
              existingRequest.status === 'pending' ? 'text-yellow-800' :
              existingRequest.status === 'accepted' ? 'text-green-800' :
              'text-red-800'
            }`}>
              {existingRequest.status === 'pending' && '⏳ Request Pending'}
              {existingRequest.status === 'accepted' && '✅ Request Accepted'}
              {existingRequest.status === 'rejected' && '❌ Request Rejected'}
            </CardTitle>
            <CardDescription>
              {existingRequest.status === 'pending' && 'Your validation request is being reviewed.'}
              {existingRequest.status === 'accepted' && 'Your ID Validation Request has been accepted!'}
              {existingRequest.status === 'rejected' && 'Your request was rejected. Please review the reason and submit a new request.'}
            </CardDescription>
          </CardHeader>
          
          {existingRequest.status === 'rejected' && existingRequest.rejectRemarks && (
            <CardContent>
              <div className="p-4 bg-red-100 border border-red-300 rounded-md">
                <p className="font-semibold text-red-800 mb-2">Rejection Reason:</p>
                <p className="text-red-700">{existingRequest.rejectRemarks}</p>
              </div>
              
              {validationPeriod.isActive ? (
                <Button
                  onClick={() => setShowResubmitForm(true)}
                  className="mt-4 w-full bg-[#b32032] hover:bg-[#8b1828]"
                >
                  Submit New Request
                </Button>
              ) : (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-sm">
                    ⚠️ Validation period is not currently active. You cannot submit a new request at this time.
                  </p>
                  <p className="text-amber-700 text-sm mt-1">
                    {validationPeriod.message}
                  </p>
                </div>
              )}
            </CardContent>
          )}

          {existingRequest.status === 'accepted' && (
            <CardContent>
              <p className="text-green-700 font-semibold">
                ✓ Your ID validation has been accepted. You cannot submit another request.
              </p>
              <p className="text-green-600 mt-2">
                Follow the instructions in your email. You can proceed with the next steps of your application.
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-6xl space-y-6">
        <Button 
          variant="outline" 
          onClick={goBackToDashboard}
          className="flex items-center gap-2 border-red-200 hover:bg-red-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">✅ Request Submitted Successfully!</CardTitle>
            <CardDescription>Your validation request has been submitted. Please wait for admin approval.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const allCaptured = corFilePreview && idPhoto && faceFront && faceLeft && faceRight && course.trim() && section.trim() && yearLevel.trim();

  return (
    <div className="w-full max-w-6xl space-y-6">
      <Button 
        variant="outline" 
        onClick={goBackToDashboard}
        className="flex items-center gap-2 border-red-200 hover:bg-red-50"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Button>

      {validationPeriod.isActive && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <p className="font-semibold text-green-800">Validation Period Active</p>
                <p className="text-sm text-green-700">{validationPeriod.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Student Information Card */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-700">Student Information</CardTitle>
          <CardDescription>Your name, email, and guardian email are automatically filled and cannot be changed. Please fill in your college, course, section, and year level</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name (Auto-filled)</label>
            <input
              type="text"
              value={studentProfile?.fullName || studentProfile?.name || `${studentProfile?.firstName || ''} ${studentProfile?.lastName || ''}`.trim() || 'Loading...'}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email (Auto-filled)</label>
            <input
              type="email"
              value={currentUser?.email || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Email (Auto-filled)</label>
            <input
              type="email"
              value={studentProfile?.guardianEmail || studentProfile?.guardian_email || 'Not provided'}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">College *</label>
              <select
                value={college}
                onChange={(e) => { setCollege(e.target.value); setCourse(''); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              >
                <option value="">Select College</option>
                <option value="COS">COS - College of Science</option>
                <option value="COE">COE - College of Engineering</option>
                <option value="CAFA">CAFA - College of Architecture and Fine Arts</option>
                <option value="CIE">CIE - College of Industrial Education</option>
                <option value="CLA">CLA - College of Liberal Arts</option>
                <option value="CIT">CIT - College of Industrial Technology</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                disabled={!college}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 ${!college ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">{!college ? 'Select a college first' : 'Select Course'}</option>
                {getCoursesForCollege().map((courseOption) => (
                  <option key={courseOption} value={courseOption}>{courseOption}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section *</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              >
                <option value="">Select Section</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year Level *</label>
              <select
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              >
                <option value="">Select Year Level</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="5th Year">5th Year</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* COR Upload Card */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-700">Certificate of Registration (COR)</CardTitle>
          {/* ✅ Updated description to reflect 5MB limit */}
          <CardDescription>Upload a photo of your COR (JPG, PNG, WEBP only — max {MAX_COR_SIZE_LABEL})</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleCorUpload}
            className="block w-full text-sm text-gray-500 
              file:mr-4 file:py-2 file:px-4 
              file:rounded-lg file:border-0 
              file:text-sm file:font-semibold 
              file:bg-blue-50 file:text-blue-700 
              hover:file:bg-blue-100 
              cursor-pointer"
          />
          {/* ✅ Inline size hint */}
          <p className="text-xs text-gray-500">
            Maximum file size: {MAX_COR_SIZE_LABEL}. Accepted formats: JPG, PNG, WEBP.
          </p>
          {corFile && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <span>✅ COR uploaded</span>
                {corFileName && (
                  <span className="text-gray-600">
                    ({corFileName} — {(corFile.size / (1024 * 1024)).toFixed(1)}MB)
                  </span>
                )}
              </div>
              
              {corFilePreview ? (
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                  <img 
                    src={corFilePreview} 
                    alt="COR Preview" 
                    className="w-full max-w-md max-h-96 rounded-lg border-2 border-green-500 object-cover" 
                  />
                </div>
              ) : (
                <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg flex items-center gap-3">
                  <span className="text-3xl">📄</span>
                  <div>
                    <p className="font-semibold text-blue-800">PDF Document</p>
                    <p className="text-sm text-blue-700">Your PDF file has been uploaded successfully</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ID Photo Card */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-700">ID Photo</CardTitle>
          <CardDescription>Capture a clear photo of your school ID</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <WebcamCapture
            label={idPhoto ? "Retake ID Photo" : "Capture ID Photo"}
            onCapture={setIdPhoto}
            useBackCamera={true}
          />
          {idPhoto && (
            <div className="mt-4">
              <p className="text-green-600 font-semibold mb-3">✅ ID Photo Captured!</p>
              <img src={idPhoto} alt="ID" className="w-80 h-80 object-cover rounded-lg border-2 border-green-500" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Face Photos Card */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-700">Face Photos (Proper Haircut, Hair Color)</CardTitle>
          <CardDescription>Capture clear photos showing your proper haircut and natural hair color</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-center">Front View</h3>
              <div className="flex flex-col items-center">
                <WebcamCapture label={faceFront ? "Retake" : "Front"} onCapture={setFaceFront} useBackCamera={false} />
                {faceFront && <img src={faceFront} alt="Front" className="mt-4 w-full max-w-xs h-48 object-cover rounded-lg border-2 border-green-500" />}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-center">Left View</h3>
              <div className="flex flex-col items-center">
                <WebcamCapture label={faceLeft ? "Retake" : "Left"} onCapture={setFaceLeft} useBackCamera={false} />
                {faceLeft && <img src={faceLeft} alt="Left" className="mt-4 w-full max-w-xs h-48 object-cover rounded-lg border-2 border-green-500" />}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-center">Right View</h3>
              <div className="flex flex-col items-center">
                <WebcamCapture label={faceRight ? "Retake" : "Right"} onCapture={setFaceRight} useBackCamera={false} />
                {faceRight && <img src={faceRight} alt="Right" className="mt-4 w-full max-w-xs h-48 object-cover rounded-lg border-2 border-green-500" />}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status & Submit Card */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-700">Capture Status</CardTitle>
          <CardDescription>Check completion and submit your request</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "COR", done: !!corFilePreview },
              { label: "ID Photo", done: !!idPhoto },
              { label: "Front", done: !!faceFront },
              { label: "Left", done: !!faceLeft },
              { label: "Right", done: !!faceRight },
            ].map(({ label, done }) => (
              <div key={label} className={`flex items-center gap-3 p-3 rounded-lg border ${done ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                <span className="text-2xl">{done ? "✅" : "⬜"}</span>
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={!allCaptured || submitting || !validationPeriod.isActive}
            className={`w-full py-6 text-lg ${
              allCaptured && !submitting && validationPeriod.isActive
                ? 'bg-[#b32032] hover:bg-[#8b1828]'
                : 'bg-gray-300'
            }`}
          >
            {submitting ? 'Submitting...' : 
             !validationPeriod.isActive ? 'Validation Period Inactive' :
             'Submit Validation Request'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}