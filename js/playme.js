const RELEASE = 'https://github.com/xolerc/me/releases/download/videos-v1';

const DEFAULT_VIDEOS = [
  { file: RELEASE + '/2_5211184992486459614.mp4', title: 'Video 1' },
  { file: RELEASE + '/2_5235775282278869717.mp4', title: 'Video 2' },
  { file: RELEASE + '/2_5237973231792597901.mp4', title: 'Video 3' },
  { file: RELEASE + '/2_5282749129141818157.mp4', title: 'Video 4' },
  { file: RELEASE + '/2_5373350012551988338.mp4', title: 'Video 5' },
  { file: RELEASE + '/2_5447322629427989855.mp4', title: 'Video 6' },
  { file: RELEASE + '/2_5452074624193953955.mp4', title: 'Video 7' },
  { file: RELEASE + '/2_5458622658318987050.mp4', title: 'Video 8' },
  { file: RELEASE + '/2_5458751034891467046.mp4', title: 'Video 9' },
  { file: RELEASE + '/2_5458751034891467056.mp4', title: 'Video 10' },
  { file: RELEASE + '/2_5462948497839910298.mp4', title: 'Video 11' },
];

// Fetch + Blob proxy for correct MIME type
const blobCache = {};

async function resolveBlobUrl(url) {
  if (blobCache[url]) return blobCache[url];
  try {
    const r = await fetch(url);
    const blob = await r.blob();
    const fixed = new Blob([blob], { type: 'video/mp4' });
    const objUrl = URL.createObjectURL(fixed);
    blobCache[url] = objUrl;
    return objUrl;
  } catch {
    return url;
  }
}

const mainVideo = document.getElementById('playmeVideo');
const floatVideo = document.getElementById('floatVideo');
const floatPlayer = document.getElementById('floatPlayer');
const floatTitle = document.getElementById('floatTitle');
const floatClose = document.getElementById('floatClose');
const playmeList = document.getElementById('playmeList');
const dropZone = document.getElementById('playmeDropZone');
const fileInput = document.getElementById('playmeFileInput');
const emptyState = document.getElementById('playmeEmpty');

let videos = [];
let currentIndex = 0;
let shuffleOrder = [];
let shuffleIdx = 0;
let floatVisible = false;
let objectUrls = [];

const DB_NAME = 'PlayMeDB';
const STORE_NAME = 'videos';

function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function dbSave(file) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: file.name,
    blob: file,
    size: file.size,
    type: file.type || 'video/mp4',
    added: Date.now(),
  });
  await new Promise(r => { tx.oncomplete = r; });
}

async function dbLoadAll() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const all = await new Promise(r => {
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => r(req.result);
  });
  return all || [];
}

async function dbDelete(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  await new Promise(r => { tx.oncomplete = r; });
}

async function dbClear() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await new Promise(r => { tx.oncomplete = r; });
}

function revokeAllUrls() {
  objectUrls.forEach(u => URL.revokeObjectURL(u));
  objectUrls = [];
}

function addFilesToPlaylist(files) {
  for (const file of files) {
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    videos.push({ file: url, blob: file, name: file.name, title: file.name.replace(/\.\w+$/, ''), fromUser: true });
    dbSave(file);
  }
  renderPlaylist();
  if (videos.length > 0 && mainVideo.paused) playVideo(0);
}

function shuffleArray(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function buildShuffle() {
  const idxs = videos.map((_, i) => i);
  shuffleOrder = shuffleArray(idxs);
  shuffleIdx = 0;
}

async function playVideo(index) {
  currentIndex = index;
  const v = videos[index];
  if (!v) return;
  let src = v.file;
  if (v.isDefault && !v._blobResolved) {
    v._blobResolved = true;
    src = await resolveBlobUrl(v.file);
  }
  mainVideo.src = src;
  mainVideo.load();
  mainVideo.play().catch(() => {});
  updateList();
}

function nextShuffle() {
  if (shuffleIdx >= shuffleOrder.length) buildShuffle();
  const idx = shuffleOrder[shuffleIdx++];
  playVideo(idx);
}

function renderEmpty() {
  emptyState.style.display = 'flex';
  dropZone.style.display = 'flex';
  playmeList.style.display = 'none';
}

function renderPlaylist() {
  if (videos.length === 0) { renderEmpty(); return; }
  emptyState.style.display = 'none';
  dropZone.style.display = 'none';
  playmeList.style.display = 'flex';

  playmeList.innerHTML = videos.map((v, i) => `
    <div class="playme-item${i === currentIndex ? ' active' : ''}" data-index="${i}">
      <div class="playme-thumb">
        <span class="playme-play-icon">▶</span>
      </div>
      <div class="playme-item-info">
        <span class="playme-item-title">${v.title || 'Video ' + (i + 1)}</span>
        <span class="playme-item-num">${v.fromUser && v.blob ? (v.blob.size / 1024 / 1024).toFixed(1) + ' MB' : 'yuklab olingan'}</span>
      </div>
      ${v.fromUser ? `<button class="playme-item-del" data-index="${i}" title="O'chirish">✕</button>` : ''}
    </div>
  `).join('');

  playmeList.querySelectorAll('.playme-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.playme-item-del')) return;
      const idx = parseInt(el.dataset.index);
      playVideo(idx);
    });
  });

  playmeList.querySelectorAll('.playme-item-del').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      const v = videos[idx];
      if (v.blob) {
        const entries = await dbLoadAll();
        const match = entries.find(e => e.name === v.blob.name && e.size === v.blob.size);
        if (match) await dbDelete(match.id);
      }
      URL.revokeObjectURL(v.file);
      videos.splice(idx, 1);
      objectUrls = objectUrls.filter(u => u !== v.file);
      if (videos.length === 0) {
        revokeAllUrls();
        renderEmpty();
        mainVideo.pause();
        mainVideo.src = '';
        return;
      }
      if (idx === currentIndex) { playVideo(0); }
      else if (idx < currentIndex) { currentIndex--; }
      renderPlaylist();
    });
  });
}

function updateList() {
  playmeList.querySelectorAll('.playme-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.index) === currentIndex);
  });
}

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => {
  if (e.target.files.length > 0) addFilesToPlaylist(e.target.files);
  e.target.value = '';
});

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) addFilesToPlaylist(e.dataTransfer.files);
});

function showFloatPlayer() {
  if (!videos[currentIndex]) return;
  floatVideo.src = mainVideo.src;
  floatVideo.currentTime = mainVideo.currentTime;
  floatVideo.play().catch(() => {});
  floatPlayer.classList.add('show');
  floatVisible = true;
  const v = videos[currentIndex];
  floatTitle.textContent = v ? v.title : 'PlayMe';
}

function hideFloatPlayer() {
  floatVideo.pause();
  floatVideo.src = '';
  floatPlayer.classList.remove('show');
  floatVisible = false;
}

mainVideo.addEventListener('play', () => { showFloatPlayer(); });

mainVideo.addEventListener('timeupdate', () => {
  if (floatVisible && !floatVideo.paused) {
    const diff = Math.abs(floatVideo.currentTime - mainVideo.currentTime);
    if (diff > 2) floatVideo.currentTime = mainVideo.currentTime;
  }
});

mainVideo.addEventListener('ended', () => { nextShuffle(); });

floatClose.addEventListener('click', hideFloatPlayer);

let drag = false;
let dragOffX = 0, dragOffY = 0;

floatPlayer.addEventListener('mousedown', e => {
  if (e.target === floatClose) return;
  drag = true;
  dragOffX = e.clientX - floatPlayer.offsetLeft;
  dragOffY = e.clientY - floatPlayer.offsetTop;
  floatPlayer.style.transition = 'none';
});

document.addEventListener('mousemove', e => {
  if (!drag) return;
  let x = e.clientX - dragOffX;
  let y = e.clientY - dragOffY;
  x = Math.max(0, Math.min(window.innerWidth - floatPlayer.offsetWidth, x));
  y = Math.max(0, Math.min(window.innerHeight - floatPlayer.offsetHeight, y));
  floatPlayer.style.left = x + 'px';
  floatPlayer.style.top = y + 'px';
  floatPlayer.style.right = 'auto';
  floatPlayer.style.bottom = 'auto';
});

document.addEventListener('mouseup', () => { drag = false; floatPlayer.style.transition = ''; });

(async function initPlayMe() {
  const entries = await dbLoadAll();
  if (entries.length > 0) {
    revokeAllUrls();
    videos = [];
    for (const e of entries) {
      const url = URL.createObjectURL(e.blob);
      objectUrls.push(url);
      videos.push({ file: url, blob: e.blob, name: e.name, title: e.name.replace(/\.\w+$/, ''), fromUser: true });
    }
    renderPlaylist();
    if (videos.length > 0) playVideo(0);
    return;
  }

  loadDefaultVideos();
})();

function loadDefaultVideos() {
  videos = DEFAULT_VIDEOS.map(v => ({
    file: RELEASE_BASE + v.name,
    name: v.name,
    title: v.title,
    fromUser: false,
  }));
  buildShuffle();
  renderPlaylist();
  playVideo(0);
}
