'use client';

import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { db } from "@/lib/firebaseConfig";

export default function ValidationRequestForm() {
  const auth = getAuth();
  const storage = getStorage();
  const currentUser = auth.currentUser;

  const [tupId, setTupId] = useState<string>("");
  const [course, setCourse] = useState<string>("");
  const [yearLevel, setYearLevel] = useState<string>("");
  const [idFile, setIdFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(true);

  // Load TUP ID from users collection
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) {
        setLoadingUserData(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setTupId(userData.tup_id || "");
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        setLoadingUserData(false);
      }
    };

    loadUserData();
  }, [currentUser]);

  const handleIdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('ID file must be less than 10MB');
        return;
      }
      setIdFile(file);
      setError(null);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('You must be logged in to submit a validation request');
      return;
    }

    if (!tupId || !course || !yearLevel || !idFile) {
      setError('Please complete all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const timestamp = Date.now();
      const filename = `${tupId}_${timestamp}.${idFile.name.split('.').pop()}`;

      console.log('Starting upload...');

      // Upload file to Storage Bucket: id_uploads/{tup_id}/{filename}
      const fileURL = await uploadFile(
        idFile, 
        `id_uploads/${tupId}/${filename}`
      );

      console.log('File uploaded successfully to:', fileURL);

      // Save to id_validations collection using TUP ID as document ID
      // Using merge: false to completely overwrite any existing document
      await setDoc(
        doc(db, 'id_validations', tupId), 
        {
          tup_id: tupId,
          course: course,
          year_level: yearLevel,
          file_upload: fileURL,
          status: 'pending',
          remarks: null,
          reviewedBy: null,
          requestedAt: serverTimestamp(),
          reviewedAt: null,
        },
        { merge: false } // Overwrite existing document entirely
      );

      console.log('Request submitted successfully');

      setSuccess(true);
      
      // Clear form
      setCourse("");
      setYearLevel("");
      setIdFile(null);

    } catch (err: any) {
      console.error('Error submitting validation request:', err);
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingUserData) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h3 className="text-xl font-bold text-green-800 mb-2">
          ✅ Validation Request Submitted!
        </h3>
        <p className="text-green-700 mb-4">
          Your ID validation request has been submitted successfully. 
          Any previous request has been replaced with this new one.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  const allFieldsFilled = tupId && course && yearLevel && idFile;

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-2">ID Validation Request</h2>
          <p className="text-gray-600 mb-2">
            Please complete the form and upload your ID document.
          </p>
          <p className="text-sm text-amber-600 mb-6">
            ⚠️ Note: Submitting a new request will overwrite any previous request.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                TUP ID
              </label>
              <input
                type="text"
                value={tupId}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your TUP ID is automatically loaded from your account
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Course *
              </label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="" disabled>Select course</option>
                {["BSCS", "BSIT", "BSECE", "BSEE", "BSME", "BSCE"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Year Level *
              </label>
              <select
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="" disabled>Select year level</option>
                {["1", "2", "3", "4", "5"].map((year) => (
                  <option key={year} value={year}>Year {year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                ID Document Upload *
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleIdFileUpload}
                className="block w-full text-sm text-gray-500 
                  file:mr-4 file:py-2 file:px-4 
                  file:rounded-lg file:border-0 
                  file:text-sm file:font-semibold 
                  file:bg-blue-50 file:text-blue-700 
                  hover:file:bg-blue-100 
                  cursor-pointer"
                required
              />
              {idFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <span>✅</span>
                  <span>{idFile.name}</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!allFieldsFilled || loading}
            className={`w-full mt-6 py-3 rounded-lg font-semibold transition-colors ${
              allFieldsFilled && !loading
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

          {!allFieldsFilled && (
            <p className="text-sm text-gray-500 text-center mt-2">
              Please complete all required fields to submit
            </p>
          )}
        </div>
      </form>
    </div>
  );
}