# Vital Sense

A conversational AI companion for reflection, everyday planning, and productivity, with text chat and natural voice replies powered by NVIDIA.

**Owner and maintainer:** [ANURAG](https://github.com/dexterrrrrrrrrrrrrrrrrrrrr)

[Open Vital Sense](https://mindmate-ai-anurag.vercel.app) · [Backend repository](https://github.com/dexterrrrrrrrrrrrrrrrrrrrr/MINDMATE_AI_API) · [API documentation](https://mindmate-ai-api-anurag.onrender.com/docs)

## What you can do

- Choose Therapy, Doctor, Work, or Personal mode to tailor the conversation.
- Chat with NVIDIA Nemotron 3 Nano Omni.
- Listen to replies through NVIDIA Magpie text to speech.
- Use browser dictation and the animated voice conversation screen.
- Explore mood check-ins, journaling, and goal-planning tools.

The public app currently runs in guest mode. Chat conversations stay in the current session and are not saved to an account. Google sign-in and cloud chat storage are not enabled; saving goals requires a configured account. Guest journals and mood check-ins use browser storage.

## Technology

| Layer | Tools |
| --- | --- |
| Interface | React 18, Vite 7, React Router |
| Motion and visuals | Framer Motion, GSAP, Three.js |
| Content | React Markdown, Lucide icons |
| AI service | Vital Sense API, FastAPI, NVIDIA NIM and Riva |
| Optional accounts | Firebase Authentication and Firestore |
| Hosting | Vercel frontend and Render backend |

## Run locally

Use Node.js 22.12 or newer.

```bash
git clone https://github.com/dexterrrrrrrrrrrrrrrrrrrrr/MINDMATE-AI.git
cd MINDMATE-AI
npm ci
cp .env.example .env
npm run dev
```

Open [localhost:5173](http://127.0.0.1:5173). Start the backend separately using its [setup instructions](https://github.com/dexterrrrrrrrrrrrrrrrrrrrr/MINDMATE_AI_API#run-locally).

### Configuration

For local guest chat, set these values in `.env`:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
VITE_GUEST_ONLY=true
```

For a deployed frontend, set `VITE_API_URL` to your backend's HTTPS address. The backend must allow the frontend's origin through `ALLOWED_ORIGINS`.

NVIDIA credentials belong on the backend. Never put an NVIDIA secret in a `VITE_` variable: frontend variables are included in browser code.

### Optional Firebase accounts

To enable accounts, provide your own `VITE_FIREBASE_*` values from `.env.example` and set `VITE_GUEST_ONLY=false`. Configure Firebase authorized domains and the authentication redirect for your deployed domain before enabling sign-in. Without complete Firebase configuration, the app stays in guest mode.

## Build and deploy

```bash
npm run build
npm run preview
```

Vercel builds the repository root with `npm run build` and serves `dist`. The `VitalSense/` directory contains a separate health-awareness prototype; it is not the deployed frontend's build root.

## Project structure

```text
src/App.jsx           Chat, navigation, guest and account state
src/components/       Conversation, voice, journal, mood, and goals screens
src/constants/        Assistant modes and voice options
src/config.js         Backend endpoint configuration
src/firebase.js       Optional account and cloud initialization
src/styles/           Interface styling
vercel.json           Static hosting and route configuration
VitalSense/           Separate health-awareness prototype
```

## Project ownership

Vital Sense is owned and maintained in ANURAG's GitHub account. This repository contains the frontend; the companion repository contains the NVIDIA-powered API. Original third-party notices are preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Vital Sense offers general support and information. It does not diagnose conditions or replace professional care.
