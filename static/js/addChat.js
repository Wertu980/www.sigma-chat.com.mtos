// js/addChat.js
import { ApiClient } from './apiClient.js';
import { Prefs } from './prefs.js';

// Gatekeeper
const token = Prefs.getToken();
if (!token) window.location.href = '/login';

const myId     = Prefs.getUserId();
const btnBack  = document.getElementById('btnBack');
const btnSearch= document.getElementById('btnSearch');
const searchBox= document.getElementById('searchBox');
const searchEl = document.getElementById('searchInput');
const listEl   = document.getElementById('userList');
const emptyEl  = document.getElementById('emptyState');

let allUsers = [];

btnBack?.addEventListener('click', () => {
  if (history.length > 1) history.back();
  else window.location.href = '/home';
});

btnSearch?.addEventListener('click', () => {
  const show = searchBox.style.display === 'none';
  searchBox.style.display = show ? 'block' : 'none';
  if (show) searchEl?.focus();
});

searchEl?.addEventListener('input', () => {
  const q = (searchEl.value || '').toLowerCase();
  renderUsers(allUsers.filter(u =>
    (u.name || '').toLowerCase().includes(q) ||
    (u.phone || '').toLowerCase().includes(q)
  ));
});

function setEmpty(msg) {
  if (!emptyEl) return;
  emptyEl.textContent = msg;
  emptyEl.style.display = 'block';
}

async function loadUsers() {
  try {
    setEmpty(''); if (emptyEl) emptyEl.style.display = 'none';
    listEl.innerHTML = '';

    const res = await ApiClient.getUsers(token);
    const users = Array.isArray(res) ? res : [];
    allUsers = users.filter(u => u && u.id !== myId);
    renderUsers(allUsers);
  } catch (e) {
    console.error('getUsers failed:', e);
    if (e.status === 401) {
      // Token invalid/expired
      Prefs.clear();
      window.location.href = '/login';
      return;
    }
    setEmpty('Failed to load users');
  }
}

function renderUsers(users) {
  listEl.innerHTML = '';
  if (!users || users.length === 0) {
    setEmpty('No users found');
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  for (const u of users) {
    const li = document.createElement('li');
    li.className = 'user-item';
    li.innerHTML = `
      <div class="avatar"><i class="bi bi-person-circle"></i></div>
      <div class="info">
        <div class="name">${escapeHtml(u.name || '')}</div>
        <div class="phone">${escapeHtml(u.phone || '')}</div>
      </div>
    `;
    li.addEventListener('click', () => {
      const peerId = encodeURIComponent(u.id);
      const peerName = encodeURIComponent(u.name || '');
      window.location.href = `/chat?peerId=${peerId}&peerName=${peerName}`;
    });
    listEl.appendChild(li);
  }
}

function escapeHtml(s) {
  return (s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

loadUsers();