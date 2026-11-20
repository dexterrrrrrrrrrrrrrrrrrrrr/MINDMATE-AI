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

Email/password accounts use the companion API and MongoDB. Signed-in users can save chats, journals, goals, mood check-ins, and theme preferences. Guest chat remains available; guest journals and mood check-ins stay in browser storage. Google sign-in is planned and is not shown yet.

## Technology

| Layer | Tools |
| --- | --- |
| Interface | React 18, Vite 7, React Router |
| Motion and visuals | Framer Motion, GSAP, Three.js |
| Content | React Markdown, Lucide icons |
| AI service | Vital Sense API, FastAPI, NVIDIA NIM and Riva |
| Accounts and storage | FastAPI sessions, Argon2 password hashing, MongoDB |
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
```

For a deployed frontend, set `VITE_API_URL` to your backend's HTTPS address. The backend must allow the frontend's origin through `ALLOWED_ORIGINS`.

NVIDIA credentials belong on the backend. Never put an NVIDIA secret in a `VITE_` variable: frontend variables are included in browser code.

### Email accounts with MongoDB

Set `MONGODB_URI` and `MONGODB_DB=vital_sense` in the **backend** environment. Use `COOKIE_SECURE=false` only for local HTTP development; production uses `true`. The Vite development server proxies `/api/v1/account` to `http://127.0.0.1:8000`; Vercel proxies that path to the Render API in `vercel.json`. Keep this proxy when changing hosts: it makes the HttpOnly session cookie first-party. Add the frontend origin to backend `ALLOWED_ORIGINS`.

Create an account with a name, email, and password of at least 10 characters. Login persists for seven days; logout revokes the session. Account deletion requires the password and removes saved data. MongoDB credentials are never included in the frontend. Without a connected database, account requests show an availability error and guest mode remains usable. Password recovery email and Google login are not enabled yet.

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
src/account.js        Account sessions through the backend
src/accountData.js    Private saved-data API adapter
src/styles/           Interface styling
vercel.json           Static hosting and route configuration
VitalSense/           Separate health-awareness prototype
```

## Project ownership

Vital Sense is owned and maintained in ANURAG's GitHub account. This repository contains the frontend; the companion repository contains the NVIDIA-powered API. Original third-party notices are preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Vital Sense offers general support and information. It does not diagnose conditions or replace professional care.
