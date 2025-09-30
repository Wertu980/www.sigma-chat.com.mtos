// static/js/home.js
import { Prefs } from "./prefs.js";
import { getConversations } from "./database.js";

/* ---------- Gatekeeper & header username ---------- */
const token = Prefs.getToken();
if (!token) {
  // ✅ redirect to Flask /login route
  window.location.href = "/login";
}

const usernameSpan = document.getElementById("username");
usernameSpan && (usernameSpan.textContent = Prefs.getUserName() || "User");

/* ---------- DOM refs ---------- */
const logoutBtn  = document.getElementById("logoutBtn");
const btnSearch  = document.getElementById("btnSearch");
const searchBox  = document.getElementById("searchBox");
const searchEl   = document.getElementById("searchInput");
const btnMenu    = document.getElementById("btnMenu");
const menuEl     = document.getElementById("menu");
const fab        = document.getElementById("fabAddChat");
const listEl     = document.getElementById("userList");
const emptyEl    = document.getElementById("emptyState");

let allConvos = [];

/* ---------- Menu (three dots) ---------- */
function openMenu() {
  if (!menuEl || !btnMenu) return;
  menuEl.classList.add("show");
  menuEl.setAttribute("aria-hidden", "false");
  btnMenu.setAttribute("aria-expanded", "true");
}
function closeMenu() {
  if (!menuEl || !btnMenu) return;
  menuEl.classList.remove("show");
  menuEl.setAttribute("aria-hidden", "true");
  btnMenu.setAttribute("aria-expanded", "false");
}
btnMenu?.addEventListener("click", (e) => {
  e.stopPropagation();
  menuEl?.classList.contains("show") ? closeMenu() : openMenu();
});
document.addEventListener("click", (e) => {
  if (!menuEl || !btnMenu) return;
  if (!menuEl.contains(e.target) && !btnMenu.contains(e.target)) closeMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

/* ---------- Logout ---------- */
logoutBtn?.addEventListener("click", () => {
  Prefs.clear();
  // ✅ redirect to Flask /login route
  window.location.href = "/login";
});

/* ---------- Search toggle & filter ---------- */
btnSearch?.addEventListener("click", () => {
  if (!searchBox) return;
  const show = searchBox.style.display === "none";
  searchBox.style.display = show ? "block" : "none";
  if (show) searchEl?.focus();
});

searchEl?.addEventListener("input", () => {
  const q = (searchEl.value || "").toLowerCase();
  const filtered = allConvos.filter(
    (c) =>
      (c.peerName || "").toLowerCase().includes(q) ||
      (c.peerPhone || "").toLowerCase().includes(q)
  );
  renderConvos(filtered);
});

/* ---------- FAB ---------- */
fab?.addEventListener("click", () => {
  // ✅ use Flask /addchat route instead of addChat.html
  window.location.href = "/addchat";
});

/* ---------- Conversations (local) ---------- */
function loadConversations() {
  const myId = Prefs.getUserId();
  allConvos = getConversations(myId); // only chats that have at least one message
  renderConvos(allConvos);
}

function renderConvos(convos) {
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!convos || convos.length === 0) {
    if (emptyEl) {
      emptyEl.textContent = "No chats yet. Start a new one!";
      emptyEl.style.display = "block";
    }
    return;
  }
  if (emptyEl) emptyEl.style.display = "none";

  convos.forEach((c) => {
    const li = document.createElement("li");
    li.className = "user-item";
    li.innerHTML = `
      <div class="avatar"><i class="bi bi-person-circle"></i></div>
      <div class="info">
        <div class="name">${escapeHtml(c.peerName || c.peerPhone || "Unknown")}</div>
        <div class="phone">${escapeHtml(c.lastMessage || "")}</div>
      </div>
      <div class="meta-time">${formatTime(c.lastTs)}</div>
    `;
    li.addEventListener("click", () => {
      const peerId = encodeURIComponent(c.peerId);
      const peerName = encodeURIComponent(c.peerName || "");
      // ✅ go to Flask /chat route with query params
      window.location.href = `/chat?peerId=${peerId}&peerName=${peerName}`;
    });
    listEl.appendChild(li);
  });
}

/* ---------- Utils ---------- */
function escapeHtml(s) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ---------- Init ---------- */
loadConversations();