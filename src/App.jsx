import React, { lazy, Suspense, useState, useEffect, useRef } from "react";
import { FaArrowDown } from "react-icons/fa";
import {
  auth,
  authRedirectDomain,
  prepareAuthSession,
  provider,
  signInWithRedirect,
  signOut,
} from "./firebase";
import {
  Copy,
  ThumbsUp,
  ThumbsDown,
  Share2,
  RefreshCcw,
  Volume2,
  ArrowUp,
  Square,
} from "lucide-react";
import SearchChatsModal from "./components/SearchChatsModal";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useLocation } from "react-router-dom";
import { Howl } from "howler";
import { updateDoc } from "firebase/firestore";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import SplashScreen from "./components/SplashScreen";
import LoginScreen from "./components/LoginScreen";
import MoodTracker from "./components/MoodTracker";
import "./styles/App.css";
import { useNavigate } from "react-router-dom";
import { Navigate, Routes, Route } from "react-router-dom";
import SettingsModal from "./components/SettingsModal";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase"; // your Firebase config file
import { getRedirectResult, onAuthStateChanged } from "firebase/auth";
import WelcomeScreen from "./components/WelcomeScreen";

import VoicePulseLine from "./components/VoicePulseLine";
import ReactMarkdown from "react-markdown";
import Starfield from "./components/Starfield";
import { generateTitleFromText } from "./components/AutoTitleGenerator";
import {
  getMicrophoneErrorMessage,
  openMicrophoneStream,
  requestMicrophonePermission,
} from "./utils/speechRecognition";
import { AI_API_URL, AI_AUDIO_URL, AI_CONVERSATION_URL } from "./config";
import { getStoredVoice, VOICE_OPTIONS } from "./constants/voices";
import {
  ASSISTANT_MODE_OPTIONS,
  getAssistantMode,
  getAssistantModeId,
} from "./constants/assistantModes";
import { buildModeAwareMessages } from "./utils/assistantRequest";
import AssistantModeSwitcher from "./components/AssistantModeSwitcher";

const JournalChatScreen = lazy(() => import("./components/JournalChatScreen"));
const Premium = lazy(() => import("./components/Premium"));
const VoiceCloud = lazy(() => import("./components/VoiceCloud"));
const GoalsPage = lazy(() => import("./components/GoalsPage"));

const AUTH_REDIRECT_PENDING_KEY = "mindmate.authRedirectPending";
const AUTH_RETURN_PATH_KEY = "mindmate.authReturnPath";

const getSafeReturnPath = (path) => (
  typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && path !== "/login"
    ? path
    : "/"
);

const formatDictationTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
};

const mapFirebaseUser = (firebaseUser) => firebaseUser
  ? {
      displayName: firebaseUser.displayName || "Anonymous",
      email: firebaseUser.email || "",
      photoURL: firebaseUser.photoURL || null,
      uid: firebaseUser.uid,
    }
  : null;

const omitMarkdownMetadata = ({ node, inline, ...props }) => {
  void node;
  void inline;
  return props;
};

function App() {
  // User & UI state
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [authResolved, setAuthResolved] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(
    () => sessionStorage.getItem(AUTH_REDIRECT_PENDING_KEY) === "true"
  );
  const [authError, setAuthError] = useState("");
  const [isGuest, setIsGuest] = useState(
    () => localStorage.getItem("isGuest") === "true"
  );
  const [input, setInput] = useState("");
  const [assistantModeId, setAssistantModeId] = useState(
    () => getAssistantModeId(localStorage.getItem("mindmate.assistantMode"))
  );
  const [modeSaving, setModeSaving] = useState(false);
  const assistantMode = getAssistantMode(assistantModeId);
  const chatBodyRef = useRef(null);
  const [chatLog, setChatLog] = useState([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [closingShare, setClosingShare] = useState(false);
  const closeShareModal = () => {
    setClosingShare(true);

    setTimeout(() => {
      setShowShareModal(false);
      setClosingShare(false);
    }, 200);
  };
  const [chatTitles, setChatTitles] = useState([]);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(
    () => localStorage.getItem("mindmate.autoSpeak") === "true"
  );
  const [showSplash, setShowSplash] = useState(
    () => sessionStorage.getItem(AUTH_REDIRECT_PENDING_KEY) !== "true"
  );
  const [sidebarOpen, setSidebarOpen] = useState(
    () => !window.matchMedia("(max-width: 768px)").matches
  );
  const [activeChatId, setActiveChatId] = useState(null);
  const [fullTitle, setFullTitle] = useState("");       // final generated title
  const [titleTyping, setTitleTyping] = useState("");   // current animated title text
  const [, setHasGeneratedTitle] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const messagesEndRef = useRef(null);
  const [showMoodTracker, setShowMoodTracker] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const bars = [0, 1, 2, 3, 4];
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [dismissedLoginModal, setDismissedLoginModal] = useState(
    () => localStorage.getItem("dismissLoginModal") === "true"
  );
  const location = useLocation();
  // Refs for control
  const typingInterval = useRef(null);
  const abortRef = useRef(null);
  const requestGenerationRef = useRef(0);
  const composerRef = useRef(null);
  const soundRef = useRef(null);
  const stopTypingRef = useRef(false);  // Flag to break typing loop
  const currentTypingTextRef = useRef("");  // Track partial text during typing
  const {
    transcript,
    resetTranscript,
    listening,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition({
    clearTranscriptOnListen: true
  });
  const dictationStartingRef = useRef(false);
  const inputBeforeDictationRef = useRef("");
  const dictationSessionRef = useRef(0);
  const dictationStreamRef = useRef(null);
  const [dictationStream, setDictationStream] = useState(null);
  const [dictationElapsed, setDictationElapsed] = useState(0);

  const [selectedVoice, setSelectedVoice] = useState(getStoredVoice);
  const [voiceStarting, setVoiceStarting] = useState(false);
  const voiceStartingRef = useRef(false);

  const handleVoiceChange = (voiceId) => {
    const nextVoice = VOICE_OPTIONS.find((option) => option.id === voiceId);
    if (!nextVoice) return;
    setSelectedVoice(nextVoice);
    localStorage.setItem("mindmate.voice", nextVoice.id);
  };

  const handleAutoSpeakChange = (enabled) => {
    setAutoSpeak(enabled);
    localStorage.setItem("mindmate.autoSpeak", String(enabled));
  };

  const startDictation = async () => {
    if (dictationStartingRef.current || listening) return;
    if (!browserSupportsSpeechRecognition) {
      window.alert("Speech recognition is not supported in this browser.");
      return;
    }

    dictationStartingRef.current = true;
    const dictationSession = dictationSessionRef.current + 1;
    dictationSessionRef.current = dictationSession;
    inputBeforeDictationRef.current = input;
    setDictationElapsed(0);
    resetTranscript();

    try {
      const stream = await openMicrophoneStream();
      if (dictationSession !== dictationSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      dictationStreamRef.current = stream;
      setDictationStream(stream);
      stream.getAudioTracks()[0]?.addEventListener("ended", () => {
        if (dictationStreamRef.current === stream) {
          dictationStreamRef.current = null;
          setDictationStream(null);
        }
      }, { once: true });
      await SpeechRecognition.startListening({
        continuous: true,
        interimResults: true,
        language: "en-US",
      });
    } catch (error) {
      dictationStreamRef.current?.getTracks().forEach((track) => track.stop());
      dictationStreamRef.current = null;
      setDictationStream(null);
      setDictationElapsed(0);
      window.alert(getMicrophoneErrorMessage(error));
    } finally {
      dictationStartingRef.current = false;
    }
  };

  const stopDictation = async () => {
    dictationSessionRef.current += 1;
    dictationStreamRef.current?.getTracks().forEach((track) => track.stop());
    dictationStreamRef.current = null;
    setDictationStream(null);
    setDictationElapsed(0);

    try {
      await SpeechRecognition.stopListening();
    } finally {
      resetTranscript();
    }
  };

  const startVoiceConversation = async () => {
    if (voiceStartingRef.current) return;
    if (!browserSupportsSpeechRecognition) {
      window.alert("Speech recognition is not supported in this browser.");
      return;
    }

    voiceStartingRef.current = true;
    setVoiceStarting(true);
    try {
      await requestMicrophonePermission();
      await SpeechRecognition.startListening({
        continuous: false,
        interimResults: true,
        language: "en-IN",
      });
      navigate("/voice", { state: { microphoneGranted: true, microphoneStarted: true } });
    } catch (error) {
      window.alert(getMicrophoneErrorMessage(error));
    } finally {
      voiceStartingRef.current = false;
      setVoiceStarting(false);
    }
  };

  const displayedChats = user
    ? chatTitles
      .filter(chat => chat.messages?.length > 0)
      .map((chat) =>
        chat.id === activeChatId
          ? { ...chat, title: titleTyping || fullTitle || chat.title }
          : chat
      )
    : [];


  // ✅ Stop typing animation


  const goToPremium = () => {
    navigate("/premium"); // Redirect to Premium page
  };

  // Function: Speak text with ElevenLabs Rachel voice
  // Wrap the Howl playback with an analyser
  const speakWithRiva = async (text) => {
    try {
      setIsSpeaking(true);

      const res = await fetch(
        AI_AUDIO_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text,
            voice: selectedVoice.name
          })
        }
      );

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const sound = new Howl({
        src: [url],
        format: ["wav"],
        html5: true
      });
      soundRef.current = sound;

      sound.on("end", () => {
        setIsSpeaking(false);
        if (soundRef.current === sound) soundRef.current = null;
        URL.revokeObjectURL(url);
      });

      sound.on("loaderror", () => {
        setIsSpeaking(false);
        if (soundRef.current === sound) soundRef.current = null;
        URL.revokeObjectURL(url);
      });

      sound.play();
    } catch (err) {
      console.error("TTS error:", err);
      setIsSpeaking(false);
    }
  };

  const handleStop = () => {
    const hadActiveResponse = isTyping || isThinking || Boolean(abortRef.current);
    requestGenerationRef.current += 1;
    stopTypingRef.current = true; // stop animation
    if (abortRef.current) abortRef.current.abort(); // stop API
    setIsTyping(false);
    setIsThinking(false);
    if (soundRef.current) {
      soundRef.current.stop();
      soundRef.current = null;
    }

    if (typingInterval.current) {
      clearInterval(typingInterval.current);
      typingInterval.current = null;
    }

    if (hadActiveResponse) {
      const partial = currentTypingTextRef.current || "Response stopped.";
      setChatLog((prev) => {
        const noTyping = prev.filter((msg) => !msg.typing);
        return [...noTyping, { from: "bot", text: partial }];
      });
      currentTypingTextRef.current = "";
    }

    // ✅ Abort API call
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };


  const handleMoodSelect = async ({ id, label, intensity, note }) => {
    const moodMessage = `I'm feeling ${label.toLowerCase()}${note ? ` — ${note}` : ""}`;
    const moodRecord = {
      mood: id,
      label,
      intensity,
      note,
      createdAt: new Date().toISOString(),
    };

    setShowMoodTracker(false);
    setChatLog((previous) => [...previous, { from: "user", text: moodMessage, type: "mood" }]);
    setIsThinking(true);

    try {
      if (user) {
        await addDoc(collection(db, "users", user.uid, "moods"), {
          ...moodRecord,
          createdAt: serverTimestamp(),
        });
      } else {
        const stored = JSON.parse(localStorage.getItem("mindmate_guest_moods") || "[]");
        localStorage.setItem(
          "mindmate_guest_moods",
          JSON.stringify([moodRecord, ...(Array.isArray(stored) ? stored : [])].slice(0, 30))
        );
      }
    } catch (error) {
      console.warn("Mood history could not be saved:", error);
    }

    try {
      const response = await fetch(AI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildModeAwareMessages({
          modeId: assistantModeId,
          taskInstruction: "Respond to this mood check-in briefly. Acknowledge it in the selected mode's style and offer one useful, proportionate next step.",
          messages: [{
            role: "user",
            content: `I feel ${label.toLowerCase()} at intensity ${intensity} out of 5.${note ? ` Context: ${note}` : ""}`,
          }],
        })),
      });

      if (!response.ok) throw new Error(`Mood response failed with ${response.status}`);
      const data = await response.json();
      const aiReply = data.content || "I'm here with you. Let's take this one gentle step at a time.";
      setChatLog((previous) => [...previous, { from: "bot", text: aiReply }]);
      if (autoSpeak) await speakWithRiva(aiReply);
    } catch (error) {
      console.error("Mood check-in response failed:", error);
      setChatLog((previous) => [
        ...previous,
        { from: "bot", text: "I'm here with you. Take one slow breath, and tell me what feels most important right now." },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Auto-scroll only if user is near bottom
  useEffect(() => {
    const container = chatBodyRef.current;
    if (!container) return;

    if (!userScrolledUp) {
      container.scrollTop = container.scrollHeight;
    }
  }, [chatLog, userScrolledUp]);

  useEffect(() => {
    if (
      !user &&
      isGuest &&
      guestMessageCount >= 5 &&
      !dismissedLoginModal &&
      !showLoginModal
    ) {
      setShowLoginModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (user) {
      setShowLoginModal(false);
    }
  }, [guestMessageCount, dismissedLoginModal, isGuest, showLoginModal, user]);

  useEffect(() => {
    const chatBody = chatBodyRef.current;
    if (!chatBody) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatBody;

      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      const atBottom = distanceFromBottom < 120;

      setUserScrolledUp(!atBottom);
    };

    chatBody.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => chatBody.removeEventListener("scroll", handleScroll);
  }, [activeChatId, chatLog.length, showMoodTracker]);

  const scrollToBottom = () => {
    const chatBody = chatBodyRef.current;
    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
      setUserScrolledUp(false);
    }
  };


  useEffect(() => {
    if (transcript && location.pathname === "/") {
      const prefix = inputBeforeDictationRef.current.trim();
      setInput(prefix ? `${prefix} ${transcript.trimStart()}` : transcript);
    }
  }, [location.pathname, transcript]);

  useEffect(() => {
    if (!listening && !dictationStartingRef.current && dictationStreamRef.current) {
      dictationStreamRef.current.getTracks().forEach((track) => track.stop());
      dictationStreamRef.current = null;
      setDictationStream(null);
    }
  }, [listening]);

  useEffect(() => {
    if (!listening || !dictationStream) return undefined;

    const startedAt = Date.now();
    const updateElapsed = () => {
      setDictationElapsed(Math.floor((Date.now() - startedAt) / 1000));
    };
    const interval = window.setInterval(updateElapsed, 250);
    updateElapsed();

    return () => window.clearInterval(interval);
  }, [dictationStream, listening]);

  useEffect(() => {
    if (location.pathname !== "/" && dictationStreamRef.current) {
      dictationSessionRef.current += 1;
      dictationStreamRef.current.getTracks().forEach((track) => track.stop());
      dictationStreamRef.current = null;
      setDictationStream(null);
    }
  }, [location.pathname]);

  useEffect(() => () => {
    dictationSessionRef.current += 1;
    dictationStreamRef.current?.getTracks().forEach((track) => track.stop());
    dictationStreamRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;
    let authStateReady = false;
    let redirectReady = false;
    let redirectUser = null;
    let redirectError = null;

    const finishAuthBootstrap = () => {
      if (!active || !authStateReady || !redirectReady) return;

      const firebaseUser = redirectUser || auth.currentUser;
      setUser(mapFirebaseUser(firebaseUser));
      setAuthResolved(true);
      setAuthSubmitting(false);

      const redirectPending = sessionStorage.getItem(AUTH_REDIRECT_PENDING_KEY) === "true";
      const returnPath = getSafeReturnPath(sessionStorage.getItem(AUTH_RETURN_PATH_KEY));

      if (redirectPending) {
        sessionStorage.removeItem(AUTH_REDIRECT_PENDING_KEY);
        sessionStorage.removeItem(AUTH_RETURN_PATH_KEY);

        if (firebaseUser) {
          setAuthError("");
          navigate(returnPath, { replace: true });
        } else {
          const message = redirectError?.code === "auth/unauthorized-domain"
            ? `Google login is not authorized for ${authRedirectDomain}.`
            : "Google login could not be completed. Please try again.";
          setAuthError(message);
          navigate("/login", { replace: true });
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!active) return;
      setUser(mapFirebaseUser(firebaseUser));
      if (firebaseUser) setAuthError("");
      authStateReady = true;
      finishAuthBootstrap();
    });

    getRedirectResult(auth)
      .then((result) => {
        redirectUser = result?.user || null;
      })
      .catch((error) => {
        redirectError = error;
        console.error("Google redirect sign-in failed:", error);
      })
      .finally(() => {
        redirectReady = true;
        finishAuthBootstrap();
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigate]);


  // Load user's saved chats from Firestore when logged in
  useEffect(() => {
    if (!user) {
      setChatTitles([]);
      setActiveChatId(null);
      setChatLog([]);
      return;
    }
    const q = query(collection(db, "users", user.uid, "chats"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = [];
      snapshot.forEach((doc) => chats.push({ id: doc.id, ...doc.data() }));
      setChatTitles(chats);
    });
    return () => unsubscribe();
  }, [user]);

  // Load selected chat messages or show welcome message if none selected


  // Auto-save chat to Firestore after 1s delay on chatLog changes


  useEffect(() => {
    if (!authResolved || authSubmitting) return;

    if (user) {
      if (location.pathname === "/login") {
        const requestedPath = location.state?.from;
        navigate(requestedPath && requestedPath !== "/login" ? requestedPath : "/", { replace: true });
      }
    } else if (!isGuest) {
      if (location.pathname !== "/login") {
        navigate("/login", { replace: true, state: { from: location.pathname } });
      }
    }
  }, [authResolved, authSubmitting, user, isGuest, location.pathname, location.state, navigate]);


  useEffect(() => {
    if (location.pathname !== "/") return undefined;

    const root = document.documentElement;
    const body = document.body;
    const visualViewport = window.visualViewport;
    let animationFrame = 0;
    let followUpFrame = 0;
    let stableViewportHeight = Math.max(
      window.innerHeight,
      visualViewport?.height || 0
    );
    let previousWidth = window.innerWidth;
    let frozenChatScrollTop = null;
    let freezeChatUntil = 0;

    root.classList.add("mindmate-chat-route");
    body.classList.add("mindmate-chat-route");
    window.scrollTo(0, 0);

    const handleFocusIn = (event) => {
      if (!event.target?.classList?.contains("input-box")) return;
      frozenChatScrollTop = chatBodyRef.current?.scrollTop ?? null;
      freezeChatUntil = performance.now() + 800;
      updateViewport();
    };

    const handleFocusOut = (event) => {
      if (!event.target?.classList?.contains("input-box")) return;
      freezeChatUntil = performance.now() + 500;
      updateViewport();
    };

    const updateViewport = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const viewportHeight = Math.round(visualViewport?.height || window.innerHeight);
        const viewportTop = Math.round(Math.max(
          visualViewport?.offsetTop || 0,
          (visualViewport?.pageTop || 0) - window.scrollY
        ));
        const currentWidth = window.innerWidth;

        // A meaningful width change is an orientation/layout change. Height-only
        // changes are usually the mobile keyboard, so retain the pre-keyboard
        // height as our comparison baseline.
        if (Math.abs(currentWidth - previousWidth) > 48) {
          stableViewportHeight = Math.max(window.innerHeight, viewportHeight);
          previousWidth = currentWidth;
        } else {
          stableViewportHeight = Math.max(stableViewportHeight, window.innerHeight, viewportHeight);
        }

        const keyboardInset = Math.max(0, stableViewportHeight - viewportHeight);
        const composerFocused = document.activeElement?.classList?.contains("input-box");
        const keyboardOpen = window.matchMedia("(max-width: 768px)").matches
          && keyboardInset > 120;

        // Keep the app shell at its pre-keyboard height. Only the composer is
        // lifted by the obscured portion of the viewport, so focusing the input
        // cannot resize or scroll the conversation itself.
        root.style.setProperty("--mindmate-viewport-height", `${stableViewportHeight}px`);
        root.style.setProperty("--mindmate-visible-height", `${viewportHeight}px`);
        root.style.setProperty("--mindmate-keyboard-inset", `${composerFocused ? keyboardInset : 0}px`);
        root.style.setProperty("--mindmate-viewport-offset-top", `${viewportTop}px`);
        root.style.setProperty("--vh", `${viewportHeight * 0.01}px`);
        root.dataset.keyboardOpen = keyboardOpen ? "true" : "false";

        window.cancelAnimationFrame(followUpFrame);
        followUpFrame = window.requestAnimationFrame(() => {
          const appShell = document.querySelector(".chatgpt-wrapper");
          if (appShell) {
            appShell.scrollTop = 0;
            appShell.scrollLeft = 0;
          }

          if (
            frozenChatScrollTop !== null
            && performance.now() <= freezeChatUntil
            && chatBodyRef.current
          ) {
            chatBodyRef.current.scrollTop = frozenChatScrollTop;
          }
        });
      });
    };

    visualViewport?.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    updateViewport();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(followUpFrame);
      visualViewport?.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      root.classList.remove("mindmate-chat-route");
      body.classList.remove("mindmate-chat-route");
      delete root.dataset.keyboardOpen;
      root.style.removeProperty("--mindmate-viewport-height");
      root.style.removeProperty("--mindmate-visible-height");
      root.style.removeProperty("--mindmate-keyboard-inset");
      root.style.removeProperty("--mindmate-viewport-offset-top");
      root.style.removeProperty("--vh");
    };
  }, [location.pathname]);

  useEffect(() => {
    if (window.matchMedia("(max-width: 768px)").matches) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 768px)");
    const syncSidebarToViewport = (event) => setSidebarOpen(!event.matches);
    mobileQuery.addEventListener("change", syncSidebarToViewport);
    return () => mobileQuery.removeEventListener("change", syncSidebarToViewport);
  }, []);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer || location.pathname !== "/") return undefined;

    const updateComposerHeight = () => {
      const height = Math.ceil(composer.getBoundingClientRect().height);
      if (height > 0) {
        document.documentElement.style.setProperty("--mindmate-composer-height", `${height}px`);
      }
    };

    updateComposerHeight();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateComposerHeight);
      return () => {
        window.removeEventListener("resize", updateComposerHeight);
        document.documentElement.style.removeProperty("--mindmate-composer-height");
      };
    }

    const resizeObserver = new ResizeObserver(updateComposerHeight);
    resizeObserver.observe(composer);
    return () => {
      resizeObserver.disconnect();
      document.documentElement.style.removeProperty("--mindmate-composer-height");
    };
  }, [location.pathname, showMoodTracker]);



  // Create a new chat, save old chat with title, then reset chat log
  const handleNewChat = async (isMoodTracker = false) => {
    if (isTyping || isThinking || abortRef.current) handleStop();

    if (user && activeChatId && chatLog.length > 0) {
      try {
        const chatRef = doc(db, "users", user.uid, "chats", activeChatId);
        await updateDoc(chatRef, {
          messages: chatLog,
          assistantMode: assistantModeId,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("❌ Failed to update existing chat:", error);
      }
    } else if (user && chatLog.length > 0 && !activeChatId) {
      // if there was a chat but not saved yet
      try {
        const firstUserMsg = chatLog.find((m) => m.from === "user")?.text || "New Chat";
        const title = generateTitleFromText(firstUserMsg);
        const chatRef = collection(db, "users", user.uid, "chats");
        await addDoc(chatRef, {
          title,
          messages: chatLog,
          assistantMode: assistantModeId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("❌ Failed to save unsaved chat:", err);
      }
    }

    // ✅ Reset for new chat
    setChatLog([]);
    setActiveChatId(null);
    setHasGeneratedTitle(false);
    setFullTitle("");
    setTitleTyping("");
    setShowChips(true);
    setShowMoodTracker(isMoodTracker);
    setIsThinking(false);
    if (window.matchMedia("(max-width: 768px)").matches) setSidebarOpen(false);
  };

  const handleAssistantModeChange = async (nextModeId) => {
    const normalizedModeId = getAssistantModeId(nextModeId);
    if (normalizedModeId === assistantModeId || modeSaving) return;

    const nextMode = getAssistantMode(normalizedModeId);
    const hasConversation = chatLog.some((message) => message.type !== "mode-change");
    const nextMessages = hasConversation
      ? [
          ...chatLog,
          {
            from: "system",
            type: "mode-change",
            mode: normalizedModeId,
            text: `${nextMode.label} mode started. New replies will use a fresh ${nextMode.label.toLowerCase()} context.`,
          },
        ]
      : chatLog;

    setAssistantModeId(normalizedModeId);
    localStorage.setItem("mindmate.assistantMode", normalizedModeId);
    if (hasConversation) setChatLog(nextMessages);

    if (user?.uid && activeChatId) {
      setModeSaving(true);
      try {
        await updateDoc(doc(db, "users", user.uid, "chats", activeChatId), {
          messages: nextMessages,
          assistantMode: normalizedModeId,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Could not save assistant mode:", error);
        if (hasConversation) {
          setChatLog((previous) => [
            ...previous,
            {
              from: "system",
              type: "mode-change",
              text: "This mode is active now, but it could not be saved yet. It will retry with your next message.",
            },
          ]);
        }
      } finally {
        setModeSaving(false);
      }
    }
  };


  const sendMessage = async (msgText = input) => {
    if (isTyping || isThinking) return;
    if (!msgText.trim()) return;

    if (showChips) {
      setShowChips(false);
    }
    if (!activeChatId && !showMoodTracker && chatLog.length === 0) {
      await handleNewChat(false); // ensures chatLog is reset safely
    }

    const newChatLog = [...chatLog, { from: "user", text: msgText }];
    setChatLog(newChatLog);

    if (!user && isGuest) {
      setGuestMessageCount((prev) => prev + 1);
    }


    setInput("");
    setIsTyping(true);
    setIsThinking(true);

    stopTypingRef.current = false;
    currentTypingTextRef.current = "";
    const requestGeneration = requestGenerationRef.current + 1;
    requestGenerationRef.current = requestGeneration;
    const requestChatId = activeChatId;
    const requestModeId = assistantModeId;
    const requestController = new AbortController();
    abortRef.current = requestController;
    let newChatId = null;

    // 🔹 3️⃣ If this is the *first user message* in a new chat → Generate and save title
    try {
      if (user && !activeChatId && newChatLog.length === 1) {
        const titlePrompt = `Generate a short, meaningful 3–5 word title for this chat: "${msgText}"`;
        let generatedTitle = generateTitleFromText(msgText);

        try {
          const titleResponse = await fetch(AI_CONVERSATION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([{ role: "user", content: titlePrompt }]),
            signal: requestController.signal,
          });
          if (!titleResponse.ok) throw new Error(`Title service returned ${titleResponse.status}.`);
          const titleData = await titleResponse.json();
          generatedTitle = titleData.content?.trim() || generatedTitle;
        } catch (titleError) {
          if (titleError.name === "AbortError") throw titleError;
          console.warn("Using a local chat title because title generation failed:", titleError);
        }

        try {
          const chatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
            title: generatedTitle,
            messages: newChatLog,
            assistantMode: requestModeId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          newChatId = chatRef.id;
        } catch (saveError) {
          console.warn("The new chat could not be saved yet:", saveError);
        }

        if (requestGenerationRef.current !== requestGeneration) return;
        if (newChatId) setActiveChatId(newChatId);
        setFullTitle(generatedTitle);
      }

      if (requestGenerationRef.current !== requestGeneration) return;

      let latestModeBoundary = -1;
      for (let index = newChatLog.length - 1; index >= 0; index -= 1) {
        if (newChatLog[index].type === "mode-change") {
          latestModeBoundary = index;
          break;
        }
      }

      const modeScopedLog = newChatLog.slice(latestModeBoundary + 1);
      const messagesToSend = buildModeAwareMessages({
        modeId: requestModeId,
        messages: modeScopedLog
        .filter((msg) => msg.text && msg.text.trim() !== "")
        .slice(-20)
        .map((msg) => ({
          role: msg.from === "user" ? "user" : "model",
          content: msg.text.trim(),
        })),
      });
      const response = await fetch(
        AI_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messagesToSend),
          signal: requestController.signal,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("API ERROR JSON:", data);
        throw new Error(JSON.stringify(data, null, 2));

      }
      if (requestGenerationRef.current !== requestGeneration) return;
      setIsThinking(false);
      const fullReply = data.content || "Something went wrong.";

      if (stopTypingRef.current) {
        return;
      }

      let currentText = "";
      for (let i = 0; i < fullReply.length; i++) {
        if (stopTypingRef.current || requestGenerationRef.current !== requestGeneration) break;
        currentText += fullReply[i];

        setChatLog((prev) => {
          const noTyping = prev.filter((msg) => !msg.typing);
          return [...noTyping, { from: "bot", text: currentText, typing: true }];
        });

        currentTypingTextRef.current = currentText;
        await new Promise((r) => setTimeout(r, 20));
      }

      if (stopTypingRef.current || requestGenerationRef.current !== requestGeneration) return;

      // 5️⃣ Finalize message
      setChatLog((prev) => {
        const noTyping = prev.filter((msg) => !msg.typing);
        return [...noTyping, { from: "bot", text: currentTypingTextRef.current }];
      });

      const chatIdToUse = requestChatId || newChatId;

      if (user && chatIdToUse) {
        const chatRef = doc(db, "users", user.uid, "chats", chatIdToUse);

        const updatedMessages = [
          ...newChatLog,
          { from: "bot", text: currentTypingTextRef.current }
        ];

        await updateDoc(chatRef, {
          messages: updatedMessages,
          assistantMode: requestModeId,
          updatedAt: serverTimestamp(),
        });

        if (requestGenerationRef.current === requestGeneration) setChatLog(updatedMessages);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }
      console.error(err);
      if (requestGenerationRef.current === requestGeneration) {
        setChatLog((prev) => [
          ...prev,
          { from: "bot", text: "Something went wrong. Please try again." },
        ]);
      }
    } finally {
      if (requestGenerationRef.current === requestGeneration) {
        setIsThinking(false);
        setIsTyping(false);
        stopTypingRef.current = false;
        if (abortRef.current === requestController) abortRef.current = null;
      }
    }

  };


  const confirmDictation = async () => {
    const dictatedText = input.trim();
    dictationSessionRef.current += 1;
    dictationStreamRef.current?.getTracks().forEach((track) => track.stop());
    dictationStreamRef.current = null;
    setDictationStream(null);
    setDictationElapsed(0);

    try {
      await SpeechRecognition.stopListening();
    } finally {
      resetTranscript();
      if (dictatedText) await sendMessage(dictatedText);
    }
  };


  // Select chat from sidebar to load messages
  const handleSelectChat = (chatId) => {
    const selected = chatTitles.find(c => c.id === chatId);

    if (selected) {
      if (isTyping || isThinking || abortRef.current) handleStop();
      const selectedModeId = getAssistantModeId(selected.assistantMode);
      setActiveChatId(chatId);
      setChatLog(selected.messages || []);
      setAssistantModeId(selectedModeId);
      localStorage.setItem("mindmate.assistantMode", selectedModeId);

      // load the correct saved title
      setFullTitle(selected.title || "");
      setTitleTyping("");
      setHasGeneratedTitle(true);

      setShowMoodTracker(false);
      if (window.matchMedia("(max-width: 768px)").matches) setSidebarOpen(false);
    }
  };


  // Login/logout handlers
  // Login button
  const handleGoogleLogin = async () => {
    if (authSubmitting) return;

    const previousLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const returnPath = getSafeReturnPath(location.state?.from);

    try {
      setAuthSubmitting(true);
      setAuthError("");
      setIsGuest(false);
      localStorage.removeItem("isGuest");

      sessionStorage.setItem(AUTH_REDIRECT_PENDING_KEY, "true");
      sessionStorage.setItem(AUTH_RETURN_PATH_KEY, returnPath);

      await prepareAuthSession();

      // Firebase returns to the URL where redirect sign-in began. Starting from
      // the SPA root also makes the callback resilient on static hosts.
      window.history.replaceState(window.history.state, "", "/");
      await signInWithRedirect(auth, provider);
    } catch (err) {
      sessionStorage.removeItem(AUTH_REDIRECT_PENDING_KEY);
      sessionStorage.removeItem(AUTH_RETURN_PATH_KEY);
      window.history.replaceState(window.history.state, "", previousLocation);
      setAuthSubmitting(false);
      console.error("Sign-in error:", err);
      setAuthError(
        err?.code === "auth/unauthorized-domain"
          ? `Google login is not authorized for ${authRedirectDomain}.`
          : err.message || "Google sign-in failed. Please try again."
      );
    }
  };

  const handleGuestLogin = () => {
    sessionStorage.removeItem(AUTH_REDIRECT_PENDING_KEY);
    sessionStorage.removeItem(AUTH_RETURN_PATH_KEY);
    setAuthError("");
    setAuthSubmitting(false);
    setIsGuest(true);
    localStorage.setItem("isGuest", "true"); // ✅ persist
    navigate("/");   // redirect guest to main screen
  };


  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setAuthError("");
      setUser(null);
      setIsGuest(false);
      localStorage.removeItem("isGuest");
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  };



  const handleDeleteChat = async (chatId) => {
    if (!chatId || !chatTitles.some((chat) => chat.id === chatId)) return false;
    if (!user?.uid) throw new Error("A signed-in session is required to delete a saved chat.");

    // Stop work tied to the active document before removing it so a late AI
    // response cannot attempt to write back into the deleted conversation.
    if (chatId === activeChatId && (isTyping || isThinking)) handleStop();

    // Saved chat: delete from Firestore and state
    try {
      await deleteDoc(doc(db, "users", user.uid, "chats", chatId));
    } catch (err) {
      console.error("Failed to delete chat:", err);
      throw new Error("The chat could not be deleted.", { cause: err });
    }

    setChatTitles((prev) => prev.filter((c) => c.id !== chatId));

    // If active chat was deleted, pick another chat or reset
    if (activeChatId === chatId) {
      const remaining = chatTitles.filter((c) => c.id !== chatId);
      if (remaining.length) {
        const nextChat = remaining[0];
        const nextModeId = getAssistantModeId(nextChat.assistantMode);
        setActiveChatId(nextChat.id);
        setChatLog(nextChat.messages || []);
        setAssistantModeId(nextModeId);
        localStorage.setItem("mindmate.assistantMode", nextModeId);
        setFullTitle(nextChat.title || "");
        setTitleTyping("");
        setHasGeneratedTitle(true);
        setShowChips(false);
      } else {
        setActiveChatId(null);
        setChatLog([]);
        setFullTitle("");
        setTitleTyping("");
        setHasGeneratedTitle(false);
        setShowChips(true);
      }
    }

    return true;
  };


  const [showShareModal, setShowShareModal] = useState(false);
  const [shareText, setShareText] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(null); // index of disliked message
  const [submitted, setSubmitted] = useState(false);


  const handleFeedback = (index, type) => {
    setChatLog((prev) =>
      prev.map((msg, i) => {
        if (i !== index) return msg;
        if (type === "like") {
          return { ...msg, liked: true, disliked: false };
        } else if (type === "dislike") {
          return { ...msg, liked: false, disliked: true };
        }
        return msg;
      })
    );

    if (type === "dislike") {
      setSuggestionIndex(index); // show suggestion tray
    } else {
      setSuggestionIndex(null); // hide tray
    }
  };


  const handleShare = (text) => {
    setShareText(text);
    setShowShareModal(true);
  };


  const handleRegenerate = (index) => {
    if (isTyping || isThinking) return;

    const lastUserMsg = [...chatLog]
      .slice(0, index)
      .reverse()
      .find((m) => m.from === "user");

    if (!lastUserMsg) return;

    sendMessage(lastUserMsg.text);
  };



  // Show splash screen initially, then login or main chat UI
  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;

  if (!authResolved) {
    return (
      <main className="auth-bootstrap" aria-live="polite" aria-busy="true">
        <span className="auth-bootstrap__orb" aria-hidden="true" />
        <p>Finishing secure sign-in…</p>
      </main>
    );
  }

  return (

    <Suspense fallback={<div className="route-loading" role="status"><span /><span /><span /></div>}>
      <Routes>
      {/* Main Chat & UI */}
      <Route
        path="/"
        element={



          <div className="chatgpt-wrapper" data-assistant-mode={assistantModeId}>
            <div className={`sidebar-container visible`}>

              <Sidebar
                onNewChat={() => handleNewChat(false)}
                onOpenMoodTracker={() => {
                  setShowMoodTracker(true);
                  if (window.matchMedia("(max-width: 768px)").matches) setSidebarOpen(false);
                }}
                chatTitles={displayedChats}
                onSelectChat={handleSelectChat}
                activeChatId={activeChatId}
                onDeleteChat={handleDeleteChat}
                onOpenSearch={() => {
                  setShowSearchModal(true);
                  if (window.matchMedia("(max-width: 768px)").matches) setSidebarOpen(false);
                }}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                sidebarOpen={sidebarOpen}
                collapsed={collapsed}
                onToggleCollapse={() => setCollapsed(!collapsed)}
                goToPremium={goToPremium}
              />
            </div>

            <div className="main-area">
              <Topbar
                user={user}
                onLogout={handleSignOut}
                goToPremium={goToPremium}
                onOpenSettings={() => setSettingsOpen(true)}
                onLoginClick={() => navigate("/login")}
                onToggleSidebar={() => setSidebarOpen((open) => !open)}
                modeSwitcher={(
                  <AssistantModeSwitcher
                    value={assistantModeId}
                    onChange={handleAssistantModeChange}
                    options={ASSISTANT_MODE_OPTIONS}
                    disabled={isTyping || isThinking || listening || modeSaving}
                    ariaLabel="Choose how MindMate should respond"
                    className="topbar-mode-switcher"
                  />
                )}
              />
              <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setSettingsOpen(false)}
                onLogout={handleSignOut}
                selectedVoice={selectedVoice}
                voiceOptions={VOICE_OPTIONS}
                onVoiceChange={handleVoiceChange}
                autoSpeak={autoSpeak}
                onAutoSpeakChange={handleAutoSpeakChange}
              />
              <SearchChatsModal
                isOpen={showSearchModal}
                onNewChat={() => handleNewChat(false)}
                onClose={() => setShowSearchModal(false)}
                chatTitles={chatTitles}
                activeChatId={activeChatId}
                onSelectChat={handleSelectChat}
              />

              <div className="chat-body" >

                {showMoodTracker ? (
                  <MoodTracker
                    onSelectMood={handleMoodSelect}
                    isGuest={isGuest}
                    onClose={() => {
                      setShowMoodTracker(false);
                    }}
                  />
                ) : !activeChatId && chatLog.length === 0 ? (
                  <>
                    <Starfield />
                    <WelcomeScreen user={user} mode={assistantModeId} />
                  </>
                ) : (
                  <div className="chat-log" ref={chatBodyRef}>

                    {chatLog.map((msg, i) => {
                      if (msg.type === "mode-change") {
                        return (
                          <div key={i} className="chat-mode-transition">
                            <span>{msg.text}</span>
                          </div>
                        );
                      }

                      const isBot = msg.from === "bot";
                      return (
                        <div key={i} className={`chat-row ${msg.from || "system"}`}>
                          {msg.image ? (
                            <img src={msg.image} alt="attached" className="chat-image" />
                          ) : (
                            <div
                              className={`message-block ${isBot ? "is-bot" : "is-user"}`}
                            >
                              <div
                                className={`chat-message-bubble ${isBot ? "chat-message-bubble--bot" : "chat-message-bubble--user"}`}
                              >
                                {isBot ? (
                                  <ReactMarkdown
                                    components={{
                                      p: (props) => (
                                        <p className="chat-markdown-paragraph" {...omitMarkdownMetadata(props)} />
                                      ),
                                      strong: (props) => (
                                        <strong
                                          className="chat-markdown-strong"
                                          {...omitMarkdownMetadata(props)}
                                        />
                                      ),
                                      ul: (props) => (
                                        <ul
                                          className="chat-markdown-list chat-markdown-list--unordered"
                                          {...omitMarkdownMetadata(props)}
                                        />
                                      ),
                                      ol: (props) => (
                                        <ol
                                          className="chat-markdown-list chat-markdown-list--ordered"
                                          {...omitMarkdownMetadata(props)}
                                        />
                                      ),
                                      li: (props) => (
                                        <li className="chat-markdown-list-item" {...omitMarkdownMetadata(props)} />
                                      ),
                                      code: (props) =>
                                        props.inline ? (
                                          <code
                                            className="chat-markdown-inline-code"
                                            {...omitMarkdownMetadata(props)}
                                          />
                                        ) : (
                                          <pre className="chat-markdown-code-block">
                                            <code {...omitMarkdownMetadata(props)} />
                                          </pre>
                                        ),
                                    }}
                                  >
                                    {msg.text}
                                  </ReactMarkdown>
                                ) : (
                                  <p className="chat-message-text">{msg.text}</p>
                                )}
                              </div>
                              {isBot && !msg.typing && (
                                <div className="message-actions">
                                  {/* Copy */}
                                  <button
                                    className="action-btn copy-wrapper"
                                    title="Copy message"
                                    onClick={(e) => {
                                      navigator.clipboard.writeText(msg.text);
                                      const btn = e.currentTarget;

                                      // Create floating "Copied" message
                                      const copied = document.createElement("div");
                                      copied.className = "copied-popup";
                                      copied.innerHTML = "Copied";
                                      btn.appendChild(copied);

                                      // Remove it after 2 seconds
                                      setTimeout(() => {
                                        copied.classList.add("fade-out");
                                        setTimeout(() => copied.remove(), 300);
                                      }, 1500);
                                    }}
                                  >
                                    <Copy size={18} />
                                  </button>

                                  <button
                                    className={`action-btn ${msg.liked ? "liked" : ""}`}
                                    title="Like"
                                    onClick={() => handleFeedback(i, "like")}
                                  >
                                    <ThumbsUp size={18} />
                                  </button>


                                  <button
                                    className={`action-btn ${msg.disliked ? "disliked" : ""}`}
                                    title="Dislike"
                                    onClick={() => handleFeedback(i, "dislike")}
                                  >
                                    <ThumbsDown size={18} />
                                  </button>

                                  {/* Share */}
                                  <button
                                    className="action-btn"
                                    title="Share message"
                                    onClick={() => handleShare(msg.text)}
                                  >
                                    <Share2 size={18} />
                                  </button>

                                  {/* Regenerate */}
                                  <button
                                    className="action-btn"
                                    title="Regenerate reply"
                                    onClick={() => handleRegenerate(i)}
                                  >
                                    <RefreshCcw size={18} />
                                  </button>

                                  {/* More */}
                                  <button

                                    className="action-btn"
                                    title="Read Aloud"
                                    onClick={() =>speakWithRiva(msg.text) }
                                    
                                  >
                                    <Volume2  size={18} />
                                  </button>
                                </div>
                              )}
                              {/* Suggestion Tray */}
                              {suggestionIndex === i && (
                                <div className="feedback-box">
                                  <div className="feedback-header">
                                    <span>Tell us more:</span>
                                    <button onClick={() => setSuggestionIndex(null)}>✕</button>
                                  </div>
                                  <div className="feedback-options">

                                    {[
                                      "Response didn’t feel supportive",
                                      "Didn't understand my mood correctly",
                                      "Personality felt off",
                                      "Tone/style wasn't helpful",
                                      "Information wasn’t accurate",
                                      "Too generic or vague",
                                      "Too long or overwhelming",
                                    ].map((r, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          setSuggestionIndex(null);
                                          setSubmitted(true);
                                          setTimeout(() => setSubmitted(false), 2000);
                                        }}
                                        style={{
                                          background: "transparent",
                                          border: "1px solid #555",
                                          color: "#ddd",
                                          borderRadius: "20px",
                                          padding: "6px 10px",
                                          fontSize: "13px",
                                          cursor: "pointer",
                                          transition: "all 0.2s ease",
                                        }}
                                        onMouseEnter={(e) =>
                                          (e.currentTarget.style.background = "#333")
                                        }
                                        onMouseLeave={(e) =>
                                          (e.currentTarget.style.background = "transparent")
                                        }
                                      >
                                        {r}
                                      </button>
                                    ))}

                                    {/* "More..." button */}
                                    <button
                                      className="feedback-option"
                                      onClick={() => {
                                        setSuggestionIndex(null);
                                        setSubmitted(true);
                                        setTimeout(() => setSubmitted(false), 2000);
                                      }}
                                    >
                                      More...
                                    </button>




                                  </div>
                                </div>
                              )}
                            </div>
                          )
                          }

                          {submitted && (
                            <div
                              style={{
                                position: "fixed",
                                top: "10px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                background: "#333",
                                color: "#fff",
                                padding: "6px 14px",
                                borderRadius: "12px",
                                fontSize: "13px",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                zIndex: 1000,
                                opacity: 0.95,
                                pointerEvents: "none",
                              }}
                            >
                              Thanks for your feedback! 💛
                            </div>
                          )}
                        </div>
                      );
                    })}


                    <button
                      className={`scroll-to-bottom-btn ${userScrolledUp ? "show" : ""}`}
                      onClick={scrollToBottom}
                    >
                      <FaArrowDown style={{ color: "white", width: "16px", height: "24px" }} />
                    </button>
                    {isThinking && (
                      <div className="chat-row bot">
                        <div className="mindmate-thinking" role="status" aria-label="MindMate is thinking">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              {showShareModal && (
                <div className="share-overlay" onClick={closeShareModal}>
                  <div
                    className={`share-modal ${closingShare ? "closing" : ""}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="share-header">
                      <h2>MindMate Mental Health System</h2>

                      <button className="share-close" onClick={closeShareModal}>
                        <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    <div className="share-divider" />

                    <div className="share-preview-container">

                      {/* Background conversation preview */}
                      <div className="share-preview-text">
                        {shareText.slice(0, 220)}
                      </div>



                      {/* Watermark like ChatGPT */}
                      <div className="preview-watermark">
                        MindMate
                      </div>

                    </div>
                    {/* Share Buttons */}
                    <div className="share-actions">

                      <div className="share-action">
                        <div className="share-circle" onClick={() => navigator.clipboard.writeText(shareText)}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.07 0l3.54-3.54a5 5 0 1 0-7.07-7.07L11 4" />
                            <path d="M14 11a5 5 0 0 0-7.07 0L3.39 14.54a5 5 0 1 0 7.07 7.07L13 20" />
                          </svg>
                        </div>
                        <span>Copy link</span>
                      </div>

                      <div className="share-action">
                        <div
                          className="share-circle"
                          onClick={() =>
                            window.open(
                              `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
                            )
                          }
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="black">
                            <path d="M18 2h3l-7.5 8.6L22 22h-6.8l-5.3-6.9L3.5 22H0l8-9.2L0 2h7l4.8 6.3L18 2z" />
                          </svg>
                        </div>
                        <span>X</span>
                      </div>

                      <div className="share-action">
                        <div
                          className="share-circle"
                          onClick={() =>
                            window.open(
                              `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareText)}`
                            )
                          }
                        >
                          <svg width="20" height="15" viewBox="0 0 24 24" fill="black">
                            <path d="M6.94 6.5a1.94 1.94 0 1 1 0-3.88 1.94 1.94 0 0 1 0 3.88zM4.5 8h4.8v12H4.5zM13 8h4.6v1.7h.07c.64-1.2 2.2-2.46 4.53-2.46 4.84 0 5.73 3.19 5.73 7.34V20H23v-4.93c0-1.18-.02-2.7-1.65-2.7-1.66 0-1.91 1.3-1.91 2.63V20H14V8z" />
                          </svg>
                        </div>
                        <span>LinkedIn</span>
                      </div>

                      <div className="share-action">
                        <div
                          className="share-circle"
                          onClick={() =>
                            window.open(
                              `https://reddit.com/submit?text=${encodeURIComponent(shareText)}`
                            )
                          }
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="black">
                            <path d="M22 12c0-1.1-.9-2-2-2-.6 0-1.1.2-1.4.6-1.3-.9-3-1.5-4.8-1.6l1-3.1 2.6.6c0 .9.7 1.6 1.6 1.6.9 0 1.6-.7 1.6-1.6s-.7-1.6-1.6-1.6c-.6 0-1.2.3-1.4.9l-3.2-.7c-.3-.1-.6.1-.7.4l-1.2 3.7c-1.9.1-3.7.7-5 1.6-.4-.3-.9-.6-1.5-.6-1.1 0-2 .9-2 2 0 .8.4 1.4 1 1.8-.1.4-.1.7-.1 1.1 0 3 3.6 5.4 8 5.4s8-2.4 8-5.4c0-.4 0-.7-.1-1.1.7-.4 1.1-1 1.1-1.8z" />
                          </svg>
                        </div>
                        <span>Reddit</span>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              <div
                ref={composerRef}
                className={`floating-input-bar ${showMoodTracker
                  ? "hidden"
                  : !activeChatId && chatLog.length === 0
                    ? "welcome-mode"
                    : "chat-mode"

                  }`}

              >

                {showChips &&
                  !activeChatId &&
                  chatLog.length === 0 &&
                  input.trim().length === 0 &&
                  !listening &&
                  !showMoodTracker && (
                    <div className="suggestions-below-input" role="group" aria-label="Suggested prompts">
                      {assistantMode.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="suggestion-chip"
                          onClick={() => sendMessage(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                <div className={`input-inner ${listening ? "input-inner--dictating" : ""}`}>
                  {!listening ? (
                    <>
                      <textarea
                        className="input-box"
                        placeholder={assistantMode.placeholder}
                        value={input}
                        rows={1}
                        onChange={(e) => {
                          setInput(e.target.value);
                          const textarea = e.currentTarget;
                          textarea.style.height = "auto";
                          const nextHeight = Math.min(textarea.scrollHeight, 120);
                          textarea.style.height = `${nextHeight}px`;
                          textarea.style.overflowY = textarea.scrollHeight > 120 ? "auto" : "hidden";
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();

                            if (!isTyping && !isThinking) {
                              sendMessage();
                            }
                          }
                        }}
                      />


                      {/* Your other buttons here */}

                       <button
                        className={`icon-btn mic-btn ${listening ? "active" : ""}`}
                        onClick={startDictation}
                        title="Voice Input"
                        type="button"
                      >
                        <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                          <path
                            d="M12 14a4 4 0 004-4V5a4 4 0 10-8 0v5a4 4 0 004 4zm5-4a5 5 0 01-10 0M19 10v1a7 7 0 01-14 0v-1M12 19v3m-4 0h8"
                            stroke="white"
                            strokeWidth="2"
                            fill="none"
                          />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <div className="dictation-mode">
                      <VoicePulseLine isListening={listening} stream={dictationStream} />
                      <time
                        className="dictation-timer"
                        dateTime={`PT${dictationElapsed}S`}
                        aria-label={`${dictationElapsed} seconds recorded`}
                      >
                        {formatDictationTime(dictationElapsed)}
                      </time>
                      <div className="dictation-actions">
                        <button
                          className="cross-btn"
                          onClick={stopDictation}
                          title="Stop dictation"
                          aria-label="Stop dictation"
                          type="button"
                        >
                          <Square size={12} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                        </button>

                        <button
                          className="tick-btn"
                          onClick={confirmDictation}
                          title="Send dictation"
                          aria-label="Send dictation"
                          type="button"
                        >
                          <ArrowUp size={22} strokeWidth={2.25} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )

                  }
                  {!listening && <div className="button-container">
                    {isTyping ? (
                      <button
                        className="stop-button"
                        onClick={handleStop} // ✅ call the stop handler
                        title="Stop"
                        type="button"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="24"
                          height="24"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect x="6" y="6" width="12" height="12" />
                        </svg>
                      </button>
                    ) : input.trim() === "" ? (
                      <button
                        className={`voice-model-button ${voiceStarting ? "is-starting" : ""}`}
                        onClick={startVoiceConversation}
                        title={`Start voice conversation with ${selectedVoice.name}`}
                        aria-label={`Start voice conversation with ${selectedVoice.name}`}
                        disabled={voiceStarting}
                        type="button"
                      >
                        <div className="animated-bars">
                          {bars.map((_, i) => (
                            <span
                              key={i}
                              className="bar"
                            />
                          ))}
                        </div>
                      </button>

                    ) : (
                      <button
                        className="send-button-animated"
                        onClick={() => sendMessage()}
                        title="Send"
                        type="button"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                          fill="black"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                        </svg>
                      </button>


                    )}
                  </div>}
                </div>

              </div>
              {showLoginModal && (
                <div className="modal-over">
                  <div className="modal-cont">
                    <button className="modal-cl" onClick={() => setShowLoginModal(false)}>×</button>

                    <h2>Let’s keep this journey going</h2>
                    <p>
                      Logging in helps us
                      <strong> personalize your experience</strong>,
                      <strong> save your progress</strong>, and
                      <strong> support your growth better</strong>.
                    </p>

                    <div className="modal-act">
                      <button
                        className="login-but"
                        onClick={() => {
                          setShowLoginModal(false);
                          navigate("/login"); // ✅ redirect to login page
                        }}
                      >
                        Continue?
                      </button>
                      <button
                        className="cancel-but"
                        onClick={() => {
                          setShowLoginModal(false);
                          setDismissedLoginModal(true);
                        }}
                      >
                        Maybe later
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div >
        }
      />
      {/* Premium Page */}


      <Route path="/premium" element={<Premium user={user} />} />
      <Route
        path="/login"
        element={
          <LoginScreen
            onGoogleLogin={handleGoogleLogin}
            onGuestLogin={handleGuestLogin}
            googleSubmitting={authSubmitting}
            authError={authError}
          />
        }
      />

      <Route
        path="/voice"
        element={
          <VoiceCloud
            selectedVoice={selectedVoice}
            voiceOptions={VOICE_OPTIONS}
            onVoiceChange={handleVoiceChange}
            assistantModeId={assistantModeId}
          />
        }
      />
      <Route path="/goals" element={<GoalsPage assistantModeId={assistantModeId} />} />
      <Route path="/journals" element={<JournalChatScreen user={user} isGuest={isGuest} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>

  );

};
export default App;
