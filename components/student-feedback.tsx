"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { db, auth } from "@/lib/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Check, AlertCircle, ArrowLeft } from "lucide-react";

export default function StudentFeedback() {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackType, setFeedbackType] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  /**
   * Go back to main dashboard
   */
  const goBackToDashboard = () => {
    router.push('/clients/students/dashboard');
  };

  /**
   * Shows the feedback input form
   */
  function openFeedbackForm() {
    setShowConfirmation(false);
    setRating(null);
    setFeedbackType('');
    setMessage('');
    setError(null);
  }

  /**
   * Sends user feedback to the server
   */
  async function submitFeedback() {
    // Validation
    if (!message.trim()) {
      setError('Please enter your feedback');
      return;
    }
    if (message.trim().length < 10) {
      setError('Feedback must be at least 10 characters');
      return;
    }
    if (!feedbackType) {
      setError('Please select a feedback type');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const user = auth.currentUser;
      if (!user) {
        setError('You must be logged in to submit feedback');
        return;
      }

      // Add feedback to Firestore
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        email: user.email,
        message: message.trim(),
        rating: rating || null,
        type: feedbackType,
        createdAt: serverTimestamp(),
        status: 'pending'
      });

      // Show confirmation
      showFeedbackConfirmation();
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Displays a thank-you message after feedback is sent
   */
  function showFeedbackConfirmation() {
    setShowConfirmation(true);
    // Reset form
    setRating(null);
    setFeedbackType('');
    setMessage('');
  }

  if (showConfirmation) {
    return (
      <div className="w-full max-w-2xl space-y-6">
        <Button 
          variant="outline" 
          onClick={goBackToDashboard}
          className="flex items-center gap-2 border-red-200 hover:bg-red-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-8 text-center">
            <div className="mb-4 flex justify-center">
              <Check className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-6">
              Your feedback has been successfully submitted. We appreciate your input and will use it to improve our services.
            </p>
            <Button 
              onClick={openFeedbackForm}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Submit Another Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Button 
        variant="outline" 
        onClick={goBackToDashboard}
        className="flex items-center gap-2 border-red-200 hover:bg-red-50"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Button>

      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-700">Give Us Your Feedback</CardTitle>
          <CardDescription>Help us improve by sharing your experience and suggestions</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {/* Rating Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                How would you rate your experience?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-4xl transition-transform ${
                      rating && star <= rating
                        ? 'scale-110 text-yellow-400'
                        : 'text-gray-300 hover:scale-110'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Feedback Type <span className="text-[#b32032]">*</span>
              </label>
              <div className="space-y-2">
                {['Suggestion', 'Bug Report', 'Complaint', 'Compliment'].map((type) => (
                  <label key={type} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200">
                    <input 
                      type="radio" 
                      name="feedbackType" 
                      value={type}
                      checked={feedbackType === type}
                      onChange={(e) => setFeedbackType(e.target.value)}
                      className="w-4 h-4 text-[#b32032]"
                    />
                    <span className="text-sm text-gray-700">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Feedback Message */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Feedback <span className="text-[#b32032]">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your feedback here... (minimum 10 characters)"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b32032] focus:border-transparent resize-none"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-2">
                {message.length} / 500 characters | Please be specific and constructive
              </p>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={submitFeedback}
                disabled={isSubmitting}
                className="flex-1 bg-[#b32032] hover:bg-[#8b1828] text-white"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setRating(null);
                  setFeedbackType('');
                  setMessage('');
                  setError(null);
                }}
                disabled={isSubmitting}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info Card */}
      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-700 text-lg">Why Your Feedback Matters</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              Your insights help us identify areas for improvement
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              We use feedback to enhance our services and user experience
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              All feedback is reviewed and taken seriously
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
