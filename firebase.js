// ============================================================
// firebase.js
// Central Firebase initialization for Secret Letter.
// Every other module imports auth/db/storage from HERE only —
// never call initializeApp() anywhere else in the project.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

// ------------------------------------------------------------
// TODO: Replace with your own Firebase project config.
// Get this from Firebase Console → Project Settings → General
// → "Your apps" → Web app → SDK setup and configuration.
// ------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDV_oui6o6cKg2wBuGXuDUS3d7l0FsUp3A",
  authDomain: "seclove.firebaseapp.com",
  projectId: "seclove",
  storageBucket: "seclove.appspot.com",
  messagingSenderId: "795834652359",
  appId: "1:795834652359:web:1af577e16f74c20ef090e2"
};

// Initialize core app once.
const app = initializeApp(firebaseConfig);

// Shared singleton instances used by every page.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * Sets auth persistence based on the "stay logged in" checkbox
 * shown on the login page. Must be called BEFORE signInWithEmailAndPassword.
 * @param {boolean} stayLoggedIn
 */
export async function setAuthPersistence(stayLoggedIn) {
  try {
    await setPersistence(
      auth,
      stayLoggedIn ? browserLocalPersistence : browserSessionPersistence
    );
  } catch (err) {
    console.error("Failed to set auth persistence:", err);
  }
}
