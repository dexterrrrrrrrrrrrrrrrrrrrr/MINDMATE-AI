// Document helpers let the existing screens use MongoDB through authenticated API routes.
// The backend derives ownership from the session, never from the URL's user ID.
import { auth, accountRequest, accountRevision } from "./account";
export const db = {};
export const collection = (_db, ...parts) => ({ parts });
export const doc = collection;
export const orderBy = (field, direction) => ({ field, direction });
export const query = (reference, sort) => ({ ...reference, sort });
export const serverTimestamp = () => ({ __serverTimestamp: true });
function path(reference) {
  const [, uid, kind, id] = reference.parts;
  if (!auth.currentUser || uid !== auth.currentUser.uid) throw new Error("Please sign in to continue.");
  if (!kind) return "/preferences";
  return `/records/${encodeURIComponent(kind)}${id ? `/${encodeURIComponent(id)}` : ""}`;
}
const snapshotDoc = (data) => ({ id: data.id, data: () => data, exists: () => true });
export async function getDocs(reference, signal) {
  let entries = await accountRequest(path(reference), { signal });
  if (reference.sort) {
    const { field, direction } = reference.sort;
    entries = [...entries].sort((a, b) => String(a[field] || "").localeCompare(String(b[field] || "")) * (direction === "desc" ? -1 : 1));
  }
  const docs = entries.map(snapshotDoc);
  return { docs, forEach: (callback) => docs.forEach(callback) };
}
export async function getDoc(reference) { return snapshotDoc(await accountRequest(path(reference))); }
function changed() { window.dispatchEvent(new Event("vitalsense:data-changed")); }
export async function addDoc(reference, data) {
  const entry = await accountRequest(path(reference), { method: "POST", body: { data } });
  changed();
  return entry;
}
export async function updateDoc(reference, data) {
  const entry = await accountRequest(path(reference), { method: "PATCH", body: { data } });
  changed();
  return entry;
}
export async function setDoc(reference, data) {
  const result = await accountRequest(path(reference), { method: "PUT", body: data });
  changed();
  return result;
}
export async function deleteDoc(reference) {
  await accountRequest(path(reference), { method: "DELETE" });
  changed();
}
export function onSnapshot(reference, callback, onError = () => {}) {
  let active = true;
  let controller;
  const uid = auth.currentUser?.uid;
  const revision = accountRevision();
  const load = async () => {
    controller?.abort();
    controller = new AbortController();
    if (auth.currentUser?.uid !== uid || accountRevision() !== revision) return;
    try {
      const result = await getDocs(reference, controller.signal);
      if (active && auth.currentUser?.uid === uid && accountRevision() === revision) callback(result);
    } catch (error) { if (active && error.name !== "AbortError") onError(error); }
  };
  load();
  window.addEventListener("vitalsense:data-changed", load);
  window.addEventListener("focus", load);
  return () => {
    active = false;
    controller?.abort();
    window.removeEventListener("vitalsense:data-changed", load);
    window.removeEventListener("focus", load);
  };
}
