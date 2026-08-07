export const VOICE_OPTIONS = [
  { id: "mia", name: "Mia", description: "Clear and composed" },
  { id: "aria", name: "Aria", description: "Smooth and reassuring" },
  { id: "sofia", name: "Sofia", description: "Friendly and expressive" },
  { id: "jason", name: "Jason", description: "Neutral and grounded" },
  { id: "leo", name: "Leo", description: "Warm and steady" },
];

export const DEFAULT_VOICE = VOICE_OPTIONS[0];

export const getStoredVoice = () => {
  if (typeof window === "undefined") return DEFAULT_VOICE;

  const storedId = window.localStorage.getItem("mindmate.voice");
  return VOICE_OPTIONS.find((voice) => voice.id === storedId) || DEFAULT_VOICE;
};
