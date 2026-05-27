const VIDEOS_PATH = 'https://xolerc.github.io/me/videos';

const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

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

const video = document.getElementById('playmeVideo');
const list = document.getElementById('playmeList');
const playBtn = document.getElementById('playmePlayBtn');
const prevBtn = document.getElementById('playmePrevBtn');
const nextBtn = document.getElementById('playmeNextBtn');
const currentEl = document.getElementById('playmeCurrent');
const durEl = document.getElementById('playmeDuration');
const progressEl = document.getElementById('playmeProgressFill');
const progressWrap = document.getElementById('playmeProgress');
const volumeEl = document.getElementById('playmeVolume');
const volumeIcon = document.getElementById('playmeVolumeIcon');

let currentIndex = 0;
let progressDragging = false;

function formatTime(s) {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

function playVideo(index) {
  if (index < 0 || index >= DEFAULT_VIDEOS.length) return;
  currentIndex = index;
  video.src = DEFAULT_VIDEOS[index].file;
  video.play().catch(() => {});
  renderList();
}

function renderList() {
  list.innerHTML = DEFAULT_VIDEOS.map((v, i) => `
    <div class="playme-item${i === currentIndex ? ' active' : ''}" data-index="${i}">
      <div class="playme-item-thumb">
        <span class="playme-item-num">${String(i + 1).padStart(2, '0')}</span>
      </div>
      <div class="playme-item-body">
        <span class="playme-item-title">${v.title}</span>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.playme-item').forEach(item => {
    item.addEventListener('click', () => playVideo(parseInt(item.dataset.index)));
  });
}

playBtn.addEventListener('click', () => {
  if (video.paused) video.play().catch(() => {});
  else video.pause();
});

prevBtn.addEventListener('click', () => {
  if (video.currentTime > 3) { video.currentTime = 0; return; }
  playVideo(currentIndex - 1 >= 0 ? currentIndex - 1 : DEFAULT_VIDEOS.length - 1);
});

nextBtn.addEventListener('click', () => {
  playVideo((currentIndex + 1) % DEFAULT_VIDEOS.length);
});

video.addEventListener('play', () => { playBtn.textContent = '⏸'; });
video.addEventListener('pause', () => { playBtn.textContent = '▶'; });
video.addEventListener('ended', () => { playVideo((currentIndex + 1) % DEFAULT_VIDEOS.length); });

video.addEventListener('timeupdate', () => {
  currentEl.textContent = formatTime(video.currentTime);
  durEl.textContent = formatTime(video.duration);
  const pct = video.duration ? (video.currentTime / video.duration * 100) : 0;
  progressEl.style.width = pct + '%';
});

video.addEventListener('loadedmetadata', () => {
  durEl.textContent = formatTime(video.duration);
});

progressWrap.addEventListener('mousedown', e => {
  progressDragging = true;
  seekProgress(e);
});
document.addEventListener('mousemove', e => {
  if (progressDragging) seekProgress(e);
});
document.addEventListener('mouseup', () => { progressDragging = false; });
progressWrap.addEventListener('touchstart', e => {
  progressDragging = true;
  seekProgress(e.touches[0]);
});
document.addEventListener('touchmove', e => {
  if (progressDragging) seekProgress(e.touches[0]);
});
document.addEventListener('touchend', () => { progressDragging = false; });

function seekProgress(e) {
  const rect = progressWrap.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  video.currentTime = pct * video.duration;
}

volumeEl.addEventListener('input', () => {
  video.volume = parseFloat(volumeEl.value);
  volumeIcon.textContent = video.volume === 0 ? '🔇' : video.volume < 0.5 ? '🔉' : '🔊';
});

volumeIcon.addEventListener('click', () => {
  if (video.volume > 0) {
    video.dataset.prevVolume = video.volume;
    video.volume = 0;
    volumeEl.value = 0;
  } else {
    const prev = parseFloat(video.dataset.prevVolume) || 0.5;
    video.volume = prev;
    volumeEl.value = prev;
  }
  volumeIcon.textContent = video.volume === 0 ? '🔇' : video.volume < 0.5 ? '🔉' : '🔊';
});

video.addEventListener('error', () => {
  const err = video.error;
  if (err?.code === 3) {
    playBtn.textContent = '⚠';
  }
});

renderList();
playVideo(0);
