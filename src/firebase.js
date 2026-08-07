import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseHostingAuthDomain =
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || "mind-mate-94675.firebaseapp.com";
const productionAppDomain =
  import.meta.env.VITE_APP_DOMAIN?.trim() || "mindmate-ai-jade.vercel.app";
const currentHostname = typeof window === "undefined" ? "" : window.location.hostname;

// Redirect auth must use the same stable production origin as the app. Random
// Vercel preview domains cannot be safely used as OAuth redirect domains.
const authDomain = currentHostname === productionAppDomain
  ? productionAppDomain
  : firebaseHostingAuthDomain;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDqFZo4GDMxM4AERs5PQD2NEeGukyLMPxA",
  authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mind-mate-94675",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mind-mate-94675.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1029632166505",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1029632166505:web:4d5409368adf6d66def0f8",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-1XCEPRHZR9",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const provider = new GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");
provider.setCustomParameters({ prompt: "select_account" });

export const prepareAuthSession = () => setPersistence(auth, browserLocalPersistence);
export const authRedirectDomain = authDomain;

export { signInWithRedirect, signOut };
