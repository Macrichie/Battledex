const views = document.querySelectorAll('section[id^="view-"]');

function showView(id) {
  views.forEach(v => v.hidden = true);
  document.getElementById(id).hidden = false;
}

// --- BattleDex storage ---

const DEX_KEY = 'battledex';
const LAST_FIGHT_KEY = 'lastFight';

function loadDex() {
  try { return JSON.parse(localStorage.getItem(DEX_KEY)) || []; }
  catch { return []; }
}

function saveDex(dex) {
  localStorage.setItem(DEX_KEY, JSON.stringify(dex));
}

function getLastFight() {
  try { return JSON.parse(localStorage.getItem(LAST_FIGHT_KEY)); }
  catch { return null; }
}

function saveLastFight(fight) {
  localStorage.setItem(LAST_FIGHT_KEY, JSON.stringify(fight));
}

function updateDexLink() {
  const dex = loadDex();
  const link = document.getElementById('dex-link');
  const count = document.getElementById('dex-count');
  link.hidden = dex.length === 0;
  count.textContent = dex.length;
}

function downsizeImage(imgEl) {
  return new Promise(resolve => {
    const size = 200;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, size, size);
    resolve(canvas.toDataURL('image/jpeg', 0.6));
  });
}

async function saveFighter(name, imgEl) {
  const dex = loadDex();
  if (dex.some(e => e.name.toLowerCase() === name.toLowerCase())) return false;
  const image = await downsizeImage(imgEl);
  dex.push({ name, image });
  saveDex(dex);
  updateDexLink();
  return true;
}

// --- Fight flow ---

function getCachedImage(name) {
  const dex = loadDex();
  const entry = dex.find(e => e.name.toLowerCase() === name.toLowerCase());
  return entry ? entry.image : null;
}

async function fetchImage(fighterName) {
  const cached = getCachedImage(fighterName);
  if (cached) return { url: cached, blocked: false, cached: true };

  try {
    const res = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fighterName }),
    });
    const result = await res.json();
    return { url: result.url, blocked: result.blocked, cached: false };
  } catch {
    return { url: null, blocked: false, cached: false };
  }
}

function preloadIntoImg(imgEl, url) {
  return new Promise(resolve => {
    if (!url) { resolve(false); return; }
    imgEl.onload = () => resolve(true);
    imgEl.onerror = () => resolve(false);
    if (!url.startsWith('data:')) imgEl.crossOrigin = 'anonymous';
    imgEl.src = url;
  });
}

// Populate the result view from a fight object (used by both live fights and last-fight restore)
function showFightResult(fight) {
  const imgElA = document.getElementById('img-a');
  const imgElB = document.getElementById('img-b');
  const statusA = document.getElementById('status-a');
  const statusB = document.getElementById('status-b');

  document.getElementById('name-a').textContent = fight.f1;
  document.getElementById('name-b').textContent = fight.f2;
  document.getElementById('result-winner').textContent = fight.winner;
  document.getElementById('result-reasoning').textContent = fight.reasoning;

  document.getElementById('card-a').classList.toggle('is-winner', fight.f1Wins);
  document.getElementById('card-b').classList.toggle('is-winner', !fight.f1Wins);

  // Images
  [[imgElA, statusA, 'save-a', fight.f1, fight.imgA],
   [imgElB, statusB, 'save-b', fight.f2, fight.imgB]].forEach(([imgEl, statEl, saveId, name, url]) => {
    const saveBtn = document.getElementById(saveId);
    if (url) {
      if (!url.startsWith('data:')) imgEl.crossOrigin = 'anonymous';
      imgEl.src = url;
      imgEl.hidden = false;
      statEl.hidden = true;
      const dex = loadDex();
      if (dex.some(e => e.name.toLowerCase() === name.toLowerCase())) {
        saveBtn.textContent = 'Saved';
        saveBtn.classList.add('is-saved');
      } else {
        saveBtn.textContent = 'Save';
        saveBtn.classList.remove('is-saved');
      }
      saveBtn.hidden = false;
    } else {
      imgEl.hidden = true;
      statEl.textContent = 'Image unavailable';
      statEl.classList.remove('is-loading');
      statEl.hidden = false;
      saveBtn.hidden = true;
    }
  });

  document.getElementById('result-loading').hidden = true;
  document.getElementById('result-content').hidden = false;
  showView('view-result');
}

document.getElementById('fight-btn').addEventListener('click', async () => {
  const f1 = document.getElementById('fighter1').value.trim();
  const f2 = document.getElementById('fighter2').value.trim();

  if (!f1 || !f2) {
    document.querySelector('.error-icon').textContent = '!';
    document.getElementById('error-message').textContent = 'Enter two fighters before hitting Fight.';
    showView('view-error');
    return;
  }

  // Show result view in loading state
  document.getElementById('result-loading').hidden = false;
  document.getElementById('result-content').hidden = true;

  ['img-a', 'img-b'].forEach(id => {
    const el = document.getElementById(id);
    el.src = '';
    el.hidden = true;
  });
  ['status-a', 'status-b'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = 'Generating...';
    el.classList.add('is-loading');
    el.hidden = false;
  });
  ['card-a', 'card-b'].forEach(id => document.getElementById(id).classList.remove('is-winner'));
  ['save-a', 'save-b'].forEach(id => {
    const el = document.getElementById(id);
    el.hidden = true;
    el.textContent = 'Save';
    el.classList.remove('is-saved');
  });

  showView('view-result');

  // Fire verdict + both images in parallel
  const verdictPromise = fetch('/api/fight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fighter1: f1, fighter2: f2 }),
  }).then(r => r.json()).catch(() => null);

  const imgAPromise = fetchImage(f1);
  const imgBPromise = fetchImage(f2);

  const [data, imgA, imgB] = await Promise.all([verdictPromise, imgAPromise, imgBPromise]);

  if (!data) {
    document.querySelector('.error-icon').textContent = '!';
    document.getElementById('error-message').textContent = 'Could not reach the server. Try again.';
    showView('view-error');
    return;
  }

  if (!data.valid) {
    const errorEl = document.getElementById('error-message');
    const errorIcon = document.querySelector('.error-icon');
    if (data.rateLimited) {
      errorEl.textContent = data.error;
      errorIcon.textContent = '\u23F1';
    } else {
      errorEl.textContent = data.error || 'Something went wrong. Try again.';
      errorIcon.textContent = '!';
    }
    showView('view-error');
    return;
  }

  // Preload images before revealing
  const imgElA = document.getElementById('img-a');
  const imgElB = document.getElementById('img-b');
  const statusA = document.getElementById('status-a');
  const statusB = document.getElementById('status-b');

  const [loadedA, loadedB] = await Promise.all([
    preloadIntoImg(imgElA, imgA.url),
    preloadIntoImg(imgElB, imgB.url),
  ]);

  if (loadedA) { imgElA.hidden = false; statusA.hidden = true; }
  else { statusA.classList.remove('is-loading'); statusA.textContent = imgA.blocked ? 'Content blocked' : 'Image unavailable'; }

  if (loadedB) { imgElB.hidden = false; statusB.hidden = true; }
  else { statusB.classList.remove('is-loading'); statusB.textContent = imgB.blocked ? 'Content blocked' : 'Image unavailable'; }

  document.getElementById('name-a').textContent = f1;
  document.getElementById('name-b').textContent = f2;
  document.getElementById('result-winner').textContent = data.winner;
  document.getElementById('result-reasoning').textContent = data.reasoning;

  const f1Wins = data.winner.toLowerCase().includes(f1.toLowerCase()) ||
                 f1.toLowerCase().includes(data.winner.toLowerCase());
  document.getElementById('card-a').classList.toggle('is-winner', f1Wins);
  document.getElementById('card-b').classList.toggle('is-winner', !f1Wins);

  // Show save buttons
  const dex = loadDex();
  [['save-a', f1, loadedA], ['save-b', f2, loadedB]].forEach(([saveId, name, loaded]) => {
    if (!loaded) return;
    const btn = document.getElementById(saveId);
    if (dex.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      btn.textContent = 'Saved';
      btn.classList.add('is-saved');
    }
    btn.hidden = false;
  });

  // Save last fight
  saveLastFight({
    f1, f2,
    winner: data.winner,
    reasoning: data.reasoning,
    f1Wins,
    imgA: imgA.url,
    imgB: imgB.url,
  });

  document.getElementById('result-loading').hidden = true;
  document.getElementById('result-content').hidden = false;
});

// Save button handlers
document.getElementById('save-a').addEventListener('click', async () => {
  const name = document.getElementById('name-a').textContent;
  const imgEl = document.getElementById('img-a');
  const btn = document.getElementById('save-a');
  if (await saveFighter(name, imgEl)) {
    btn.textContent = 'Saved';
    btn.classList.add('is-saved');
  }
});

document.getElementById('save-b').addEventListener('click', async () => {
  const name = document.getElementById('name-b').textContent;
  const imgEl = document.getElementById('img-b');
  const btn = document.getElementById('save-b');
  if (await saveFighter(name, imgEl)) {
    btn.textContent = 'Saved';
    btn.classList.add('is-saved');
  }
});

document.getElementById('back-btn').addEventListener('click', () => {
  updateDexLink();
  showView('view-input');
});
document.getElementById('error-back-btn').addEventListener('click', () => showView('view-input'));

// --- Init ---

updateDexLink();

// Check for ?lastfight=1 param (from BattleDex page)
const params = new URLSearchParams(window.location.search);
if (params.get('lastfight') === '1') {
  const fight = getLastFight();
  if (fight) {
    showFightResult(fight);
  }
  // Clean up URL
  history.replaceState(null, '', '/');
}
