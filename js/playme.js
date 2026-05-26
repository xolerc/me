const mainVideo = document.getElementById('playmeVideo');
const floatVideo = document.getElementById('floatVideo');
const floatPlayer = document.getElementById('floatPlayer');
const floatTitle = document.getElementById('floatTitle');
const floatClose = document.getElementById('floatClose');
const playmeList = document.getElementById('playmeList');
const dropZone = document.getElementById('playmeDropZone');
const fileInput = document.getElementById('playmeFileInput');
const emptyState = document.getElementById('playmeEmpty');

const RELEASE = 'https://github.com/xolerc/me/releases/download/videos-v1';
const DEFAULT_VIDEOS = [
  { file: RELEASE + '/2_5211184992486459614.mp4', title: 'Video 1' },
  { file: RELEASE + '/2_5235775282278869717.mp4', title: 'Video 2' },
  { file: RELEASE + '/2_5237973231792597901.mp4', title: 'Video 3' },
  { file: RELEASE + '/2_5447322629427989855.mp4', title: 'Video 4' },
  { file: RELEASE + '/2_5452074624193953955.mp4', title: 'Video 5' },
  { file: RELEASE + '/2_5458622658318987050.mp4', title: 'Video 6' },
  { file: RELEASE + '/2_5458751034891467046.mp4', title: 'Video 7' },
  { file: RELEASE + '/2_5458751034891467056.mp4', title: 'Video 8' },
  { file: RELEASE + '/2_5462948497839910298.mp4', title: 'Video 9' },
];

let videos = [];
let currentIndex = 0;
let shuffleOrder = [];
let shuffleIdx = 0;
let floatVisible = false;
let objectUrls = [];

const HIDDEN_KEY = 'playme_hidden';

function getHidden() {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY)) || []; } catch { return []; }
}

function addHidden(url) {
  const h = getHidden();
  if (!h.includes(url)) { h.push(url); localStorage.setItem(HIDDEN_KEY, JSON.stringify(h)); }
}

function buildVideoList() {
  const hidden = getHidden();
  videos = [];
  objectUrls = [];
  for (const d of DEFAULT_VIDEOS) {
    if (hidden.includes(d.file)) continue;
    videos.push({ file: d.file, title: d.title, isDefault: true });
  }
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

function playVideo(index) {
  currentIndex = index;
  const v = videos[index];
  if (!v) return;
  mainVideo.src = v.file;
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
        <span class="playme-item-title">${v.title}</span>
        <span class="playme-item-num">Video ${i + 1}</span>
      </div>
      <button class="playme-item-del" data-index="${i}" title="O'chirish">✕</button>
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
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      const v = videos[idx];
      if (v.isDefault) addHidden(v.file);
      videos.splice(idx, 1);
      if (videos.length === 0) {
        renderEmpty();
        mainVideo.pause();
        mainVideo.src = '';
        return;
      }
      if (idx === currentIndex) { playVideo(Math.min(0, videos.length - 1)); }
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

// Default video titles
function getFileTitle(name) {
  return name.replace(/\.\w+$/, '').replace(/^\d+_/, 'Video ');
}

// Drop zone
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

function addFilesToPlaylist(files) {
  for (const file of files) {
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    videos.push({ file: url, title: getFileTitle(file.name), isDefault: false });
  }
  renderPlaylist();
  if (videos.length > 0 && !mainVideo.src) playVideo(videos.length - files.length);
}

// Float player
function showFloatPlayer() {
  if (!videos[currentIndex]) return;
  floatVideo.src = mainVideo.src;
  floatVideo.currentTime = mainVideo.currentTime;
  floatVideo.play().catch(() => {});
  floatPlayer.classList.add('show');
  floatVisible = true;
  floatTitle.textContent = videos[currentIndex]?.title || 'PlayMe';
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

// Drag float player
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

// Init
buildVideoList();
if (videos.length > 0) {
  renderPlaylist();
  playVideo(0);
} else {
  renderEmpty();
}
