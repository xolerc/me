// ===== PlayMe v2 — Video Player =====

const VIDEOS_PATH = 'https://xolerc.github.io/me/videos';

const DEFAULT_VIDEOS = [
  { file: VIDEOS_PATH + '/2_5211184992486459614.mp4', title: 'Video 1' },
  { file: VIDEOS_PATH + '/2_5235775282278869717.mp4', title: 'Video 2' },
  { file: VIDEOS_PATH + '/2_5237973231792597901.mp4', title: 'Video 3' },
  { file: VIDEOS_PATH + '/2_5282749129141818157.mp4', title: 'Video 4' },
  { file: VIDEOS_PATH + '/2_5287781263149656497.mp4', title: 'Video 5' },
  { file: VIDEOS_PATH + '/2_5373350012551988338.mp4', title: 'Video 6' },
  { file: VIDEOS_PATH + '/2_5447322629427989855.mp4', title: 'Video 7' },
  { file: VIDEOS_PATH + '/2_5452074624193953955.mp4', title: 'Video 8' },
  { file: VIDEOS_PATH + '/2_5458622658318987050.mp4', title: 'Video 9' },
  { file: VIDEOS_PATH + '/2_5458751034891467046.mp4', title: 'Video 10' },
  { file: VIDEOS_PATH + '/2_5458751034891467056.mp4', title: 'Video 11' },
  { file: VIDEOS_PATH + '/2_5462948497839910298.mp4', title: 'Video 12' },
];

// Debug: show video URLs on page
const debugEl = document.createElement('div');
debugEl.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#000;color:#0f0;padding:8px;font-size:11px;z-index:9999;font-family:monospace;border-top:2px solid #0f0;max-height:80px;overflow:auto';
document.body.appendChild(debugEl);
function debug(msg) {
  debugEl.textContent = typeof msg === 'string' ? msg : JSON.stringify(msg);
  console.log('[PlayMe]', msg);
}

debug('Script loaded');

// ===== State =====
const STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ERROR: 'error',
};

// ===== DOM =====
const $ = id => document.getElementById(id);
const el = {
  video: $('playmeVideo'),
  float: $('floatVideo'),
  floatWrap: $('floatPlayer'),
  floatTitle: $('floatTitle'),
  floatClose: $('floatClose'),
  list: $('playmeList'),
  dropZone: $('playmeDropZone'),
  fileInput: $('playmeFileInput'),
  empty: $('playmeEmpty'),
  playBtn: $('playmePlayBtn'),
  prevBtn: $('playmePrevBtn'),
  nextBtn: $('playmeNextBtn'),
  shuffleBtn: $('playmeShuffleBtn'),
  repeatBtn: $('playmeRepeatBtn'),
  speedBtn: $('playmeSpeedBtn'),
  pipBtn: $('playmePipBtn'),
  fullBtn: $('playmeFullBtn'),
  currentTime: $('playmeCurrent'),
  duration: $('playmeDuration'),
  progress: $('playmeProgress'),
  progressFill: $('playmeProgressFill'),
  volume: $('playmeVolume'),
  volumeIcon: $('playmeVolumeIcon'),
  loading: $('playmeLoading'),
  error: $('playmeError'),
  controls: $('playmeControls'),
  header: $('playmeVideoInfo'),
  title: $('playmeVideoTitle'),
  count: $('playmeCount'),
  search: $('playmeSearch'),
  searchWrap: $('playmeSearchWrap'),
  retryBtn: $('playmeRetryBtn'),
};

// ===== App State =====
let state = STATE.IDLE;
let videos = [];
let currentIndex = 0;
let shuffleOrder = [];
let shuffleIdx = 0;
let isShuffle = false;
let repeatMode = 0; // 0=off, 1=all, 2=one
let playbackSpeed = 1;
let isDragging = false;
let dragOffX = 0, dragOffY = 0;
let floatVisible = false;
let pipActive = false;
let progressDragging = false;

// ===== IndexedDB =====
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

// ===== Helpers =====
function formatTime(s) {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
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
  shuffleOrder = shuffleArray(videos.map((_, i) => i));
  shuffleIdx = 0;
}

let objectUrls = [];
function revokeAll() {
  objectUrls.forEach(u => URL.revokeObjectURL(u));
  objectUrls = [];
}

// ===== Load/Save Position =====
function savePosition(index, time) {
  try {
    const data = JSON.parse(localStorage.getItem('playme_positions') || '{}');
    data[index] = { time, updated: Date.now() };
    localStorage.setItem('playme_positions', JSON.stringify(data));
  } catch {}
}

function getSavedPosition(index) {
  try {
    const data = JSON.parse(localStorage.getItem('playme_positions') || '{}');
    return data[index] ? data[index].time : 0;
  } catch { return 0; }
}

function saveSettings() {
  localStorage.setItem('playme_settings', JSON.stringify({
    isShuffle,
    repeatMode,
    playbackSpeed,
  }));
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('playme_settings') || '{}');
    if (s.isShuffle !== undefined) isShuffle = s.isShuffle;
    if (s.repeatMode !== undefined) repeatMode = s.repeatMode;
    if (s.playbackSpeed !== undefined) playbackSpeed = s.playbackSpeed;
    updateRepeatUI();
    updateShuffleUI();
    updateSpeedUI();
    if (el.video) el.video.playbackRate = playbackSpeed;
    if (el.float) el.float.playbackRate = playbackSpeed;
  } catch {}
}

// ===== Render =====
function renderEmpty() {
  el.empty.style.display = 'flex';
  el.dropZone.style.display = 'flex';
  el.list.style.display = 'none';
  el.controls.style.display = 'none';
  el.header.style.display = 'none';
  el.searchWrap.style.display = 'none';
  el.error.style.display = 'none';
}

function renderPlaylist() {
  if (videos.length === 0) { renderEmpty(); return; }
  el.empty.style.display = 'none';
  el.dropZone.style.display = 'none';
  el.list.style.display = 'flex';
  el.controls.style.display = '';
  el.header.style.display = '';
  el.searchWrap.style.display = '';
  el.error.style.display = 'none';

  const searchTerm = el.search ? el.search.value.toLowerCase().trim() : '';
  const filtered = videos.map((v, i) => ({ v, i })).filter(x =>
    (x.v.title || '').toLowerCase().includes(searchTerm) ||
    (x.v.name || '').toLowerCase().includes(searchTerm)
  );

  if (filtered.length === 0 && searchTerm) {
    el.list.innerHTML = `<div class="playme-search-empty">Hech narsa topilmadi</div>`;
    return;
  }

  el.list.innerHTML = filtered.map(({ v, i }) => `
    <div class="playme-item${i === currentIndex ? ' active' : ''}" data-index="${i}">
      <div class="playme-item-thumb" data-index="${i}">
        <span class="playme-item-play">▶</span>
      </div>
      <div class="playme-item-body">
        <span class="playme-item-title">${v.title || 'Video ' + (i + 1)}</span>
        <span class="playme-item-meta">${v._duration ? formatTime(v._duration) : ''}${v.fromUser ? ' · ' + (v.blob ? (v.blob.size / 1024 / 1024).toFixed(1) + ' MB' : 'local') : ' · online'}</span>
      </div>
      ${v.fromUser ? `<button class="playme-item-del" data-index="${i}" title="O'chirish">✕</button>` : ''}
      <div class="playme-item-progress" style="width:${v._progress || 0}%"></div>
    </div>
  `).join('');

  el.list.querySelectorAll('.playme-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.closest('.playme-item-del')) return;
      playVideo(parseInt(item.dataset.index));
    });
  });

  el.list.querySelectorAll('.playme-item-del').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      removeVideo(parseInt(btn.dataset.index));
    });
  });

  el.count.textContent = videos.length + ' video' + (videos.length !== 1 ? '' : '');
}

function removeVideo(idx) {
  const v = videos[idx];
  if (v.blob) {
    dbLoadAll().then(entries => {
      const match = entries.find(e => e.name === v.blob.name && e.size === v.blob.size);
      if (match) dbDelete(match.id);
    });
  }
  if (v.file.startsWith('blob:')) URL.revokeObjectURL(v.file);
  objectUrls = objectUrls.filter(u => u !== v.file);
  videos.splice(idx, 1);
  if (videos.length === 0) {
    revokeAll();
    renderEmpty();
    el.video.pause();
    el.video.removeAttribute('src');
    setState(STATE.IDLE);
    return;
  }
  if (idx === currentIndex) { playVideo(0); }
  else if (idx < currentIndex) { currentIndex--; renderPlaylist(); }
  else renderPlaylist();
}

function addFilesToPlaylist(files) {
  for (const file of files) {
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    videos.push({
      file: url,
      blob: file,
      name: file.name,
      title: file.name.replace(/\.\w+$/, ''),
      fromUser: true,
      _duration: 0,
      _progress: 0,
    });
    dbSave(file);
  }
  renderPlaylist();
  if (videos.length > 0 && el.video.paused) playVideo(videos.length - files.length);
}

// ===== Playback =====
function setState(newState) {
  state = newState;
  el.video.dataset.state = state;
  switch (state) {
    case STATE.LOADING:
      el.loading.style.display = '';
      el.error.style.display = 'none';
      break;
    case STATE.ERROR:
      el.loading.style.display = 'none';
      el.error.style.display = '';
      break;
    default:
      el.loading.style.display = 'none';
      el.error.style.display = 'none';
  }
}

async function playVideo(index) {
  debug('playVideo(' + index + ') videos=' + videos.length);
  if (index < 0 || index >= videos.length) return;
  _playMeReady = true;
  currentIndex = index;
  const v = videos[index];
  if (!v) return;

  debug('Loading: ' + v.file);
  setState(STATE.LOADING);
  el.video.src = v.file;
  el.video.load();

  el.title.textContent = v.title || 'Video ' + (index + 1);
  el.header.style.display = '';
  renderPlaylist();
  updateNavButtons();
}

// Video load timeout
let loadTimer = null;
function startLoadTimer() {
  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => {
    if (state === STATE.LOADING) {
      debug('Load timeout: switching to error');
      setState(STATE.ERROR);
    }
  }, 30000);
}
function clearLoadTimer() {
  clearTimeout(loadTimer);
}

el.video.addEventListener('loadstart', () => {
  debug('loadstart');
  startLoadTimer();
});
el.video.addEventListener('loadedmetadata', () => {
  debug('loadedmetadata duration=' + el.video.duration);
  clearLoadTimer();
  videos[currentIndex]._duration = el.video.duration;
  const saved = getSavedPosition(currentIndex);
  if (saved > 0 && saved < el.video.duration - 5) {
    el.video.currentTime = saved;
  }
  el.video.play().catch(() => {});
  setState(STATE.PLAYING);
  renderPlaylist();
});

el.video.addEventListener('waiting', () => setState(STATE.LOADING));
el.video.addEventListener('canplay', () => {
  if (!el.video.paused) setState(STATE.PLAYING);
});
el.video.addEventListener('play', () => {
  setState(STATE.PLAYING);
  showFloatPlayer();
});
el.video.addEventListener('pause', () => setState(STATE.PAUSED));
el.video.addEventListener('error', () => {
  const err = el.video.error;
  debug('video error: code=' + err?.code + ' message=' + (err?.message || ''));
  setState(STATE.ERROR);
});

el.video.addEventListener('timeupdate', () => {
  const v = el.video;
  el.currentTime.textContent = formatTime(v.currentTime);
  el.duration.textContent = formatTime(v.duration);
  const pct = v.duration ? (v.currentTime / v.duration * 100) : 0;
  el.progressFill.style.width = pct + '%';
  videos[currentIndex]._progress = pct;
  savePosition(currentIndex, v.currentTime);
  if (floatVisible && !el.float.paused) {
    const diff = Math.abs(el.float.currentTime - v.currentTime);
    if (diff > 2) el.float.currentTime = v.currentTime;
  }
  updatePlaylistProgress();
});

el.video.addEventListener('ended', () => {
  videos[currentIndex]._progress = 0;
  if (repeatMode === 2) {
    el.video.currentTime = 0;
    el.video.play().catch(() => {});
    return;
  }
  if (isShuffle) nextShuffle();
  else nextVideo();
});

function updatePlaylistProgress() {
  const items = el.list.querySelectorAll('.playme-item');
  items.forEach(item => {
    const idx = parseInt(item.dataset.index);
    const prog = item.querySelector('.playme-item-progress');
    if (prog && videos[idx]) {
      prog.style.width = (videos[idx]._progress || 0) + '%';
    }
  });
}

function nextVideo() {
  if (currentIndex + 1 < videos.length) playVideo(currentIndex + 1);
  else if (repeatMode === 1) playVideo(0);
}

function prevVideo() {
  if (el.video.currentTime > 3) {
    el.video.currentTime = 0;
    return;
  }
  if (currentIndex - 1 >= 0) playVideo(currentIndex - 1);
  else if (repeatMode === 1) playVideo(videos.length - 1);
}

function nextShuffle() {
  shuffleIdx++;
  if (shuffleIdx >= shuffleOrder.length) {
    if (repeatMode === 1) buildShuffle();
    else { shuffleIdx = 0; return; }
  }
  playVideo(shuffleOrder[shuffleIdx]);
}

function updateNavButtons() {
  if (!el.prevBtn || !el.nextBtn) return;
  el.prevBtn.disabled = !isShuffle && currentIndex === 0 && repeatMode !== 1;
  el.nextBtn.disabled = !isShuffle && currentIndex >= videos.length - 1 && repeatMode !== 1;
}

// ===== Controls =====
el.playBtn.addEventListener('click', () => {
  if (el.video.paused) el.video.play().catch(() => {});
  else el.video.pause();
});

// Touch toggle controls on mobile
const controlsBottom = document.querySelector('.playme-controls-bottom');
if (el.video && controlsBottom) {
  el.video.addEventListener('click', () => {
    controlsBottom.classList.toggle('visible');
    clearTimeout(window._ctrlTimer);
    if (controlsBottom.classList.contains('visible')) {
      window._ctrlTimer = setTimeout(() => controlsBottom.classList.remove('visible'), 4000);
    }
  });
  el.video.addEventListener('play', () => {
    setTimeout(() => controlsBottom.classList.remove('visible'), 2000);
  });
}

el.prevBtn.addEventListener('click', () => {
  if (isShuffle) {
    shuffleIdx = Math.max(0, shuffleIdx - 2);
    nextShuffle();
  } else prevVideo();
});

el.nextBtn.addEventListener('click', () => {
  if (isShuffle) nextShuffle();
  else nextVideo();
});

el.shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  if (isShuffle) buildShuffle();
  updateShuffleUI();
  updateNavButtons();
  saveSettings();
});

el.repeatBtn.addEventListener('click', () => {
  repeatMode = (repeatMode + 1) % 3;
  updateRepeatUI();
  saveSettings();
});

el.speedBtn.addEventListener('click', () => {
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const idx = speeds.indexOf(playbackSpeed);
  playbackSpeed = speeds[(idx + 1) % speeds.length];
  el.video.playbackRate = playbackSpeed;
  el.float.playbackRate = playbackSpeed;
  updateSpeedUI();
  saveSettings();
});

el.pipBtn.addEventListener('click', async () => {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await el.video.requestPictureInPicture();
    }
  } catch {}
});

el.video.addEventListener('enterpictureinpicture', () => {
  pipActive = true;
  el.pipBtn.classList.add('active');
});
el.video.addEventListener('leavepictureinpicture', () => {
  pipActive = false;
  el.pipBtn.classList.remove('active');
});

el.fullBtn.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else el.video.requestFullscreen();
});

el.progress.addEventListener('mousedown', e => {
  progressDragging = true;
  seekProgress(e);
});
document.addEventListener('mousemove', e => {
  if (progressDragging) seekProgress(e);
});
document.addEventListener('mouseup', () => { progressDragging = false; });
el.progress.addEventListener('touchstart', e => {
  progressDragging = true;
  seekProgress(e.touches[0]);
});
document.addEventListener('touchmove', e => {
  if (progressDragging) seekProgress(e.touches[0]);
});
document.addEventListener('touchend', () => { progressDragging = false; });

function seekProgress(e) {
  const rect = el.progress.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  el.video.currentTime = pct * el.video.duration;
}

el.volume.addEventListener('input', () => {
  const v = parseFloat(el.volume.value);
  el.video.volume = v;
  el.float.volume = v;
  updateVolumeIcon(v);
});

el.volumeIcon.addEventListener('click', () => {
  if (el.video.volume > 0) {
    el.video.dataset.prevVolume = el.video.volume;
    el.video.volume = 0;
    el.float.volume = 0;
    el.volume.value = 0;
  } else {
    const prev = parseFloat(el.video.dataset.prevVolume) || 0.5;
    el.video.volume = prev;
    el.float.volume = prev;
    el.volume.value = prev;
  }
  updateVolumeIcon(el.video.volume);
});

function updateVolumeIcon(v) {
  if (!el.volumeIcon) return;
  el.volumeIcon.textContent = v === 0 ? '🔇' : v < 0.5 ? '🔉' : '🔊';
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', e => {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
  const tab = document.getElementById('tab-playme');
  if (!tab || !tab.classList.contains('active')) return;

  switch (e.key) {
    case ' ':
    case 'k':
      e.preventDefault();
      el.playBtn.click();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      el.video.currentTime = Math.max(0, el.video.currentTime - 5);
      break;
    case 'ArrowRight':
      e.preventDefault();
      el.video.currentTime = Math.min(el.video.duration, el.video.currentTime + 5);
      break;
    case 'ArrowUp':
      e.preventDefault();
      el.video.volume = Math.min(1, el.video.volume + 0.1);
      el.volume.value = el.video.volume;
      updateVolumeIcon(el.video.volume);
      break;
    case 'ArrowDown':
      e.preventDefault();
      el.video.volume = Math.max(0, el.video.volume - 0.1);
      el.volume.value = el.video.volume;
      updateVolumeIcon(el.video.volume);
      break;
    case 'm':
      el.volumeIcon.click();
      break;
    case 'f':
      el.fullBtn.click();
      break;
    case 'n':
    case 'l':
      el.nextBtn.click();
      break;
    case 'p':
    case 'ArrowLeft':
      e.preventDefault();
      break;
  }
});

// ===== Search =====
el.search.addEventListener('input', renderPlaylist);

// ===== File Input / Drag Drop =====
el.dropZone.addEventListener('click', () => el.fileInput.click());
el.fileInput.addEventListener('change', e => {
  if (e.target.files.length > 0) addFilesToPlaylist(e.target.files);
  e.target.value = '';
});

el.dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  el.dropZone.classList.add('dragover');
});
el.dropZone.addEventListener('dragleave', () => {
  el.dropZone.classList.remove('dragover');
});
el.dropZone.addEventListener('drop', e => {
  e.preventDefault();
  el.dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) addFilesToPlaylist(e.dataTransfer.files);
});

// ===== Floating Mini Player =====
function showFloatPlayer() {
  if (!videos[currentIndex]) return;
  el.float.src = el.video.src;
  el.float.currentTime = el.video.currentTime;
  el.float.play().catch(() => {});
  el.floatWrap.classList.add('show');
  floatVisible = true;
  el.floatTitle.textContent = videos[currentIndex].title || 'PlayMe';
}

function hideFloatPlayer() {
  el.float.pause();
  el.float.removeAttribute('src');
  el.floatWrap.classList.remove('show');
  floatVisible = false;
}

el.floatClose.addEventListener('click', hideFloatPlayer);

el.floatWrap.addEventListener('mousedown', e => {
  if (e.target.closest('.float-player-close')) return;
  if (e.target.closest('.float-player-resize')) return;
  if (e.target.closest('video')) return;
  isDragging = true;
  dragOffX = e.clientX - el.floatWrap.offsetLeft;
  dragOffY = e.clientY - el.floatWrap.offsetTop;
  el.floatWrap.style.transition = 'none';
});

document.addEventListener('mousemove', e => {
  if (!isDragging) return;
  let x = e.clientX - dragOffX;
  let y = e.clientY - dragOffY;
  x = Math.max(0, Math.min(window.innerWidth - el.floatWrap.offsetWidth, x));
  y = Math.max(0, Math.min(window.innerHeight - el.floatWrap.offsetHeight, y));
  el.floatWrap.style.left = x + 'px';
  el.floatWrap.style.top = y + 'px';
  el.floatWrap.style.right = 'auto';
  el.floatWrap.style.bottom = 'auto';
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  el.floatWrap.style.transition = '';
});

// Touch drag
let touchDragId = null;
el.floatWrap.addEventListener('touchstart', e => {
  if (e.target.closest('.float-player-close')) return;
  if (e.target.closest('video')) return;
  const t = e.changedTouches[0];
  touchDragId = t.identifier;
  dragOffX = t.clientX - el.floatWrap.offsetLeft;
  dragOffY = t.clientY - el.floatWrap.offsetTop;
  el.floatWrap.style.transition = 'none';
}, { passive: true });

document.addEventListener('touchmove', e => {
  const t = Array.from(e.changedTouches).find(tc => tc.identifier === touchDragId);
  if (!t) return;
  e.preventDefault();
  let x = t.clientX - dragOffX;
  let y = t.clientY - dragOffY;
  x = Math.max(0, Math.min(window.innerWidth - el.floatWrap.offsetWidth, x));
  y = Math.max(0, Math.min(window.innerHeight - el.floatWrap.offsetHeight, y));
  el.floatWrap.style.left = x + 'px';
  el.floatWrap.style.top = y + 'px';
  el.floatWrap.style.right = 'auto';
  el.floatWrap.style.bottom = 'auto';
}, { passive: false });

document.addEventListener('touchend', e => {
  const t = Array.from(e.changedTouches).find(tc => tc.identifier === touchDragId);
  if (!t) return;
  touchDragId = null;
  el.floatWrap.style.transition = '';
});

// Resize
const resizeHandle = document.createElement('div');
resizeHandle.className = 'float-player-resize';
el.floatWrap.appendChild(resizeHandle);

let resizeActive = false;
let resizeStart = {};

resizeHandle.addEventListener('mousedown', e => {
  e.stopPropagation();
  resizeActive = true;
  resizeStart = {
    x: e.clientX, y: e.clientY,
    w: el.floatWrap.offsetWidth, h: el.floatWrap.offsetHeight,
  };
});

document.addEventListener('mousemove', e => {
  if (!resizeActive) return;
  const dw = e.clientX - resizeStart.x;
  const dh = e.clientY - resizeStart.y;
  const w = Math.max(160, resizeStart.w + dw);
  const h = Math.max(90, resizeStart.h + dh);
  el.floatWrap.style.width = w + 'px';
  el.floatWrap.style.height = 'auto';
});

document.addEventListener('mouseup', () => { resizeActive = false; });

// ===== UI Updates =====
function updateShuffleUI() {
  el.shuffleBtn.classList.toggle('active', isShuffle);
}
function updateRepeatUI() {
  el.repeatBtn.classList.remove('mode-one');
  el.repeatBtn.textContent = repeatMode === 0 ? '🔁' : repeatMode === 1 ? '🔁' : '🔂';
  if (repeatMode === 2) el.repeatBtn.classList.add('mode-one');
}
function updateSpeedUI() {
  el.speedBtn.textContent = playbackSpeed + '×';
}
function updatePlayBtn() {
  if (!el.playBtn) return;
  el.playBtn.textContent = el.video.paused ? '▶' : '⏸';
}

// Play button state sync
el.video.addEventListener('play', updatePlayBtn);
el.video.addEventListener('pause', updatePlayBtn);

// ===== Retry Button =====
el.retryBtn.addEventListener('click', () => {
  if (videos[currentIndex]) playVideo(currentIndex);
});

// ===== Load Default Videos =====
function loadDefaultVideos() {
  videos = DEFAULT_VIDEOS.map((v, i) => ({
    file: v.file,
    name: 'video_' + (i + 1) + '.mp4',
    title: v.title,
    fromUser: false,
    _duration: 0,
    _progress: 0,
  }));
  buildShuffle();
  renderPlaylist();
  if (document.getElementById('tab-playme')?.classList.contains('active')) {
    playVideo(0);
  }
}

// ===== Init =====
let _playMeReady = false;

function playMePlay() {
  if (_playMeReady) return;
  _playMeReady = true;
  if (videos.length > 0) playVideo(currentIndex);
}

// Clear IndexedDB on first visit (remove stale data from v1)
if (!localStorage.getItem('playme_v2')) {
  try { indexedDB.deleteDatabase('PlayMeDB'); } catch {}
  localStorage.setItem('playme_v2', '1');
}

(async function initPlayMe() {
  debug('initPlayMe start');
  try {
    loadSettings();
    const entries = await dbLoadAll();
    debug('dbLoadAll entries=' + entries.length);
    if (entries.length > 0) {
      revokeAll();
      videos = [];
      for (const e of entries) {
        const url = URL.createObjectURL(e.blob);
        objectUrls.push(url);
        videos.push({
          file: url,
          blob: e.blob,
          name: e.name,
          title: e.name.replace(/\.\w+$/, ''),
          fromUser: true,
          _duration: 0,
          _progress: 0,
        });
      }
      renderPlaylist();
      if (videos.length > 0) {
        if (document.getElementById('tab-playme')?.classList.contains('active')) {
          playVideo(0);
        }
      }
      return;
    }
  } catch (err) {
    debug('initPlayMe error: ' + (err?.message || err));
  }
  debug('initPlayMe: loadDefaultVideos');
  loadDefaultVideos();
  if (document.getElementById('tab-playme')?.classList.contains('active')) {
    playVideo(0);
  }
})();

// Watch for PlayMe tab activation to start video loading
const _tabObserver = new MutationObserver(() => {
  if (document.getElementById('tab-playme')?.classList.contains('active')) {
    if (!_playMeReady && videos.length > 0) {
      playVideo(currentIndex);
    }
  }
});
const _playmeTab = document.getElementById('tab-playme');
if (_playmeTab) _tabObserver.observe(_playmeTab, { attributes: true, attributeFilter: ['class'] });
