// viewer.js
import { el, scrollToBottom, markdownToHtml } from './shared.js';

const messagesEl = document.getElementById('messages');
const meetingIdEl = document.getElementById('meetingId');
const passwordEl = document.getElementById('password');
const joinBtn = document.getElementById('joinBtn');
const headerTitle = document.getElementById('headerTitle');
const headerMeta = document.getElementById('headerMeta');
const joinBar = document.getElementById('joinBar');

let socket = null;

joinBtn.addEventListener('click', joinMeeting);

async function joinMeeting() {
  const meetingId = meetingIdEl.value.trim();
  const password = passwordEl.value.trim();
  if (!meetingId || !password) { alert('Enter meeting id and password'); return; }

  const res = await fetch('/api/meetings/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meetingId, password })
  });
  const data = await res.json();
  if (!data.ok) { alert(data.error || 'Unable to join'); return; }

  headerTitle.textContent = 'Live: ' + data.meeting.title;
  headerMeta.textContent = 'Meeting ID: ' + meetingId + ' | Password: ' + password;
  joinBar.style.display = 'none';

  // history
  const histRes = await fetch(`/api/meetings/${meetingId}/history?role=viewer&password=${encodeURIComponent(password)}`);
  const hist = await histRes.json();
  messagesEl.innerHTML = '';
  if (hist.ok) {
    hist.messages.forEach(m => messagesEl.appendChild(renderAssistantMessage(m.response, m.responseDatetime)));
    scrollToBottom(messagesEl);
  }

  // live
  if (socket) socket.disconnect();
  socket = io();
  socket.on('connect', () => socket.emit('join_meeting', { meetingId, password, role:'viewer' }));
  socket.on('assistant_done', ({ response, responseDatetime }) => {
    messagesEl.appendChild(renderAssistantMessage(response, responseDatetime));
    scrollToBottom(messagesEl);
  });
  socket.on('error_msg', e => alert(e));
}

function renderAssistantMessage(text, timeIso) {
  const row = el('div', { class: 'chat-row assistant' }, [
    el('div', { class: 'avatar' }, 'G'),
    el('div', {}, [
      el('div', { class: 'timestamp' }, new Date(timeIso).toLocaleString()),
      el('div', { class: 'bubble', html: markdownToHtml(text) })
    ])
  ]);
  return row;
}
