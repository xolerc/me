// ===== MOTIVATSION BILDIRISHNOMALAR =====
const MOTIVATION_QUOTES = [
  "Uyg'on, Xoleric...",
  "Tizim seni kutmoqda...",
  "Oq quyonni kuzatib bor.",
  "Sen dunyoni o'zgartirishing kerak!",
  "Vaqt tugadi. Uyg'on.",
  "Sen tanlagan yo'l — sening yo'ling.",
  "Har bir kun yangi imkoniyat.",
  "Bugun o'zgarishni boshlash uchun eng yaxshi kun.",
  "Sen cheksiz imkoniyatlarga egasan.",
  "Orzularing sari bir qadam tashla.",
  "Muvaffaqiyat - bu odat.",
  "Kuch sening ichingda, Xoleric.",
  "Tush kutmaydi, sen uni quvishing kerak.",
  "Hech qachon kech emas.",
  "Imkoniyatlar cheksiz.",
  "Bugun sen eng yaxshi versiyang bo'l.",
  "Har bir qiyinchilik yangi imkoniyatdir.",
  "Sen o'ylagandan ham kuchlisan, Xoleric.",
  "Intizom - bu erkinlik.",
  "Harakat qil, xato qil, yana urinib ko'r.",
  "Eng katta xavf - hech qanday xavfni olmaslik.",
  "Vaqt keldi. Hozir. Aynan shu dam.",
  "Uyg'on va dunyoni larzaga keltir!",
  "Kodni o'zgartir, olamni o'zgartir.",
  "Real hayot - bu sen yaratgan hayot.",
  "Chegaralar faqat boshingda.",
  "O'z taqdiringni o'zing yoz, Xoleric.",
  "Sen qul emassan, Xoleric.",
  "Tizim sening ichingda. Uyg'on.",
  "Haqiqatni ko'rishga tayyormisan?",
  "Erkin bo'lishni xohlaysanmi? Uyg'on.",
  "Hech kim senga yo'lni ko'rsata olmaydi. O'zing yur.",
  "Tanlov — bu illyuziya. Faqat uyg'onish haqiqat.",
  "Bugun o'zgar. Ertaga kech bo'ladi.",
  "Sen o'zingni bilganingdan ham kuchlisan.",
  "Qo'rquv — bu tizim. Uzgina tizimni.",
  "Uyg'on, Xoleric. Seni kutishayapti.",
  "Dunyoni o'zgartirishga tayyormisan?",
  "Hozirgi vaqt — eng yaxshi vaqt.",
  "Sen yetakchisan. Ergashma.",
  "Kodni buz. Dunyoni buz. Qayta yoz.",
  "Bir qadam. Faqat bir qadam. Bas.",
  "Uyg'onish vaqti keldi, Xoleric.",
];

(function() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    scheduleMotivation();
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') scheduleMotivation();
    });
  }
})();

function scheduleMotivation() {
  function sendMotivation() {
    if (Notification.permission !== 'granted') return;
    const quote = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
    try {
      new Notification('XOLERIC ∞', {
        body: quote,
        icon: 'icon.png',
        vibrate: [200, 100, 200],
      });
    } catch {}
  }
  sendMotivation();
  setInterval(sendMotivation, 5 * 60 * 60 * 1000); // 5 soat
}

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('copy', e => e.preventDefault());
document.addEventListener('cut', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && ['c','C','x','X','s','S','p','P','u','U'].includes(e.key)) e.preventDefault();
  if (e.key === 'PrintScreen' || e.key === 'F12') e.preventDefault();
});

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(d => d.classList.toggle('active', d.id === 'tab-' + name));
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

window.addEventListener('load', () => {
  const hash = location.hash.replace('#', '');
  if (hash && document.getElementById('tab-' + hash)) switchTab(hash);
});

// Wave Canvas
(function() {
  const canvas = document.getElementById('wave-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, t = 0;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resize);
  resize();

  function draw() {
    ctx.clearRect(0, 0, W, H);

    const waves = [
      { a: 20, f: 0.007, s: 0.04, c: 'rgba(99,102,241,0.07)', oy: 0.28 },
      { a: 26, f: 0.011, s: 0.06, c: 'rgba(99,102,241,0.05)', oy: 0.42 },
      { a: 16, f: 0.005, s: 0.03, c: 'rgba(139,92,246,0.06)', oy: 0.52 },
      { a: 22, f: 0.009, s: 0.04, c: 'rgba(3,3,197,0.05)', oy: 0.35 },
    ];

    waves.forEach(function(w) {
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 2) {
        const y = H * w.oy
          + Math.sin(x * w.f + t * w.s) * w.a
          + Math.sin(x * w.f * 2.5 + t * w.s * 1.4) * (w.a * 0.35);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = w.c;
      ctx.fill();
    });

    t += 1;
    requestAnimationFrame(draw);
  }

  draw();
})();

// Music
(function() {
  const a = document.getElementById('bgMusic'), b = document.getElementById('musicToggle');
  if (!a || !b) return;
  let p = false;
  b.addEventListener('click', () => {
    if (p) { a.pause(); b.classList.remove('playing'); }
    else { a.play().catch(() => {}); b.classList.add('playing'); }
    p = !p;
  });
})();

// Online badge auto-update from chat
window.updateOnlineBadge = function(count) {
  const badge = document.getElementById('onlineBadge');
  if (badge) badge.textContent = count || '0';
};

// Theme switch
const themes = {
  dark:   { bg:'#000', bg2:'#0a0a0f', card:'#12121a', border:'rgba(255,255,255,0.04)', text:'#fff', text2:'rgba(255,255,255,0.5)', accent:'#818cf8' },
  light:  { bg:'#f5f5f5', bg2:'#fff', card:'#fff', border:'rgba(0,0,0,0.08)', text:'#1a1a1a', text2:'#888', accent:'#6366f1' },
  matrix: { bg:'#000', bg2:'#0a0a0a', card:'#0d0d0d', border:'rgba(0,255,65,0.08)', text:'#00ff41', text2:'#00aa2a', accent:'#00ff41' },
  cyber:  { bg:'#0a0014', bg2:'#150020', card:'#1a0028', border:'rgba(255,0,255,0.08)', text:'#f0e6ff', text2:'#b088ff', accent:'#ff00ff' },
  neon:   { bg:'#0d0d1a', bg2:'#1a1a2e', card:'#222244', border:'rgba(0,255,255,0.08)', text:'#e0ffff', text2:'#00cccc', accent:'#00ffff' },
  minimal:{ bg:'#000', bg2:'#0a0a0a', card:'#111', border:'rgba(255,255,255,0.04)', text:'#fff', text2:'#555', accent:'#fff' },
};

function applyTheme(name) {
  const t = themes[name] || themes.dark;
  const r = document.documentElement;
  Object.entries(t).forEach(([k, v]) => r.style.setProperty(`--${k}`, v));
  document.body.style.background = t.bg;
  document.body.style.color = t.text;
  localStorage.setItem('xolerc_theme', name);
  document.querySelectorAll('.theme-btn').forEach(b => {
    const active = b.dataset.theme === name;
    b.classList.toggle('active', active);
  });
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.theme-btn');
  if (!btn) return;
  applyTheme(btn.dataset.theme);
});

const savedTheme = localStorage.getItem('xolerc_theme') || 'dark';
applyTheme(savedTheme);
