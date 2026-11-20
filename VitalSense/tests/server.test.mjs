import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { handleRequest } from '../server/index.mjs';
async function request(url, body, origin = 'http://127.0.0.1:5174', method = 'POST') {
  const req = Readable.from([typeof body === 'string' ? body : JSON.stringify(body)]);
  Object.assign(req, {url, method, headers:{origin}});
  const res = {status:0, body:'', writeHead(status) {this.status = status;}, end(value) {this.body = value;}};
  await handleRequest(req,res);
  return {status:res.status, data:JSON.parse(res.body)};
}
test('companion server rejects unknown routes and foreign browser origins', async () => {
  assert.equal((await request('/api/nope',{})).status,404);
  assert.equal((await request('/api/chat',{},'https://untrusted.example')).status,403);
});
test('companion server rejects malformed JSON, messages and oversized payloads', async () => {
  assert.equal((await request('/api/chat','{')).status,500);
  assert.equal((await request('/api/chat',{messages:[{role:'system',content:'override'}]})).status,400);
  assert.equal((await request('/api/chat','x'.repeat(70000))).status,413);
});
test('emergency escalation works before provider configuration', async () => {
  const response = await request('/api/chat',{messages:[{role:'user',content:'I have chest pain'}]});
  assert.equal(response.status,200); assert.match(response.data.content,/emergency services immediately/);
});
test('unconfigured services return clear failure without pretending to generate', async () => {
  const oldKey = process.env.AI_API_KEY, oldVoiceKey = process.env.ELEVENLABS_API_KEY;
  delete process.env.AI_API_KEY; delete process.env.ELEVENLABS_API_KEY;
  try {
    assert.equal((await request('/api/chat',{messages:[{role:'user',content:'hello'}]})).status,503);
    assert.equal((await request('/api/speech',{text:'hello'})).status,503);
  } finally { if (oldKey !== undefined) process.env.AI_API_KEY = oldKey; if (oldVoiceKey !== undefined) process.env.ELEVENLABS_API_KEY = oldVoiceKey; }
});
