import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Your service account credentials
// Make sure these are set in your environment variables
const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Initialize Firebase Admin only once
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount as any),
    // CRITICAL: Set the correct storage bucket here
    storageBucket: 'process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  });
}

export const adminAuth = getAuth();
export const adminDB = getFirestore();

// Note: getStorage is imported directly in the route file when needed
// This is because it needs to be called after app initialization