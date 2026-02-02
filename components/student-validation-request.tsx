"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WebcamCapture from '@/components/webcam-capture';
import { auth, db } from "@/lib/firebaseConfig";
import { collection, addDoc, setDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ArrowLeft } from "lucide-react";

export default function StudentValidationRequest() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  
  const [corFile, setCorFile] = useState<string | null>(null);
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [faceFront, setFaceFront] = useState<string | null>(null);
  const [faceLeft, setFaceLeft] = useState<string | null>(null);
  const [faceRight, setFaceRight] = useState<string | null>(null);
  
  const [course, setCourse] = useState<string>('');
  const [section, setSection] = useState<string>('');
  const [yearLevel, setYearLevel] = useState<string>('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Initialize page - fetch user profile and check for existing request
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      try {
        // Get student profile (new: student_profiles, doc id is TUPID)
        let profileData: any = null;

        const profileQuery = query(
          collection(db, 'student_profiles'),
          where('uid', '==', user.uid)
        );
        const profileSnap = await getDocs(profileQuery);

        if (!profileSnap.empty) {
          profileData = profileSnap.docs[0].data();
        } else {
          // Fallback for older records
          const studentDocRef = doc(db, 'students', user.uid);
          const studentSnap = await getDoc(studentDocRef);
          if (studentSnap.exists()) {
            profileData = studentSnap.data();
          }
        }

        if (profileData) {
          setStudentProfile(profileData);
        }

        // Check for existing validation request
        const q = query(
          collection(db, 'validation_requests2'),
          where('studentId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          setExistingRequest({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Handle COR file upload to Firebase Storage
   */
  const handleCorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Max 10MB.');
      return;
    }

    try {
      setError(null);
      const storage = getStorage();
      const studentNumber = studentProfile?.studentNumber || studentProfile?.tup_id || 'unknown';
      const fileName = `${studentNumber}_cor_${Date.now()}`;
      const storageRef = ref(storage, `ID_Validation_Files/${studentNumber}/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setCorFile(url);
    } catch (err: any) {
      console.error('Error uploading COR:', err);
      setError('Failed to upload COR file');
    }
  };

  /**
   * Convert base64 string to Blob
   */
  const base64ToBlob = (base64: string): Blob => {
    try {
      console.log('base64ToBlob input length:', base64.length);
      console.log('base64ToBlob first 100 chars:', base64.substring(0, 100));
      
      const parts = base64.split(';base64,');
      console.log('Parts after split:', parts.length);
      console.log('Part[0] (header):', parts[0]);
      console.log('Part[1] length:', parts[1] ? parts[1].length : 'undefined');
      
      const contentType = parts[0].split(':')[1];
      console.log('Extracted contentType:', contentType);
      
      const raw = window.atob(parts[1]);
      console.log('Decoded raw length:', raw.length);
      
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);

      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }

      const blob = new Blob([uInt8Array], { type: contentType });
      console.log('Blob created successfully:', blob.size, 'bytes,', blob.type);
      return blob;
    } catch (error: any) {
      console.error('Error in base64ToBlob:', error);
      throw new Error(`base64ToBlob failed: ${error.message}`);
    }
  };

  /**
   * Upload base64 image to Firebase Storage
   */
  const uploadImageToStorage = async (base64Image: string, imageName: string): Promise<string> => {
    // Ensure we have a string
    if (!base64Image || typeof base64Image !== 'string') {
      throw new Error(`${imageName} is not a valid string. Received: ${typeof base64Image}`);
    }

    // Trim any whitespace
    let trimmedImage = base64Image.trim();

    console.log(`[${imageName}] Initial validation:`);
    console.log(`  - Length: ${trimmedImage.length} chars`);
    console.log(`  - First 100 chars: ${trimmedImage.substring(0, 100)}`);

    // Check if it's already a URL (in case of resubmission)
    if (trimmedImage.startsWith('http://') || trimmedImage.startsWith('https://')) {
      console.log(`[${imageName}] Already a Firebase Storage URL, returning as-is`);
      return trimmedImage;
    }

    // Validate format: must be data:image/[type];base64,[data]
    if (!trimmedImage.startsWith('data:')) {
      console.error(`[${imageName}] ERROR: Does not start with 'data:'`);
      throw new Error(`Invalid image format for ${imageName}. Must start with 'data:image/...'`);
    }

    // Check if format includes ;base64,
    if (!trimmedImage.includes(';base64,')) {
      console.error(`[${imageName}] ERROR: Missing ';base64,' separator`);
      console.error(`  Current format: ${trimmedImage.substring(0, 150)}`);
      throw new Error(`Invalid image format for ${imageName}. Must include ';base64,' separator`);
    }

    // Validate data part is not empty
    const parts = trimmedImage.split(';base64,');
    const datapart = parts[1];
    if (!datapart || datapart.length === 0) {
      console.error(`[${imageName}] ERROR: Base64 data is empty after ';base64,' separator`);
      throw new Error(`Invalid image format for ${imageName}. Base64 data is empty`);
    }

    console.log(`[${imageName}] Format validation passed`);
    console.log(`  - MIME type: ${parts[0].substring(5)}`);
    console.log(`  - Data length: ${datapart.length} chars`);

    try {
      const storage = getStorage();
      const studentNumber = studentProfile?.studentNumber || studentProfile?.tup_id || 'unknown';
      const fileName = `${studentNumber}_${imageName}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `ID_Validation_Files/${studentNumber}/${fileName}`);

      // Convert base64 to Blob and upload
      console.log(`[${imageName}] Converting base64 to Blob...`);
      const blob = base64ToBlob(trimmedImage);
      console.log(`[${imageName}] Blob created: ${blob.size} bytes, type: ${blob.type}`);
      
      console.log(`[${imageName}] Uploading to Firebase Storage...`);
      const snapshot = await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(snapshot.ref);
      console.log(`✓ [${imageName}] Successfully uploaded to: ${url}`);
      return url;
    } catch (uploadError: any) {
      console.error(`✗ [${imageName}] Upload failed:`, uploadError);
      console.error(`  Error code: ${uploadError.code}`);
      console.error(`  Error message: ${uploadError.message}`);
      throw new Error(`Failed to upload ${imageName}: ${uploadError.message}`);
    }
  };

  /**
   * Submit validation request to Firestore with Firebase Storage URLs
   */
  const handleSubmit = async () => {
    if (!currentUser) {
      setError('You must be logged in');
      return;
    }

    if (!corFile || !idPhoto || !faceFront || !faceLeft || !faceRight) {
      setError('Please complete all required fields and captures');
      return;
    }

    if (!course.trim() || !section.trim() || !yearLevel.trim()) {
      setError('Please fill in course, section, and year level');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const fullName =
        studentProfile?.fullName ||
        studentProfile?.name ||
        `${studentProfile?.firstName || ''} ${studentProfile?.lastName || ''}`.trim() ||
        'Unknown'

      const studentNumber =
        studentProfile?.studentNumber ||
        studentProfile?.tup_id ||
        studentProfile?.studentId ||
        'unknown';

      // Upload all images to Firebase Storage
      console.log('Uploading images to Firebase Storage...');
      const [idPictureUrl, faceFrontUrl, faceLeftUrl, faceRightUrl] = await Promise.all([
        uploadImageToStorage(idPhoto, 'id_picture'),
        uploadImageToStorage(faceFront, 'pose_front'),
        uploadImageToStorage(faceLeft, 'pose_left'),
        uploadImageToStorage(faceRight, 'pose_right'),
      ]);

      const requestData = {
        studentId: currentUser.uid,
        tupId: studentNumber,
        studentName: fullName,
        email: currentUser.email,
        phoneNumber: studentProfile?.phone || studentProfile?.student_phone_num || '',
        course: course.trim(),
        section: section.trim(),
        yearLevel: yearLevel.trim(),
        
        // Store Firebase Storage URLs instead of base64
        cor: corFile,
        idPicture: idPictureUrl,
        
        selfiePictures: {
          front: faceFrontUrl,
          left: faceLeftUrl,
          back: faceRightUrl
        },
        
        status: 'pending',
        requestTime: serverTimestamp(),
        rejectRemarks: null
      };

      // If there's an existing accepted request, prevent resubmission
      if (existingRequest && existingRequest.status === 'accepted') {
        setError('You have already been validated. You cannot submit another request.');
        setSubmitting(false);
        return;
      }

      // Use studentNumber as document ID instead of random UID
      const requestDocRef = doc(db, 'validation_requests2', studentNumber);
      
      if (existingRequest && existingRequest.status === 'rejected') {
        // Update existing rejected request
        await setDoc(requestDocRef, requestData, { merge: true });
      } else {
        // Create new document with studentNumber as ID
        await setDoc(requestDocRef, requestData);
      }

      setSuccess(true);
      
      // Reset form
      setCorFile(null);
      setIdPhoto(null);
      setFaceFront(null);
      setFaceLeft(null);
      setFaceRight(null);
      setCourse('');
      setSection('');
      setYearLevel('');
      setShowResubmitForm(false);

    } catch (err: any) {
      console.error('Error submitting:', err);
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Go back to main dashboard
   */
  const goBackToDashboard = () => {
    router.push('/clients/students/dashboard');
  };

  if (loading) {
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

  // Show existing request status
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
              {existingRequest.status === 'accepted' && 'Your ID has been validated!'}
              {existingRequest.status === 'rejected' && 'Your request was rejected. Please review the reason and submit a new request.'}
            </CardDescription>
          </CardHeader>
          
          {/* Show rejection remarks if rejected */}
          {existingRequest.status === 'rejected' && existingRequest.rejectRemarks && (
            <CardContent>
              <div className="p-4 bg-red-100 border border-red-300 rounded-md">
                <p className="font-semibold text-red-800 mb-2">Rejection Reason:</p>
                <p className="text-red-700">{existingRequest.rejectRemarks}</p>
              </div>
              
              <Button
                onClick={() => setShowResubmitForm(true)}
                className="mt-4 w-full bg-[#b32032] hover:bg-[#8b1828]"
              >
                Submit New Request
              </Button>
            </CardContent>
          )}

          {/* Show message if accepted - no action button */}
          {existingRequest.status === 'accepted' && (
            <CardContent>
              <p className="text-green-700 font-semibold">
                ✓ Your ID validation has been accepted. You cannot submit another request.
              </p>
              <p className="text-green-600 mt-2">
                You can proceed with your application.
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  // Success message
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

  const allCaptured = corFile && idPhoto && faceFront && faceLeft && faceRight && course.trim() && section.trim() && yearLevel.trim();

  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* Back Button */}
      <Button 
        variant="outline" 
        onClick={goBackToDashboard}
        className="flex items-center gap-2 border-red-200 hover:bg-red-50"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Button>

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
          <CardDescription>Your name, email, and guardian email are automatically filled and cannot be changed. Please fill in your course, section, and year level</CardDescription>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g., BS Computer Science"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section *</label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g., A"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
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
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* COR Upload Card */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-700">Certificate of Registration (COR)</CardTitle>
          <CardDescription>Upload your COR document (PDF or image, max 10MB)</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={handleCorUpload}
            className="block w-full text-sm text-gray-500 
              file:mr-4 file:py-2 file:px-4 
              file:rounded-lg file:border-0 
              file:text-sm file:font-semibold 
              file:bg-blue-50 file:text-blue-700 
              hover:file:bg-blue-100 
              cursor-pointer"
          />
          {corFile && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <span>✅ COR uploaded</span>
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
              <img 
                src={idPhoto} 
                alt="ID" 
                className="w-80 h-80 object-cover rounded-lg border-2 border-green-500" 
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Face Photos Card */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-700">Face Photos (3 Angles)</CardTitle>
          <CardDescription>Capture your face from three different angles</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Front */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-center">Front View</h3>
              <div className="flex flex-col items-center">
                <WebcamCapture
                  label={faceFront ? "Retake" : "Front"}
                  onCapture={setFaceFront}
                  useBackCamera={false}
                />
                {faceFront && (
                  <img 
                    src={faceFront} 
                    alt="Front" 
                    className="mt-4 w-full max-w-xs h-48 object-cover rounded-lg border-2 border-green-500" 
                  />
                )}
              </div>
            </div>

            {/* Left */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-center">Left View</h3>
              <div className="flex flex-col items-center">
                <WebcamCapture
                  label={faceLeft ? "Retake" : "Left"}
                  onCapture={setFaceLeft}
                  useBackCamera={false}
                />
                {faceLeft && (
                  <img 
                    src={faceLeft} 
                    alt="Left" 
                    className="mt-4 w-full max-w-xs h-48 object-cover rounded-lg border-2 border-green-500" 
                  />
                )}
              </div>
            </div>

            {/* Right */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-center">Right View</h3>
              <div className="flex flex-col items-center">
                <WebcamCapture
                  label={faceRight ? "Retake" : "Right"}
                  onCapture={setFaceRight}
                  useBackCamera={false}
                />
                {faceRight && (
                  <img 
                    src={faceRight} 
                    alt="Right" 
                    className="mt-4 w-full max-w-xs h-48 object-cover rounded-lg border-2 border-green-500" 
                  />
                )}
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
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${corFile ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
              <span className="text-2xl">{corFile ? "✅" : "⬜"}</span>
              <span className="font-medium">COR</span>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${idPhoto ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
              <span className="text-2xl">{idPhoto ? "✅" : "⬜"}</span>
              <span className="font-medium">ID Photo</span>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${faceFront ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
              <span className="text-2xl">{faceFront ? "✅" : "⬜"}</span>
              <span className="font-medium">Front</span>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${faceLeft ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
              <span className="text-2xl">{faceLeft ? "✅" : "⬜"}</span>
              <span className="font-medium">Left</span>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${faceRight ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
              <span className="text-2xl">{faceRight ? "✅" : "⬜"}</span>
              <span className="font-medium">Right</span>
            </div>
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={!allCaptured || submitting}
            className={`w-full py-6 text-lg ${
              allCaptured && !submitting
                ? 'bg-[#b32032] hover:bg-[#8b1828]'
                : 'bg-gray-300'
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit Validation Request'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
