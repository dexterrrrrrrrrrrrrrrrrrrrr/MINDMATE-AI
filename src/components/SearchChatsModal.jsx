import { MessageCircle, MessageSquarePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/SearchChatsModal.css";

const toDate = (value) => {
  if (value?.toDate) return value.toDate();
  if (value?.seconds) return new Date(value.seconds * 1000);
  const parsed = new Date(value || 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function SearchChatsModal({
  isOpen,
  onClose,
  chatTitles,
  onSelectChat,
  activeChatId,
  onNewChat,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(true);
  const closeTimerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    setVisible(true);
    setClosing(false);
    setLoading(true);
    setSearchTerm("");

    const loadingTimer = setTimeout(() => setLoading(false), 260);
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(focusTimer);
    };
  }, [isOpen]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setVisible(false);
      onClose();
    }, 180);
  };

  useEffect(() => {
    if (!visible) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  // Closing is intentionally bound to the active modal instance.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, closing]);

  const groupedChats = useMemo(() => {
    const groups = { Today: [], Yesterday: [], Older: [] };
    const now = new Date();
    const today = now.toDateString();
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterday = yesterdayDate.toDateString();
    const term = searchTerm.trim().toLowerCase();

    (chatTitles || []).forEach((chat) => {
      if (term && !(chat.title || "").toLowerCase().includes(term)) return;
      const updatedAt = toDate(chat.updatedAt);
      if (updatedAt?.toDateString() === today) groups.Today.push(chat);
      else if (updatedAt?.toDateString() === yesterday) groups.Yesterday.push(chat);
      else groups.Older.push(chat);
    });

    return groups;
  }, [chatTitles, searchTerm]);

  if (!visible) return null;

  const hasMatches = Object.values(groupedChats).some((group) => group.length > 0);

  return (
    <div className={`chat-search-overlay ${closing ? "closing" : ""}`} onMouseDown={handleClose}>
      <section
        className={`chat-search-modal ${closing ? "closing" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search chats"
      >
        <header className="search-header">
          <input
            ref={inputRef}
            type="search"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Search chats"
          />
          <button type="button" className="close-search" onClick={handleClose} aria-label="Close search">
            <X size={18} />
          </button>
        </header>

        <div className="search-content">
          {loading ? (
            <div className="search-skeleton" aria-label="Loading chats">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="skeleton-row">
                  <div className="skeleton-dot" />
                  <div className="skeleton-lines">
                    <div className="line short" />
                    <div className="line long" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="new-chat-row"
                onClick={() => {
                  onNewChat();
                  handleClose();
                }}
              >
                <MessageSquarePlus size={18} aria-hidden="true" />
                <span className="new-chat-text">New Chat</span>
              </button>

              {Object.entries(groupedChats).map(([label, chats]) => chats.length > 0 && (
                <section key={label} aria-labelledby={`search-group-${label.toLowerCase()}`}>
                  <h2 id={`search-group-${label.toLowerCase()}`} className="search-section">{label}</h2>
                  {chats.map((chat) => (
                    <button
                      type="button"
                      key={chat.id}
                      className={`search-chat-item ${chat.id === activeChatId ? "active" : ""}`}
                      onClick={() => {
                        onSelectChat(chat.id);
                        handleClose();
                      }}
                    >
                      <MessageCircle className="chat-icon" size={17} aria-hidden="true" />
                      <span>{chat.title || "Untitled Chat"}</span>
                    </button>
                  ))}
                </section>
              ))}

              {!hasMatches && <div className="no-chats">No chats found</div>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
