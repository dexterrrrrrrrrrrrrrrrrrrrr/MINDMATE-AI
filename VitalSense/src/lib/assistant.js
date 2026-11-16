import { EMERGENCY_TEXT } from './health.js';
export const MODES = {
  health: { label: 'Health guide', icon: 'heart', welcome: 'A little clarity.\nA healthier tomorrow.', prompt: 'Help me prepare questions for a health appointment.' },
  signals: { label: 'Signal explorer', icon: 'activity', welcome: 'Your signals tell a story.\nLet’s understand it.', prompt: 'How should I measure and record my health signals?' },
  wellbeing: { label: 'Mind & mood', icon: 'brain', welcome: 'Make room for\nhow you feel.', prompt: 'Guide me through a short grounding exercise.' },
  habits: { label: 'Healthy habits', icon: 'leaf', welcome: 'Small steps.\nMeaningful change.', prompt: 'Help me create a realistic evening routine.' },
};
export function demoReply(text, mode) {
  if (/\b(chest pain|can'?t breathe|cannot breathe|severe trouble breathing|stroke|sudden weakness)\b/i.test(text)) return EMERGENCY_TEXT;
  if (mode === 'wellbeing') return 'Try a short grounding pause: notice five things you can see, four you can feel, and three you can hear. Keep your breathing comfortable, and stop if the exercise feels uncomfortable. You can write down what you notice in your health journal.\n\n*This is a preset demonstration response, not an AI assessment.*';
  if (mode === 'signals') return 'Record the measurement, unit, time, and context, such as whether you were resting. Use a suitable device and follow its instructions. In Signals, each entry contributes to a timeline; Insights explains the prototype rules and missing information. A measurement by itself does not establish a diagnosis.\n\n*This is a preset demonstration response, not an AI assessment.*';
  if (mode === 'habits') return 'Choose one manageable action, such as setting aside a few minutes for an evening wind-down. Add it to Healthy habits and check it off when complete. Adjust it around your energy and any advice from your clinician.\n\n*This is a preset demonstration response, not an AI assessment.*';
  return 'For your next appointment, note when your concern started, how it has changed, and what makes it better or worse. Bring your measurements and a list of medicines or supplements. You can use Visit summary to print your recorded signals and prepare questions for your clinician.\n\n*This is a preset demonstration response, not an AI assessment.*';
}
export async function askAssistant({ messages, mode, shareSignals, signals, signal }) {
  const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal, body: JSON.stringify({ messages: messages.slice(-16).map(({role, content}) => ({role, content})), mode, signals: shareSignals ? signals.slice(-7) : [] }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Assistant unavailable.');
  if (typeof payload.content !== 'string') throw new Error('The assistant returned an invalid response.');
  return payload.content;
}
