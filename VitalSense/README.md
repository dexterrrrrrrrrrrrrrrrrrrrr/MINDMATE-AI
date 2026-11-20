# VitalSense AI

A health-awareness software engineering prototype built from MindMate’s visual foundation: dark glass panels, a calm chat composer, starfield backdrop, and the original animated Three.js voice orb.

**Understand your signals. Notice patterns. Prepare better questions.**

## Run locally

Requires Node.js 22.12+ (Node 24 recommended).

```powershell
cd D:\mindmate-web\VitalSense
npm install
npm run dev
```

Open http://127.0.0.1:5174. The app works without Firebase or AI keys in guided demo mode. Sample measurements are fictional and separate from personal records. Personal records persist in browser localStorage; sample changes reset on reload.

```powershell
npm test
npm run lint
npm run build
npm run preview
```

## Implemented screens

| Screen | Behavior |
| --- | --- |
| Overview | Latest logged measurements, timestamped pulse chart, check-in shortcut, explainable observations |
| Health companion | Four health-focused conversation modes, saved chat history, Markdown, copy, read aloud, dictation, cancellation |
| Health signals | Manual pulse, paired blood pressure, sleep, steps and temperature; optional notes, validation, history, delete and metric timeline |
| Insights | Source-linked adult BP categories; experimental pulse-baseline change rule; explicit missing-data and scope statements |
| Health journal | Create, edit, search, delete; newest saved/edited reflections first |
| Mind & mood | Explicit mood check-ins, notes, history, deletion; no inferred emotional diagnosis |
| Healthy habits | Suggested or custom daily habits, completion by date, total completed days, remove |
| Visit summary | Printable latest 14 readings and clinician question checklist; excludes private journal/chat/mood content |
| Settings | AI/data-sharing opt-ins, voice provider, Google sign-in, manual cloud snapshots, JSON export and confirmed local reset |

## MindMate adaptation

Reused the existing starfield and CloudyOrb components. Preserved the visual language and feature families of chat, journaling, mood, goals, voice, authentication and cloud persistence. Rebuilt navigation and data flows around health signals. Removed subscriptions/payments, therapy/doctor impersonation, financial/career goals, inherited deployment URLs, old Firebase defaults, and guest message limits. No MindMate `.env`, credentials, or data were copied. The original app and its uncommitted changes remain untouched.

## Live AI and ElevenLabs (optional)

1. Copy `.env.server.example` to `.env.server`.
2. Set your OpenAI-compatible `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL`.
3. Optionally set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`.
4. In another terminal, run `npm run server`.
5. Enable **Use live AI** in Settings. Sending chat transmits message history to that provider. Measurement sharing is a separate opt-in.

The Vite dev server proxies `/api` to the companion server on port 8787. Browser speech synthesis needs no key. Speech recognition depends on browser support/permission and may send audio to the browser provider. ElevenLabs receives response text only when selected. The orb responds to microphone amplitude and voice state; browser TTS does not provide output amplitude analysis.

The companion server binds only to localhost. It is a local development service, **not a production API**. `vite preview` serves static output without the API proxy. Before public deployment, provide an authenticated API behind the same origin, verified Firebase ID tokens, rate limits, abuse protection, request auditing without sensitive payloads, secure secret storage, and an appropriate privacy/consent policy. No server-side API key belongs in a `VITE_` variable.

## Firebase (optional, separate project)

Copy `.env.example` to `.env.local` and fill in a new Firebase project’s values. Enable Google authentication, authorize localhost and your eventual hosting domain, and deploy `firestore.rules` to that project. Restart Vite.

Sign-in alone uploads nothing. In **My data**, opt in to cloud snapshot actions and explicitly save or load a snapshot. Loading replaces browser records; export first. Deleting a cloud snapshot does not delete local data. Signing out leaves local browser records intact; clear them on shared devices. The cloud document path is `vitalsenseUsers/{uid}/workspaces/personal`, with owner-only rules. This snapshot approach has Firestore’s document-size limit and does not offer multi-device merge or automatic synchronization.

## Health logic and limits

This is an educational prototype for adults 18+, excluding pregnancy. It does not diagnose, provide medical treatment, continuously monitor emergencies, or implement a clinically validated disease-prediction model. No model accuracy, disease probability, or clinical efficacy is claimed.

Recent insights use the last seven days only. Adult blood pressure reference: [American Heart Association](https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings), accessed November 13, 2026. A systolic reading above 180 **or** diastolic above 120 triggers a prompt-attention notice. Warning symptoms require immediate emergency help; without symptoms, repeat after at least one minute and promptly contact a clinician if still very high. The app’s basic keyword escalation is not comprehensive triage.

Pulse analysis requires four readings and compares the latest against the mean of earlier readings within seven days. A change of at least 15 bpm in either direction produces an experimental pattern flag. That threshold is a project heuristic, not a clinical rule. Temperature, sleep and activity are logged and charted without diagnostic classification. Missing measurements never mean low risk.

No wearable integrations, trained ML model, lab report interpretation, push notifications, medication management, clinical validation, or production deployment are implemented. These are future extensions, not current features.

## Project layout

```text
src/App.jsx                    Navigation, personal/sample state, settings
src/components/HealthPages.jsx Dashboard, logging, insights, journal, habits, mood, summary
src/components/Assistant.jsx   Chat, dictation, playback, voice conversation
src/components/CloudyOrb.jsx   Original MindMate shader orb
src/components/Starfield.jsx   Original MindMate canvas background
src/lib/health.js              Validation, categories, pattern rules, fixtures
src/lib/assistant.js           Client API and explicitly labeled preset replies
src/lib/cloud.js               Optional Firebase and snapshot operations
server/index.mjs               Local-only AI and ElevenLabs proxy
tests/                        Health and assistant unit tests
```

## Manual acceptance checks

1. Explore fictional sample data; switch to My data and confirm it is empty initially.
2. Add valid signals; reject partial/reversed BP, fractions for steps, future times, out-of-range and blank records.
3. Reload and confirm personal measurements remain; charts use measurement timestamps.
4. Record a very high BP in a disposable workspace; confirm urgent guidance appears in Insights and Overview.
5. Create/edit/search/delete reflections; add a mood and daily habit; confirm completion persists.
6. Send a guided-demo message; verify its explicit preset label. Stop and switch conversations.
7. Try dictation on a supported secure browser; deny permission, verify readable failure, then test allowed input, review and send.
8. Test voice close/stop; confirm microphone tracks stop and audio ends. Verify reduced-motion and WebGL fallback.
9. With separate test credentials, test Google sign-in, cloud save/load/delete, owner-denied access, AI provider errors and ElevenLabs playback.
10. Print the visit summary; verify journals/chats/mood are absent. Export JSON and clear local disposable records after confirmation.
11. Check desktop and 390px-wide layouts, keyboard focus, Escape, and screen reader labels.

Clinical, Firebase, microphone, provider, and cross-browser acceptance require their actual environments. Unit tests do not establish medical validity.

## Deliverables

- `docs/VitalSense_AI_Project_Report.pdf`: 11-page report covering requirements, adaptation, architecture, data design, algorithms, privacy, verified checks and future work.
- `docs/PROJECT_REPORT.md`: editable report source.
- `docs/PRESENTATION_OUTLINE.md`: 12-slide presentation outline with speaker notes. PPTX export could not run because the presentation runtime is unavailable in this environment; this outline is not a PowerPoint file.
- `docs/build_report.py`: report rebuild script, requiring Python, ReportLab and Windows Arial fonts.

These documents distinguish implemented experimental signal observations from future predictive ML work. Original source notices are preserved in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
