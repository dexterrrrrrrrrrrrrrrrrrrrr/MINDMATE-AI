// Same-origin requests keep session cookies first-party on Vercel and localhost.
const BASE = "/api/v1/account";
export const auth = { currentUser: null };
const listeners = new Set();
let bootstrap;
let revision = 0;

export async function accountRequest(path, { method = "GET", body, signal } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method, credentials: "same-origin", cache: "no-store", signal,
    headers: { "Content-Type": "application/json", "X-Vital-Sense": "1" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && path.startsWith("/records")) publishUser(null);
    const error = new Error(typeof data.detail === "string" ? data.detail : "Something went wrong. Please try again.");
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}
function publishUser(user) {
  auth.currentUser = user;
  revision += 1;
  listeners.forEach((listener) => listener(user));
  window.dispatchEvent(new Event("vitalsense:data-changed"));
}
export function onAuthStateChanged(_auth, callback) {
  listeners.add(callback);
  if (!bootstrap) {
    bootstrap = accountRequest("/me")
      .then((user) => publishUser(user))
      .catch(() => publishUser(null));
  } else {
    bootstrap.then(() => { if (listeners.has(callback)) callback(auth.currentUser); });
  }
  return () => listeners.delete(callback);
}
export async function signIn(email, password) {
  const user = await accountRequest("/login", { method: "POST", body: { email, password } });
  localStorage.removeItem("isGuest");
  publishUser(user);
  return user;
}
export async function signUp(displayName, email, password) {
  const user = await accountRequest("/signup", { method: "POST", body: { displayName, email, password } });
  localStorage.removeItem("isGuest");
  publishUser(user);
  return user;
}
export async function signOut() {
  await accountRequest("/logout", { method: "POST" });
  publishUser(null);
}
export async function deleteAccount(password) {
  await accountRequest("/me", { method: "DELETE", body: { password } });
  publishUser(null);
}
export const accountRevision = () => revision;
