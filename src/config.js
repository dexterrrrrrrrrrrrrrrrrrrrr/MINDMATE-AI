const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiOrigin = (configuredApiUrl || "https://mindmate-ai-api.onrender.com").replace(/\/+$/, "");
const apiBase = apiOrigin.endsWith("/api/v1") ? apiOrigin : `${apiOrigin}/api/v1`;

export const AI_API_URL = `${apiBase}/`;
export const AI_AUDIO_URL = `${apiBase}/audio/`;
export const AI_CONVERSATION_URL = `${apiBase}/convo/`;
