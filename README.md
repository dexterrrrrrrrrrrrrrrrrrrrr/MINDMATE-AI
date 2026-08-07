# 🧠 MindMate AI

MindMate AI is an AI-powered mental wellness and productivity companion offering emotional support, goal tracking, AI journaling, and voice interactions through a conversational interface. It integrates text and voice AI to provide realistic, context-aware responses.

## 🖥️ Deployment

- frontend deployed: <https://mindmate-ai-jade.vercel.app>


- backend deployed: <https://mindmate-ai-api.onrender.com>


open api docs:
- <https://mindmate-ai-api.onrender.com/docs>

 or

- <https://mindmate-ai-api.onrender.com/scalar_docs>

## Github Repos

- frontend: <https://github.com/sagnikisopasfasf/MINDMATE-AI>
- backend: <https://github.com/Sonic7002/MINDMATE_AI_API>

## 🌟 Features

- 💬 Conversational AI chat with context-aware emotional support

- 🎯 Goal tracking and habit monitoring

- 📓 AI-assisted journaling with sentiment insights

- 🔊 Text-to-speech voice responses

- 🔐 Google authentication and secure cloud storage

## 🏗 Tech Stack

- Frontend: React, Framer Motion, Lucide Icons, CSS / Glassmorphism UI
- Backend: FastAPI, Python 3.11, NVIDIA NIM (GPT OSS 120B), Gemini 2.5 Flash Lite, NVIDIA Magpie TTS
- Cloud & Storage: Firebase Authentication, Firebase Firestore
- Deployment: Vercel (frontend), Render (backend)

## 🚀 Setup
Frontend
```bash
git clone https://github.com/yourusername/mindmate-ai.git
cd mindmate-ai/frontend
npm install
cp .env.example .env
npm run dev
```
Backend
```bash
cd ../backend
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Access backend API docs: http://localhost:8000/docs

## Vercel authentication deployment

Google sign-in uses Firebase redirect authentication with a same-origin helper proxy. Keep the Vercel project root at this repository root so the root `vercel.json` is applied.

Set these production values in Vercel:

```text
VITE_APP_DOMAIN=mindmate-ai-jade.vercel.app
VITE_FIREBASE_AUTH_DOMAIN=mind-mate-94675.firebaseapp.com
```

Firebase Authentication must list `mindmate-ai-jade.vercel.app` as an authorized domain. The Google OAuth client must include this exact redirect URI:

```text
https://mindmate-ai-jade.vercel.app/__/auth/handler
```

After deployment, both `/__/auth/handler` and `/__/auth/iframe` on the Vercel domain should return HTTP 200 before testing Google sign-in.


## 📱 Usage

- Login with Google Authentication

- Chat with MindMate AI

- Track goals and habits

- Use AI journaling for reflection

- Listen to voice responses

## 📄 License

**MIT License**

## 👨‍💻 Author

**Srijan Kargupta** – Backend & AI


**Sagnik Pal** – Frontend, UI & Cloud

## ❤️ Acknowledgements

NVIDIA NIM & Riva

GEMINI AI API

Firebase

React Community
