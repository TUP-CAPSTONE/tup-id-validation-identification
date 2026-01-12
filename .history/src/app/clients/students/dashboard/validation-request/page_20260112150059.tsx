"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/student-app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WebcamCapture from '@/components/webcam-capture';
import { auth, db } from "@/lib/firebaseConfig";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ValidationRequestPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [corFile, setCorFile] = useState<string | null>(null);
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [faceFront, setFaceFront] = useState<string | null>(null);
  const [faceLeft, setFaceLeft] = useState<string | null>(null);
  const [faceRight, setFaceRight] = useState<string | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check auth and existing request - FIXED: using useEffect instead of useState
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      try {
        // Get student profile
        const studentDocRef = doc(db, 'students', user.uid);
        const studentSnap = await getDoc(studentDocRef);
        
        if (studentSnap.exists()) {
          setStudentProfile(studentSnap.data());
        }

        // Check for existing validation request
        const q = query(
          collection(db, 'validation_requests'),
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
  }, []); // Empty dependency array - runs once on mount

  // Convert file to base64
  const handleCorUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Max 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCorFile(reader.result as string);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      setError('You must be logged in');
      return;
    }

    if (!corFile || !idPhoto || !faceFront || !faceLeft || !faceRight) {
      setError('Please complete all required fields and captures');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create document in Firestore with base64 data
      await addDoc(collection(db, 'validation_requests'), {
        studentId: currentUser.uid,
        tupId: studentProfile?.studentId || 'N/A',
        studentName: `${studentProfile?.firstName || ''} ${studentProfile?.lastName || ''}`.trim() || 'Unknown',
        email: currentUser.email,
        phoneNumber: studentProfile?.phone || '',
        
        // Store base64 strings directly
        cor: corFile,
        idPicture: idPhoto,
        
        selfiePictures: {
          front: faceFront,
          left: faceLeft,
          back: faceRight
        },
        
        status: 'pending',
        requestTime: serverTimestamp()
      });

      setSuccess(true);
      
      // Reset form
      setCorFile(null);
      setIdPhoto(null);
      setFaceFront(null);
      setFaceLeft(null);
      setFaceRight(null);

    } catch (err: any) {
      console.error('Error submitting:', err);
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p>Loading...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!currentUser) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="text-red-700">Authentication Required</CardTitle>
                <CardDescription>Please log in to access this page.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Show existing request status
  if (existingRequest && !success) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="bg-white sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-lg text-red-700">ID Validation Request</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-6">
            <div className="mx-auto w-full max-w-6xl">
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-yellow-800">
                    {existingRequest.status === 'pending' && '⏳ Request Pending'}
                    {existingRequest.status === 'approved' && '✅ Request Approved'}
                    {existingRequest.status === 'rejected' && '❌ Request Rejected'}
                  </CardTitle>
                  <CardDescription>
                    {existingRequest.status === 'pending' && 'Your validation request is being reviewed.'}
                    {existingRequest.status === 'approved' && 'Your ID has been validated!'}
                    {existingRequest.status === 'rejected' && 'Your request was rejected. Please submit a new one.'}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Success message
  if (success) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="bg-white sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-lg text-red-700">ID Validation Request</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-6">
            <div className="mx-auto w-full max-w-6xl">
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">✅ Request Submitted Successfully!</CardTitle>
                  <CardDescription>Your validation request has been submitted. Please wait for admin approval.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const allCaptured = corFile && idPhoto && faceFront && faceLeft && faceRight;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-white sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-lg text-red-700">ID Validation Request</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-red-700">{error}</p>
                </CardContent>
              </Card>
            )}

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
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gray-300'
                  }`}
                >
                  {submitting ? 'Submitting...' : 'Submit Validation Request'}
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}