// js/chat.js
import { Prefs } from './prefs.js';
import { touchConversation } from './database.js';
import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';

/* ====== CONFIG: your chat server URL ====== */
const SOCKET_URL = 'https://chat-server-4ikh.onrender.com/';

/* ------------------ Gatekeeper ------------------ */
let rawToken = Prefs.getToken();
if (!rawToken) {
  window.location.href = 'login.html';
}
// Some backends store "Bearer xxx". Strip that and whitespace just in case.
const token = String(rawToken).replace(/^Bearer\s+/i, '').trim();

/* ------------------ URL params ------------------ */
const params   = new URLSearchParams(window.location.search);
const peerId   = params.get('peerId') || '';
const peerName = decodeURIComponent(params.get('peerName') || '') || 'Chat';

if (!peerId) {
  alert('Missing peerId');
  window.location.href = 'home.html';
}

/* ------------------ DOM refs ------------------ */
const btnBack      = document.getElementById('btnBack');
const btnMenu      = document.getElementById('btnMenu');
const menuEl       = document.getElementById('menu');
const inlineAlert  = document.getElementById('inlineAlert');
const peerNameEl   = document.getElementById('peerName');
const peerSubtitle = document.getElementById('peerSubtitle');
const msgListEl    = document.getElementById('msgList');
const msgInput     = document.getElementById('msgInput');
const btnSend      = document.getElementById('btnSend');
const menuClear    = document.getElementById('menuClearChat');

/* ------------------ Header ------------------ */
peerNameEl && (peerNameEl.textContent = peerName);
peerSubtitle && (peerSubtitle.textContent = 'connecting…');

/* ------------------ Local message store ------------------ */
const myId = Prefs.getUserId();
const LS_KEY = (me, peer) => `sigma.messages.v1::${me}::${peer}`;

function loadMessages() {
  try { return JSON.parse(localStorage.getItem(LS_KEY(myId, peerId))) || []; }
  catch { return []; }
}
function saveMessages(list) {
  localStorage.setItem(LS_KEY(myId, peerId), JSON.stringify(list || []));
}

/* ------------------ State ------------------ */
let messages = loadMessages(); // [{id, from, to, text, ts, status:'sent'|'recv'|'pending'}]

/* ------------------ Socket ------------------ */
let socket = null;

function setupSocket() {
  if (!SOCKET_URL) { toast('Missing SOCKET_URL', 'warn'); return; }

  // Send token via both places to satisfy any middleware style
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    auth: { token },               // modern style: socket.handshake.auth.token
    query: { token },              // fallback for server reading from query
    timeout: 20000
  });

  socket.on('connect', () => {
    toast('Connected');
    if (peerSubtitle) peerSubtitle.textContent = 'online';
  });

  socket.on('disconnect', (reason) => {
    toast(`Disconnected (${reason || 'network'})`, 'warn');
    if (peerSubtitle) peerSubtitle.textContent = 'offline';
  });

  socket.on('connect_error', (err) => {
    // The server may send message strings: 'missing_token', 'invalid_token', etc.
    const msg = err?.message || err?.data || String(err);
    console.error('Socket connect_error:', err);

    if (/missing_token|invalid_token|jwt|auth/i.test(msg)) {
      toast('Session expired. Please login again.', 'warn');
      // Clear broken token to avoid loops
      setTimeout(() => { Prefs.clear(); window.location.href = 'login.html'; }, 1200);
      return;
    }

    toast('Connection error', 'warn');
    if (peerSubtitle) peerSubtitle.textContent = 'offline';
  });

  socket.on('reconnect_attempt', () => {
    toast('Reconnecting…');
    if (peerSubtitle) peerSubtitle.textContent = 'connecting…';
  });

  // Realtime incoming message
  socket.on('message', (payload) => {
    // payload: { id, from, to, content, ts }
    onIncoming({
      id: payload.id,
      from: payload.from,
      to: payload.to,
      text: payload.content,
      ts: payload.ts ? new Date(payload.ts).getTime() : Date.now()
    });
  });

  // ACK for sent message
  socket.on('message:sent', ({ tempId, serverId, ts }) => {
    onAck(tempId, serverId, ts);
  });
}

function ensureSocketConnected() {
  if (!socket || !socket.connected) {
    try { socket?.connect(); } catch (e) {}
  }
}

/* ------------------ Render ------------------ */
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderAll() {
  msgListEl.innerHTML = '';
  messages.forEach(renderOne);
  scrollToBottom();
}

function renderOne(m) {
  const li = document.createElement('li');
  const isMe = m.from === myId;
  li.className = `msg ${isMe ? 'msg--sent' : 'msg--recv'}`;
  li.innerHTML = `
    <div class="msg__text">${escapeHtml(m.text || '')}</div>
    <span class="msg__time">${formatTime(m.ts)}${isMe ? statusDot(m.status) : ''}</span>
  `;
  msgListEl.appendChild(li);
}

function statusDot(st) {
  if (st === 'pending') return ' · ⏳';
  if (st === 'sent')    return ' · ✓';
  return '';
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    const pane = document.getElementById('messagePane');
    pane && (pane.scrollTop = pane.scrollHeight + 9999);
  });
}

function escapeHtml(s) {
  return (s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* ------------------ Sending ------------------ */
function sendMessage() {
  const text = (msgInput.value || '').trim();
  if (!text) return;

  ensureSocketConnected();
  if (!socket || !socket.connected) {
    toast('Not connected', 'warn');
    return;
  }

  // build local "pending" message
  const ts  = Date.now();
  const tempId = `t${ts}-${Math.floor(Math.random() * 10000)}`;
  const m = { id: tempId, from: myId, to: peerId, text, ts, status: 'pending' };

  // store + UI
  messages.push(m);
  saveMessages(messages);
  renderOne(m);
  scrollToBottom();

  // update conversation preview (ensures Home shows this chat)
  touchConversation(myId, { peerId, peerName }, text, ts);

  // clear composer
  msgInput.value = '';
  autoSize(msgInput);

  // emit to server (server will echo "message:sent" ack)
  try {
    socket.emit('message', { to: peerId, content: text, tempId });
  } catch (e) {
    console.error('emit error', e);
    toast('Send failed', 'warn');
  }
}

function onAck(tempId, serverId, ts) {
  const i = messages.findIndex(x => x.id === tempId);
  if (i >= 0) {
    messages[i].id = serverId || messages[i].id;
    messages[i].status = 'sent';
    if (ts) {
      const t = typeof ts === 'string' ? new Date(ts).getTime() : ts;
      messages[i].ts = t || messages[i].ts;
    }
    saveMessages(messages);
    renderAll();
  }
}

/* ------------------ Receiving ------------------ */
function onIncoming(m) {
  const msg = {
    id: m.id || `r${Date.now()}`,
    from: m.from,
    to: m.to,
    text: m.text || '',
    ts: typeof m.ts === 'number' ? m.ts : (m.ts ? new Date(m.ts).getTime() : Date.now()),
    status: 'recv'
  };

  const isForThisThread =
    (msg.from === peerId && msg.to === myId) ||
    (msg.from === myId && msg.to === peerId);

  if (!isForThisThread) return;

  messages.push(msg);
  saveMessages(messages);
  renderOne(msg);
  scrollToBottom();

  const preview = msg.text || '';
  touchConversation(myId, { peerId, peerName }, preview, msg.ts);
}

/* ------------------ Composer UX ------------------ */
function autoSize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
msgInput?.addEventListener('input', () => autoSize(msgInput));
msgInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
btnSend?.addEventListener('click', sendMessage);

/* ------------------ Menu / Back ------------------ */
btnBack?.addEventListener('click', () => {
  if (history.length > 1) history.back();
  else window.location.href = 'home.html';
});

function openMenu() {
  if (!menuEl || !btnMenu) return;
  menuEl.classList.add('show');
  menuEl.setAttribute('aria-hidden', 'false');
  btnMenu.setAttribute('aria-expanded', 'true');
}
function closeMenu() {
  if (!menuEl || !btnMenu) return;
  menuEl.classList.remove('show');
  menuEl.setAttribute('aria-hidden', 'true');
  btnMenu.setAttribute('aria-expanded', 'false');
}
btnMenu?.addEventListener('click', (e) => {
  e.stopPropagation();
  menuEl?.classList.contains('show') ? closeMenu() : openMenu();
});
document.addEventListener('click', (e) => {
  if (!menuEl || !btnMenu) return;
  if (!menuEl.contains(e.target) && !btnMenu.contains(e.target)) closeMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});

menuClear?.addEventListener('click', () => {
  if (!confirm('Clear this chat on this device?')) return;
  messages = [];
  saveMessages(messages);
  renderAll();
  toast('Chat cleared (local)');
  closeMenu();
});

/* ------------------ Alerts ------------------ */
function toast(text, kind = 'info') {
  if (!inlineAlert) return;
  inlineAlert.textContent = text;
  inlineAlert.style.display = 'block';
  inlineAlert.className = `inline-alert ${kind}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { inlineAlert.style.display = 'none'; }, 1800);
}

/* ------------------ Init ------------------ */
renderAll();
setupSocket();

/* ------------------ Storage sync ------------------ */
window.addEventListener('storage', (e) => {
  if (e.key === LS_KEY(myId, peerId)) {
    messages = loadMessages();
    renderAll();
  }
});