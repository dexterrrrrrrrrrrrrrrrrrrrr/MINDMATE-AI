import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
const env = import.meta.env;
export const cloudReady = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID && env.VITE_FIREBASE_AUTH_DOMAIN);
const app = cloudReady ? initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, projectId: env.VITE_FIREBASE_PROJECT_ID, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, appId: env.VITE_FIREBASE_APP_ID }) : null;
export const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
export const login = () => signInWithPopup(auth, new GoogleAuthProvider());
export const logout = () => signOut(auth);
const workspaceDoc = uid => doc(db, 'vitalsenseUsers', uid, 'workspaces', 'personal');
export async function loadCloud(uid) { const result = await getDoc(workspaceDoc(uid)); return result.exists() ? result.data().workspace : null; }
export const saveCloud = (uid, workspace) => setDoc(workspaceDoc(uid), { workspace, updatedAt: new Date().toISOString(), schemaVersion: 1 });
export const deleteCloud = uid => deleteDoc(workspaceDoc(uid));
