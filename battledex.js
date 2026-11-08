const DEX_KEY = 'battledex';
const LAST_FIGHT_KEY = 'lastFight';

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
  document.getElementById('dex-clear-all').hidden = dex.length === 0;
  subtitle.textContent = dex.length > 0
    ? `${dex.length} fighter${dex.length !== 1 ? 's' : ''} saved`
    : 'Your saved fighters';

  dex.forEach((entry, i) => {
    const div = document.createElement('div');
    div.className = 'dex-entry';
    div.innerHTML = `
      <img src="${entry.image}" alt="${entry.name}">
      <span class="dex-entry-name">${entry.name}</span>
      <button class="dex-remove" data-index="${i}">&times;</button>
    `;
    gallery.appendChild(div);
  });
}

// Remove entry
document.getElementById('dex-gallery').addEventListener('click', (e) => {
  const btn = e.target.closest('.dex-remove');
  if (!btn) return;
  const dex = loadDex();
  dex.splice(Number(btn.dataset.index), 1);
  saveDex(dex);
  renderDex();
});

// Last Fight button — navigate to index with param to restore last fight
const lastFightBtn = document.getElementById('dex-last-fight');
try {
  const lastFight = JSON.parse(localStorage.getItem(LAST_FIGHT_KEY));
  if (lastFight) lastFightBtn.hidden = false;
} catch {}

lastFightBtn.addEventListener('click', () => {
  window.location.href = '/?lastfight=1';
});

// Clear All button
const clearBtn = document.getElementById('dex-clear-all');
clearBtn.addEventListener('click', () => {
  if (!confirm('Remove all saved fighters?')) return;
  saveDex([]);
  renderDex();
});

renderDex();
