"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { db, auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { StudentHandbookDialog } from "@/components/student-handbook-dialog";

export default function StudentMyOffenses() {
  const router = useRouter();
  const [offenses, setOffenses] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [handbookDialogOpen, setHandbookDialogOpen] = useState<boolean>(false);

  /**
   * Go back to main dashboard
   */
  const goBackToDashboard = () => {
    router.push('/clients/students/dashboard');
  };

  /**
   * Fetches OSA offenses from Firestore
   */
  async function fetchOffenses(uid: string) {
    try {
      setLoading(true);
      setError(null);

      // Query student_offenses collection
      const q = query(collection(db, 'student_offenses'), where('studentUid', '==', uid));
      const qSnap = await getDocs(q);
      const list: any[] = [];
      qSnap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      
      // Sort by date (newest first)
      setOffenses(list.sort((a, b) => {
        const dateA = a.dateRecorded ? new Date(a.dateRecorded.toDate ? a.dateRecorded.toDate() : a.dateRecorded).getTime() : 0;
        const dateB = b.dateRecorded ? new Date(b.dateRecorded.toDate ? b.dateRecorded.toDate() : b.dateRecorded).getTime() : 0;
        return dateB - dateA;
      }));
    } catch (err: any) {
      console.warn('Could not load offenses', err);
      setError('Failed to load offenses');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setOffenses([]);
        setLoading(false);
        return;
      }

      await fetchOffenses(u.uid);
    });

    return () => unsub();
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
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
          <CardTitle className="text-red-700">My Offenses</CardTitle>
          <CardDescription>Records from the Office of Student Affairs (disciplinary)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-600">Loading records...</p>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : offenses.length === 0 ? (
            <div className="text-sm text-green-700 py-4">No offenses found.</div>
          ) : (
            <div className="space-y-4 mt-4">
              {offenses.map((o) => (
                <div key={o.id} className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                  {/* Offense Title Header */}
                  <div className="mb-4 pb-3 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-red-700">{o.offenseTitle || 'Offense'}</h2>
                    {o.dateCommitted && (
                      <p className="text-xs text-gray-500 mt-1">
                        Date Committed: {new Date(o.dateCommitted.toDate ? o.dateCommitted.toDate() : o.dateCommitted).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Offense Information */}
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Offense Information</h3>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold text-gray-600">Category:</span>
                      <div className={`px-3 py-1 rounded text-xs font-semibold uppercase ${
                        o.offenseType === 'major' 
                          ? 'bg-red-600 text-white' 
                          : 'bg-amber-200 text-amber-800'
                      }`}>
                        {o.offenseType || 'minor'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 italic">
                      Reference:{" "}
                      <button
                        onClick={() => setHandbookDialogOpen(true)}
                        className="text-red-600 hover:text-red-800 underline hover:no-underline font-semibold transition-colors"
                      >
                        TUP Student Handbook - Rules on Conduct & Discipline
                      </button>
                    </div>
                  </div>

                  {/* Narrative */}
                  {o.offenseDescription && (
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Narrative</h3>
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                        {o.offenseDescription}
                      </div>
                    </div>
                  )}

                  {/* Sanction */}
                  {o.sanction && (
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Sanction</h3>
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-800">
                        {o.sanction}
                      </div>
                    </div>
                  )}

                  {/* Resolution Status */}
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Resolution Status</h3>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded text-xs font-semibold capitalize ${
                        o.status === 'resolved' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {o.status || 'pending'}
                      </div>
                      {o.status === 'resolved' && o.dateRecorded && (
                        <span className="text-xs text-gray-600">
                          Resolved on: {new Date(o.dateRecorded.toDate ? o.dateRecorded.toDate() : o.dateRecorded).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Remarks */}
                  {o.recordedByName && (
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Remarks</h3>
                      <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded border border-blue-200">
                        Recorded by: <strong>{o.recordedByName}</strong>
                      </div>
                    </div>
                  )}

                  {/* Attachments (if any) */}
                  {o.attachments && Array.isArray(o.attachments) && o.attachments.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Attachments</h3>
                      <div className="flex gap-2 flex-wrap">
                        {o.attachments.map((a: any, idx: number) => (
                          <a 
                            key={idx} 
                            href={a.url || a} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-sm text-red-600 underline hover:text-red-800"
                          >
                            View {a.name || `Document ${idx + 1}`}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date Recorded */}
                  {o.dateRecorded && (
                    <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                      Record created: {new Date(o.dateRecorded.toDate ? o.dateRecorded.toDate() : o.dateRecorded).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}

              {/* Acknowledgement */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 flex items-start gap-2">
                  <span className="text-blue-600 font-bold">ℹ️</span>
                  <span>
                    <strong>Acknowledgement:</strong> This record is for viewing only. For clarifications, contact the Office of Student Affairs (OSA).
                  </span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Handbook Dialog */}
      <StudentHandbookDialog
        open={handbookDialogOpen}
        onOpenChange={setHandbookDialogOpen}
      />
    </div>
  );
}