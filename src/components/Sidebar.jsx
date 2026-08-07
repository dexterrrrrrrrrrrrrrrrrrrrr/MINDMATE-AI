
import {
  SmilePlus,
  NotebookPen,
  Target,
} from "lucide-react";
import LOGO2 from "../assets/LOGO2.svg";
import "../styles/App.css";
import { useNavigate } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
export default function Sidebar({
  chatTitles = [],
  onNewChat,
  onSelectChat,
  activeChatId,
  onDeleteChat,
  searchTerm,
  onToggleSidebar,
  collapsed,
  onToggleCollapse,
  sidebarOpen,
  onOpenMoodTracker,
  goToPremium,
  onOpenSearch
}) {
  const [chatToDelete, setChatToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [anim] = useState("fade-in");
  const navigate = useNavigate();
  const [menuOpenForId, setMenuOpenForId] = useState(null);
  const [toast, setToast] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const deleteDialogRef = useRef(null);
  const deleteCancelRef = useRef(null);
  const deleteInFlightRef = useRef(false);
  const newChatButtonRef = useRef(null);
  const optionsButtonRefs = useRef(new Map());
  const deleteReturnFocusRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const [hasCoarsePointer, setHasCoarsePointer] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(hover: none), (pointer: coarse)").matches
      : false
  );

  const handleOverlayClick = (e) => {
    if (e.target !== e.currentTarget || !sidebarOpen) return;

    setMenuOpenForId(null);
    onToggleSidebar();
  };
  const showToast = (message, tone = "neutral") => {
    window.clearTimeout(toastTimeoutRef.current);
    setToast({ message, tone });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2600);
  };

  const handleShareChat = async (chatId) => {

    const shareLink = `${window.location.origin}/chat/${chatId}`;

    try {
      await navigator.clipboard.writeText(shareLink);

      showToast("Link copied.", "success");

    } catch (err) {
      console.error("Copy failed", err);
      showToast("Could not copy the link.", "error");
    }

    setMenuOpenForId(null);
  };
  useEffect(() => {
    const pointerQuery = window.matchMedia("(hover: none), (pointer: coarse)");
    const updatePointerType = () => setHasCoarsePointer(pointerQuery.matches);

    updatePointerType();
    pointerQuery.addEventListener?.("change", updatePointerType);

    return () => pointerQuery.removeEventListener?.("change", updatePointerType);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimeoutRef.current), []);

  useEffect(() => {
    if (!chatToDelete) return undefined;

    const previouslyFocused = deleteReturnFocusRef.current;
    const fallbackFocusTarget = newChatButtonRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => deleteCancelRef.current?.focus());

    document.body.style.overflow = "hidden";

    const handleDialogKeyDown = (event) => {
      if (event.key === "Escape") {
        if (!deleteInFlightRef.current) {
          setDeleteError("");
          setChatToDelete(null);
        }
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = Array.from(
        deleteDialogRef.current?.querySelectorAll("button:not([disabled])") || []
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDialogKeyDown);
      document.body.style.overflow = previousBodyOverflow;

      window.requestAnimationFrame(() => {
        if (previouslyFocused?.isConnected) previouslyFocused.focus();
        else if (fallbackFocusTarget?.isConnected) fallbackFocusTarget.focus();
      });
    };
  }, [chatToDelete]);

  useEffect(() => {
    if (menuOpenForId === null) return undefined;

    const closeMenu = () => setMenuOpenForId(null);
    const closeMenuOnEscape = (event) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("click", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("keydown", closeMenuOnEscape);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [menuOpenForId]);

  const handleChatMenuToggle = (event, chatId) => {
    event.stopPropagation();

    if (menuOpenForId === chatId) {
      setMenuOpenForId(null);
      return;
    }

    const triggerRect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const dropdownWidth = 220;
    const dropdownHeight = 96;
    const viewportMargin = 8;
    const triggerGap = 6;
    const maxLeft = Math.max(viewportMargin, viewportWidth - dropdownWidth - viewportMargin);
    const preferredLeft = triggerRect.right - dropdownWidth;
    const left = Math.min(Math.max(preferredLeft, viewportMargin), maxLeft);
    const belowTop = triggerRect.bottom + triggerGap;
    const aboveTop = triggerRect.top - dropdownHeight - triggerGap;
    const top = belowTop + dropdownHeight <= viewportHeight - viewportMargin
      ? belowTop
      : Math.max(viewportMargin, aboveTop);

    setMenuPosition({ top: Math.round(top), left: Math.round(left) });
    setMenuOpenForId(chatId);
  };

  const handleNewChatClick = () => {
    onNewChat();

    if (sidebarOpen && window.matchMedia("(max-width: 768px)").matches) {
      onToggleSidebar();
    }
  };

  const requestChatDelete = (chat) => {
    deleteReturnFocusRef.current = optionsButtonRefs.current.get(chat.id) || null;
    setDeleteError("");
    setChatToDelete({
      id: chat.id,
      title: chat.title?.trim() || "Untitled chat",
    });
    setMenuOpenForId(null);
  };

  const closeDeleteDialog = () => {
    if (deleteInFlightRef.current) return;
    setDeleteError("");
    setChatToDelete(null);
  };

  const confirmChatDelete = async () => {
    if (!chatToDelete || deleteInFlightRef.current) return;

    deleteInFlightRef.current = true;
    setIsDeleting(true);
    setDeleteError("");

    try {
      const deleted = await onDeleteChat(chatToDelete.id);
      if (deleted === false) throw new Error("Delete was not completed");

      const deletedTitle = chatToDelete.title;
      setChatToDelete(null);
      showToast(`${deletedTitle} deleted.`, "neutral");
    } catch (error) {
      console.error("Chat deletion failed:", error);
      setDeleteError("This chat could not be deleted. Nothing was removed. Please try again.");
    } finally {
      deleteInFlightRef.current = false;
      setIsDeleting(false);
    }
  };

  const handleChatClick = (chatId) => {
    setMenuOpenForId(null); // close menu

    onSelectChat(chatId);
  };
  const filteredChats = chatTitles.filter((chat) =>
    (chat.title || "").toLowerCase().includes((searchTerm || "").toLowerCase())
  );



  return (
    <>

      {toast && (
        <div className={`sidebar-toast ${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}

      {sidebarOpen && (
        <div
          className={`sidebar-overlay ${sidebarOpen ? "open" : "collapsed"}`}
          onClick={handleOverlayClick}
        />
      )}

      <div
        className={`sidebar ${collapsed ? "collapsed" : "expanded"} ${sidebarOpen ? "visible" : ""
          }`}
      >
        {/* Logo */}
        <div className="logo-wrapper">

          <img
            src={LOGO2}
            alt="MindMate Logo"
            className="logo-i"
          />

          <button
            className="collapse-btn"
            onClick={onToggleCollapse}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              {collapsed ? (
                <path
                  d="M9 18l6-6-6-6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </button>

        </div>

        {/* ---------- MIDDLE SECTION ---------- */}
        <div className={`sidebar-middle ${anim}`}>

          <button
            ref={newChatButtonRef}
            onClick={handleNewChatClick}
            className="new-chat-btn"

            style={{

              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: "bold",
              marginTop: "5px",
              padding: "1px 16px",
              backgroundColor: "transparent",
              color: "white",
              border: "none",

              cursor: "pointer",
              transition: "all 0.2s ease-in-out", // smooth effect
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {/* Chat Plus Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h7"></path>
              <line x1="19" y1="3" x2="19" y2="9"></line>
              <line x1="16" y1="6" x2="22" y2="6"></line>
            </svg>

            {!collapsed && <span>New Chat</span>}
          </button>

          <button type="button" className="feature-btn" onClick={onOpenMoodTracker}>
            <SmilePlus size={18} />
            {!collapsed && <span>Mood</span>}
          </button>

          <button type="button" className="feature-btn" onClick={() => navigate("/journals")}>
            <NotebookPen size={18} />
            {!collapsed && <span>Journaling</span>}
          </button>

          <button type="button" className="feature-btn" onClick={() => navigate("/goals")}>
            <Target size={18} />
            {!collapsed && <span>Goals</span>}
          </button>

          <button
            type="button"
            className={`search-container ${collapsed ? "collapsed" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenSearch();
            }}
          >

            <svg
              className="search-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            {!collapsed && (
              <span className="search-placeholder">
                Search chats...

              </span>
            )}

          </button>
        </div>

        {/* ---------- BOTTOM SECTION ---------- */}
        {collapsed && (
          <div className="sidebar-bottom">
            <div className="upgrade-section" onClick={goToPremium}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="upgrade-icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3l2.09 6.26L21 9.27l-5 3.64L17.18 21 12 17.27 6.82 21 8 12.91l-5-3.64 6.91-1.01L12 3z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* ---------- CHATS ---------- */}
        <div className="chat-header">Chats</div>

        <ul
          className="chat-list"
          style={{
            pointerEvents: collapsed ? "none" : "auto",
            opacity: collapsed ? 0 : 1
          }}
        >
          {filteredChats.length === 0 ? (
            <li className="no-chats-message">No chats found</li>
          ) : (
            filteredChats.map((chat) => (
              <li
                key={chat.id}
                className={
                  chat.id === activeChatId ? "active clickable" : "clickable"
                }
              >
                <button
                  type="button"
                  className="chat-select-btn"
                  onClick={() => handleChatClick(chat.id)}
                  title={chat.title || "Untitled Chat"}
                  aria-current={chat.id === activeChatId ? "page" : undefined}
                >
                  <span className="chat-title">
                    {chat.title || "Untitled Chat"}
                    <span className="dot-after-title">.</span>
                  </span>
                </button>

                <button
                  ref={(node) => {
                    if (node) optionsButtonRefs.current.set(chat.id, node);
                    else optionsButtonRefs.current.delete(chat.id);
                  }}
                  type="button"
                  className="chat-options-btn"
                  aria-label={`More options for ${chat.title || "Untitled Chat"}`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpenForId === chat.id}
                  style={hasCoarsePointer || menuOpenForId === chat.id ? { opacity: 1 } : undefined}
                  onClick={(event) => handleChatMenuToggle(event, chat.id)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                </button>
                {menuOpenForId === chat.id && (
                  <div
                    className="chat-dropdown"
                    role="menu"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="dropdown-item"
                      role="menuitem"
                      onClick={() => handleShareChat(chat.id)}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
                        <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
                      </svg>

                      Share
                    </button>


                    <button
                      type="button"
                      className="dropdown-item delete"
                      role="menuitem"
                      onClick={() => requestChatDelete(chat)}
                    >
                      <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </div>

      {chatToDelete && (
        <div
          className="chat-delete-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteDialog();
          }}
        >
          <div
            ref={deleteDialogRef}
            className="chat-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-busy={isDeleting}
            aria-labelledby="chat-delete-title"
            aria-describedby="chat-delete-description"
          >
            <button
              type="button"
              className="chat-delete-dialog__close"
              onClick={closeDeleteDialog}
              disabled={isDeleting}
              aria-label="Close delete confirmation"
            >
              &times;
            </button>

            <div className="chat-delete-dialog__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
            </div>
            <h2 id="chat-delete-title">Delete this chat?</h2>
            <p id="chat-delete-description">
              <strong>{chatToDelete.title}</strong> will be permanently removed. This cannot be undone.
            </p>
            {deleteError && <p className="chat-delete-dialog__error" role="alert">{deleteError}</p>}

            <div className="chat-delete-dialog__actions">
              <button
                ref={deleteCancelRef}
                type="button"
                className="chat-delete-dialog__cancel"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
              >
                Keep chat
              </button>
              <button
                type="button"
                className="chat-delete-dialog__confirm"
                onClick={confirmChatDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete chat"}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
