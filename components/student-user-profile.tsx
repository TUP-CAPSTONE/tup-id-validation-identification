"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function StudentUserProfile() {
  const [userProfile, setUserProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    guardianEmail: "",
    studentId: "",
    phone: "",
    status: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        fetchAndDisplayUserProfile(user.uid);
      } else {
        setIsLoading(false);
        console.log("No user logged in");
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Fetches user data from the backend and populates the UI
   */
  async function fetchAndDisplayUserProfile(uid: string) {
    try {
      setIsLoading(true);
      const userDocRef = doc(db, "students", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          guardianEmail: data.guardianEmail || data.guardian_email || "",
          studentId: data.studentId || "",
          phone: data.phone || "",
          status: data.status || "",
        });
      } else {
        console.log("No user document found");
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Allows editing and saving of individual user fields
   * @param {string} field - The field name to update
   * @param {string} value - The new value for the field
   */
  function updateUserField(field: string, value: string) {
    setUserProfile(prev => ({
      ...prev,
      [field]: value
    }));
  }

  /**
   * Sends updated user info to the server
   */
  async function saveProfileChanges() {
    if (!userId) {
      console.error("No user ID available");
      return;
    }

    try {
      setIsSaving(true);
      const userDocRef = doc(db, "students", userId);
      await updateDoc(userDocRef, {
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        studentId: userProfile.studentId,
        phone: userProfile.phone,
      });

      console.log('Profile updated successfully');
      setEditMode(false);
      await fetchAndDisplayUserProfile(userId);
    } catch (error) {
      console.error('Error saving profile changes:', error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Information</CardTitle>
        <CardDescription>View and manage your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={userProfile.firstName}
                onChange={(e) => updateUserField('firstName', e.target.value)}
                disabled={!editMode}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={userProfile.lastName}
                onChange={(e) => updateUserField('lastName', e.target.value)}
                disabled={!editMode}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email (Cannot be changed)</Label>
              <Input
                id="email"
                type="email"
                value={userProfile.email}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="guardianEmail">Guardian Email (Cannot be changed)</Label>
              <Input
                id="guardianEmail"
                type="email"
                value={userProfile.guardianEmail}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                value={userProfile.studentId}
                onChange={(e) => updateUserField('studentId', e.target.value)}
                disabled={!editMode}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={userProfile.phone}
                onChange={(e) => updateUserField('phone', e.target.value)}
                disabled={!editMode}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                value={userProfile.status}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="flex gap-2">
              {!editMode ? (
                <Button onClick={() => setEditMode(true)}>
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button onClick={saveProfileChanges} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditMode(false);
                      if (userId) fetchAndDisplayUserProfile(userId);
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
