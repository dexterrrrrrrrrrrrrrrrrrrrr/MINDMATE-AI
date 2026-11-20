import test from 'node:test';
import assert from 'node:assert/strict';
import { demoReply } from '../src/lib/assistant.js';
test('demo replies are explicitly labeled as preset responses in every mode', () => {
  for (const mode of ['health','signals','wellbeing','habits']) assert.match(demoReply('hello',mode),/preset demonstration response/);
});
test('possible emergency wording gets immediate emergency guidance instead of ordinary coaching', () => {
  for (const message of ['I have chest pain',"I can't breathe",'sudden weakness']) assert.match(demoReply(message,'wellbeing'),/emergency services immediately/);
});
