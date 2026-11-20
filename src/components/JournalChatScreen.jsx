import {
  ArrowLeft,
  CalendarDays,
  Check,
  Edit3,
  Feather,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "../accountData";
import { db } from "../accountData";
import "../styles/Journal.css";

const GUEST_JOURNAL_KEY = "mindmate_guest_journals";
const moodOptions = [
  { id: "peaceful", label: "Peaceful" },
  { id: "hopeful", label: "Hopeful" },
  { id: "neutral", label: "Neutral" },
  { id: "heavy", label: "Heavy" },
  { id: "anxious", label: "Anxious" },
];

const createId = () =>
  globalThis.crypto?.randomUUID?.() || `journal-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const readGuestJournals = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(GUEST_JOURNAL_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

const writeGuestJournals = (entries) => {
  localStorage.setItem(GUEST_JOURNAL_KEY, JSON.stringify(entries));
};

const toDate = (entry) => {
  if (entry.createdAt?.toDate) return entry.createdAt.toDate();
  const parsed = new Date(entry.createdAt || entry.updatedAt || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const formatDate = (entry) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(toDate(entry));

const countWords = (text = "") => text.trim().split(/\s+/).filter(Boolean).length;

export default function JournalChatScreen({ user, isGuest = false }) {
  const navigate = useNavigate();
  const composerRef = useRef(null);
  const deleteCancelRef = useRef(null);
  const [journals, setJournals] = useState([]);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [mood, setMood] = useState("neutral");
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!user) {
      setJournals(readGuestJournals());
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const journalsQuery = query(
      collection(db, "users", user.uid, "journals"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      journalsQuery,
      (snapshot) => {
        setJournals(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setLoading(false);
        setError("");
      },
      () => {
        setError("Your journal could not be loaded. Please check your connection and try again.");
        setLoading(false);
      }
    );
  }, [user]);

  useEffect(() => {
    if (!savedNotice) return undefined;
    const timer = setTimeout(() => setSavedNotice(false), 2200);
    return () => clearTimeout(timer);
  }, [savedNotice]);

  useEffect(() => {
    if (!deleteId) return undefined;
    deleteCancelRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !deleting) setDeleteId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deleteId, deleting]);

  const filteredJournals = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return journals;
    return journals.filter((entry) =>
      `${entry.title || ""} ${entry.text || ""}`.toLowerCase().includes(term)
    );
  }, [journals, search]);

  const totalWords = useMemo(
    () => journals.reduce((total, entry) => total + countWords(entry.text), 0),
    [journals]
  );

  const resetComposer = () => {
    setTitle("");
    setText("");
    setMood("neutral");
    setEditingId(null);
  };

  const saveEntry = async () => {
    if ((!title.trim() && !text.trim()) || saving) return;
    setSaving(true);
    setError("");

    const payload = {
      title: title.trim() || "Untitled reflection",
      text: text.trim(),
      mood,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (user) {
        if (editingId) {
          await updateDoc(doc(db, "users", user.uid, "journals", editingId), {
            ...payload,
            updatedAt: serverTimestamp(),
          });
        } else {
          await addDoc(collection(db, "users", user.uid, "journals"), {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        const now = new Date().toISOString();
        const updated = editingId
          ? journals.map((entry) => entry.id === editingId ? { ...entry, ...payload } : entry)
          : [{ id: createId(), ...payload, createdAt: now }, ...journals];
        setJournals(updated);
        writeGuestJournals(updated);
      }
      resetComposer();
      setSavedNotice(true);
    } catch {
      setError("This entry could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (entry) => {
    setEditingId(entry.id);
    setTitle(entry.title || "");
    setText(entry.text || "");
    setMood(entry.mood || "neutral");
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const deleteEntry = async () => {
    if (!deleteId || deleting) return;
    setError("");
    setDeleteError("");
    setDeleting(true);
    try {
      if (user) {
        await deleteDoc(doc(db, "users", user.uid, "journals", deleteId));
      } else {
        const updated = journals.filter((entry) => entry.id !== deleteId);
        setJournals(updated);
        writeGuestJournals(updated);
      }
      if (editingId === deleteId) resetComposer();
      setDeleteId(null);
    } catch {
      setDeleteError("This entry could not be deleted. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const requestDelete = (entryId) => {
    setDeleteError("");
    setDeleteId(entryId);
  };

  return (
    <main className="journal-page">
      <header className="journal-topbar">
        <button type="button" className="journal-icon-button" onClick={() => navigate("/")} aria-label="Back to Vital Sense">
          <ArrowLeft size={20} />
        </button>
        <div className="journal-brand">
          <span>Journal</span>
        </div>
        <span className="journal-private">
          <span /> {user ? "Synced privately" : isGuest ? "Saved on this device" : "Private space"}
        </span>
      </header>

      <div className="journal-content">
        <section className="journal-intro">
          <div>
            <h1>Journal</h1>
            <p>A quiet place to write, reflect, and notice what has been on your mind.</p>
          </div>
          <div className="journal-overview" aria-label="Journal overview">
            <span><strong>{journals.length}</strong> {journals.length === 1 ? "entry" : "entries"}</span>
            <span aria-hidden="true">·</span>
            <span><strong>{totalWords.toLocaleString()}</strong> words</span>
          </div>
        </section>

        <section className="journal-composer" ref={composerRef} aria-labelledby="journal-composer-title">
          <div className="journal-composer__header">
            <div>
              <div>
                <h2 id="journal-composer-title">{editingId ? "Editing entry" : "New entry"}</h2>
                <p>{new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p>
              </div>
            </div>
            {editingId && (
              <button type="button" className="journal-cancel-edit" onClick={resetComposer}><X size={15} /> Cancel edit</button>
            )}
          </div>

          <input
            className="journal-title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, 80))}
            placeholder="Title"
            aria-label="Journal title"
          />
          <textarea
            className="journal-text-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Start writing..."
            rows={7}
            aria-label="Journal entry"
          />

          <div className="journal-composer__footer">
            <div className="journal-moods" role="radiogroup" aria-label="Reflection mood">
              {moodOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={mood === option.id}
                  className={mood === option.id ? "is-active" : ""}
                  onClick={() => setMood(option.id)}
                  title={option.label}
                >
                  <span className="journal-mood-dot" aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            <div className="journal-save-group">
              <span>{countWords(text)} words</span>
              <button type="button" className="journal-save" onClick={saveEntry} disabled={saving || (!title.trim() && !text.trim())}>
                {saving ? "Saving..." : editingId ? "Save changes" : "Save reflection"}
                {!saving && <Check size={17} />}
              </button>
            </div>
          </div>
        </section>

        {error && <div className="journal-error" role="alert">{error}</div>}

        <section className="journal-library" aria-labelledby="journal-library-title">
          <div className="journal-library__header">
            <div>
              <h2 id="journal-library-title">Past reflections</h2>
              <p>Your private timeline, newest first.</p>
            </div>
            <label className="journal-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search entries"
                aria-label="Search journal entries"
              />
            </label>
          </div>

          {loading ? (
            <div className="journal-loading" role="status" aria-label="Loading journal entries">
              {[1, 2, 3].map((item) => <span key={item} />)}
            </div>
          ) : filteredJournals.length === 0 ? (
            <div className="journal-empty">
              <span><Feather size={24} /></span>
              <h3>{search ? "No matching reflections" : "Your story starts here"}</h3>
              <p>{search ? "Try another word or phrase." : "Write your first thought above. Even one sentence is enough."}</p>
              {!search && <button type="button" onClick={() => composerRef.current?.scrollIntoView({ behavior: "smooth" })}><Plus size={16} /> New reflection</button>}
            </div>
          ) : (
            <div className="journal-grid">
              {filteredJournals.map((entry) => {
                const entryMood = moodOptions.find((option) => option.id === entry.mood) || moodOptions[2];
                const expanded = expandedId === entry.id;
                return (
                  <article key={entry.id} className={`journal-card ${expanded ? "is-expanded" : ""}`}>
                    <button type="button" className="journal-card__content" onClick={() => setExpandedId(expanded ? null : entry.id)} aria-expanded={expanded}>
                      <div className="journal-card__meta">
                        <span className="journal-card__mood"><span aria-hidden="true" /> {entryMood.label}</span>
                        <span><CalendarDays size={13} /> {formatDate(entry)}</span>
                      </div>
                      <h3>{entry.title || "Untitled reflection"}</h3>
                      <p>{entry.text || "A quiet moment with no words added."}</p>
                      <span className="journal-card__read">{expanded ? "Show less" : "Read reflection"}</span>
                    </button>
                    <div className="journal-card__actions">
                      <span>{countWords(entry.text)} words</span>
                      <div>
                        <button type="button" onClick={() => editEntry(entry)} aria-label={`Edit ${entry.title || "entry"}`}><Edit3 size={15} /></button>
                        <button type="button" onClick={() => requestDelete(entry.id)} aria-label={`Delete ${entry.title || "entry"}`}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {savedNotice && <div className="journal-toast" role="status" aria-live="polite"><Check size={16} /> Reflection saved</div>}

      {deleteId && (
        <div className="journal-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !deleting && setDeleteId(null)}>
          <div
            className="journal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-journal-title"
            aria-describedby="delete-journal-description"
          >
            <span className="journal-dialog__icon"><Trash2 size={20} /></span>
            <h2 id="delete-journal-title">Delete this reflection?</h2>
            <p id="delete-journal-description">This cannot be undone. Your other journal entries will stay untouched.</p>
            {deleteError && <p className="journal-dialog__error" role="alert">{deleteError}</p>}
            <div>
              <button ref={deleteCancelRef} type="button" onClick={() => setDeleteId(null)} disabled={deleting}>Keep it</button>
              <button type="button" className="is-danger" onClick={deleteEntry} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
