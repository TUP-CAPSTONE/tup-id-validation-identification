import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Load Firebase config from environment variables
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
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth }; 