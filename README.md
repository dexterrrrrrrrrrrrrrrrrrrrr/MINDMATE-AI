# 🧠 Vital Sense AI

Vital Sense AI is an AI-powered mental wellness and productivity companion offering emotional support, goal tracking, AI journaling, and voice interactions through a conversational interface. It integrates text and voice AI to provide realistic, context-aware responses.

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
- Backend: FastAPI, Python 3.11, NVIDIA NIM (Nemotron 3 Nano Omni 30B A3B), NVIDIA Magpie TTS
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

## Deployment configuration

Set `VITE_API_URL` to your own backend URL and `VITE_GUEST_ONLY=true` for guest chat.
The app does not connect to Firebase when guest mode is enabled or Firebase configuration is incomplete.
Guest chat stays in the current session; Google login and cloud chat saving are unavailable.

To enable accounts later, set your own `VITE_FIREBASE_*` configuration, set `VITE_GUEST_ONLY=false`, and configure your Firebase authorized domains and OAuth redirect before enabling sign-in.

## 📱 Usage

- Login with Google Authentication

- Chat with Vital Sense AI

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

Firebase

React Community
