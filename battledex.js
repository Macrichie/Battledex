const DEX_KEY = 'battledex';
const LAST_FIGHT_KEY = 'lastFight';
const COLORS = ['#ff3a4c', '#2e8bff', '#ffd23f', '#b56bff'];

function loadDex() {
  try { return JSON.parse(localStorage.getItem(DEX_KEY)) || []; }
  catch { return []; }
}

function saveDex(dex) {
  localStorage.setItem(DEX_KEY, JSON.stringify(dex));
}

function renderDex() {
  const dex = loadDex();
  const gallery = document.getElementById('dex-gallery');
  const empty = document.getElementById('dex-empty');
  const subtitle = document.getElementById('dex-subtitle');

  gallery.innerHTML = '';
  empty.hidden = dex.length > 0;
  gallery.hidden = dex.length === 0;
  document.getElementById('dex-clear-all').hidden = dex.length === 0;
  subtitle.textContent = dex.length > 0
    ? `${dex.length} fighter${dex.length !== 1 ? 's' : ''} saved`
    : 'Your saved fighters';

  dex.forEach((entry, i) => {
    const color = COLORS[i % COLORS.length];
    const num = '#' + String(i + 1).padStart(3, '0');
    const div = document.createElement('div');
    div.className = 'dex-card';
    div.style.background = color;
    div.innerHTML = `
      <div class="dex-card-header">
        <span class="dex-card-num">${num}</span>
        <button class="dex-card-remove" data-index="${i}">&times;</button>
      </div>
      <div class="dex-card-img">
        <img src="${entry.image}" alt="${entry.name}">
      </div>
      <div class="dex-card-name">${entry.name}</div>
    `;
    gallery.appendChild(div);
  });
}

// Remove entry
document.getElementById('dex-gallery').addEventListener('click', (e) => {
  const btn = e.target.closest('.dex-card-remove');
  if (!btn) return;
  const dex = loadDex();
  dex.splice(Number(btn.dataset.index), 1);
  saveDex(dex);
  renderDex();
});

// Last Fight button
const lastFightBtn = document.getElementById('dex-last-fight');
try {
  const lastFight = JSON.parse(localStorage.getItem(LAST_FIGHT_KEY));
  if (lastFight) lastFightBtn.hidden = false;
} catch {}

lastFightBtn.addEventListener('click', () => {
  window.location.href = '/?lastfight=1';
});

// Clear All button — custom modal
const clearBtn = document.getElementById('dex-clear-all');
const clearModal = document.getElementById('clear-modal');

clearBtn.addEventListener('click', () => { clearModal.hidden = false; });

document.getElementById('clear-confirm').addEventListener('click', () => {
  clearModal.hidden = true;
  saveDex([]);
  renderDex();
});

document.getElementById('clear-cancel').addEventListener('click', () => {
  clearModal.hidden = true;
});

clearModal.addEventListener('click', (e) => {
  if (e.target === clearModal) clearModal.hidden = true;
});

renderDex();
