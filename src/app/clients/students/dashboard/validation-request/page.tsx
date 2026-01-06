"use client";

import { useEffect, useState, useRef } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { db, auth, app } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const STUDENTS_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_STUDENTS_COLLECTION || "students";
const VALIDATION_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_VALIDATION_COLLECTION || "validation_requests";

export default function IdValidationPage() {
  const [tab, setTab] = useState<"info" | "notice" | "id" | "face">("info");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);

  // Additional fields from validation document
  const [email, setEmail] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [requestTime, setRequestTime] = useState<Date | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [tupId, setTupId] = useState<string | null>(null);
  const [selfiePreviews, setSelfiePreviews] = useState<{ front?: string | null; back?: string | null; left?: string | null; }>({});
  const [corPreview, setCorPreview] = useState<string | null>(null);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const storage = getStorage(app);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(u);
      try {
        const studentRef = doc(db, STUDENTS_COLLECTION, u.uid);
        const snap = await getDoc(studentRef);
        if (snap.exists()) setProfile(snap.data());

        const valRef = doc(db, VALIDATION_COLLECTION, u.uid);
        const valSnap = await getDoc(valRef);
        if (valSnap.exists()) {
          const data: any = valSnap.data();
          setStatus(data.status || null);

          // ID picture (support older and newer field names)
          const idUrl = data.idPictureUrl || data.idPicture || null;
          if (idUrl) setIdPreview(idUrl);

          // Face capture (legacy single capture)
          const faceUrl = data.faceCaptureUrl || null;
          if (faceUrl) setFacePreview(faceUrl);

          // Selfie pictures map (front/back/left)
          const selfies = data.selfiePictures || {};
          setSelfiePreviews({
            front: selfies.front || null,
            back: selfies.back || null,
            left: selfies.left || null,
          });

          // COR picture if present
          const corUrl = data.corPicture || data.corPictureUrl || null;
          if (corUrl) setCorPreview(corUrl);

          // Other metadata
          setEmail(data.email || u.email || null);
          setPhoneNumber(data.phoneNumber || data.phone || null);
          setRequestTime(data.requestTime ? (data.requestTime.toDate ? data.requestTime.toDate() : new Date(data.requestTime)) : null);
          setStudentName(data.studentName || `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || null);
          setTupId(data.tupId || data.tupId || profile?.studentId || profile?.studentNumber || null);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load profile or validation status");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const handleIdUpload = async (file: File | null) => {
    if (!file || !user) return;
    setError(null);
    try {
      const path = `validation_requests/${user.uid}/id-${Date.now()}-${file.name}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      const ref = doc(db, VALIDATION_COLLECTION, user.uid);
      await setDoc(ref, {
        idPictureUrl: url,
        idPicture: url, // compatibility
        status: "id_submitted",
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setIdPreview(url);
      setStatus("id_submitted");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Upload failed");
    }
  };

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (err: any) {
      console.error(err);
      setError("Unable to access camera");
    }
  };

  const stopCamera = () => {
    setCameraOn(false);
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current || !user) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.95));
    if (!blob) return;

    try {
      const path = `validation_requests/${user.uid}/face-${Date.now()}.jpg`;
      const r = storageRef(storage, path);
      await uploadBytes(r, blob);
      const url = await getDownloadURL(r);
      const ref = doc(db, VALIDATION_COLLECTION, user.uid);
      await setDoc(ref, {
        faceCaptureUrl: url,
        status: "face_submitted",
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Also set selfiePictures.front to support multi-angle format
      try {
        await updateDoc(ref, { 'selfiePictures.front': url });
      } catch (e) {
        // ignore update failure
        console.warn('Could not set selfiePictures.front', e);
      }

      setFacePreview(url);
      setSelfiePreviews((s) => ({ ...s, front: url }));
      setStatus("face_submitted");
      stopCamera();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Capture failed");
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-white sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-lg text-red-700">ID Validation Request</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="max-w-5xl w-full mx-auto">
            <Card className="mb-4 border-red-200 p-4 md:p-6">
              <CardHeader className="bg-red-50 -mx-4 -mt-4 p-4 md:-mx-6 md:-mt-6 md:p-6 rounded-t-md">
                <CardTitle className="text-red-700">Important</CardTitle>
                <CardDescription>Please follow these instructions to avoid rejection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                  <p className="text-sm text-red-900"><strong>Important:</strong> Upload a clear, unedited photo of your current school ID. Make sure all text is legible and your photo is within the ID frame.</p>
                </div>
                <div className="rounded-lg bg-white p-4 border mt-3">
                  <h4 className="font-semibold">Tips</h4>
                  <ul className="text-sm list-disc ml-5">
                    <li>Ensure good lighting and no glare.</li>
                    <li>Use a plain background when taking the ID photo or face capture.</li>
                    <li>Do not submit screenshots or heavily cropped images.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-4 border-red-200 p-4 md:p-6">
              <CardHeader className="bg-red-50 -mx-4 -mt-4 p-4 md:-mx-6 md:-mt-6 md:p-6 rounded-t-md">
                <CardTitle className="text-red-700">Validation Status</CardTitle>
                <CardDescription>Current request status</CardDescription>
              </CardHeader>
              <CardContent>
                {status ? (
                  <div className="space-y-3">
                    <p className="text-sm"><strong>Status:</strong> <span className={`uppercase ${((status||'').toLowerCase().includes('pending')) ? 'text-red-700 font-semibold' : ((status||'').toLowerCase().includes('approved')) ? 'text-green-600 font-semibold' : 'text-gray-700'}`}>{status}</span></p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm"><strong>Name:</strong> {studentName || profile?.firstName + ' ' + profile?.lastName}</p>
                        <p className="text-sm"><strong>Student ID:</strong> {tupId || profile?.studentId || profile?.studentNumber}</p>
                        <p className="text-sm"><strong>Email:</strong> {email || profile?.email}</p>
                        <p className="text-sm"><strong>Phone:</strong> {phoneNumber || profile?.phone || 'N/A'}</p>
                        <p className="text-sm"><strong>Submitted:</strong> <span className="ml-2 text-red-700 font-medium">{requestTime ? requestTime.toLocaleString() : 'N/A'}</span></p>
                      </div>

                      <div className="space-y-2">
                        {idPreview ? (
                          <div>
                            <p className="text-sm font-semibold">ID Photo</p>
                            <img src={idPreview} alt="ID preview" className="mt-2 rounded border" />
                          </div>
                        ) : (
                          <div className="text-sm text-red-700">No ID submitted yet.</div>
                        )}

                        <div>
                          <p className="text-sm font-semibold">Selfie Photos</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {selfiePreviews.front ? <img src={selfiePreviews.front} alt="selfie-front" className="w-24 h-24 object-cover rounded border" /> : <div className="w-24 h-24 bg-gray-50 rounded border flex items-center justify-center text-xs">Front</div>}
                            {selfiePreviews.back ? <img src={selfiePreviews.back} alt="selfie-back" className="w-24 h-24 object-cover rounded border" /> : <div className="w-24 h-24 bg-gray-50 rounded border flex items-center justify-center text-xs">Back</div>}
                            {selfiePreviews.left ? <img src={selfiePreviews.left} alt="selfie-left" className="w-24 h-24 object-cover rounded border" /> : <div className="w-24 h-24 bg-gray-50 rounded border flex items-center justify-center text-xs">Left</div>}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-semibold">COR (Certificate of Registration)</p>
                          {corPreview ? (
                            <div className="mt-2"><img src={corPreview} alt="cor" className="max-w-full rounded border" /></div>
                          ) : (
                            <div className="mt-2 text-sm text-gray-600">No COR submitted yet.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">No validation request submitted yet.</div>
                )}
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Card className="p-4 md:p-6">
              <CardHeader className="bg-white">
                <CardTitle className="text-lg text-red-700">{tab === 'id' ? 'ID Submission' : 'Face Capture'}</CardTitle>
                <CardDescription>
                  {tab === 'id' ? 'Upload a clear photo of your school ID (front).' : 'Capture a live photo for face verification.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tab === 'id' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">Submit a photo of your school ID (front). Accepted formats: JPG, PNG. Max size: 5MB.</p>
                    <div className="mt-3">
                      <input type="file" accept="image/*" onChange={(e) => handleIdUpload(e.target.files ? e.target.files[0] : null)} />
                      {idPreview && <div className="mt-3"><img src={idPreview} className="max-w-full rounded border" alt="id" /></div>}

                      <div className="mt-4 border rounded p-3 bg-red-50">
                        <p className="text-sm text-red-900"><strong>Note:</strong> COR (Certificate of Registration) uploads will be available soon. For now, please make sure your ID submission is clear and legible.</p>
                        <div className="mt-2">
                          <Button disabled variant="outline">Upload COR (coming soon)</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'face' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">Use your device camera to capture a clear face photo.</p>
                    <div className="mt-3 space-y-2">
                      {!cameraOn ? (
                        <Button onClick={startCamera} className="bg-red-600">Start Camera</Button>
                      ) : (
                        <div>
                          <video ref={videoRef} autoPlay playsInline className="w-full max-w-md rounded border" />
                          <div className="flex gap-2 mt-2">
                            <Button onClick={captureFace} className="bg-red-600">Capture</Button>
                            <Button onClick={stopCamera} variant="outline">Stop</Button>
                          </div>
                        </div>
                      )}
                      <canvas ref={canvasRef} className="hidden" />
                      {facePreview && <div className="mt-3"><img src={facePreview} className="max-w-full rounded border" alt="face" /></div>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2 mt-4">
              <Button onClick={() => setTab('id')} variant={tab==='id'? 'default' : 'outline'} className={tab==='id' ? 'bg-red-600' : ''}>ID Submission</Button>
              <Button onClick={() => setTab('face')} variant={tab==='face'? 'default' : 'outline'} className={tab==='face' ? 'bg-red-600' : ''}>Face Capture</Button>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}