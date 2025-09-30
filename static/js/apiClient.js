// js/apiClient.js
const BASE = 'https://workspace-cyan-rho.vercel.app/'; // <-- keep HTTPS & trailing slash

function join(u, p) {
  return u.replace(/\/+$/, '') + '/' + p.replace(/^\/+/, '');
}

async function parseJsonSafe(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; }
  catch { throw new Error(`Bad JSON (status ${res.status})`); }
}

async function request(path, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(join(BASE, path), {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    // Prefer server error field if present
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const ApiClient = {
  async getUsers(token) {
    return request('users', { headers: { Authorization: `Bearer ${token}` } });
  },
  async login(phone, password) {
    return request('login', { method: 'POST', body: JSON.stringify({ phone, password }) });
  },
  async register(name, phone, password) {
    return request('register', { method: 'POST', body: JSON.stringify({ name, phone, password }) });
  },
};