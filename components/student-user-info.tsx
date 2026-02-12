"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { db, auth, app } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

const STUDENTS_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_STUDENTS_COLLECTION || "students";

export default function StudentUserInfo() {
  const router = useRouter();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const storage = getStorage(app);

  /**
   * Go back to main dashboard
   */
  const goBackToDashboard = () => {
    router.push('/clients/students/dashboard');
  };

  /**
   * Fetches user data from the backend and populates the UI
   */
  async function fetchAndDisplayUserProfile(uid: string) {
    try {
      setLoading(true);
      
      // Load from student_profiles (doc id is TUPID)
      let profileData: any = null;
      const profileQuery = query(
        collection(db, 'student_profiles'),
        where('uid', '==', uid)
      );
      const profileSnap = await getDocs(profileQuery);

      if (!profileSnap.empty) {
        profileData = profileSnap.docs[0].data();
      } else {
        // Fallback to old students collection
        const studentRef = doc(db, STUDENTS_COLLECTION, uid);
        const snap = await getDoc(studentRef);
        if (snap.exists()) {
          profileData = snap.data();
        }
      }

      if (profileData) {
        setProfile(profileData);
        setEditingData(profileData);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Allows editing and saving of individual user fields
   */
  function updateUserField(field: string, value: string) {
    setEditingData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  }

  /**
   * Sends updated user info to the server
   */
  async function saveProfileChanges() {
    if (!auth.currentUser) {
      setError("You must be signed in to save changes.");
      return;
    }

    try {
      setIsSaving(true);
      
      // Find the student profile document (doc id is TUPID)
      const profileQuery = query(
        collection(db, 'student_profiles'),
        where('uid', '==', auth.currentUser.uid)
      );
      const profileSnap = await getDocs(profileQuery);

      if (profileSnap.empty) {
        setError("Profile not found");
        return;
      }

      const profileDocRef = profileSnap.docs[0].ref;
      
      const updateData: any = {
        fullName: editingData.fullName,
        phone: editingData.phone,
        birthDate: editingData.birthDate,
        guardianPhoneNumber: editingData.guardianPhoneNumber,
      };

      await updateDoc(profileDocRef, updateData);

      console.log('Profile updated successfully');
      setProfile(editingData);
      setEditMode(false);
    } catch (err: any) {
      console.error('Error saving profile changes:', err);
      setError('Failed to save changes: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const handleAvatarUpload = async (file: File | null) => {
    setAvatarError(null);
    if (!file) return;
    if (!auth.currentUser) {
      setAvatarError("You must be signed in to upload an avatar.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("File is too large. Max 5MB.");
      return;
    }

    try {
      setUploadingAvatar(true);
      const user = auth.currentUser;
      const path = `students/${user.uid}/avatar-${Date.now()}-${file.name}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);

      const studentRef = doc(db, STUDENTS_COLLECTION, user.uid);
      await updateDoc(studentRef, { avatar: url });

      setProfile((p: any) => ({ ...(p || {}), avatar: url }));
      setEditingData((p: any) => ({ ...(p || {}), avatar: url }));
    } catch (err: any) {
      console.error(err);
      setAvatarError(err?.message || "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setProfile(null);
        setEditingData(null);
        setLoading(false);
        return;
      }

      await fetchAndDisplayUserProfile(u.uid);
    });

    return () => unsub();
  }, []);

  return (
    <div className="w-full max-w-5xl space-y-6">
      <Button 
        variant="outline" 
        onClick={goBackToDashboard}
        className="flex items-center gap-2 border-red-200 hover:bg-red-50"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Button>

      <Card className="border-red-200 p-4 md:p-6">
        <CardHeader className="bg-red-50 -mx-4 -mt-4 p-4 md:-mx-6 md:-mt-6 md:p-6 rounded-t-md">
          {loading ? (
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-red-100 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-48 bg-red-100 rounded mb-2 animate-pulse" />
                <div className="h-3 w-40 bg-red-100 rounded animate-pulse" />
              </div>
            </div>
          ) : error && loading ? (
            <div className="text-red-700 font-semibold">Unable to load profile</div>
          ) : (
            profile ? (
              <div className="flex items-center gap-4">
                <label htmlFor="avatarUpload" className="cursor-pointer inline-block">
                  <div className="rounded-full p-1 bg-red-50 hover:bg-red-100 transition-colors">
                    <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-red-200 bg-white flex items-center justify-center shadow-sm ring-2 ring-red-200">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt="avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="text-red-700 font-bold text-2xl">{profile.fullName ? profile.fullName[0].toUpperCase() : 'S'}</div>
                      )}
                    </div>
                  </div>
                </label>
                <input id="avatarUpload" type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e.target.files ? e.target.files[0] : null)} disabled={uploadingAvatar} />

                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-2xl md:text-3xl font-bold text-red-700 leading-tight">{profile.fullName}</span>
                    {profile.isValidated ? (
                      <Badge className="bg-gradient-to-r from-green-600 to-green-700 text-white gap-1.5 px-3 py-1 text-sm font-semibold shadow-md border border-green-500/50">
                        <CheckCircle2 className="w-4 h-4" />
                        ID Validated
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gradient-to-r from-[#b32032] to-[#951928] text-white gap-1.5 px-3 py-1 text-sm font-semibold shadow-md border border-red-400/50">
                        <XCircle className="w-4 h-4" />
                        Not Yet Validated
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm md:text-base text-red-700/90">{profile.email}</div>
                  <div className="text-xs text-red-600 mt-1">{profile.studentNumber}</div>
                  {uploadingAvatar && <div className="text-xs text-red-600 mt-1">Uploading...</div>}
                  {avatarError && <div className="text-xs text-red-600 mt-1">{avatarError}</div>}
                </div>
              </div>
            ) : (
              <div className="text-red-700 font-semibold">No profile found</div>
            )
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          ) : profile ? (
            <div className="space-y-6">
              <div className="space-y-6">
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-[#b32032] mb-4 uppercase tracking-wide">User Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Full Name *</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editingData?.fullName || ''}
                          onChange={(e) => updateUserField('fullName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b32032]"
                        />
                      ) : (
                        <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900">
                          {profile.fullName}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Student ID</label>
                      <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-600">
                        {profile.studentNumber}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Birth Date *</label>
                      {editMode ? (
                        <input
                          type="date"
                          value={editingData?.birthDate || ''}
                          onChange={(e) => updateUserField('birthDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b32032]"
                        />
                      ) : (
                        <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900">
                          {profile.birthDate || 'Not provided'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Email (Verified - Cannot be changed) *</label>
                      <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-900 cursor-not-allowed">
                        {profile.email}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Student Phone Number *</label>
                      {editMode ? (
                        <input
                          type="tel"
                          value={editingData?.phone || ''}
                          onChange={(e) => updateUserField('phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b32032]"
                        />
                      ) : (
                        <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900">
                          {profile.phone || 'Not provided'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Student Number</label>
                      <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-600">
                        {profile.studentNumber || profile.tup_id || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-[#b32032] mb-4 uppercase tracking-wide">Guardian Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Guardian Email (Verified - Cannot be changed) *</label>
                      <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-900 cursor-not-allowed">
                        {profile.guardianEmail || 'Not provided'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Guardian Phone Number *</label>
                      {editMode ? (
                        <input
                          type="tel"
                          value={editingData?.guardianPhoneNumber || ''}
                          onChange={(e) => updateUserField('guardianPhoneNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b32032]"
                        />
                      ) : (
                        <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900">
                          {profile.guardianPhoneNumber || 'Not provided'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>


                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Phone</label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={editingData?.phone || ''}
                      onChange={(e) => updateUserField('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b32032]"
                    />
                  ) : (
                    <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900">
                      {profile.phone || 'N/A'}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button 
                      onClick={saveProfileChanges} 
                      disabled={isSaving}
                      className="bg-[#b32032] hover:bg-[#8b1828] text-white"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      onClick={() => {
                        setEditMode(false);
                        setEditingData(profile);
                      }}
                      variant="outline"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => setEditMode(true)}
                    className="bg-[#b32032] hover:bg-[#8b1828] text-white"
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">No profile found. Please contact support.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
