'use client';

import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, getStorage } from 'firebase/storage';
import { auth, db } from "@/lib/firebaseConfig";
import WebcamCapture from './webcam-capture';

export default function ValidationRequestForm() {
  const auth = getAuth();
  const storage = getStorage();
  const currentUser = auth.currentUser;

  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  
  const [corFile, setCorFile] = useState<File | null>(null);
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [faceFront, setFaceFront] = useState<string | null>(null);
  const [faceLeft, setFaceLeft] = useState<string | null>(null);
  const [faceRight, setFaceRight] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check for existing request
  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!currentUser) {
        setCheckingExisting(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'id_validation_requests'),
          where('studentId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const request = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          setExistingRequest(request);
        }
      } catch (err) {
        console.error('Error checking existing request:', err);
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingRequest();
  }, [currentUser]);

  const handleCorUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('COR file must be less than 10MB');
        return;
      }
      setCorFile(file);
      setError(null);
    }
  };

  const uploadBase64Image = async (base64: string, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadString(storageRef, base64, 'data_url');
    return await getDownloadURL(storageRef);
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await uploadString(storageRef, base64, 'data_url');
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('You must be logged in to submit a validation request');
      return;
    }

    if (!corFile || !idPhoto || !faceFront || !faceLeft || !faceRight) {
      setError('Please complete all required fields and captures');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const timestamp = Date.now();
      const studentId = currentUser.uid;

      console.log('Starting upload...');

      const [corURL, idPhotoURL, faceFrontURL, faceLeftURL, faceRightURL] = await Promise.all([
        uploadFile(corFile, `validation-documents/${studentId}/cor_${timestamp}.pdf`),
        uploadBase64Image(idPhoto, `validation-documents/${studentId}/id_photo_${timestamp}.jpg`),
        uploadBase64Image(faceFront, `validation-documents/${studentId}/face_front_${timestamp}.jpg`),
        uploadBase64Image(faceLeft, `validation-documents/${studentId}/face_left_${timestamp}.jpg`),
        uploadBase64Image(faceRight, `validation-documents/${studentId}/face_right_${timestamp}.jpg`),
      ]);

      console.log('Files uploaded successfully');

      await addDoc(collection(db, 'id_validation_requests'), {
        studentId,
        corURL,
        idPhotoURL,
        faceFrontURL,
        faceLeftURL,
        faceRightURL,
        status: 'pending',
        remarks: null,
        reviewedBy: null,
        requestedAt: serverTimestamp(),
        reviewedAt: null,
      });

      console.log('Request submitted successfully');

      setSuccess(true);
      
      setCorFile(null);
      setIdPhoto(null);
      setFaceFront(null);
      setFaceLeft(null);
      setFaceRight(null);

    } catch (err: any) {
      console.error('Error submitting validation request:', err);
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (existingRequest) {
    if (existingRequest.status === 'pending') {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-yellow-800 mb-2">
            ⏳ Request Pending
          </h3>
          <p className="text-yellow-700">
            Your ID validation request is currently under review. 
            Please wait for admin approval.
          </p>
        </div>
      );
    }

    if (existingRequest.status === 'approved') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-green-800 mb-2">
            ✅ ID Validated
          </h3>
          <p className="text-green-700">
            Your ID has been validated and approved!
          </p>
        </div>
      );
    }

    if (existingRequest.status === 'rejected') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-red-800 mb-2">
            ❌ Request Rejected
          </h3>
          <p className="text-red-700 mb-4">
            Your validation request was rejected.
          </p>
          {existingRequest.remarks && (
            <div className="bg-white p-4 rounded-lg mb-4">
              <p className="font-semibold text-gray-700">Reason:</p>
              <p className="text-gray-600">{existingRequest.remarks}</p>
            </div>
          )}
          <button
            onClick={() => setExistingRequest(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Submit New Request
          </button>
        </div>
      );
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h3 className="text-xl font-bold text-green-800 mb-2">
          ✅ Validation Request Submitted!
        </h3>
        <p className="text-green-700">
          Your ID validation request has been submitted successfully. 
          Please wait for admin approval.
        </p>
      </div>
    );
  }

  const allCaptured = corFile && idPhoto && faceFront && faceLeft && faceRight;

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-2">ID Validation Request</h2>
          <p className="text-gray-600 mb-6">
            Please upload your Certificate of Registration and capture the required photos.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Certificate of Registration (COR) *
            </label>
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
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <span>✅</span>
                <span>{corFile.name}</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              ID Photo *
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Capture a clear photo of your school ID
            </p>
            <WebcamCapture
              label={idPhoto ? "✅ Retake ID Photo" : "📸 Capture ID Photo"}
              onCapture={setIdPhoto}
              useBackCamera={true}
            />
            {idPhoto && (
              <img 
                src={idPhoto} 
                alt="ID" 
                className="mt-3 w-40 h-40 object-cover rounded-lg border-2 border-green-500" 
              />
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Face Photos (3 angles) *
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Capture clear photos of your face from three different angles
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm font-medium mb-2">Front View</p>
                <WebcamCapture
                  label={faceFront ? "✅ Retake" : "📸 Front"}
                  onCapture={setFaceFront}
                  useBackCamera={false}
                />
                {faceFront && (
                  <img 
                    src={faceFront} 
                    alt="Front" 
                    className="mt-2 w-full h-32 object-cover rounded-lg border-2 border-green-500" 
                  />
                )}
              </div>

              <div className="text-center">
                <p className="text-sm font-medium mb-2">Left View</p>
                <WebcamCapture
                  label={faceLeft ? "✅ Retake" : "📸 Left"}
                  onCapture={setFaceLeft}
                  useBackCamera={false}
                />
                {faceLeft && (
                  <img 
                    src={faceLeft} 
                    alt="Left" 
                    className="mt-2 w-full h-32 object-cover rounded-lg border-2 border-green-500" 
                  />
                )}
              </div>

              <div className="text-center">
                <p className="text-sm font-medium mb-2">Right View</p>
                <WebcamCapture
                  label={faceRight ? "✅ Retake" : "📸 Right"}
                  onCapture={setFaceRight}
                  useBackCamera={false}
                />
                {faceRight && (
                  <img 
                    src={faceRight} 
                    alt="Right" 
                    className="mt-2 w-full h-32 object-cover rounded-lg border-2 border-green-500" 
                  />
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!allCaptured || loading}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              allCaptured && !loading
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Submitting...
              </span>
            ) : (
              'Submit Validation Request'
            )}
          </button>

          {!allCaptured && (
            <p className="text-sm text-gray-500 text-center mt-2">
              Please complete all required fields to submit
            </p>
          )}
        </div>
      </form>
    </div>
  );
}