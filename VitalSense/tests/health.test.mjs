import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSignal, bpCategory, insights, demoData, series, isWorkspace, EMPTY_DATA } from '../src/lib/health.js';
const now = new Date('2026-11-13T12:00:00Z');
const valid = {at:'2026-11-13T10:00:00Z',pulse:'72'};
test('valid measurements normalize to numbers; blank fields remain missing', () => {
  const r = validateSignal({...valid,sleep:''}, now);
  assert.deepEqual(r.errors, []); assert.deepEqual(r.values, {pulse:72});
});
test('empty or non-finite measurements are rejected', () => {
  assert.ok(validateSignal({at:valid.at},now).errors.length);
  assert.ok(validateSignal({...valid,pulse:'NaN'},now).errors.length);
  assert.ok(validateSignal({...valid,pulse:'Infinity'},now).errors.length);
});
test('zero sleep is valid but fractional steps are not', () => {
  assert.deepEqual(validateSignal({at:valid.at,sleep:'0'},now).values,{sleep:0});
  assert.ok(validateSignal({...valid,steps:'1.5'},now).errors.length);
});
test('BP requires both numbers and sensible ordering', () => {
  assert.ok(validateSignal({...valid,systolic:120},now).errors.length);
  assert.ok(validateSignal({...valid,systolic:100,diastolic:110},now).errors.length);
});
test('future timestamps and invalid dates are rejected', () => {
  assert.ok(validateSignal({...valid,at:'2027-01-01'},now).errors.length);
  assert.ok(validateSignal({...valid,at:'garbage'},now).errors.length);
});
test('clinical BP reference boundaries use either pressure, with severe boundary strictly greater', () => {
  for (const [s,d,expected] of [[119,79,'Below elevated threshold'],[120,79,'Elevated range'],[130,79,'Stage 1 range'],[119,80,'Stage 1 range'],[140,79,'Stage 2 range'],[119,90,'Stage 2 range'],[180,120,'Stage 2 range'],[181,80,'Very high reading'],[120,121,'Very high reading']]) assert.equal(bpCategory(s,d),expected);
  assert.equal(bpCategory(undefined,80),null);
});
test('missing data never produces low risk or a reassuring all-clear', () => {
  assert.match(insights([],now)[0].detail,/Missing data/);
  assert.equal(insights([],now)[0].title,'Your signals need more context');
});
test('stale and future data are not used for recent insights', () => {
  assert.equal(insights([{at:'2026-01-01',systolic:200,diastolic:130},{at:'2027-01-01',systolic:200,diastolic:130}],now).length,1);
  assert.equal(insights([{at:'2026-01-01',systolic:200,diastolic:130}],now)[0].tone,'neutral');
});
test('very high BP produces urgent guidance with evidence and source', () => {
  const result = insights([{...valid,systolic:190,diastolic:90}],now)[0];
  assert.equal(result.tone,'urgent'); assert.match(result.detail,/emergency services/); assert.match(result.evidence,/190\/90/); assert.ok(result.source.startsWith('https://www.heart.org/'));
});
test('pulse baseline excludes latest reading and detects +/-15 bpm changes', () => {
  const rows = [70,70,70,85].map((pulse,i) => ({id:String(i),at:`2026-11-${10+i}T10:00:00Z`,pulse}));
  assert.equal(insights(rows,now)[0].tone,'attention');
  assert.match(insights(rows,now)[0].evidence,/70 bpm/);
  assert.match(insights(rows,now)[0].detail,/15 bpm above/);
  assert.equal(insights(rows.slice(0,3),now)[0].title,'Your signals need more context');
});
test('series sorts by measurement time and omits missing measurements', () => {
  assert.deepEqual(series([{id:'b',at:'2026-11-12',pulse:72},{id:'missing',at:'2026-11-10'},{id:'a',at:'2026-11-11',pulse:70}],'pulse').map(r=>r.id),['a','b']);
});
test('sample workspace is explicitly fictional and independent from blank data', () => {
  const d = demoData(); assert.ok(isWorkspace(d)); assert.equal(d.signals.length,7); assert.ok(d.signals.every(r=>r.source==='demo'));
  assert.equal(EMPTY_DATA.signals.length,0); assert.equal(isWorkspace({signals:[]}),false);
});
