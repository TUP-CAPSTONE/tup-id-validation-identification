"use client";

import { useEffect, useState } from "react";
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
import { db, auth, app } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const STUDENTS_COLLECTION = process.env.NEXT_PUBLIC_FIRESTORE_STUDENTS_COLLECTION || "students";

export default function UserInfoPage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingValidation, setUpcomingValidation] = useState<any | null>(null);

  // OSA / Offenses
  const [offenses, setOffenses] = useState<Array<any>>([]);
  const [offensesLoading, setOffensesLoading] = useState<boolean>(false);
  const [offensesError, setOffensesError] = useState<string | null>(null);

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const storage = getStorage(app);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setProfile(null);
        setUpcomingValidation(null);
        setLoading(false);
        return;
      }

      try {
        const studentRef = doc(db, process.env.NEXT_PUBLIC_FIRESTORE_STUDENTS_COLLECTION || "students", u.uid);
        const snap = await getDoc(studentRef);
        if (snap.exists()) setProfile(snap.data());

        // Fetch upcoming validation schedule (settings/validation)
        try {
          const settingsRef = doc(db, 'settings', 'validation');
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) setUpcomingValidation(settingsSnap.data());
        } catch (err) {
          console.warn('Failed to load validation schedule', err);
        }

        // Fetch OSA offenses - try subcollection first, then fallback to collection query
        try {
          setOffensesLoading(true);
          setOffensesError(null);

          // 1) students/{uid}/offenses
          const subCol = collection(db, 'students', u.uid, 'offenses');
          const subSnap = await getDocs(subCol);
          if (!subSnap.empty) {
            const list: any[] = [];
            subSnap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
            setOffenses(list.sort((a,b) => (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0)));
          } else {
            // 2) collection student_offenses where uid == u.uid
            const q = query(collection(db, 'student_offenses'), where('uid', '==', u.uid));
            const qSnap = await getDocs(q);
            const list: any[] = [];
            qSnap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
            setOffenses(list.sort((a,b) => (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0)));
          }
        } catch (err: any) {
          console.warn('Could not load offenses', err);
          setOffensesError('Failed to load OSA records');
        } finally {
          setOffensesLoading(false);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

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

      // update local profile so UI updates immediately
      setProfile((p: any) => ({ ...(p || {}), avatar: url }));
    } catch (err: any) {
      console.error(err);
      setAvatarError(err?.message || "Upload failed");
    } finally {
      setUploadingAvatar(false);
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
                <BreadcrumbPage className="text-lg text-red-700">User Information</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 gap-6 p-4">
          <div className="w-full max-w-5xl">
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
                ) : error ? (
                  <div className="text-red-700 font-semibold">Unable to load profile</div>
                ) : (
                  profile ? (
                    <div className="flex items-center gap-4">
                      <label htmlFor="avatarUpload" className="cursor-pointer inline-block">
                        <div className="rounded-full p-1 bg-red-50 hover:bg-red-100 transition-all">
                          <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-red-200 bg-white flex items-center justify-center shadow-sm ring-2 ring-red-200">
                            {profile.avatar ? (
                              <img src={profile.avatar} alt="avatar" className="h-full w-full object-cover" />
                            ) : (
                              <div className="text-red-700 font-bold text-2xl">{(profile.firstName ? profile.firstName[0] : 'T')}{(profile.lastName ? profile.lastName[0] : 'U')}</div>
                            )}
                          </div>
                        </div>
                      </label>
                      <input id="avatarUpload" type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e.target.files ? e.target.files[0] : null)} />

                      <div>
                        <div className="text-xl font-semibold text-red-700">{profile.firstName} {profile.lastName}</div>
                        <div className="text-sm text-red-700">{profile.email}</div>
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
                  <div className="space-y-3">
                    <div className="mt-3">
                      <p><strong>Student ID:</strong> {profile.studentId || profile.studentNumber}</p>
                      <p><strong>Course:</strong> {profile.course || 'N/A'}</p>
                      <p><strong>Section:</strong> {profile.section || 'N/A'}</p>
                      <p><strong>Year Level:</strong> {profile.yearLevel || 'N/A'}</p>
                      <p><strong>Phone:</strong> {profile.phone || 'N/A'}</p>
                    </div>
                    <div className="mt-4">
                      <Button className="bg-red-600 hover:bg-red-700 text-white">Edit Profile</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">No profile found. Please contact support.</div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-4 border-red-200 p-4 md:p-6">
              <CardHeader className="bg-red-50 -mx-4 -mt-4 p-4 md:-mx-6 md:-mt-6 md:p-6 rounded-t-md">
                <CardTitle className="text-red-700">Upcoming Validation</CardTitle>
                <CardDescription>Next scheduled validation</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingValidation ? (
                  <div className="space-y-2">
                    {upcomingValidation.nextDate ? (
                      <p className="text-sm"><strong>Next Date:</strong> <span className="ml-2 inline-block bg-red-600 text-white text-sm px-2 py-1 rounded">{new Date(upcomingValidation.nextDate.toDate ? upcomingValidation.nextDate.toDate() : upcomingValidation.nextDate).toLocaleString()}</span></p>
                    ) : null}
                    {upcomingValidation.message && <p className="text-sm text-gray-700">{upcomingValidation.message}</p>}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">No upcoming validation scheduled.</div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6 border-red-200 p-4 md:p-6">
              <CardHeader className="bg-red-50 -mx-4 -mt-4 p-4 md:-mx-6 md:-mt-6 md:p-6 rounded-t-md">
                <CardTitle className="text-red-700">OSA Records</CardTitle>
                <CardDescription>Records from the Office of Student Affairs (disciplinary)</CardDescription>
              </CardHeader>
              <CardContent>
                {offensesLoading ? (
                  <p className="text-sm text-gray-600">Loading records...</p>
                ) : offensesError ? (
                  <p className="text-sm text-red-600">{offensesError}</p>
                ) : offenses.length === 0 ? (
                  <div className="text-sm text-green-700">No OSA records found.</div>
                ) : (
                  <div className="space-y-3">
                    {offenses.map((o) => (
                      <div key={o.id} className="border rounded p-3 bg-white">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <div className={`px-2 py-1 rounded text-sm ${o.severity === 'Major' ? 'bg-red-600 text-white' : 'bg-amber-200 text-amber-800'}`}>{o.severity || 'Minor'}</div>
                              <div className="font-semibold text-sm text-gray-800">{o.title || 'Offense'}</div>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">{o.date ? new Date(o.date).toLocaleString() : 'No date'}</div>
                          </div>
                          <div className="text-sm text-right">
                            <div className={`px-2 py-1 rounded text-sm ${o.status === 'Open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{o.status || 'Open'}</div>
                          </div>
                        </div>
                        {o.description && <div className="mt-2 text-sm text-gray-700">{o.description}</div>}
                        {o.attachments && Array.isArray(o.attachments) && o.attachments.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold mb-1">Attachments</p>
                            <div className="flex gap-2 flex-wrap">
                              {o.attachments.map((a: any, idx: number) => (
                                <a key={idx} href={a.url || a} target="_blank" rel="noreferrer" className="text-sm text-red-600 underline">View {a.name || 'file'}</a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}