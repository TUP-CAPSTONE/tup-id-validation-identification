"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ✅ shadcn toast (Sonner)
import { toast } from "sonner";

// ✅ Firebase auth
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

type SenderRole = "student" | "osa";
type ReportType = "feedback" | "bug";

function isNumberedSteps(text: string) {
  /**
   * Accepts formats like:
   * 1. step
   * 2. step
   * or
   * 1) step
   * 2) step
   */
  const trimmed = text.trim();
  if (!trimmed) return false;

  const lines = trimmed
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Must have at least 2 numbered steps (can adjust if you want)
  let count = 0;

  for (const line of lines) {
    if (/^\d+[\.\)]\s+/.test(line)) count++;
  }

  return count >= 2;
}

export function FeedbackReportForm({
  senderRole,
  className,
}: {
  senderRole: SenderRole;
  className?: string;
}) {
  const [type, setType] = useState<ReportType | "">("");
  const [loading, setLoading] = useState(false);

  // common
  const [title, setTitle] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");

  // feedback fields
  const [rating, setRating] = useState<number>(5);
  const [feedbackCategory, setFeedbackCategory] = useState<string>("overall");
  const [experience, setExperience] = useState("");
  const [suggestions, setSuggestions] = useState("");

  // bug fields
  const [severity, setSeverity] = useState<string>("Low");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");

  // ✅ auto-fill logged-in user's name/email
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setSenderName("");
        setSenderEmail("");
        return;
      }

      const name =
        user.displayName ||
        user.email?.split("@")[0]?.replace(/\./g, " ") ||
        "User";

      setSenderName(name);
      setSenderEmail(user.email || "");
    });

    return () => unsub();
  }, []);

  const canSubmit = useMemo(() => {
    if (!type) return false;
    if (!title.trim()) return false;
    if (!senderName.trim()) return false;
    if (!senderEmail.trim()) return false;

    if (type === "feedback") {
      // ✅ only sentence needed (not numbered)
      return experience.trim().length >= 10;
    }

    if (type === "bug") {
      // ✅ steps must be numbered
      const okSteps = isNumberedSteps(stepsToReproduce);

      return (
        okSteps &&
        expectedBehavior.trim().length >= 5 &&
        actualBehavior.trim().length >= 5
      );
    }

    return false;
  }, [
    type,
    title,
    senderName,
    senderEmail,
    experience,
    stepsToReproduce,
    expectedBehavior,
    actualBehavior,
  ]);

  async function handleSubmit() {
    setLoading(true);
    try {
      if (!auth.currentUser) {
        toast.error("Not logged in", {
          description: "Please log in first before submitting.",
        });
        return;
      }

      const token = await auth.currentUser.getIdToken(); // ✅ get Firebase ID token

      const payload: any = {
        type,
        senderRole,
        senderName,
        senderEmail,
        title,
        uid: auth.currentUser.uid,
      };

      if (type === "feedback") {
        payload.rating = rating;
        payload.category = feedbackCategory;
        payload.experience = experience;
        payload.suggestions = suggestions;
      }

      if (type === "bug") {
        payload.bugSeverity = severity;
        payload.stepsToReproduce = stepsToReproduce;
        payload.expectedBehavior = expectedBehavior;
        payload.actualBehavior = actualBehavior;
        payload.deviceInfo = deviceInfo;
      }

      const res = await fetch("/api/send-feedback-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ send token
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit report.");
      }

      toast.success("Report Submitted!", {
        description: "Thank you for helping improve TUP SIIVS.",
      });

      // reset fields
      setType("");
      setTitle("");
      setRating(5);
      setFeedbackCategory("overall");
      setExperience("");
      setSuggestions("");
      setSeverity("medium");
      setStepsToReproduce("");
      setExpectedBehavior("");
      setActualBehavior("");
      setDeviceInfo("");
    } catch (err: any) {
      toast.error("Failed to Submit", {
        description: err?.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Feedback & Reports</CardTitle>
          <CardDescription>
            Help improve <span className="font-medium">TUP SIIVS</span> by
            sending feedback or reporting bugs.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Choose Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              What kind of report do you want to submit?
            </Label>

            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as ReportType)}
              className="grid gap-3 sm:grid-cols-2"
            >
              <Label
                htmlFor="feedback"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                  type === "feedback" ? "border-primary" : "hover:bg-muted",
                )}
              >
                <RadioGroupItem
                  value="feedback"
                  id="feedback"
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Feedback Form</p>
                  <p className="text-xs text-muted-foreground">
                    Share your honest experience using the system.
                  </p>
                </div>
              </Label>

              <Label
                htmlFor="bug"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                  type === "bug" ? "border-primary" : "hover:bg-muted",
                )}
              >
                <RadioGroupItem value="bug" id="bug" className="mt-1" />
                <div>
                  <p className="font-medium">Bug Report Form</p>
                  <p className="text-xs text-muted-foreground">
                    Report errors, glitches, or problems in the system.
                  </p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Slide-in section */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-300",
              type ? "max-h-500 opacity-100" : "max-h-0 opacity-0",
            )}
          >
            {type ? (
              <div className="space-y-6 pt-2">
                <Separator />

                {/* Common fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={senderName} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={senderEmail} disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      type === "feedback"
                        ? "Ex: Great UI but onboarding could be clearer"
                        : "Ex: Face scanner not working on mobile"
                    }
                  />
                </div>

                {/* Feedback Form */}
                {type === "feedback" ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Rating</Label>
                        <Select
                          value={String(rating)}
                          onValueChange={(v) => setRating(Number(v))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 - Excellent</SelectItem>
                            <SelectItem value="4">4 - Good</SelectItem>
                            <SelectItem value="3">3 - Fair</SelectItem>
                            <SelectItem value="2">2 - Poor</SelectItem>
                            <SelectItem value="1">1 - Very Poor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={feedbackCategory}
                          onValueChange={setFeedbackCategory}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Overall">
                              Overall Experience
                            </SelectItem>
                            <SelectItem value="UI">UI / Design</SelectItem>
                            <SelectItem value="performance">
                              Performance
                            </SelectItem>
                            <SelectItem value="Face Recognition">
                              Face Recognition
                            </SelectItem>
                            <SelectItem value="ID Validation">
                              ID Validation
                            </SelectItem>
                            <SelectItem value="Security">Security</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Describe your experience</Label>
                      <Textarea
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        placeholder="Tell us what you liked, what was difficult, and what we should improve..."
                        className="min-h-32"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Suggestions / Improvements (optional)</Label>
                      <Textarea
                        value={suggestions}
                        onChange={(e) => setSuggestions(e.target.value)}
                        placeholder="Any specific improvements you want to suggest?"
                        className="min-h-28"
                      />
                    </div>
                  </div>
                ) : null}

                {/* Bug Report Form */}
                {type === "bug" ? (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select value={severity} onValueChange={setSeverity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Steps to reproduce</Label>
                      <Textarea
                        value={stepsToReproduce}
                        onChange={(e) => setStepsToReproduce(e.target.value)}
                        placeholder={`Example:
1. Login as student
2. Go to Feedback Form
3. Fill up the form
4. Error shows`}
                        className="min-h-32"
                      />

                      {/* helper text */}
                      {stepsToReproduce.trim().length > 0 &&
                      !isNumberedSteps(stepsToReproduce) ? (
                        <p className="text-xs text-destructive">
                          Please use numbered steps (example: 1. 2. 3.)
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Expected behavior</Label>
                        <Textarea
                          value={expectedBehavior}
                          onChange={(e) => setExpectedBehavior(e.target.value)}
                          placeholder="What should happen?"
                          className="min-h-28"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Actual behavior</Label>
                        <Textarea
                          value={actualBehavior}
                          onChange={(e) => setActualBehavior(e.target.value)}
                          placeholder="What actually happened?"
                          className="min-h-28"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Device / Browser info (optional)</Label>
                      <Input
                        value={deviceInfo}
                        onChange={(e) => setDeviceInfo(e.target.value)}
                        placeholder="Ex: Android Chrome / Windows 10 Edge"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit || loading}
                    className="rounded-xl"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
