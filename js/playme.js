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

const bgVideo = document.getElementById('bgVideo');
const toggleBtn = document.getElementById('bgVideoToggle');
const nextBtn = document.getElementById('bgVideoNext');
const library = document.getElementById('playmeLibrary');

let currentIndex = 0;
let isMuted = true;
let playOrder = [];
let playIdx = 0;

function shuffleArray(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function buildPlayOrder() {
  playOrder = shuffleArray(DEFAULT_VIDEOS.map((_, i) => i));
  playIdx = 0;
}

function playVideo(index) {
  const v = DEFAULT_VIDEOS[index];
  if (!v) return;
  currentIndex = index;
  bgVideo.src = v.file;
  bgVideo.play().catch(() => {});
  library.querySelectorAll('.bg-vid-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.idx) === index);
  });
}

bgVideo.addEventListener('ended', () => {
  playIdx++;
  if (playIdx >= playOrder.length) buildPlayOrder();
  playVideo(playOrder[playIdx]);
});

bgVideo.addEventListener('error', () => {
  playIdx++;
  if (playIdx >= playOrder.length) buildPlayOrder();
  playVideo(playOrder[playIdx]);
});

toggleBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  bgVideo.muted = isMuted;
  toggleBtn.textContent = isMuted ? '🔇' : '🔊';
});

nextBtn.addEventListener('click', () => {
  playIdx++;
  if (playIdx >= playOrder.length) buildPlayOrder();
  playVideo(playOrder[playIdx]);
});

function renderLibrary() {
  library.innerHTML = DEFAULT_VIDEOS.map((v, i) => `
    <button class="bg-vid-item${i === currentIndex ? ' active' : ''}" data-idx="${i}">
      <span class="bg-vid-item-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="bg-vid-item-title">${v.title}</span>
    </button>
  `).join('');
  library.querySelectorAll('.bg-vid-item').forEach(btn => {
    btn.addEventListener('click', () => playVideo(parseInt(btn.dataset.idx)));
  });
}

buildPlayOrder();
renderLibrary();
playVideo(playOrder[0]);
