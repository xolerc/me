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

// BG Canvas
(function() {
  const c = document.getElementById('bgCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let w, h, pts;
  function resize() { w = c.width = window.innerWidth; h = c.height = window.innerHeight; }
  function create(n) { return Array.from({length:n}, () => ({x:Math.random()*w, y:Math.random()*h, vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3, r:Math.random()*2+0.5, o:Math.random()*0.2+0.05})); }
  resize(); pts = create(60);
  function draw() {
    ctx.clearRect(0,0,w,h);
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${p.o})`; ctx.fill();
    });
    for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++) {
      const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.sqrt(dx*dx+dy*dy);
      if(d<100) { ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.strokeStyle=`rgba(255,255,255,${0.02*(1-d/100)})`; ctx.stroke(); }
    }
    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', () => { resize(); pts = create(60); });
})();

// Music
(function() {
  const a = document.getElementById('bgMusic'), b = document.getElementById('musicToggle');
  if(!a||!b)return; let p=false;
  b.addEventListener('click',()=>{if(p){a.pause();b.classList.remove('playing')}else{a.play().catch(()=>{});b.classList.add('playing')}p=!p;});
})();

// Online badge auto-update from chat
window.updateOnlineBadge = function(count) {
  const badge = document.getElementById('onlineBadge');
  if (badge) badge.textContent = count || '0';
};

// Theme switch in settings
const themes = {
  dark:  { bg:'#07070a', bg2:'#0a0a0f', card:'#12121a', border:'#2a2a3a', text:'#e0e0e0', text2:'#888', accent:'#00d4aa' },
  light: { bg:'#f5f5f5', bg2:'#fff', card:'#fff', border:'#ddd', text:'#1a1a1a', text2:'#888', accent:'#0891b2' },
  matrix:{ bg:'#000', bg2:'#0a0a0a', card:'#0d0d0d', border:'#0a0a0a', text:'#00ff41', text2:'#00aa2a', accent:'#00ff41' },
  cyber: { bg:'#0a0014', bg2:'#150020', card:'#1a0028', border:'rgba(255,0,255,0.12)', text:'#f0e6ff', text2:'#b088ff', accent:'#ff00ff' },
  neon:  { bg:'#0d0d1a', bg2:'#1a1a2e', card:'#222244', border:'rgba(0,255,255,0.12)', text:'#e0ffff', text2:'#00cccc', accent:'#00ffff' },
  minimal:{ bg:'#000', bg2:'#0a0a0a', card:'#111', border:'rgba(255,255,255,0.06)', text:'#fff', text2:'#555', accent:'#fff' },
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
    b.style.borderColor = active ? '#FFDE02' : 'rgba(255,255,255,0.1)';
    b.style.color = active ? '#FFDE02' : '#fff';
    b.style.background = active ? 'rgba(255,222,2,0.08)' : 'rgba(255,255,255,0.06)';
  });
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.theme-btn.theme-switch');
  if (!btn) return;
  applyTheme(btn.dataset.theme);
});

// Load saved theme
const savedTheme = localStorage.getItem('xolerc_theme') || 'dark';
applyTheme(savedTheme);
