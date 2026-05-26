(async function loadRepos() {
  const grid = document.getElementById('projectsGrid');
  const loading = document.getElementById('projectsLoading');
  if (!grid) return;

  try {
    const res = await fetch('https://api.github.com/users/xolerc/repos?sort=updated&per_page=100');
    if (!res.ok) throw new Error('GitHub API error');
    let repos = await res.json();

    loading.style.display = 'none';

    if (!repos.length) {
      grid.innerHTML = '<p style="color:#888;text-align:center;grid-column:1/-1">Hozircha loyihalar mavjud emas.</p>';
      return;
    }

    grid.innerHTML = repos.map(r => {
      const lang = r.language || '';
      const desc = r.description || 'Tavsif mavjud emas';
      const stars = r.stargazers_count || 0;

      const homepage = r.homepage || '';

      return `
        <div class="project-card">
          <div class="project-name">${escapeHtml(r.name)}</div>
          <div class="project-desc">${escapeHtml(desc)}</div>
          ${lang ? `<div class="project-lang">${escapeHtml(lang)}</div>` : ''}
          <div class="project-stars">&#9733; ${stars}</div>
          <div class="project-links">
            <a href="${r.html_url}" target="_blank" class="project-link">GITHUB</a>
            ${homepage ? `<a href="${homepage}" target="_blank" class="project-link">SAYT</a>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    loading.textContent = 'Yuklashda xatolik. Qayta urinib ko\'ring.';
  }
})();
