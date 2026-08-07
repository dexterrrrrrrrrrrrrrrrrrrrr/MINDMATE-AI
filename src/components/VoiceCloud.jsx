import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff, Settings2, X } from "lucide-react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import "../styles/VoiceCloud.css";
import CloudyOrb from "./CloudyOrb";
import {
  getMicrophoneErrorMessage,
  requestMicrophonePermission,
} from "../utils/speechRecognition";
import { AI_API_URL, AI_AUDIO_URL } from "../config";
import { buildModeAwareMessages } from "../utils/assistantRequest";

const VoiceCloud = ({ selectedVoice, voiceOptions = [], onVoiceChange, assistantModeId = "therapy" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const voice = selectedVoice?.name || "Mia";
  const permissionGrantedOnEntry = Boolean(location.state?.microphoneGranted);
  const microphoneStartedOnEntry = Boolean(location.state?.microphoneStarted);
  const {
    transcript,
    resetTranscript,
    listening,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition({ clearTranscriptOnListen: true });

  const [error, setError] = useState(null);
  const [micActive, setMicActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [closing, setClosing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoListen, setAutoListen] = useState(
    () => localStorage.getItem("mindmate.voice.autoListen") !== "false"
  );
  const [showCaptions, setShowCaptions] = useState(
    () => localStorage.getItem("mindmate.voice.captions") === "true"
  );

  const mountedRef = useRef(true);
  const sessionActiveRef = useRef(false);
  const permissionReadyRef = useRef(permissionGrantedOnEntry);
  const startingRef = useRef(false);
  const microphoneAttemptRef = useRef(0);
  const listeningRef = useRef(listening);
  const processingRef = useRef(false);
  const autoStartedRef = useRef(false);
  const closeTimerRef = useRef(null);
  const requestControllerRef = useRef(null);
  const activePlaybackRef = useRef(null);
  const assistantVolumeRef = useRef(0);
  const turnIdRef = useRef(0);
  const autoListenRef = useRef(autoListen);
  const settingsRef = useRef(null);
  const conversationRef = useRef([]);

  useEffect(() => {
    conversationRef.current = [];
  }, [assistantModeId]);

  const stopAssistantAudio = useCallback(() => {
    activePlaybackRef.current?.stop();
    activePlaybackRef.current = null;
    assistantVolumeRef.current = 0;
    if (mountedRef.current) setAssistantSpeaking(false);
  }, []);

  const cancelCurrentTurn = useCallback(() => {
    turnIdRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    processingRef.current = false;
    if (mountedRef.current) setProcessing(false);
    stopAssistantAudio();
  }, [stopAssistantAudio]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    autoListenRef.current = autoListen;
    localStorage.setItem("mindmate.voice.autoListen", String(autoListen));
  }, [autoListen]);

  useEffect(() => {
    localStorage.setItem("mindmate.voice.captions", String(showCaptions));
  }, [showCaptions]);

  useEffect(() => {
    if (!settingsOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!settingsRef.current?.contains(event.target)) setSettingsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

  const beginListening = useCallback(async ({ requestPermission = false } = {}) => {
    if (!sessionActiveRef.current || startingRef.current) return;

    const attempt = microphoneAttemptRef.current + 1;
    microphoneAttemptRef.current = attempt;
    startingRef.current = true;
    try {
      setError(null);
      const options = {
        continuous: false,
        interimResults: true,
        language: "en-IN",
      };

      if (requestPermission || !permissionReadyRef.current) {
        await requestMicrophonePermission();
        if (!mountedRef.current || !sessionActiveRef.current || microphoneAttemptRef.current !== attempt) return;
        permissionReadyRef.current = true;
      }

      await SpeechRecognition.startListening(options);
      if (!mountedRef.current || !sessionActiveRef.current || microphoneAttemptRef.current !== attempt) {
        if (listeningRef.current) SpeechRecognition.abortListening().catch(() => {});
        return;
      }

      if (mountedRef.current) setMicActive(true);
    } catch (micError) {
      if (!mountedRef.current || microphoneAttemptRef.current !== attempt) return;
      sessionActiveRef.current = false;
      if (mountedRef.current) {
        setMicActive(false);
        setError(getMicrophoneErrorMessage(micError));
      }
    } finally {
      if (microphoneAttemptRef.current === attempt) startingRef.current = false;
    }
  }, []);

  const playAssistantReply = useCallback(async (text, signal) => {
    const response = await fetch(AI_AUDIO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Voice service returned ${response.status}.`);
    }

    const blob = await response.blob();
    if (signal?.aborted) throw new DOMException("Voice request cancelled.", "AbortError");

    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    return new Promise((resolve, reject) => {
      let settled = false;
      let audioContext = null;
      let analyser = null;
      let samples = null;
      let animationFrame = null;

      const clearPlayback = () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        audio.onplay = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        URL.revokeObjectURL(objectUrl);
        if (audioContext?.state !== "closed") audioContext.close().catch(() => {});
        assistantVolumeRef.current = 0;
        if (mountedRef.current) setAssistantSpeaking(false);
        if (activePlaybackRef.current?.audio === audio) activePlaybackRef.current = null;
        signal?.removeEventListener("abort", stopPlayback);
      };

      const finish = (playbackError) => {
        if (settled) return;
        settled = true;
        clearPlayback();
        if (playbackError) reject(playbackError);
        else resolve();
      };

      const stopPlayback = () => finish();
      activePlaybackRef.current = { audio, stop: stopPlayback };
      signal?.addEventListener("abort", stopPlayback, { once: true });
      if (signal?.aborted) {
        stopPlayback();
        return;
      }

      const updateVolume = () => {
        if (!analyser || !samples || audio.paused || audio.ended || settled) return;
        analyser.getByteFrequencyData(samples);
        let sum = 0;
        for (let index = 0; index < samples.length; index += 1) sum += samples[index];
        const nextLevel = Math.min((sum / samples.length / 255) * 1.65, 1);
        assistantVolumeRef.current += (nextLevel - assistantVolumeRef.current) * 0.24;
        animationFrame = requestAnimationFrame(updateVolume);
      };

      try {
        if (AudioContextClass) {
          audioContext = new AudioContextClass();
          const source = audioContext.createMediaElementSource(audio);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          samples = new Uint8Array(analyser.frequencyBinCount);
          source.connect(analyser);
          analyser.connect(audioContext.destination);
        }

        audio.onplay = () => {
          if (mountedRef.current) setAssistantSpeaking(true);
          updateVolume();
        };
        audio.onended = () => finish();
        audio.onerror = () => finish(new Error("The voice response could not be played."));

        const startPlayback = async () => {
          if (audioContext?.state === "suspended") await audioContext.resume();
          await audio.play();
        };

        startPlayback().catch((playbackError) => finish(playbackError));
      } catch (playbackError) {
        finish(playbackError);
      }
    });
  }, [voice]);

  const sendVoiceMessage = useCallback(async (text, signal) => {
    const nextConversation = [
      ...conversationRef.current,
      { role: "user", content: text },
    ].slice(-12);

    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildModeAwareMessages({
        modeId: assistantModeId,
        messages: nextConversation,
        taskInstruction: "This is a spoken conversation. Answer naturally and concisely so the reply is comfortable to hear aloud.",
      })),
      signal,
    });

    if (!response.ok) {
      throw new Error(`AI service returned ${response.status}.`);
    }

    const data = await response.json();
    const reply = data.content || "Sorry, I didn't understand.";
    conversationRef.current = [
      ...nextConversation,
      { role: "model", content: reply },
    ].slice(-12);
    return reply;
  }, [assistantModeId]);

  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;

    if (!browserSupportsSpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (!permissionGrantedOnEntry) return;

    sessionActiveRef.current = true;
    setMicActive(true);
    if (!microphoneStartedOnEntry) beginListening({ requestPermission: false });
  }, [beginListening, browserSupportsSpeechRecognition, microphoneStartedOnEntry, permissionGrantedOnEntry]);

  useEffect(() => {
    if (isMicrophoneAvailable !== false || !sessionActiveRef.current) return;
    microphoneAttemptRef.current += 1;
    startingRef.current = false;
    sessionActiveRef.current = false;
    setMicActive(false);
    setError("Please allow microphone access and try again.");
    cancelCurrentTurn();
  }, [cancelCurrentTurn, isMicrophoneAvailable]);

  useEffect(() => {
    if (listening || !sessionActiveRef.current || processingRef.current || closing) return undefined;

    const spokenText = transcript.trim();
    if (spokenText.length < 2) {
      if (!micActive || startingRef.current) return undefined;
      const restartTimer = setTimeout(() => beginListening({ requestPermission: false }), 350);
      return () => clearTimeout(restartTimer);
    }

    const controller = new AbortController();
    const turnId = turnIdRef.current + 1;
    turnIdRef.current = turnId;
    requestControllerRef.current = controller;
    processingRef.current = true;
    setProcessing(true);

    const respond = async () => {
      try {
        const reply = await sendVoiceMessage(spokenText, controller.signal);
        if (sessionActiveRef.current && turnIdRef.current === turnId && !controller.signal.aborted) {
          await playAssistantReply(reply, controller.signal);
        }
      } catch (voiceError) {
        if (voiceError?.name !== "AbortError" && mountedRef.current) {
          setError(voiceError.message || "Voice conversation failed. Please try again.");
        }
      } finally {
        if (turnIdRef.current === turnId) {
          requestControllerRef.current = null;
          processingRef.current = false;
          if (mountedRef.current) {
            setProcessing(false);
            resetTranscript();
          }
          if (sessionActiveRef.current && !controller.signal.aborted) {
            if (autoListenRef.current) {
              beginListening({ requestPermission: false });
            } else {
              sessionActiveRef.current = false;
              if (mountedRef.current) setMicActive(false);
            }
          }
        }
      }
    };

    respond();
    return undefined;
  }, [beginListening, closing, listening, micActive, playAssistantReply, resetTranscript, sendVoiceMessage, transcript]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionActiveRef.current = false;
      microphoneAttemptRef.current += 1;
      startingRef.current = false;
      requestControllerRef.current?.abort();
      if (listeningRef.current) SpeechRecognition.abortListening().catch(() => {});
      stopAssistantAudio();
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [stopAssistantAudio]);

  const toggleMicrophone = async () => {
    if (closing) return;
    if (!browserSupportsSpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (sessionActiveRef.current) {
      sessionActiveRef.current = false;
      microphoneAttemptRef.current += 1;
      startingRef.current = false;
      setMicActive(false);
      cancelCurrentTurn();
      if (listeningRef.current) SpeechRecognition.abortListening().catch(() => {});
      return;
    }

    resetTranscript();
    sessionActiveRef.current = true;
    await beginListening({ requestPermission: !permissionReadyRef.current });
  };

  const endConversation = () => {
    if (closing) return;
    setClosing(true);
    setSettingsOpen(false);
    sessionActiveRef.current = false;
    microphoneAttemptRef.current += 1;
    startingRef.current = false;
    setMicActive(false);
    cancelCurrentTurn();
    if (listeningRef.current) SpeechRecognition.abortListening().catch(() => {});
    closeTimerRef.current = setTimeout(() => navigate("/", { replace: true }), 560);
  };

  const orbMode = assistantSpeaking
    ? "speaking"
    : processing
      ? "thinking"
      : listening
        ? "listening"
        : "idle";

  const statusText = assistantSpeaking
    ? "Speaking"
    : processing
      ? "Thinking"
      : listening
        ? "Listening"
        : micActive
          ? "Getting ready"
          : "Tap the microphone to begin";

  return (
    <main className={`voice-screen ${settingsOpen ? "voice-settings-open" : ""} ${closing ? "voice-closing" : ""}`}>
      <h1 className="voice-screen-reader-title">Voice with {voice}</h1>

      <div className="voice-session-toolbar" ref={settingsRef}>
        <label className="voice-picker">
          <span className="voice-screen-reader-title">Choose voice</span>
          <select
            value={selectedVoice?.id || "mia"}
            onChange={(event) => onVoiceChange?.(event.target.value)}
            disabled={processing || assistantSpeaking || closing}
            aria-label="Choose voice"
          >
            {voiceOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`voice-settings-button ${settingsOpen ? "active" : ""}`}
          onClick={() => setSettingsOpen((open) => !open)}
          disabled={closing}
          aria-label="Voice settings"
          aria-expanded={settingsOpen}
        >
          <Settings2 size={17} />
        </button>

        {settingsOpen && (
          <div className="voice-settings-panel" role="group" aria-label="Voice settings">
            <div className="voice-settings-heading">
              <strong>Voice settings</strong>
              <span>{voice}</span>
            </div>

            <label className="voice-setting-row">
              <span>
                <strong>Auto-listen</strong>
                <small>Continue after each reply</small>
              </span>
              <input
                type="checkbox"
                checked={autoListen}
                onChange={(event) => setAutoListen(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>

            <label className="voice-setting-row">
              <span>
                <strong>Captions</strong>
                <small>Show what the microphone hears</small>
              </span>
              <input
                type="checkbox"
                checked={showCaptions}
                onChange={(event) => setShowCaptions(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>
          </div>
        )}
      </div>

      <div className="voice-avatar-wrapper">
        <div className="orb-container">
          <CloudyOrb
            volume={listening ? 0.16 : 0}
            assistantVolumeRef={assistantVolumeRef}
            mode={orbMode}
            closing={closing}
          />
        </div>
        <p className={`voice-status state-${orbMode}`}>{statusText}</p>
        <p className="voice-live-region" aria-live="polite">
          {transcript ? `You said: ${transcript}` : statusText}
        </p>
        {showCaptions && transcript && (
          <p className="voice-caption" aria-hidden="true">{transcript}</p>
        )}
      </div>

      <div className="controls" aria-label="Voice controls">
        <button
          type="button"
          className={`control-btn mic ${micActive ? "active" : ""}`}
          onClick={toggleMicrophone}
          disabled={closing}
          aria-label={micActive ? "Mute microphone" : "Start microphone"}
          aria-pressed={micActive}
        >
          {micActive ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        <button type="button" className="control-btn end" onClick={endConversation} disabled={closing} aria-label="End voice conversation">
          <X size={25} />
        </button>
      </div>

      {error && <div className="voice-error" role="alert">{error}</div>}
    </main>
  );
};

export default VoiceCloud;
