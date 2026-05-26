const VIDEOS = [
  { file: 'videos/2_5211184992486459614.mp4', title: 'Video 1' },
  { file: 'videos/2_5235775282278869717.mp4', title: 'Video 2' },
  { file: 'videos/2_5237973231792597901.mp4', title: 'Video 3' },
  { file: 'videos/2_5282749129141818157.mp4', title: 'Video 4' },
  { file: 'videos/2_5287781263149656497.mp4', title: 'Video 5' },
  { file: 'videos/2_5373350012551988338.mp4', title: 'Video 6' },
  { file: 'videos/2_5447322629427989855.mp4', title: 'Video 7' },
  { file: 'videos/2_5452074624193953955.mp4', title: 'Video 8' },
  { file: 'videos/2_5458622658318987050.mp4', title: 'Video 9' },
  { file: 'videos/2_5458751034891467046.mp4', title: 'Video 10' },
  { file: 'videos/2_5458751034891467056.mp4', title: 'Video 11' },
  { file: 'videos/2_5462948497839910298.mp4', title: 'Video 12' },
];

const mainVideo = document.getElementById('playmeVideo');
const floatVideo = document.getElementById('floatVideo');
const floatPlayer = document.getElementById('floatPlayer');
const floatTitle = document.getElementById('floatTitle');
const floatClose = document.getElementById('floatClose');
const playmeList = document.getElementById('playmeList');
let currentIndex = 0;
let shuffleOrder = [];
let shuffleIdx = 0;
let floatVisible = false;

function shuffleArray(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function buildShuffle() {
  const idxs = VIDEOS.map((_, i) => i);
  shuffleOrder = shuffleArray(idxs);
  shuffleIdx = 0;
}

function playVideo(index) {
  currentIndex = index;
  const v = VIDEOS[index];
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

function renderList() {
  playmeList.innerHTML = VIDEOS.map((v, i) => `
    <div class="playme-item${i === currentIndex ? ' active' : ''}" data-index="${i}">
      <div class="playme-thumb">
        <span class="playme-play-icon">▶</span>
      </div>
      <div class="playme-item-info">
        <span class="playme-item-title">${v.title}</span>
        <span class="playme-item-num">Video ${i + 1}</span>
      </div>
    </div>
  `).join('');

  playmeList.querySelectorAll('.playme-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      playVideo(idx);
    });
  });
}

function updateList() {
  playmeList.querySelectorAll('.playme-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.index) === currentIndex);
  });
}

// Float player
function showFloatPlayer() {
  floatVideo.src = mainVideo.src;
  floatVideo.currentTime = mainVideo.currentTime;
  floatVideo.play().catch(() => {});
  floatPlayer.classList.add('show');
  floatVisible = true;
  const v = VIDEOS[currentIndex];
  floatTitle.textContent = v ? v.title : 'PlayMe';
}

function hideFloatPlayer() {
  floatVideo.pause();
  floatVideo.src = '';
  floatPlayer.classList.remove('show');
  floatVisible = false;
}

mainVideo.addEventListener('play', () => {
  showFloatPlayer();
});

mainVideo.addEventListener('timeupdate', () => {
  if (floatVisible && !floatVideo.paused) {
    const diff = Math.abs(floatVideo.currentTime - mainVideo.currentTime);
    if (diff > 2) floatVideo.currentTime = mainVideo.currentTime;
  }
});

mainVideo.addEventListener('ended', () => {
  nextShuffle();
});

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

document.addEventListener('mouseup', () => {
  drag = false;
  floatPlayer.style.transition = '';
});

// Init
buildShuffle();
renderList();
nextShuffle();
