export const BP_SOURCE = 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings';
export const EMERGENCY_TEXT = 'If you have chest pain, severe trouble breathing, sudden weakness, trouble speaking, or another possible emergency now, contact local emergency services immediately. Do not wait for this app.';
export const METRICS = [
  { key: 'pulse', label: 'Resting pulse', unit: 'bpm', min: 20, max: 250, step: 1 },
  { key: 'systolic', label: 'Systolic BP', unit: 'mmHg', min: 40, max: 300, step: 1 },
  { key: 'diastolic', label: 'Diastolic BP', unit: 'mmHg', min: 20, max: 200, step: 1 },
  { key: 'sleep', label: 'Sleep', unit: 'hours', min: 0, max: 24, step: 0.1 },
  { key: 'steps', label: 'Steps', unit: 'steps', min: 0, max: 100000, step: 1 },
  { key: 'temperature', label: 'Temperature', unit: '°C', min: 30, max: 45, step: 0.1 },
];
export function validateSignal(input, now = new Date()) {
  const errors = [];
  const values = {};
  for (const metric of METRICS) {
    const raw = input[metric.key];
    if (raw === '' || raw == null) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < metric.min || value > metric.max || (metric.step === 1 && !Number.isInteger(value))) errors.push(`${metric.label}: enter ${metric.min}–${metric.max} ${metric.unit}${metric.step === 1 ? ' as a whole number' : ''}.`);
    else values[metric.key] = value;
  }
  if (!Object.keys(values).length) errors.push('Add at least one measured signal.');
  if ((values.systolic != null) !== (values.diastolic != null)) errors.push('Enter both blood pressure numbers.');
  if (values.systolic != null && values.diastolic >= values.systolic) errors.push('Systolic pressure must be higher than diastolic pressure.');
  const date = new Date(input.at);
  if (!Number.isFinite(date.getTime()) || date > now) errors.push('Choose a valid measurement time that is not in the future.');
  return { errors, values };
}
export function bpCategory(systolic, diastolic) {
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
  if (systolic > 180 || diastolic > 120) return 'Very high reading';
  if (systolic >= 140 || diastolic >= 90) return 'Stage 2 range';
  if (systolic >= 130 || diastolic >= 80) return 'Stage 1 range';
  if (systolic >= 120) return 'Elevated range';
  return 'Below elevated threshold';
}
export const ordered = (records) => [...records].sort((a, b) => new Date(a.at) - new Date(b.at));
export const series = (records, key) => ordered(records).filter(r => Number.isFinite(r[key]));
export const latest = (records, key) => series(records, key).at(-1);
export function insights(records, now = new Date()) {
  const items = [];
  const recent = records.filter(r => now - new Date(r.at) <= 7 * 86400000 && now >= new Date(r.at));
  const bp = ordered(recent).filter(r => Number.isFinite(r.systolic) && Number.isFinite(r.diastolic)).at(-1);
  if (bp) {
    const high = bp.systolic > 180 || bp.diastolic > 120;
    items.push({ tone: high ? 'urgent' : bp.systolic >= 130 || bp.diastolic >= 80 ? 'attention' : 'neutral', title: bpCategory(bp.systolic, bp.diastolic), detail: high ? 'If you have warning symptoms now, contact emergency services immediately. Without symptoms, wait at least one minute, measure again, and contact a clinician as soon as possible if still very high.' : 'This describes one adult blood pressure reading, not a diagnosis or an all-clear. Share repeated elevated readings with a clinician.', evidence: `${bp.systolic}/${bp.diastolic} mmHg · ${new Date(bp.at).toLocaleString()}`, source: BP_SOURCE });
  }
  const pulse = series(recent, 'pulse');
  if (pulse.length >= 4) {
    const baseline = pulse.slice(0, -1).reduce((n, r) => n + r.pulse, 0) / (pulse.length - 1);
    const delta = pulse.at(-1).pulse - baseline;
    items.push({ tone: Math.abs(delta) >= 15 ? 'attention' : 'neutral', title: Math.abs(delta) >= 15 ? 'A change in your resting pulse' : 'Your pulse pattern', detail: `Latest reading is ${Math.abs(delta).toFixed(0)} bpm ${delta >= 0 ? 'above' : 'below'} the average of your earlier entries this week. Activity, stress, illness, or measurement differences may affect readings. This is an experimental pattern rule, not a clinical risk score.`, evidence: `${pulse.length} entries · earlier average ${baseline.toFixed(0)} bpm` });
  }
  if (!items.length) items.push({ tone: 'neutral', title: 'Your signals need more context', detail: 'Add recent measurements to build a picture. Missing data cannot be interpreted as low risk. This prototype does not predict disease.', evidence: `${recent.length} entries in the last 7 days` });
  return items;
}
export function demoData() {
  const now = Date.now();
  return { signals: Array.from({ length: 7 }, (_, i) => ({ id: `sample-${i}`, at: new Date(now - (6 - i) * 86400000).toISOString(), pulse: [72, 74, 71, 76, 79, 82, 88][i], systolic: [118, 120, 122, 119, 124, 126, 132][i], diastolic: [76, 78, 77, 76, 80, 79, 84][i], sleep: [7.8, 7.5, 7.2, 7, 6.5, 6, 6.2][i], steps: [6200, 8100, 5400, 7200, 4800, 5100, 4300][i], notes: 'Fictional sample measurement', source: 'demo' })), journals: [], moods: [], chats: [], goals: [{ id: 'sample-goal', title: 'Make time for an evening wind-down', doneDates: [] }] };
}
export const EMPTY_DATA = { signals: [], journals: [], moods: [], chats: [], goals: [] };
export function isWorkspace(value) {
  return value && ['signals', 'journals', 'moods', 'chats', 'goals'].every(key => Array.isArray(value[key])) && value.signals.every(r => typeof r.id === 'string' && Number.isFinite(new Date(r.at).getTime()));
}
