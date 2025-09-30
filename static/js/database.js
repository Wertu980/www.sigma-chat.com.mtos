// js/db/database.js
const LS_KEY = 'sigma.conversations.v1'; // { [myId]: { [peerId]: {peerId, peerName, peerPhone, lastMessage, lastTs} } }

function _loadAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}
function _saveAll(all) {
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

/** Save/refresh a conversation row for myId <-> peerId */
export function touchConversation(myId, { peerId, peerName = '', peerPhone = '' }, lastMessage = '', lastTs = Date.now()) {
  if (!myId || !peerId) return;
  const all = _loadAll();
  const mine = all[myId] || {};
  mine[peerId] = {
    peerId,
    peerName,
    peerPhone,
    lastMessage,
    lastTs
  };
  all[myId] = mine;
  _saveAll(all);
}

/** Return conversations for myId sorted by lastTs desc */
export function getConversations(myId) {
  if (!myId) return [];
  const all = _loadAll();
  const mine = all[myId] || {};
  return Object.values(mine).sort((a,b) => (b.lastTs||0) - (a.lastTs||0));
}

/** Optional: delete one */
export function deleteConversation(myId, peerId) {
  const all = _loadAll();
  if (all[myId] && all[myId][peerId]) {
    delete all[myId][peerId];
    _saveAll(all);
  }
}

/** Optional: clear all for myId */
export function clearConversations(myId) {
  const all = _loadAll();
  delete all[myId];
  _saveAll(all);
}

