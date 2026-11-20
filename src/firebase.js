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

const firebaseHostingAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
const productionAppDomain = import.meta.env.VITE_APP_DOMAIN?.trim();
const currentHostname = typeof window === "undefined" ? "" : window.location.hostname;
const authDomain = currentHostname === productionAppDomain
  ? productionAppDomain
  : firebaseHostingAuthDomain;
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim(),
};

export const firebaseEnabled = import.meta.env.VITE_GUEST_ONLY !== "true"
  && Boolean(firebaseConfig.apiKey && authDomain && firebaseConfig.projectId && firebaseConfig.appId);
const app = firebaseEnabled ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export const provider = new GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");
provider.setCustomParameters({ prompt: "select_account" });

export const prepareAuthSession = () => setPersistence(auth, browserLocalPersistence);
export const authRedirectDomain = authDomain;

export { signInWithRedirect, signOut };
