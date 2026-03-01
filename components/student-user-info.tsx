"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { db, auth, app } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { ArrowLeft, CheckCircle2, XCircle, ShieldCheck, ShieldX, Clock } from "lucide-react";

const STUDENTS_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_STUDENTS_COLLECTION || "students";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ValidationHistoryEntry {
  id: string;
  semester: string;
  schoolYear: string;
  status: "validated" | "not_validated";
  date: any; // Firestore Timestamp or Date
  validatedBy: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(val: any): string {
  if (!val) return "—";
  // Firestore Timestamp
  if (val?.toDate) return val.toDate().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  // ISO string or Date
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ── Validation History Section ────────────────────────────────────────────────
function ValidationHistorySection({ profileDocId }: { profileDocId: string }) {
  const [history, setHistory] = useState<ValidationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileDocId) return;

    async function fetchHistory() {
      try {
        const histRef = collection(db, "student_profiles", profileDocId, "validation_history");
        const q = query(histRef, orderBy("date", "desc"));
        const snap = await getDocs(q);
        const entries: ValidationHistoryEntry[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ValidationHistoryEntry, "id">),
        }));
        setHistory(entries);
      } catch (err) {
        console.error("Failed to fetch validation history:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [profileDocId]);

  return (
    <div className="pt-4 border-t border-gray-200">
      <h3 className="text-sm font-bold text-[#b32032] mb-4 uppercase tracking-wide flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Validation History
      </h3>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50">
          <Clock className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm font-medium">No validation history yet</p>
          <p className="text-xs mt-1">Your validation records will appear here each semester.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const isValidated = entry.status === "validated";
            return (
              <div
                key={entry.id}
                className={`flex items-start gap-4 rounded-lg border px-4 py-3 transition-colors ${
                  isValidated
                    ? "border-green-200 bg-green-50"
                    : "border-red-100 bg-red-50/40"
                }`}
              >
                {/* Icon */}
                <div className={`mt-0.5 flex-shrink-0 rounded-full p-1.5 ${
                  isValidated ? "bg-green-100" : "bg-red-100"
                }`}>
                  {isValidated
                    ? <ShieldCheck className="w-4 h-4 text-green-600" />
                    : <ShieldX className="w-4 h-4 text-[#b32032]" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-800">
                      {entry.semester} Semester — {entry.schoolYear}
                    </span>
                    <Badge
                      className={`text-xs px-2 py-0.5 font-semibold ${
                        isValidated
                          ? "bg-green-600 text-white border-0"
                          : "bg-[#b32032] text-white border-0"
                      }`}
                    >
                      {isValidated ? "Validated" : "Not Validated"}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-0.5">
                    <span>{formatDate(entry.date)}</span>
                    {isValidated && entry.validatedBy && (
                      <span>Validated by: <span className="font-medium text-gray-700">{entry.validatedBy}</span></span>
                    )}
                  </div>
                </div>

                {/* Status icon on the right (desktop) */}
                <div className="hidden sm:flex flex-shrink-0 items-center self-center">
                  {isValidated
                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                    : <XCircle className="w-5 h-5 text-[#b32032]" />
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function StudentUserInfo() {
  const router = useRouter();
  const [profile, setProfile] = useState<any | null>(null);
  const [profileDocId, setProfileDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const storage = getStorage(app);

  const goBackToDashboard = () => router.push("/clients/students/dashboard");

  async function fetchAndDisplayUserProfile(uid: string) {
    try {
      setLoading(true);

      let profileData: any = null;
      let docId: string | null = null;

      const profileQuery = query(
        collection(db, "student_profiles"),
        where("uid", "==", uid)
      );
      const profileSnap = await getDocs(profileQuery);

      if (!profileSnap.empty) {
        profileData = profileSnap.docs[0].data();
        docId = profileSnap.docs[0].id;
      } else {
        const studentRef = doc(db, STUDENTS_COLLECTION, uid);
        const snap = await getDoc(studentRef);
        if (snap.exists()) {
          profileData = snap.data();
          docId = snap.id;
        }
      }

      if (profileData) {
        setProfile(profileData);
        setEditingData(profileData);
        setProfileDocId(docId);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  function updateUserField(field: string, value: string) {
    setEditingData((prev: any) => ({ ...prev, [field]: value }));
  }

  async function saveProfileChanges() {
    if (!auth.currentUser) {
      setError("You must be signed in to save changes.");
      return;
    }
    try {
      setIsSaving(true);
      const profileQuery = query(
        collection(db, "student_profiles"),
        where("uid", "==", auth.currentUser.uid)
      );
      const profileSnap = await getDocs(profileQuery);
      if (profileSnap.empty) { setError("Profile not found"); return; }

      await updateDoc(profileSnap.docs[0].ref, {
        fullName: editingData.fullName,
        phone: editingData.phone,
        birthDate: editingData.birthDate,
        guardianPhoneNumber: editingData.guardianPhoneNumber,
      });

      setProfile(editingData);
      setEditMode(false);
    } catch (err: any) {
      setError("Failed to save changes: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const handleAvatarUpload = async (file: File | null) => {
    setAvatarError(null);
    if (!file || !auth.currentUser) return;
    if (file.size > 5 * 1024 * 1024) { setAvatarError("File is too large. Max 5MB."); return; }
    try {
      setUploadingAvatar(true);
      const user = auth.currentUser;
      const path = `students/${user.uid}/avatar-${Date.now()}-${file.name}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await updateDoc(doc(db, STUDENTS_COLLECTION, user.uid), { avatar: url });
      setProfile((p: any) => ({ ...(p || {}), avatar: url }));
      setEditingData((p: any) => ({ ...(p || {}), avatar: url }));
    } catch (err: any) {
      setAvatarError(err?.message || "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setProfile(null); setEditingData(null); setLoading(false); return; }
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
          ) : profile ? (
            <div className="flex items-center gap-4">
              <label htmlFor="avatarUpload" className="cursor-pointer inline-block">
                <div className="rounded-full p-1 bg-red-50 hover:bg-red-100 transition-colors">
                  <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-red-200 bg-white flex items-center justify-center shadow-sm ring-2 ring-red-200">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-red-700 font-bold text-2xl">
                        {profile.fullName ? profile.fullName[0].toUpperCase() : "S"}
                      </div>
                    )}
                  </div>
                </div>
              </label>
              <input
                id="avatarUpload" type="file" accept="image/*" className="hidden"
                onChange={(e) => handleAvatarUpload(e.target.files ? e.target.files[0] : null)}
                disabled={uploadingAvatar}
              />
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-2xl md:text-3xl font-bold text-red-700 leading-tight">{profile.fullName}</span>
                  {profile.isValidated ? (
                    <Badge className="bg-gradient-to-r from-green-600 to-green-700 text-white gap-1.5 px-3 py-1 text-sm font-semibold shadow-md border border-green-500/50">
                      <CheckCircle2 className="w-4 h-4" /> ID Validated
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gradient-to-r from-[#b32032] to-[#951928] text-white gap-1.5 px-3 py-1 text-sm font-semibold shadow-md border border-red-400/50">
                      <XCircle className="w-4 h-4" /> Not Yet Validated
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
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          ) : profile ? (
            <div className="space-y-6">
              {/* ── User Information ── */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-bold text-[#b32032] mb-4 uppercase tracking-wide">User Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Full Name *</label>
                    {editMode ? (
                      <input type="text" value={editingData?.fullName || ""} onChange={(e) => updateUserField("fullName", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b32032]" />
                    ) : (
                      <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900">{profile.fullName}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Student ID</label>
                    <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-600">{profile.studentNumber}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Birth Date *</label>
                    {editMode ? (
                      <input type="date" value={editingData?.birthDate || ""} onChange={(e) => updateUserField("birthDate", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b32032]" />
                    ) : (
                      <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900">{profile.birthDate || "Not provided"}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Email (Verified — Cannot be changed) *</label>
                    <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-900 cursor-not-allowed">{profile.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Student Phone Number *</label>
                    {editMode ? (
                      <input type="tel" value={editingData?.phone || ""} onChange={(e) => updateUserField("phone", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b32032]" />
                    ) : (
                      <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900">{profile.phone || "Not provided"}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Student Number</label>
                    <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-600">{profile.studentNumber || profile.tup_id || "N/A"}</div>
                  </div>
                </div>
              </div>

              {/* ── Guardian Information ── */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-bold text-[#b32032] mb-4 uppercase tracking-wide">Guardian Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Guardian Email (Verified — Cannot be changed) *</label>
                    <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-900 cursor-not-allowed">{profile.guardianEmail || "Not provided"}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#b32032] mb-2">Guardian Phone Number *</label>
                    {editMode ? (
                      <input type="tel" value={editingData?.guardianPhoneNumber || ""} onChange={(e) => updateUserField("guardianPhoneNumber", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b32032]" />
                    ) : (
                      <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900">{profile.guardianPhoneNumber || "Not provided"}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Validation History ── */}
              {profileDocId && <ValidationHistorySection profileDocId={profileDocId} />}

              {/* ── Actions ── */}
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button onClick={saveProfileChanges} disabled={isSaving} className="bg-[#b32032] hover:bg-[#8b1828] text-white">
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button onClick={() => { setEditMode(false); setEditingData(profile); }} variant="outline" disabled={isSaving}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditMode(true)} className="bg-[#b32032] hover:bg-[#8b1828] text-white">
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