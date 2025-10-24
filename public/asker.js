// asker.js
import { el, renderMessage, renderStreamingStart, scrollToBottom, markdownToHtml } from './shared.js';

// Login guard
const token = localStorage.getItem('idToken');
if (!token) { window.location.replace('/login.html'); throw new Error('No token'); }

// DOM
const listEl = document.getElementById('meetingList');
const modal = document.getElementById('modal');
const titleInput = document.getElementById('meetingTitleInput');
const startMeetingBtn = document.getElementById('startMeeting');
const cancelModalBtn = document.getElementById('cancelModal');
const createBtn = document.getElementById('createBtn');
const refreshBtn = document.getElementById('refreshBtn');
const messagesEl = document.getElementById('messages');
const promptEl = document.getElementById('prompt');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const meetingTitleEl = document.getElementById('meetingTitle');
const meetingMetaEl = document.getElementById('meetingMeta');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menuBtn');

let currentMeeting = null;
let socket = null;
let streamTextEl = null;
let streamBuffer = '';
let isRecording = false;

function getToken(){ return localStorage.getItem('idToken') || ''; }

// Sidebar toggle (mobile)
if (menuBtn && sidebar) {
  menuBtn.addEventListener('click', () => sidebar.classList.toggle('active'));
}

// Modal
createBtn.onclick = () => { modal.classList.add('open'); titleInput.focus(); };
cancelModalBtn.onclick = () => { modal.classList.remove('open'); titleInput.value=''; };

startMeetingBtn.onclick = async () => {
  const title = titleInput.value.trim() || 'Untitled Meeting';
  modal.classList.remove('open'); titleInput.value='';
  const res = await fetch('/api/meetings/create', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},
    body:JSON.stringify({title})
  });
  const data = await res.json();
  if (data.ok) {
    await loadMeetings();
    await selectMeetingById(data.meeting.meetingId);
    alert(`Share with viewer:\nID: ${data.meeting.meetingId}\nPassword: ${data.meeting.password}`);
  } else alert(data.error||'Create failed');
};

refreshBtn.onclick = loadMeetings;

// Event delegation for reliable single-click selection
listEl.addEventListener('click', (e) => {
  const item = e.target.closest('[data-id]');
  if (!item) return;
  const id = item.getAttribute('data-id');
  selectMeetingById(id);
  // close sidebar on mobile after choosing
  if (sidebar && sidebar.classList.contains('active')) sidebar.classList.remove('active');
});

async function loadMeetings() {
  const res = await fetch('/api/meetings');
  const data = await res.json();
  listEl.innerHTML = '';
  if (!data.ok) return;

  data.meetings.forEach(m => {
    const row = el('div', { class: 'meeting-item', 'data-id': m.meetingId }, [
      el('div', { class: 'meeting-title' }, m.title),
      el('div', { class: 'meeting-sub' }, 'ID: ' + m.meetingId),
      el('button', {
        class: 'delete-meeting',
        onclick: async (ev) => {
          ev.stopPropagation();
          if (!confirm('Delete this meeting permanently?')) return;
          const del = await fetch(`/api/meetings/${m.meetingId}`, {
            method:'DELETE', headers:{'Authorization':'Bearer '+getToken()}
          });
          const d = await del.json();
          if (d.ok) { await loadMeetings();
            if (currentMeeting?.meetingId === m.meetingId) {
              currentMeeting = null; meetingTitleEl.textContent='No Meeting Selected'; meetingMetaEl.textContent=''; messagesEl.innerHTML='';
            }
          } else alert(d.error||'Delete failed');
        }
      }, '🗑️')
    ]);
    listEl.appendChild(row);
  });
}
loadMeetings();

async function selectMeetingById(meetingId) {
  const res = await fetch(`/api/meetings/${meetingId}/details`, {
    headers:{'Authorization':'Bearer '+getToken()}
  });
  const data = await res.json();
  if (!data.ok) return alert(data.error||'Failed');

  const m = data.meeting; currentMeeting = m;
  meetingTitleEl.textContent = m.title;
  meetingMetaEl.textContent = `ID: ${m.meetingId} | PWD: ${m.password}`;
  messagesEl.innerHTML = '';

  const hist = await (await fetch(`/api/meetings/${m.meetingId}/history?role=asker`)).json();
  if (hist.ok) hist.messages.forEach(x => messagesEl.appendChild(renderMessage(x)));
  scrollToBottom(messagesEl);

  if (socket) socket.disconnect();
  socket = io();
  socket.on('connect', ()=> socket.emit('join_meeting', { meetingId:m.meetingId, role:'asker' }));
  socket.on('message', msg => { messagesEl.appendChild(renderMessage(msg)); scrollToBottom(messagesEl); });

  // stream: build plaintext, then convert to HTML on done
  socket.on('assistant_token', t => {
    if (!streamTextEl) {
      const row = renderStreamingStart(); messagesEl.appendChild(row);
      streamTextEl = document.getElementById('streamText'); streamBuffer = '';
    }
    streamBuffer += t || '';
    streamTextEl.textContent = streamBuffer; // smoother during stream
    scrollToBottom(messagesEl);
  });
  socket.on('assistant_done', () => {
    // replace bubble with markdown-rendered HTML
    const bubble = document.getElementById('streamBubble');
    if (bubble) bubble.innerHTML = markdownToHtml(streamBuffer);
    streamTextEl = null; streamBuffer = '';
    scrollToBottom(messagesEl);
  });
  socket.on('error_msg', e => alert(e));
}

// Send
sendBtn.onclick = sendMessage;
promptEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

async function sendMessage() {
  if (!currentMeeting) return alert('Select meeting');
  const content = promptEl.value.trim(); if (!content) return;
  const sendToViewer = document.getElementById('sendToViewer')?.checked || false;
  promptEl.value = '';
  const res = await fetch(`/api/meetings/${currentMeeting.meetingId}/ask`, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},
    body:JSON.stringify({ message:content, sendToViewer })
  });
  const data = await res.json(); if (!data.ok) alert(data.error||'Failed');
}

// Mic -> fills textbox (no auto-send)
(function setupMic(){
  const WSR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!WSR) { micBtn.style.display='none'; return; }
  const rec = new WSR(); rec.lang='en-IN'; rec.interimResults=true;
  micBtn.onclick = () => {
    if (isRecording) { rec.stop(); isRecording=false; micBtn.style.background='#30363d'; return; }
    rec.start(); isRecording=true; micBtn.style.background='red';
  };
  rec.onresult = e => { let t=''; for (let i=e.resultIndex;i<e.results.length;i++) t+=e.results[i][0].transcript; promptEl.value=t; };
  rec.onend = () => { isRecording=false; micBtn.style.background='#30363d'; };
})();
