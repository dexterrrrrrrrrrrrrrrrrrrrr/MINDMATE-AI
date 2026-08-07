import React, { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, Trash2, X } from "lucide-react";
import {
  deleteUser,
  EmailAuthProvider,
  FacebookAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import "../styles/Settings.css";

const sections = [
  { id: "general", label: "General" },
  { id: "voice", label: "Voice" },
  { id: "account", label: "Account" },
];

const themes = [
  { id: "dark", label: "Dark", gradient: "linear-gradient(180deg, #0f0f0f, #1a1a1a)" },
  { id: "premium", label: "Plum", gradient: "linear-gradient(180deg, #1a0f2e, #2e1746, #0f0f0f)" },
  { id: "blue", label: "Ocean", gradient: "linear-gradient(180deg, #2c3e50, #4ca1af)" },
  { id: "sunset", label: "Sunset", gradient: "linear-gradient(135deg, #1e1e2f, #3a1c71, #d76d77, #ffaf7b)" },
  { id: "aurora", label: "Aurora", gradient: "linear-gradient(180deg, #0f2027, #203a43, #2c5364)" },
];

const focusableSelector = [
  "button:not([disabled])",
  "select:not([disabled])",
  "input:not([disabled])",
  "[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function SettingsModal({
  isOpen,
  onClose,
  onLogout,
  selectedVoice,
  voiceOptions = [],
  onVoiceChange,
  autoSpeak = false,
  onAutoSpeakChange,
}) {
  const [active, setActive] = useState("general");
  const [closing, setClosing] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);

  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const closeTimerRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  const resetAccountDialogs = useCallback(() => {
    setShowConfirmModal(false);
    setShowPasswordModal(false);
    setShowSuccessModal(false);
    setErrorMessage("");
    setPassword("");
    setDeletePending(false);
  }, []);

  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setClosing(false);
      resetAccountDialogs();
      onClose();
    }, 240);
  }, [closing, onClose, resetAccountDialogs]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocusedRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (deletePending) return;
        if (errorMessage) setErrorMessage("");
        else if (showSuccessModal) setShowSuccessModal(false);
        else if (showPasswordModal) {
          setShowPasswordModal(false);
          setPassword("");
        } else if (showConfirmModal) setShowConfirmModal(false);
        else handleClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusScope = modalRef.current?.querySelector(".settings-confirm-dialog") || modalRef.current;
      const focusableItems = [...(focusScope?.querySelectorAll(focusableSelector) || [])];
      if (!focusableItems.length) return;

      const first = focusableItems[0];
      const last = focusableItems[focusableItems.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deletePending, errorMessage, handleClose, isOpen, showConfirmModal, showPasswordModal, showSuccessModal]);

  useEffect(() => {
    if (!showConfirmModal && !showPasswordModal && !showSuccessModal && !errorMessage) return undefined;
    const focusFrame = requestAnimationFrame(() => {
      const dialog = modalRef.current?.querySelector(".settings-confirm-dialog");
      dialog?.querySelector(focusableSelector)?.focus();
    });
    return () => cancelAnimationFrame(focusFrame);
  }, [errorMessage, showConfirmModal, showPasswordModal, showSuccessModal]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let activeRequest = true;

    const loadTheme = async () => {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme && activeRequest) setTheme(savedTheme);

      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const snapshot = await getDoc(doc(db, "users", currentUser.uid));
        const storedTheme = snapshot.data()?.theme;
        if (activeRequest && storedTheme) setTheme(storedTheme);
      } catch (error) {
        console.error("Could not load theme preference:", error);
      }
    };

    loadTheme();
    return () => {
      activeRequest = false;
    };
  }, [isOpen]);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const handleThemeChange = async (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      await setDoc(doc(db, "users", currentUser.uid), { theme: nextTheme }, { merge: true });
    } catch (error) {
      console.error("Could not save theme preference:", error);
    }
  };

  const handleDeleteAccount = () => {
    const currentUser = auth.currentUser;
    setErrorMessage("");

    if (!currentUser) {
      setErrorMessage("Sign in before trying to delete an account.");
      return;
    }

    const providerId = currentUser.providerData[0]?.providerId;
    if (providerId === "password") {
      setShowPasswordModal(true);
      return;
    }

    if (providerId === "google.com" || providerId === "facebook.com") {
      setShowConfirmModal(true);
      return;
    }

    setErrorMessage("This account provider is not supported for deletion yet.");
  };

  const finishAccountDeletion = async (currentUser) => {
    await deleteDoc(doc(db, "users", currentUser.uid));
    await deleteUser(currentUser);
    setShowConfirmModal(false);
    setShowPasswordModal(false);
    setPassword("");
    setShowSuccessModal(true);
  };

  const confirmDeleteOAuth = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || deletePending) return;

    setDeletePending(true);
    setErrorMessage("");
    try {
      const providerId = currentUser.providerData[0]?.providerId;
      if (providerId === "google.com") {
        await reauthenticateWithPopup(currentUser, new GoogleAuthProvider());
      } else if (providerId === "facebook.com") {
        await reauthenticateWithPopup(currentUser, new FacebookAuthProvider());
      } else {
        throw new Error("Unsupported account provider.");
      }
      await finishAccountDeletion(currentUser);
    } catch (error) {
      console.error("Account deletion failed:", error);
      setShowConfirmModal(false);
      setErrorMessage("We couldn't delete your account. Please try again.");
    } finally {
      setDeletePending(false);
    }
  };

  const confirmDeletePassword = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !password.trim() || deletePending) return;

    setDeletePending(true);
    setErrorMessage("");
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
      await finishAccountDeletion(currentUser);
    } catch (error) {
      console.error("Account deletion failed:", error);
      setShowPasswordModal(false);
      setPassword("");
      setErrorMessage("We couldn't delete your account. Check your password and try again.");
    } finally {
      setDeletePending(false);
    }
  };

  const handleSignOut = async () => {
    if (signOutPending) return;
    setSignOutPending(true);
    try {
      await onLogout?.();
      handleClose();
    } finally {
      setSignOutPending(false);
    }
  };

  const handleSectionKeyDown = (event, currentSectionId) => {
    const currentIndex = sections.findIndex((section) => section.id === currentSectionId);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % sections.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + sections.length) % sections.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = sections.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextSection = sections[nextIndex];
    setActive(nextSection.id);
    requestAnimationFrame(() => document.getElementById(`settings-tab-${nextSection.id}`)?.focus());
  };

  if (!isOpen && !closing) return null;

  const currentUser = auth.currentUser;
  const accountName = currentUser?.displayName || (currentUser ? "MindMate account" : "Guest session");
  const accountDetail = currentUser?.email || "Your conversations are stored on this device only.";
  const accountInitial = (currentUser?.displayName || currentUser?.email || "G").trim().charAt(0).toUpperCase();

  const dismissDialog = (setter) => {
    if (!deletePending) setter(false);
  };

  return (
    <div
      className={`settings-overlay ${closing ? "closing" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        ref={modalRef}
        className={`settings-modal ${closing ? "closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="settings-close-button"
          onClick={handleClose}
          aria-label="Close settings"
        >
          <X size={19} />
        </button>

        <div className="settings-content">
          <aside className="settings-sidebar" aria-label="Settings sections">
            <div className="settings-tabs" role="tablist" aria-orientation="vertical">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  id={`settings-tab-${section.id}`}
                  className={`settings-tab ${active === section.id ? "active" : ""}`}
                  onClick={() => setActive(section.id)}
                  onKeyDown={(event) => handleSectionKeyDown(event, section.id)}
                  role="tab"
                  aria-selected={active === section.id}
                  aria-controls="settings-panel"
                  tabIndex={active === section.id ? 0 : -1}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </aside>

          <main
            id="settings-panel"
            className="settings-panel"
            role="tabpanel"
            aria-labelledby={`settings-tab-${active}`}
          >
            {active === "general" && (
              <>
                <h2 id="settings-title">General</h2>
                <p className="settings-description">Adjust how MindMate looks on this device.</p>
                <section className="settings-surface" aria-labelledby="settings-theme-label">
                  <div className="settings-row-copy">
                    <h3 id="settings-theme-label">Theme</h3>
                    <p>Choose a comfortable backdrop for your space.</p>
                  </div>
                  <div className="settings-theme-list" aria-label="Theme choices">
                    {themes.map((themeOption) => (
                      <button
                        type="button"
                        key={themeOption.id}
                        className={`settings-theme-button ${theme === themeOption.id ? "active" : ""}`}
                        onClick={() => handleThemeChange(themeOption.id)}
                        aria-label={`Use ${themeOption.label} theme`}
                        aria-pressed={theme === themeOption.id}
                        title={themeOption.label}
                      >
                        <span style={{ background: themeOption.gradient }} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {active === "voice" && (
              <>
                <h2 id="settings-title">Voice</h2>
                <p className="settings-description">Choose how MindMate sounds in chat and voice conversations.</p>

                <section className="settings-surface settings-control-row">
                  <label className="settings-row-copy" htmlFor="settings-default-voice">
                    <h3>Default voice</h3>
                    <p>You can also switch voices from the orb screen.</p>
                  </label>
                  <select
                    id="settings-default-voice"
                    value={selectedVoice?.id || "mia"}
                    onChange={(event) => onVoiceChange?.(event.target.value)}
                    disabled={!voiceOptions.length}
                  >
                    {voiceOptions.map((voice) => (
                      <option key={voice.id} value={voice.id}>{voice.name}</option>
                    ))}
                  </select>
                </section>

                <label className="settings-surface settings-control-row settings-switch-row">
                  <span className="settings-row-copy">
                    <h3>Read replies aloud</h3>
                    <p>Automatically play voice for chat responses.</p>
                  </span>
                  <input
                    type="checkbox"
                    checked={autoSpeak}
                    onChange={(event) => onAutoSpeakChange?.(event.target.checked)}
                  />
                  <i aria-hidden="true" />
                </label>
              </>
            )}

            {active === "account" && (
              <>
                <h2 id="settings-title">Account</h2>
                <p className="settings-description">Manage your current session and account data.</p>

                <section className="settings-account-summary" aria-label="Current account">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="settings-account-avatar" aria-hidden="true">{accountInitial}</span>
                  )}
                  <div>
                    <strong>{accountName}</strong>
                    <span>{accountDetail}</span>
                  </div>
                </section>

                <section className="settings-surface settings-account-action">
                  <div className="settings-row-copy">
                    <h3>Session</h3>
                    <p>Sign out of MindMate on this device.</p>
                  </div>
                  <button
                    type="button"
                    className="settings-secondary-button"
                    onClick={handleSignOut}
                    disabled={signOutPending}
                  >
                    <LogOut size={16} aria-hidden="true" />
                    {signOutPending ? "Signing out…" : "Sign out"}
                  </button>
                </section>

                <section className="settings-danger-zone">
                  <div className="settings-row-copy">
                    <h3>Delete account</h3>
                    <p>Permanently remove your account and saved MindMate data.</p>
                  </div>
                  <button
                    type="button"
                    className="settings-danger-button"
                    onClick={handleDeleteAccount}
                    disabled={!currentUser}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete account
                  </button>
                </section>
              </>
            )}
          </main>
        </div>

        {showConfirmModal && (
          <div
            className="settings-confirm-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) dismissDialog(setShowConfirmModal);
            }}
          >
            <div className="settings-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title" aria-describedby="delete-account-copy">
              <h3 id="delete-account-title">Delete your account?</h3>
              <p id="delete-account-copy">This permanently removes your account and saved data. You’ll be asked to verify your identity first.</p>
              <div className="settings-dialog-actions">
                <button type="button" className="settings-dialog-cancel" onClick={() => setShowConfirmModal(false)} disabled={deletePending}>Cancel</button>
                <button type="button" className="settings-dialog-danger" onClick={confirmDeleteOAuth} disabled={deletePending}>
                  {deletePending ? "Verifying…" : "Continue"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showPasswordModal && (
          <div
            className="settings-confirm-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) dismissDialog(setShowPasswordModal);
            }}
          >
            <div className="settings-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="password-delete-title" aria-describedby="password-delete-copy">
              <h3 id="password-delete-title">Confirm account deletion</h3>
              <p id="password-delete-copy">Enter your password to verify this permanent action.</p>
              <label className="settings-password-label" htmlFor="delete-account-password">Password</label>
              <input
                id="delete-account-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={deletePending}
              />
              <div className="settings-dialog-actions">
                <button type="button" className="settings-dialog-cancel" onClick={() => { setShowPasswordModal(false); setPassword(""); }} disabled={deletePending}>Cancel</button>
                <button type="button" className="settings-dialog-danger" onClick={confirmDeletePassword} disabled={deletePending || !password.trim()}>
                  {deletePending ? "Deleting…" : "Delete account"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSuccessModal && (
          <div className="settings-confirm-backdrop">
            <div className="settings-confirm-dialog" role="status" aria-live="polite">
              <h3>Account deleted</h3>
              <p>Your MindMate account has been permanently removed.</p>
              <div className="settings-dialog-actions single">
                <button type="button" className="settings-dialog-primary" onClick={handleClose}>Done</button>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="settings-confirm-backdrop">
            <div className="settings-confirm-dialog" role="alert" aria-live="assertive">
              <h3>Something went wrong</h3>
              <p>{errorMessage}</p>
              <div className="settings-dialog-actions single">
                <button type="button" className="settings-dialog-primary" onClick={() => setErrorMessage("")}>Okay</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
