"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { majorOffenses, minorOffenses, Offense } from "@/lib/offense-data";
import { db, auth } from "@/lib/firebaseConfig";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StudentInfo {
  uid: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function OSAFileOffenseForm() {
  // Student search
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [searchError, setSearchError] = useState("");

  // Offense selection
  const [offenseType, setOffenseType] = useState<"major" | "minor">("major");
  const [selectedOffenseNumber, setSelectedOffenseNumber] = useState<string>("");
  const [selectedOffense, setSelectedOffense] = useState<Offense | null>(null);
  const offenseRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Offense details
  const [dateCommitted, setDateCommitted] = useState("");
  const [offenseDescription, setOffenseDescription] = useState("");
  const [selectedSanction, setSelectedSanction] = useState<"first" | "second" | "third">("first");
  
  // Submission
  const [submitting, setSubmitting] = useState(false);

  const currentOffenses = offenseType === "major" ? majorOffenses : minorOffenses;

  // Reset selected offense when offense type changes
  useEffect(() => {
    setSelectedOffenseNumber("");
    setSelectedOffense(null);
  }, [offenseType]);

  // Update selected offense when offense number changes
  useEffect(() => {
    if (selectedOffenseNumber) {
      const offense = currentOffenses.find((o) => o.number === selectedOffenseNumber);
      setSelectedOffense(offense || null);
      
      // Scroll to selected offense
      if (offense && offenseRefs.current[selectedOffenseNumber]) {
        offenseRefs.current[selectedOffenseNumber]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    } else {
      setSelectedOffense(null);
    }
  }, [selectedOffenseNumber, currentOffenses]);

  const handleSearchStudent = async () => {
    if (!searchQuery.trim()) {
      setSearchError("Please enter a student ID or email");
      return;
    }

    setSearching(true);
    setSearchError("");
    setSelectedStudent(null);

    try {
      // Search in students collection
      const studentsRef = collection(db, "students");
      
      // Try to find by studentId first
      let q = query(studentsRef, where("studentId", "==", searchQuery.trim()));
      let snapshot = await getDocs(q);
      
      // If not found by studentId, try by email
      if (snapshot.empty) {
        q = query(studentsRef, where("email", "==", searchQuery.trim().toLowerCase()));
        snapshot = await getDocs(q);
      }

      if (snapshot.empty) {
        setSearchError("Student not found. Please check the ID or email.");
        return;
      }

      const studentData = snapshot.docs[0].data();
      setSelectedStudent({
        uid: snapshot.docs[0].id,
        studentId: studentData.studentId,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        email: studentData.email,
      });
      
      toast.success("Student found!");
    } catch (error: any) {
      console.error("Error searching student:", error);
      setSearchError("Error searching for student. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedStudent) {
      toast.error("Please select a student first");
      return;
    }

    if (!selectedOffense) {
      toast.error("Please select an offense");
      return;
    }

    if (!dateCommitted) {
      toast.error("Please enter the date offense was committed");
      return;
    }

    if (!offenseDescription.trim()) {
      toast.error("Please enter a narrative/description of the offense");
      return;
    }

    if (!auth.currentUser) {
      toast.error("You must be logged in to file an offense");
      return;
    }

    setSubmitting(true);

    try {
      // Get the sanction based on the selected occurrence
      const sanction = selectedOffense.sanctions[selectedSanction];

      // Prepare offense data
      const offenseData = {
        studentUid: selectedStudent.uid,
        studentId: selectedStudent.studentId,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        studentEmail: selectedStudent.email,
        
        offenseNumber: selectedOffense.number,
        offenseTitle: selectedOffense.title,
        offenseType: offenseType,
        offenseItems: selectedOffense.items || [],
        
        offenseDescription: offenseDescription.trim(),
        sanction: sanction,
        sanctionLevel: selectedSanction,
        
        dateCommitted: new Date(dateCommitted),
        dateRecorded: serverTimestamp(),
        
        recordedBy: auth.currentUser.uid,
        recordedByEmail: auth.currentUser.email,
        
        status: "active",
      };

      // Add to Firestore
      await addDoc(collection(db, "student_offenses"), offenseData);

      toast.success("Offense filed successfully", {
        description: `Filed offense for ${selectedStudent.firstName} ${selectedStudent.lastName}`,
      });

      // Reset form
      setSelectedStudent(null);
      setSearchQuery("");
      setSelectedOffenseNumber("");
      setSelectedOffense(null);
      setDateCommitted("");
      setOffenseDescription("");
      setSelectedSanction("first");

    } catch (error: any) {
      console.error("Error filing offense:", error);
      toast.error("Failed to file offense", {
        description: error.message || "Please try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Student Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Student</CardTitle>
          <CardDescription>Search by Student ID or Email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter Student ID or Email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearchStudent()}
              />
            </div>
            <Button onClick={handleSearchStudent} disabled={searching}>
              {searching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>

          {searchError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          )}

          {selectedStudent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">Selected Student</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Name:</strong> {selectedStudent.firstName} {selectedStudent.lastName}</p>
                <p><strong>Student ID:</strong> {selectedStudent.studentId}</p>
                <p><strong>Email:</strong> {selectedStudent.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSelectedStudent(null);
                  setSearchQuery("");
                }}
              >
                Clear Selection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offense Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-700">Select Offense</CardTitle>
          <CardDescription>Browse and select from TUP Student Handbook</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Offense Type and Jump to Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="offenseType" className="mb-2 block">Offense Type</Label>
              <Select value={offenseType} onValueChange={(val: "major" | "minor") => setOffenseType(val)}>
                <SelectTrigger id="offenseType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="major">Major Offenses</SelectItem>
                  <SelectItem value="minor">Minor Offenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="offenseNumber" className="mb-2 block">Jump to Offense</Label>
              <Select value={selectedOffenseNumber} onValueChange={setSelectedOffenseNumber}>
                <SelectTrigger id="offenseNumber">
                  <SelectValue placeholder="Select offense" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {currentOffenses.map((offense) => (
                    <SelectItem key={offense.number} value={offense.number}>
                      #{offense.number} - {offense.title.length > 40 ? offense.title.substring(0, 40) + "..." : offense.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Offenses List */}
          <div ref={scrollContainerRef} className="max-h-[400px] overflow-y-auto border rounded-lg p-4 bg-gray-50">
            <div className="space-y-3">
              {currentOffenses.map((offense) => (
                <div
                  key={offense.number}
                  ref={(el) => {
                    offenseRefs.current[offense.number] = el;
                  }}
                  onClick={() => setSelectedOffenseNumber(offense.number)}
                  className={`border rounded-lg p-4 bg-white shadow-sm cursor-pointer transition-all hover:shadow-md ${
                    selectedOffenseNumber === offense.number
                      ? "border-red-500 border-2 ring-2 ring-red-200"
                      : "border-gray-300"
                  }`}
                >
                  {/* Offense Header */}
                  <div className="mb-2">
                    <div className="flex items-start gap-2">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        offenseType === "major"
                          ? "bg-red-600 text-white"
                          : "bg-amber-500 text-white"
                      }`}>
                        {offense.number}
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 flex-1 mt-1">
                        {offense.title}
                      </h3>
                    </div>
                  </div>

                  {/* Offense Items */}
                  {offense.items && offense.items.length > 0 && (
                    <div className="mb-3 ml-10">
                      <ul className="list-disc list-outside space-y-1 text-xs text-gray-700">
                        {offense.items.map((item, idx) => (
                          <li key={idx} className="pl-1">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sanctions */}
                  <div className="ml-10 mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Sanctions:</p>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p><strong>1st Offense:</strong> {offense.sanctions.first}</p>
                      <p><strong>2nd Offense:</strong> {offense.sanctions.second}</p>
                      <p><strong>3rd Offense:</strong> {offense.sanctions.third}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedOffense && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">Selected Offense</h3>
              <p className="text-sm">
                <strong>#{selectedOffense.number}:</strong> {selectedOffense.title}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offense Details Form */}
      <Card>
        <CardHeader>
          <CardTitle>Offense Details</CardTitle>
          <CardDescription>Enter the details of the incident</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="dateCommitted">Date Committed</Label>
            <Input
              id="dateCommitted"
              type="date"
              value={dateCommitted}
              onChange={(e) => setDateCommitted(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <Label htmlFor="sanctionLevel">Sanction to Apply</Label>
            <Select value={selectedSanction} onValueChange={(val: "first" | "second" | "third") => setSelectedSanction(val)}>
              <SelectTrigger id="sanctionLevel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first">
                  1st Offense {selectedOffense && `- ${selectedOffense.sanctions.first}`}
                </SelectItem>
                <SelectItem value="second">
                  2nd Offense {selectedOffense && `- ${selectedOffense.sanctions.second}`}
                </SelectItem>
                <SelectItem value="third">
                  3rd Offense {selectedOffense && `- ${selectedOffense.sanctions.third}`}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="narrative">Narrative / Description</Label>
            <Textarea
              id="narrative"
              placeholder="Describe what happened, including circumstances, witnesses, and any relevant details..."
              value={offenseDescription}
              onChange={(e) => setOffenseDescription(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {offenseDescription.length} characters
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedStudent || !selectedOffense}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Filing Offense...
              </>
            ) : (
              "File Offense"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
