const REACTIONS = ['👍', '❤️', '😊', '😂', '😮', '😢', '🙏', '🔥', '🎉', '💯'];
const CACHE_KEY = 'xolerc_user';

let currentUser = null;
let unsubscribe = null;
let onlineUsers = {};

async function ensureUser() {
  let uid = localStorage.getItem('xolerc_uid');
  if (uid) {
    try {
      const user = await DB.getUser(uid);
      if (user && user.id) {
        currentUser = user;
        localStorage.setItem(CACHE_KEY, JSON.stringify(user));
        return user;
      }
    } catch {}
    // Firebase miss — fallback to cache
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id === uid) {
          currentUser = parsed;
          return parsed;
        }
      } catch {}
    }
  }
  return null;
}

(async function init() {
  const user = await ensureUser();
  if (user) {
    document.getElementById('setupModal').style.display = 'none';
    updateSidebarUser(user);
    startChat();
    DB.updateUser(user.id, { online: true });
  } else {
    document.getElementById('setupModal').style.display = 'flex';
  }
})();

document.getElementById('setupSave').addEventListener('click', async () => {
  const name = document.getElementById('setupName').value.trim();
  if (!name) return alert('Username kiriting');
  const avatar = document.getElementById('setupAvatar').textContent === '?' ? '' : document.getElementById('setupAvatar').textContent;
  const bio = document.getElementById('setupBio').value.trim();

  if (currentUser) {
    await DB.updateUser(currentUser.id, { username: name, bio, avatar });
    currentUser = { ...currentUser, username: name, bio, avatar };
    localStorage.setItem(CACHE_KEY, JSON.stringify(currentUser));
    document.getElementById('setupModal').style.display = 'none';
    updateSidebarUser(currentUser);
    return;
  }

  const exists = await DB.usernameExists(name);
  if (exists) return alert('Bu username band. Boshqasini tanlang.');
  const user = await DB.createUser({ username: name, bio, avatar });
  currentUser = user;
  localStorage.setItem('xolerc_uid', user.id);
  localStorage.setItem(CACHE_KEY, JSON.stringify(user));
  document.getElementById('setupModal').style.display = 'none';
  updateSidebarUser(user);
  startChat();
});

document.getElementById('editProfileBtn').addEventListener('click', () => {
  const m = document.getElementById('setupModal');
  m.style.display = 'flex';
  document.getElementById('setupSave').textContent = 'Saqlash';
  if (currentUser) {
    document.getElementById('setupName').value = currentUser.username || '';
    document.getElementById('setupBio').value = currentUser.bio || '';
    document.getElementById('setupAvatar').textContent = currentUser.avatar || '?';
  }
});

// --- AVATAR SETUP ---
const setupAvatarInput = document.getElementById('setupAvatarInput');
const setupAvatar = document.getElementById('setupAvatar');
setupAvatarInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => { setupAvatar.textContent = ''; setupAvatar.style.backgroundImage = `url(${r.result})`; setupAvatar.style.backgroundSize = 'cover'; };
  r.readAsDataURL(f);
});

// --- SIDEBAR ---
function updateSidebarUser(user) {
  document.getElementById('sidebarName').textContent = user.username || 'User';
  document.getElementById('sidebarStatus').textContent = 'online';
  const sa = document.getElementById('sidebarAvatar');
  if (user.avatar) { sa.textContent = ''; sa.style.backgroundImage = `url(${user.avatar})`; sa.style.backgroundSize = 'cover'; }
  else { sa.textContent = (user.username || '?')[0].toUpperCase(); sa.style.backgroundImage = ''; }
}

// --- CHAT ---
function startChat() {
  loadMessages();
  subscribeMessages();
  setupOnline();
  setupInput();
}

function getDateLabel(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Bugun';
  if (d.toDateString() === yesterday.toDateString()) return 'Kecha';
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function loadMessages() {
  try {
    const msgs = await DB.getMessages('main');
    const container = document.getElementById('chatMessages');
    container.innerHTML = msgs.map((m, i) => {
      const showDate = i === 0 || new Date(msgs[i-1]?.time).toDateString() !== new Date(m.time).toDateString();
      return (showDate ? `<div class="date-separator"><span>${getDateLabel(m.time)}</span></div>` : '') + renderMessage(m);
    }).join('');
    container.scrollTop = container.scrollHeight;
  } catch { document.getElementById('chatMessages').innerHTML = '<div class="chat-loading">Xatolik yuz berdi</div>'; }
}

function renderMessage(m) {
  const isOwn = m.fromId === currentUser?.id;
  const cls = isOwn ? 'msg own' : 'msg other';
  const avatar = m.fromAvatar && m.fromAvatar !== '?' ? m.fromAvatar : null;
  const time = m.time ? new Date(m.time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '';
  const media = m.media ? `<div class="msg-media"><img src="${m.media}" loading="lazy" onclick="opencodeImage('${m.media}')" /></div>` : '';
  const bubbleCls = isOwn ? 'msg-bubble own' : 'msg-bubble';
  return `
    <div class="${cls} msg-wrapper" data-id="${m.id || ''}">
      <div class="msg-avatar" style="${avatar ? `background-image:url(${avatar});background-size:cover` : 'background:rgba(255,222,2,0.15);color:#FFDE02'}">${avatar ? '' : (m.fromName ? m.fromName[0].toUpperCase() : '?')}</div>
      <div class="msg-body">
        ${isOwn ? '' : `<span class="msg-author">${m.fromName || 'Anon'}</span>`}
        <div class="${bubbleCls}">
          ${m.text ? `<div class="msg-text">${escapeHtml(m.text)}</div>` : ''}
          ${media}
          ${m.reaction ? `<div class="msg-reaction">${m.reaction}</div>` : ''}
        </div>
        <div class="msg-info">
          <span class="msg-time">${time}</span>
          <div class="msg-actions">
            <button class="msg-action-btn react-btn" onclick="toggleReactions('${m.id}')" title="Reaksiya">😊</button>
            ${isOwn ? `<button class="msg-action-btn" onclick="deleteMsg('${m.id}')" title="O'chirish">🗑️</button>` : ''}
          </div>
        </div>
        <div class="msg-reactions" id="reactions-${m.id}" style="display:none">
          ${REACTIONS.map(r => `<button class="react-emoji" onclick="addReact('${m.id}','${r}')">${r}</button>`).join('')}
        </div>
      </div>
    </div>`;
}

function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

function subscribeMessages() {
  if (unsubscribe) unsubscribe();
  unsubscribe = DB.subscribe(msgs => {
    const container = document.getElementById('chatMessages');
    container.innerHTML = msgs.map(m => renderMessage(m)).join('');
    container.scrollTop = container.scrollHeight;
  });
}

async function deleteMsg(id) {
  if (!id || !confirm("O'chirilsinmi?")) return;
  await DB.deleteMessage('main', id);
}

function toggleReactions(id) {
  const el = document.getElementById('reactions-' + id);
  if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

async function addReact(msgId, emoji) {
  await DB.addReaction(msgId, emoji);
  document.getElementById('reactions-' + msgId).style.display = 'none';
}

function opencodeImage(src) {
  window.open(src, '_blank');
}

// --- SEND ---
function setupInput() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');

  async function send() {
    const text = input.value.trim();
    const preview = document.getElementById('chatPreview');
    const media = preview.style.display !== 'none' && preview.querySelector('img') ? preview.querySelector('img').src : '';
    if (!text && !media) return;
    await DB.sendMessage({
      groupId: 'main', fromId: currentUser.id, fromName: currentUser.username,
      fromAvatar: currentUser.avatar || '', text, media,
    });
    input.value = '';
    input.style.height = 'auto';
    preview.style.display = 'none';
    preview.querySelector('img').src = '';
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });

  // Media
  const mediaInput = document.getElementById('chatMediaInput');
  const mediaBtn = document.getElementById('chatMediaBtn');
  const preview = document.getElementById('chatPreview');
  const previewImg = document.getElementById('chatPreviewImg');
  mediaBtn.addEventListener('click', () => mediaInput.click());
  mediaInput.addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { previewImg.src = r.result; preview.style.display = 'block'; };
    r.readAsDataURL(f);
  });
  document.getElementById('chatPreviewRemove').addEventListener('click', () => { preview.style.display = 'none'; previewImg.src = ''; mediaInput.value = ''; });
}

// --- ONLINE USERS ---
function setupOnline() {
  async function refresh() {
    try {
      const users = await DB.getAllUsers();
      const online = users.filter(u => u.online && u.id !== currentUser?.id);
      onlineUsers = {};
      online.forEach(u => { onlineUsers[u.id] = u; });
      const count = online.length + (currentUser ? 1 : 0);
      document.getElementById('onlineCount').textContent = count + ' online';
      if (window.updateOnlineBadge) window.updateOnlineBadge(count);
    } catch {}
  }
  refresh();
  setInterval(refresh, 10000);

  // Mark offline on close
  window.addEventListener('beforeunload', () => {
    if (currentUser) DB.updateUser(currentUser.id, { online: false });
  });
}
