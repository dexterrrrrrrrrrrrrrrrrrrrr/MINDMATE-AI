import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowUp, Mic, MicOff, Square, AudioLines, Plus, Copy, Volume2, X } from 'lucide-react';
import Modal from './Modal';
import ReactMarkdown from 'react-markdown';
import { MODES, askAssistant, demoReply } from '../lib/assistant';
import { uid } from './HealthPages';
const CloudyOrb = lazy(() => import('./CloudyOrb'));

export default function Assistant({ data, update, settings, mode, setMode, chatId, setChatId, status }) {
  const [input, setInput] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [voiceOpen, setVoiceOpen] = useState(false), [listening, setListening] = useState(false), [speaking, setSpeaking] = useState(false), [level, setLevel] = useState(0);
  const abort = useRef(null), recognition = useRef(null), stream = useRef(null), audioContext = useRef(null), frame = useRef(null), audio = useRef(null), turn = useRef(0), end = useRef(null), mounted = useRef(true);
  const chat = data.chats.find(c => c.id === chatId);
  const messages = chat?.messages || [];
  const activeMode = MODES[mode] || MODES.health;
  const stopMic = () => { recognition.current?.stop(); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; audioContext.current?.close().catch(() => {}); audioContext.current = null; cancelAnimationFrame(frame.current); setLevel(0); setListening(false); };
  const stopAudio = () => { window.speechSynthesis?.cancel(); audio.current?.pause(); if (audio.current?.src) URL.revokeObjectURL(audio.current.src); audio.current = null; setSpeaking(false); };
  const stop = () => { turn.current++; abort.current?.abort(); stopMic(); stopAudio(); setBusy(false); };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; abort.current?.abort(); recognition.current?.abort(); stream.current?.getTracks().forEach(t => t.stop()); audioContext.current?.close().catch(() => {}); cancelAnimationFrame(frame.current); window.speechSynthesis?.cancel(); audio.current?.pause(); if (audio.current?.src) URL.revokeObjectURL(audio.current.src); }; }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, busy]);
  const speak = async text => {
    stopAudio();
    setError('');
    if (settings.voice === 'elevenlabs') {
      if (!status.elevenlabs) return setError('ElevenLabs is not configured. Select Browser voice in Settings.');
      try {
        const token = turn.current;
        const response = await fetch('/api/speech', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text:text.slice(0,3000)}) });
        if (!response.ok) throw new Error('Voice service is unavailable.');
        const blob = await response.blob();
        if (!mounted.current || token !== turn.current) return;
        const player = new Audio(URL.createObjectURL(blob)); audio.current = player;
        player.onended = () => { setSpeaking(false); URL.revokeObjectURL(player.src); };
        player.onerror = () => { setSpeaking(false); setError('Audio playback failed.'); };
        await player.play(); setSpeaking(true);
      } catch (err) { if (mounted.current) setError(err.message); }
    } else {
      if (!('speechSynthesis' in window)) return setError('Speech playback is not available in this browser.');
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_]/g, ''));
      utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false);
      setSpeaking(true); window.speechSynthesis.speak(utterance);
    }
  };
  const startMic = async () => {
    if (listening) { stopMic(); return; }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return setError('Voice input is unavailable in this browser. You can type your message instead.');
    setError(''); stopAudio();
    try {
      const media = await navigator.mediaDevices.getUserMedia({audio:true});
      if (!mounted.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const ctx = new AudioContext(); audioContext.current = ctx;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
      ctx.createMediaStreamSource(media).connect(analyser);
      const bins = new Uint8Array(analyser.frequencyBinCount);
      const animate = () => { analyser.getByteFrequencyData(bins); setLevel(bins.reduce((a,b) => a+b,0) / bins.length / 128); frame.current = requestAnimationFrame(animate); }; animate();
      const rec = new Recognition(); recognition.current = rec; rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true;
      const base = input;
      rec.onresult = event => { setInput(`${base} ${Array.from(event.results).map(r => r[0].transcript).join(' ')}`.trim()); };
      rec.onerror = event => { setError(event.error === 'not-allowed' ? 'Microphone access was denied. Enable it in browser settings or type instead.' : `Voice input stopped: ${event.error}.`); stopMic(); };
      rec.onend = () => stopMic(); rec.start(); setListening(true);
    } catch { stopMic(); setError('Microphone access is unavailable. Check permission and use a secure localhost or HTTPS page.'); }
  };
  const send = async (text = input) => {
    if (!text.trim() || busy) return;
    if (text.length > 8000) return setError('Please keep your message under 8,000 characters.');
    stopMic(); stopAudio(); setInput(''); setError(''); setBusy(true);
    const token = ++turn.current;
    const id = chat?.id || uid();
    const next = [...messages, {role:'user', content:text.trim(), id:uid()}];
    const entry = {id, mode, title:chat?.title || text.trim().slice(0,48), at:new Date().toISOString(), messages:next};
    update('chats', [entry, ...data.chats.filter(c => c.id !== id)]); setChatId(id);
    abort.current = new AbortController();
    try {
      const content = settings.liveAI ? await askAssistant({messages:next, mode, signals:data.signals, shareSignals:settings.shareSignals, signal:abort.current.signal}) : demoReply(text, mode);
      if (token !== turn.current || !mounted.current) return;
      update('chats', current => [{...entry, messages:[...next, {role:'assistant', content, id:uid(), kind:settings.liveAI ? 'ai' : 'demo'}]}, ...current.filter(c => c.id !== id)]);
      if (voiceOpen || settings.autoSpeak) speak(content);
    } catch (err) { if (token === turn.current && mounted.current && err.name !== 'AbortError') setError(err.message); }
    finally { if (token === turn.current && mounted.current) setBusy(false); }
  };
  return <div className="assistant-page"><div className="assistant-toolbar"><div className="mode-tabs" aria-label="Assistant mode">{Object.entries(MODES).map(([id, m]) => <button key={id} className={mode === id ? 'active' : ''} disabled={busy} onClick={() => {stop(); setMode(id); setChatId(null);}} aria-pressed={mode === id}>{m.label}</button>)}</div><button className="icon-button" aria-label="Start a new conversation" onClick={() => {stop(); setChatId(null);}}><Plus size={20}/></button></div>
    {!messages.length ? <div className="assistant-welcome"><div className="welcome-mark"><img src="/vitalsense.svg" alt=""/></div><div className="eyebrow">VITALSENSE AI · {activeMode.label}</div><h1>{activeMode.welcome}</h1><p>A thoughtful space to ask, reflect, and understand.</p><div className="chat-suggestions">{[activeMode.prompt, 'What can this app help me understand?', 'Help me organize my health notes.'].map(s => <button key={s} onClick={() => send(s)}>{s}<ArrowUp size={14}/></button>)}</div></div> : <div className="chat-messages">{messages.map(m => <article className={`message ${m.role}`} key={m.id}><div className="message-label">{m.role === 'user' ? 'You' : `VitalSense AI · ${m.kind === 'demo' ? 'Guided demo' : 'AI response'}`}</div><div className="message-content"><ReactMarkdown>{m.content}</ReactMarkdown></div>{m.role === 'assistant' && <div className="message-actions"><button className="icon-button" aria-label="Copy response" onClick={() => navigator.clipboard.writeText(m.content).catch(() => setError('Copy is unavailable in this browser.'))}><Copy size={15}/></button><button className="icon-button" aria-label="Read response aloud" onClick={() => speak(m.content)}><Volume2 size={16}/></button></div>}</article>)}{busy && <p className="thinking" role="status">Making space for a thoughtful answer…</p>}<div ref={end}/></div>}
    <div className="composer-area">{error && <div className="notice error" role="alert">{error}</div>}{listening && <p className="mic-status" role="status">Listening · tap the microphone to finish, then send</p>}<form className="composer" onSubmit={e => {e.preventDefault(); send();}}><textarea aria-label="Message VitalSense AI" placeholder={listening ? 'Listening…' : `Ask your ${activeMode.label.toLowerCase()}…`} value={input} maxLength={8000} onChange={e => setInput(e.target.value)} onKeyDown={e => {if(e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {e.preventDefault(); send();}}}/><div className="composer-bottom"><span className="composer-mode"><span className="live-dot"/>{settings.liveAI ? 'Live AI' : 'Guided demo'}</span><div className="button-row"><button type="button" className={`icon-button ${listening ? 'active-mic' : ''}`} aria-label={listening ? 'Stop dictation' : 'Start dictation'} onClick={startMic}>{listening ? <MicOff size={18}/> : <Mic size={18}/>}</button><button type="button" className="icon-button" aria-label="Open voice conversation" onClick={() => setVoiceOpen(true)}><AudioLines size={19}/></button>{busy || speaking ? <button type="button" className="send-button" aria-label="Stop response and audio" onClick={stop}><Square size={15}/></button> : <button className="send-button" disabled={!input.trim()} aria-label="Send message"><ArrowUp size={20}/></button>}</div></div></form><p className="composer-caption">{settings.liveAI ? 'Messages are sent to your configured AI provider.' : 'Preset demo responses · connect an AI provider in Settings.'} Educational support, not medical care.</p></div>
    {voiceOpen && <Modal onClose={() => {stop(); setVoiceOpen(false);}}><section className="voice-dialog" role="dialog" aria-modal="true" aria-label="Voice conversation" onKeyDown={e => {if(e.key === 'Escape') {stop(); setVoiceOpen(false);}}}><button autoFocus className="icon-button voice-close" aria-label="Close voice conversation" onClick={() => {stop(); setVoiceOpen(false);}}><X size={22}/></button><div className="eyebrow">VITALSENSE AI · VOICE</div><div className="orb-container"><Suspense fallback={<div className="orb-css-fallback"/>}><CloudyOrb mode={listening ? 'listening' : busy ? 'thinking' : speaking ? 'speaking' : 'idle'} volume={level}/></Suspense></div><h2>{listening ? 'I’m listening.' : busy ? 'A moment to reflect.' : speaking ? 'Here with you.' : 'A little space to talk.'}</h2><p>{input || 'Tap the microphone. Review your words, then send.'}</p>{error && <p className="error" role="alert">{error}</p>}<div className="voice-controls"><button className="button" onClick={startMic}>{listening ? <MicOff size={20}/> : <Mic size={20}/>} {listening ? 'Finish' : 'Speak'}</button><button className="button primary" disabled={!input.trim() || busy} onClick={() => send()}>Send <ArrowUp size={17}/></button><button className="button" onClick={stop}><Square size={16}/>Stop</button></div><small>{settings.voice === 'elevenlabs' ? 'ElevenLabs · response text sent for audio' : 'Browser voice'} · {settings.liveAI ? 'Live AI' : 'Guided demo'}</small><small>Browser speech recognition may send audio to the browser provider.</small></section></Modal>}
  </div>;
}
