const views = document.querySelectorAll('.view');

function showView(id) {
  views.forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// --- Confetti ---

function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#ff3a4c', '#ffd23f', '#2e8bff', '#b56bff', '#22c55e', '#ec4899'];
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

// --- Error display helper ---

function showError(msg, tag, icon, iconSize) {
  document.getElementById('error-icon').textContent = icon || '!';
  document.getElementById('error-icon').style.fontSize = iconSize || '72px';
  document.getElementById('error-tag').textContent = tag || 'Error';
  document.getElementById('error-message').textContent = msg;
  showView('view-error');
}

// Populate the result view from a fight object (used by both live fights and last-fight restore)
function showFightResult(fight) {
  // Health bar names
  document.getElementById('hb-name-a').textContent = fight.f1;
  document.getElementById('hb-name-b').textContent = fight.f2;

  // Health bar fills
  const hbFillA = document.getElementById('hb-fill-a');
  const hbFillB = document.getElementById('hb-fill-b');
  if (fight.f1Wins) {
    hbFillA.className = 'health-bar-fill-winner';
    hbFillB.className = 'health-bar-fill-loser';
    document.getElementById('hb-name-a').className = 'health-bar-name health-bar-name-winner';
    document.getElementById('hb-name-b').className = 'health-bar-name health-bar-name-loser';
  } else {
    hbFillA.className = 'health-bar-fill-loser';
    hbFillB.className = 'health-bar-fill-winner';
    document.getElementById('hb-name-a').className = 'health-bar-name health-bar-name-loser';
    document.getElementById('hb-name-b').className = 'health-bar-name health-bar-name-winner';
  }

  // Winner and loser names
  const winnerName = fight.f1Wins ? fight.f1 : fight.f2;
  const loserName = fight.f1Wins ? fight.f2 : fight.f1;
  const winnerImgUrl = fight.f1Wins ? fight.imgA : fight.imgB;
  const loserImgUrl = fight.f1Wins ? fight.imgB : fight.imgA;

  document.getElementById('name-winner').textContent = winnerName;
  document.getElementById('name-loser').textContent = loserName;
  document.getElementById('result-winner').textContent = winnerName;
  document.getElementById('result-reasoning').textContent = fight.reasoning;

  // Images
  [[document.getElementById('img-winner'), document.getElementById('status-winner'), 'save-winner', winnerName, winnerImgUrl],
   [document.getElementById('img-loser'), document.getElementById('status-loser'), 'save-loser', loserName, loserImgUrl]].forEach(([imgEl, statEl, saveId, name, url]) => {
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
      statEl.hidden = false;
      saveBtn.hidden = true;
    }
  });

  showView('view-result');
  launchConfetti();
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
    showError(
      'Hold up! You need two fighters in the ring — fill in both names and let\'s get it on!',
      'Missing fighter', '!', '72px'
    );
    return;
  }

  // Show loading view
  document.getElementById('loader-name-a').textContent = f1;
  document.getElementById('loader-name-b').textContent = f2;
  startFactTicker(f1, f2);
  showView('view-loading');

  // Fire verdict + both images in parallel
  const verdictPromise = fetch('/api/fight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fighter1: f1, fighter2: f2 }),
  }).then(r => r.json()).catch(() => null);

  const imgAPromise = fetchImage(f1);
  const imgBPromise = fetchImage(f2);

  const [data, imgA, imgB] = await Promise.all([verdictPromise, imgAPromise, imgBPromise]);

  stopFactTicker();

  if (!data) {
    showError(
      'The arena lost power! We can\'t reach the fight server — check your connection and step back in.',
      'Power out', '!', '72px'
    );
    return;
  }

  if (!data.valid) {
    if (data.rateLimited) {
      showError(data.error, 'Cooldown', '\u23F1', '52px');
    } else {
      showError(
        data.error || 'Something went sideways in the ring! Shake it off and try again.',
        'Failed weigh-in', '!', '72px'
      );
    }
    return;
  }

  const f1Wins = data.winner.toLowerCase().includes(f1.toLowerCase()) ||
                 f1.toLowerCase().includes(data.winner.toLowerCase());

  // Preload images into result view elements
  const winnerName = f1Wins ? f1 : f2;
  const loserName = f1Wins ? f2 : f1;
  const winnerImg = f1Wins ? imgA : imgB;
  const loserImg = f1Wins ? imgB : imgA;

  const imgWinnerEl = document.getElementById('img-winner');
  const imgLoserEl = document.getElementById('img-loser');
  const statusWinner = document.getElementById('status-winner');
  const statusLoser = document.getElementById('status-loser');

  // Reset states
  imgWinnerEl.hidden = true; imgLoserEl.hidden = true;
  statusWinner.hidden = false; statusLoser.hidden = false;
  statusWinner.textContent = 'Loading...'; statusLoser.textContent = 'Loading...';
  document.getElementById('save-winner').hidden = true;
  document.getElementById('save-loser').hidden = true;

  const [loadedW, loadedL] = await Promise.all([
    preloadIntoImg(imgWinnerEl, winnerImg.url),
    preloadIntoImg(imgLoserEl, loserImg.url),
  ]);

  // Save last fight
  saveLastFight({
    f1, f2,
    winner: data.winner,
    reasoning: data.reasoning,
    f1Wins,
    imgA: imgA.url,
    imgB: imgB.url,
  });

  showFightResult({
    f1, f2,
    winner: data.winner,
    reasoning: data.reasoning,
    f1Wins,
    imgA: imgA.url,
    imgB: imgB.url,
  });
});

// Save button handlers
document.getElementById('save-winner').addEventListener('click', async () => {
  const name = document.getElementById('name-winner').textContent;
  const imgEl = document.getElementById('img-winner');
  const btn = document.getElementById('save-winner');
  if (await saveFighter(name, imgEl)) {
    btn.textContent = 'Saved';
    btn.classList.add('is-saved');
  }
});

document.getElementById('save-loser').addEventListener('click', async () => {
  const name = document.getElementById('name-loser').textContent;
  const imgEl = document.getElementById('img-loser');
  const btn = document.getElementById('save-loser');
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
  history.replaceState(null, '', '/');
}
