# VitalSense AI
## Software Engineering Project Report

**Health signal awareness and explainable risk indicators**

Prepared by Sagnik Pal · 13 November 2026

Implementation: React/Vite application derived from the MindMate project. Status: educational prototype. AI, Firebase and ElevenLabs integrations require separate configuration and acceptance testing.

## 1. Abstract

VitalSense AI adapts the MindMate application into a personal health-awareness workspace. Users manually record health measurements, review their timeline, capture mood and journal context, maintain small daily habits, and prepare a factual summary for a clinician visit. The project retains MindMate’s dark interface, conversational interaction, animated starfield and voice orb while replacing unrelated productivity and commercial features with health-focused workflows.

The prototype combines deterministic observations with an optional conversational AI service. Blood pressure reference categories follow a published adult reference, and an experimental pulse rule compares a recent measurement with the user’s earlier entries. The implementation deliberately avoids disease probabilities, diagnosis, clinical accuracy claims, and reassurance based on missing data. A clinically validated predictive model remains future work.

Personal records stay in browser localStorage by default. Users can optionally configure a separate Firebase project and explicitly save account-owned cloud snapshots. Server-side credentials support an OpenAI-compatible assistant and optional ElevenLabs speech. Without those services, the interface provides clearly labeled preset demonstration replies.

## 2. Problem statement and objectives

Health readings often lack useful context when scattered across notes, device screens and memory. A person may remember an unusual reading without knowing when it occurred, what they were doing, or which questions to bring to an appointment. The engineering problem is to organize self-reported information without presenting a student prototype as a medical decision system.

The objectives are to preserve MindMate’s familiar interaction style, make measurement logging reliable, show understandable patterns with their evidence, keep personal data under user control, and support preparation for clinician conversations. The app also gives journal, mood, habit and voice features a coherent role in the health project.

The intended audience is an adult user exploring personal records and an academic reviewer evaluating the software design. The reference categorization excludes children and pregnancy. The application cannot replace a clinician or emergency service.

## 3. Scope and requirements

| ID | Requirement | Implementation status |
| --- | --- | --- |
| FR-01 | Distinct VitalSense AI project and branding | Implemented in VitalSense folder |
| FR-02 | Manual health signals with time, units and context | Implemented, with input validation |
| FR-03 | Signal history and charts | Implemented, latest 14 points per metric |
| FR-04 | Explainable observations | Adult BP reference and experimental pulse rule |
| FR-05 | Health-focused conversational modes | Implemented, guided demo by default |
| FR-06 | Live conversational AI | Optional server integration, not provider-tested |
| FR-07 | Journal, explicit mood check-ins and daily habits | Implemented with local persistence |
| FR-08 | Voice input, playback and reactive orb | Implemented, browser/device testing pending |
| FR-09 | Optional Google authentication and cloud snapshots | Implemented, credentials and testing pending |
| FR-10 | Visit preparation and data export | Printable summary and JSON backup |

Non-functional requirements include responsive layouts, keyboard-accessible controls, modal focus containment, reduced-motion handling, understandable errors, isolated sample data, server-only secrets, and owner-scoped cloud access. Visual and assistive-technology acceptance remain manual checks.

Out of scope are wearable connections, medical-device certification, clinical prediction accuracy, automatic monitoring, medication dosing, push notifications and production deployment.

## 4. MindMate adaptation

| MindMate foundation | VitalSense implementation |
| --- | --- |
| Dark conversational interface | Preserved visual language with mint health branding |
| Starfield and shader voice orb | Reused existing components |
| Therapy, Doctor, Work and Personal modes | Health guide, Signal explorer, Mind & mood and Healthy habits |
| Journal and mood features | Health reflections and explicit mood timeline |
| Broad personal and financial goals | Daily health-oriented habits and custom intentions |
| Firebase and voice integrations | Separate optional configuration and explicit cloud actions |
| Premium subscription and payment page | Removed from the new project |
| Existing service URLs and Firebase defaults | Not inherited |

The original MindMate source and its existing uncommitted changes remain separate. No existing environment file was copied. The new project retains the original license and identifies the reused components in its README.

## 5. Architecture and workflow

The application uses a React presentation layer, browser state and storage, a deterministic signal-analysis module, and optional external integrations. React Router selects the eight main screens. A central workspace state provides signals, journal entries, mood check-ins, habits and conversations. Personal and fictional sample workspaces use separate state.

| Layer | Responsibility | Main implementation |
| --- | --- | --- |
| Presentation | Navigation, dashboard, forms and settings | App.jsx, HealthPages.jsx, styles.css |
| Conversation and audio | Chat, dictation, cancellation and voice UI | Assistant.jsx, CloudyOrb.jsx |
| Health domain | Validation, reference categories, patterns | lib/health.js |
| Local persistence | Personal workspace in localStorage | App.jsx |
| Cloud adapter | Optional sign-in and manual snapshots | lib/cloud.js, firestore.rules |
| Local companion server | AI and ElevenLabs requests with server secrets | server/index.mjs |

A measurement passes validation before it enters the workspace. Saving updates the current workspace and its derived charts and observations. Personal workspace changes persist locally. Cloud sign-in alone does not upload data. The user must explicitly consent to cloud snapshot actions.

For live chat, the browser sends up to 16 recent messages to the local companion server. Optional measurement sharing adds up to seven records. The server applies health-focused instructions, limits request size, handles simple emergency keywords and calls the configured provider. It returns an error rather than silently pretending that a preset answer came from live AI.

## 6. Data design and analysis rules

| Record | Core fields |
| --- | --- |
| Signal | id, at, optional pulse, systolic, diastolic, sleep, steps, temperature, notes, source |
| Conversation | id, mode, title, at, messages with role, content and response kind |
| Journal | id, title, text, at |
| Mood | id, value, note, at |
| Habit | id, title, doneDates |

Signal validation requires at least one numeric measurement. Optional fields remain absent rather than becoming zero. Blood pressure requires both values, with systolic greater than diastolic. Whole-number metrics reject fractions. Datetimes must be valid and no later than the current time. Numeric limits are broad data-entry checks rather than clinical safe ranges.

Recent observations use measurements from the preceding seven days. The adult blood pressure reference maps readings into the following categories [1]. These labels describe a reading; only an appropriate healthcare professional can establish a diagnosis.

| Category | Rule used by the prototype |
| --- | --- |
| Below elevated threshold | Systolic below 120 and diastolic below 80 |
| Elevated range | Systolic 120-129 with diastolic below 80 |
| Stage 1 range | Systolic 130-139 or diastolic 80-89 |
| Stage 2 range | Systolic at least 140 or diastolic at least 90, below the very-high condition |
| Very high reading | Systolic above 180 or diastolic above 120 |

The very-high condition takes priority. Current warning symptoms prompt immediate emergency guidance. Without symptoms, the guidance is to repeat after at least one minute and promptly contact a clinician if the reading remains very high [2]. A measurement below these thresholds does not rule out an emergency or another health concern.

Pulse analysis requires at least four recent pulse measurements. It sorts readings by time, excludes the latest from the baseline, computes the earlier mean, and compares the latest value with it. An absolute difference of at least 15 bpm creates an experimental attention flag. This threshold is a project heuristic, not a validated medical risk score. Sleep, steps and temperature have logging and charts but no diagnostic rules.

## 7. Implementation, privacy and security

VitalSense uses React 18, Vite, React Router, Lucide icons, react-markdown, Three.js with React Three Fiber, the Firebase browser SDK and a Node.js companion server. Native browser speech APIs provide dictation and optional speech playback. ElevenLabs is an alternative server-mediated playback service.

The initial sample workspace contains fictional readings and is visibly labeled. It never populates the personal workspace. Personal data persists under a VitalSense-specific browser key. Sample changes reset on reload. Journal and chat content is not included in the printable visit summary.

LocalStorage is not encrypted. People using a shared device should export and clear local data when appropriate. Browser speech recognition may transmit audio to the browser provider. Live AI receives chat history when enabled, and health-measurement context requires a separate opt-in. ElevenLabs receives response text when selected.

Cloud storage uses vitalsenseUsers/{uid}/workspaces/personal. The supplied rules restrict reads and writes to the authenticated owner. Save, load and delete are explicit snapshot operations. Loading replaces local personal records, so users should export first. The single-document approach inherits Firestore’s size limit and provides no multi-device merge.

The Node companion service binds to localhost and rejects foreign browser origins. Keys belong in .env.server, never in VITE-prefixed variables. A public release still requires an authenticated production API, verified identity tokens, rate limits, operational monitoring, appropriate data-retention policies and formal security review. The local server is not a deployable clinical service.

## 8. Testing and evaluation

Automated verification completed on the implementation includes 18 passing Node unit and request-handler tests, a clean ESLint run, and a successful Vite production build. Request-handler tests use simulated streams, not live network connections.

| Test area | Cases | Result |
| --- | --- | --- |
| Guided assistant | Preset labels across modes; emergency wording | 2 passed |
| Health logic | Numeric normalization, missing data, zero values, paired BP, dates, categories, recency, urgency, pulse baseline, ordering, sample isolation | 12 passed |
| Server handler | Routes/origins, malformed/oversized input, emergency response, unconfigured services | 4 passed |
| Static analysis | ESLint | Passed |
| Production bundle | Vite build | Passed |

The browser preview attempt timed out, and direct local HTTP verification was blocked by this execution environment. Therefore no desktop/mobile visual inspection or end-to-end interaction pass is claimed. Automated results establish selected software behavior, not clinical reliability.

Pending acceptance includes reload persistence in a browser, mobile layouts, keyboard and screen-reader flows, microphone permission and cleanup, speech playback, Google sign-in, cloud authorization, actual provider responses and printing. No real patient data or external account credentials were used for validation.

## 9. Limitations, future work and conclusion

VitalSense currently provides health-awareness workflows and explainable signal rules. It does not implement a trained disease model, wearable ingestion or clinical validation. Its preset chat answers are demonstrations, and the emergency keyword check is intentionally limited rather than comprehensive triage. The rule scope excludes children and pregnancy.

A future predictive extension would need a defined target outcome, an appropriate consented dataset, clinically meaningful labels, representative cohorts and documented evaluation. Development should prevent patient-level and temporal data leakage, measure calibration and subgroup performance, and involve clinicians in the handling of false positives and false negatives. No future accuracy number is assumed in this project.

Other future work includes granular cloud collections, multi-device conflict handling, an authenticated production backend, optional wearable imports, reminder scheduling, accessibility testing and usability evaluation. These extensions should follow the user’s needs and available evidence.

The implemented project demonstrates how an existing conversational wellness app can become a coherent health-awareness prototype. It combines measurement context, transparent observations, reflective tools and visit preparation while keeping clinical claims within the limits of the software actually built.

## 10. Reproduction and references

Local setup: use Node.js 22.12 or later, enter the VitalSense folder, run npm install, then npm run dev. Open http://127.0.0.1:5174. The demo requires no external credentials. Run npm test, npm run lint and npm run build to reproduce the automated checks. Optional provider and Firebase configuration is documented in README.md.

Primary implementation sources: VitalSense/src/App.jsx, src/components/HealthPages.jsx, src/components/Assistant.jsx, src/lib/health.js, src/lib/cloud.js, server/index.mjs and tests/. Existing project source: MindMate repository in the parent workspace, with Starfield and CloudyOrb reused.

[1] American Heart Association. Understanding Blood Pressure Readings. https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings. Accessed 13 November 2026.

[2] American Heart Association. When To Call 911 About High Blood Pressure. https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/when-to-call-911-for-high-blood-pressure. Accessed 13 November 2026. The app uses location-neutral emergency-services wording rather than assuming a country.

Source code and verified checks are the basis for implementation claims. No clinical study, user study or deployment outcome is asserted.
