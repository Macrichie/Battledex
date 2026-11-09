const views = document.querySelectorAll('section[id^="view-"]');

function showView(id) {
  views.forEach(v => v.hidden = true);
  document.getElementById(id).hidden = false;
}

// --- Confetti ---

function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#e63946', '#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899'];
  const pieces = [];
  const count = 120;

  for (let i = 0; i < count; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: Math.random() * 8 + 4,
      h: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 4 + 2,
      spin: Math.random() * 0.2 - 0.1,
      angle: Math.random() * Math.PI * 2,
      opacity: 1,
    });
  }

  let frame = 0;
  const maxFrames = 180;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;

    for (const p of pieces) {
      p.x += p.vx;
      p.vy += 0.04;
      p.y += p.vy;
      p.angle += p.spin;
      if (frame > maxFrames - 40) p.opacity = Math.max(0, p.opacity - 0.025);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (frame < maxFrames) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  draw();
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

// --- Loading facts ---

const FIGHT_FACTS = [
  (a, b) => `${a} and ${b} have never faced off... until now.`,
  (a, b) => `Analyzing fight records for ${a} and ${b}...`,
  (a, b) => `Who has the stronger chin? ${a} or ${b}?`,
  (a, b) => `Calculating reach advantage between ${a} and ${b}...`,
  (a, b) => `Both fighters are warming up in the tunnel...`,
  (a, b) => `The crowd is going wild for ${a} vs ${b}!`,
  (a, b) => `Reviewing tape on ${a}... looking dangerous.`,
  (a, b) => `${b} has entered the arena. The pressure is real.`,
  (a, b) => `Tale of the tape: comparing size, speed, and power...`,
  (a, b) => `Judges are taking their seats ringside...`,
  (a, b) => `${a} looks focused. ${b} looks hungry.`,
  (a, b) => `This could be the fight of the century...`,
  (a, b) => `Breaking down peak athletic performance...`,
  (a, b) => `Consulting the fight gods for a verdict...`,
  (a, b) => `The ref is giving final instructions...`,
];

let factInterval = null;

function startFactTicker(f1, f2) {
  const factEl = document.getElementById('loader-fact');
  const used = new Set();

  function showNext() {
    let idx;
    do { idx = Math.floor(Math.random() * FIGHT_FACTS.length); }
    while (used.has(idx) && used.size < FIGHT_FACTS.length);
    used.add(idx);
    if (used.size >= FIGHT_FACTS.length) used.clear();

    factEl.style.animation = 'none';
    factEl.offsetHeight; // trigger reflow
    factEl.style.animation = '';
    factEl.textContent = FIGHT_FACTS[idx](f1, f2);
  }

  showNext();
  factInterval = setInterval(showNext, 3000);
}

function stopFactTicker() {
  if (factInterval) { clearInterval(factInterval); factInterval = null; }
}

document.getElementById('fight-btn').addEventListener('click', async () => {
  const f1 = document.getElementById('fighter1').value.trim();
  const f2 = document.getElementById('fighter2').value.trim();

  if (!f1 || !f2) {
    document.querySelector('.error-icon').textContent = '!';
    document.getElementById('error-message').textContent = 'Hold up! You need two fighters in the ring — fill in both names and let\'s get it on!';
    showView('view-error');
    return;
  }

  // Show result view in loading state
  document.getElementById('result-loading').hidden = false;
  document.getElementById('result-content').hidden = true;

  // Set fighter names in loader
  document.getElementById('loader-name-a').textContent = f1;
  document.getElementById('loader-name-b').textContent = f2;
  startFactTicker(f1, f2);

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
    stopFactTicker();
    document.querySelector('.error-icon').textContent = '!';
    document.getElementById('error-message').textContent = 'The arena lost power! We can\'t reach the fight server — check your connection and step back in.';
    showView('view-error');
    return;
  }

  if (!data.valid) {
    stopFactTicker();
    const errorEl = document.getElementById('error-message');
    const errorIcon = document.querySelector('.error-icon');
    if (data.rateLimited) {
      errorEl.textContent = data.error;
      errorIcon.textContent = '\u23F1';
    } else {
      errorEl.textContent = data.error || 'Something went sideways in the ring! Shake it off and try again.';
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

  stopFactTicker();
  document.getElementById('result-loading').hidden = true;
  document.getElementById('result-content').hidden = false;
  launchConfetti();
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
