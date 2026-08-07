import { Menu, Settings, LogOut, Star } from "lucide-react";
import LOGO2 from "../assets/LOGO2.svg";
import "../styles/App.css";
import { useState, useRef, useEffect } from "react";

const Topbar = ({ user, onLogout, goToPremium, onOpenSettings, onLoginClick, onToggleSidebar }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const menuRef = useRef();
  const avatarButtonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.photoURL]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      avatarButtonRef.current?.focus();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  const initials = (user?.displayName || user?.email || "User")
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <header className="topbar">

      <button type="button" className="topbar-menu-button" onClick={onToggleSidebar} aria-label="Open navigation">
        <Menu size={21} />
      </button>

      {/* Center: Logo */}
      <div className="brand-logo">
        <img
          src={LOGO2}
          alt="Logo"
          className="logo-icon"
        />

        {/* Brand title always visible */}
        <h2 className="brand-title">MindMate</h2>
      </div>




      {/* Right: User Menu or Guest Buttons */}
      {user ? (
        <div className="profile-container" ref={menuRef}>
          <button
            ref={avatarButtonRef}
            type="button"
            className="profile-avatar-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close account menu" : "Open account menu"}
            aria-expanded={menuOpen}
            aria-controls="mindmate-account-menu"
          >
            {user.photoURL && !avatarLoadFailed ? (
              <img
                src={user.photoURL}
                alt=""
                className="profile-avatar"
                referrerPolicy="no-referrer"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <span className="profile-initials" aria-hidden="true">{initials}</span>
            )}
          </button>

          {menuOpen && (
            <div id="mindmate-account-menu" className="profile-menu" role="group" aria-label="Account actions">
              <button
                type="button"
                className="menu-header"
                onClick={() => {
                  setMenuOpen(false);
                  goToPremium();
                }}
              >
                <Star size={18} />
                MindMate Pro
              </button>

              <hr className="profile-menu__divider" />

              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSettings();
                }}
              >
                <Settings size={18} />
                Settings
              </button>

              <hr className="profile-menu__divider" />

              <button
                type="button"
                className="menu-item profile-menu__danger"
                onClick={onLogout}
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="guest-buttons">
          <button
            type="button"
            onClick={onLoginClick}
          >
            Login
          </button>
          <button
            type="button"
            onClick={onLoginClick}
          >
            Sign Up
          </button>
        </div>
      )}
    </header>
  );
};

export default Topbar;
