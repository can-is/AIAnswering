import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import OpenAI from 'openai';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 5174;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);

// === LowDB setup ===
const db = new Low(new JSONFile(path.join(__dirname, 'data.json')), { meetings: [] });
await db.read(); await db.write();
const saveDb = () => db.write().catch(console.error);

const randomId = (len = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};
const randomNumeric = (n = 8) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');

async function verifyAdmin(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ ok: false, error: 'Missing token' });

    const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token })
    });
    const data = await resp.json();
    const email = data?.users?.[0]?.email;
    if (!email || !ADMIN_EMAILS.includes(email)) return res.status(403).json({ ok: false, error: 'Not authorized' });
    req.user = { email }; next();
  } catch (e) { console.error('Auth error', e); res.status(401).json({ ok: false, error: 'Auth failed' }); }
}

const getMeeting = id => db.data.meetings.find(m => m.meetingId === id);
const setMeeting = m => { const i = db.data.meetings.findIndex(x => x.meetingId === m.meetingId);
  if (i >= 0) db.data.meetings[i] = m; else db.data.meetings.push(m); saveDb(); };

// === API routes ===
app.post('/api/meetings/create', verifyAdmin, (req, res) => {
  const title = (req.body?.title || '').trim() || 'Untitled Meeting';
  const meetingId = randomId(6);
  const password = randomNumeric(8);
  const now = new Date().toISOString();
  const m = { meetingId, title, password, createdAt: now, messages: [], chatHistory: [{ role:'system', content:'You are ChatGPT.', ts: now }] };
  db.data.meetings.push(m); saveDb();
  res.json({ ok: true, meeting: m });
});

app.get('/api/meetings', (req, res) => {
  res.json({ ok: true, meetings: db.data.meetings.map(m => ({ meetingId: m.meetingId, title: m.title, createdAt: m.createdAt })) });
});

app.get('/api/meetings/:id/details', verifyAdmin, (req, res) => {
  const m = getMeeting(req.params.id);
  if (!m) return res.status(404).json({ ok: false, error: 'Meeting not found' });
  res.json({ ok: true, meeting: m });
});

app.post('/api/meetings/join', (req, res) => {
  const { meetingId, password } = req.body || {};
  const m = getMeeting(meetingId);
  if (!m) return res.status(404).json({ ok: false, error: 'Meeting not found' });
  if (m.password !== String(password)) return res.status(401).json({ ok: false, error: 'Invalid password' });
  res.json({ ok: true, meeting: { meetingId: m.meetingId, title: m.title } });
});

app.get('/api/meetings/:id/history', (req, res) => {
  const m = getMeeting(req.params.id);
  if (!m) return res.status(404).json({ ok: false, error: 'Meeting not found' });
  if (req.query.role === 'viewer') {
    const pw = String(req.query.password || '');
    if (pw !== m.password) return res.status(401).json({ ok: false, error: 'Invalid password' });
    return res.json({ ok: true, messages: m.messages.map(x => ({ response: x.response, responseDatetime: x.responseDatetime })) });
  }
  res.json({ ok: true, messages: m.chatHistory.filter(x => x.role !== 'system') });
});

// === Sockets ===
io.on('connection', socket => {
  socket.on('join_meeting', ({ meetingId, password, role }) => {
    const m = getMeeting(meetingId);
    if (!m) return socket.emit('error_msg', 'Meeting not found');
    if (role !== 'asker' && m.password !== String(password)) return socket.emit('error_msg', 'Invalid password');
    socket.join(meetingId);
  });
});

app.delete('/api/meetings/:id', verifyAdmin, (req, res) => {
  const id = req.params.id;
  const idx = db.data.meetings.findIndex(m => m.meetingId === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Meeting not found' });
  db.data.meetings.splice(idx, 1);
  saveDb();
  res.json({ ok: true });
});

// === Ask ChatGPT (admin only) ===
app.post('/api/meetings/:id/ask', verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const { message, sendToViewer } = req.body || {};
  const m = getMeeting(id);
  if (!m) return res.status(404).json({ ok: false, error: 'Meeting not found' });
  if (!message) return res.status(400).json({ ok: false, error: 'Message required' });

  const inputDatetime = new Date().toISOString();

  // ✅ Manual viewer broadcast
  if (sendToViewer) {
    const responseDatetime = new Date().toISOString();
    m.chatHistory.push({ role: 'assistant', content: message, ts: responseDatetime });
    m.messages.push({ input:'(manual)', response: message, meetingId:id, title:m.title, password:m.password, inputDatetime, responseDatetime });
    setMeeting(m);
    io.to(id).emit('assistant_done', { response: message, responseDatetime });
    return res.json({ ok: true, manualResponse: true });
  }

  // --- Normal streaming path ---
  m.chatHistory.push({ role:'user', content:message, ts:inputDatetime });
  io.to(id).emit('message', { role:'user', content:message, ts:inputDatetime });
  setMeeting(m);
  res.json({ ok:true, status:'streaming' });

  try {
      
    const systemPrompt = {
      role: "system",
      content: "Your answers must be concise — no more than few lines. If it is code provide complete code, Avoid jargon, keep it clear and human-friendly."
    };

    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: [systemPrompt, ...m.chatHistory.map(x => ({ role: x.role, content: x.content }))],
      stream: true,
      temperature: 0.6,
    });

    let assistantContent = '';
    for await (const chunk of stream) {
      const token = chunk?.choices?.[0]?.delta?.content || '';
      if (token) { assistantContent += token; io.to(id).emit('assistant_token', token); }
    }
    const responseDatetime = new Date().toISOString();
    m.chatHistory.push({ role:'assistant', content:assistantContent, ts:responseDatetime });
    m.messages.push({ input:message, response:assistantContent, meetingId:id, title:m.title, password:m.password, inputDatetime, responseDatetime });
    setMeeting(m);
    io.to(id).emit('assistant_done', { response:assistantContent, responseDatetime });
  } catch (e) { console.error('OpenAI stream error:', e); io.to(id).emit('error_msg', 'Assistant failed to respond.'); }
});

server.listen(PORT, () => console.log('🚀 Server running on http://localhost:' + PORT));
