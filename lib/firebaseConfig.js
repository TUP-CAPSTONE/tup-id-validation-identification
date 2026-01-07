// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCkPbJFUUEOL3DRA8nMJrgJavmp-EVDbLM",
  authDomain: "tup-id-verification.firebaseapp.com",
  projectId: "tup-id-verification",
  storageBucket: "tup-id-verification.firebasestorage.app",
  messagingSenderId: "1042468746164",
  appId: "1:1042468746164:web:c46a1fad6750901d7eb8e1",
  measurementId: "G-NXC95E467D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export { app, analytics };