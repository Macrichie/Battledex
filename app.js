const views = document.querySelectorAll('section[id^="view-"]');

function showView(id) {
  views.forEach(v => v.hidden = true);
  document.getElementById(id).hidden = false;
}

document.getElementById('fight-btn').addEventListener('click', async () => {
  const f1 = document.getElementById('fighter1').value.trim();
  const f2 = document.getElementById('fighter2').value.trim();

  if (!f1 || !f2) {
    document.getElementById('error-message').textContent = 'Enter two fighters before hitting Fight.';
    showView('view-error');
    return;
  }

  // Show result view in loading state (spinner on, content off)
  document.getElementById('result-loading').hidden = false;
  document.getElementById('result-content').hidden = true;

  // Reset image slots
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

  showView('view-result');

  // Phase 1: get verdict (Claude only — fast)
  let data;
  try {
    const res = await fetch('/api/fight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fighter1: f1, fighter2: f2 }),
    });
    data = await res.json();
  } catch {
    document.getElementById('error-message').textContent = 'Could not reach the server. Try again.';
    showView('view-error');
    return;
  }

  if (!data.valid) {
    document.getElementById('error-message').textContent = data.error || 'Something went wrong. Try again.';
    showView('view-error');
    return;
  }

  // Verdict received — hide spinner, show content
  document.getElementById('result-loading').hidden = true;
  document.getElementById('result-content').hidden = false;

  document.getElementById('name-a').textContent = f1;
  document.getElementById('name-b').textContent = f2;
  document.getElementById('result-winner').textContent = data.winner;
  document.getElementById('result-reasoning').textContent = data.reasoning;

  const f1Wins = data.winner.toLowerCase().includes(f1.toLowerCase()) ||
                 f1.toLowerCase().includes(data.winner.toLowerCase());
  document.getElementById('card-a').classList.toggle('is-winner', f1Wins);
  document.getElementById('card-b').classList.toggle('is-winner', !f1Wins);

  // Phase 2: load both fighter images in parallel (non-blocking)
  async function loadImage(fighterName, imgId, statusId) {
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fighterName }),
      });
      const result = await res.json();
      const imgEl = document.getElementById(imgId);
      const statusEl = document.getElementById(statusId);
      statusEl.classList.remove('is-loading');
      if (result.url) {
        imgEl.src = result.url;
        imgEl.hidden = false;
        statusEl.hidden = true;
      } else {
        statusEl.textContent = result.blocked ? 'Content blocked' : 'Image unavailable';
      }
    } catch {
      const statusEl = document.getElementById(statusId);
      statusEl.classList.remove('is-loading');
      statusEl.textContent = 'Image unavailable';
    }
  }

  loadImage(f1, 'img-a', 'status-a');
  loadImage(f2, 'img-b', 'status-b');
});

document.getElementById('back-btn').addEventListener('click', () => showView('view-input'));
document.getElementById('error-back-btn').addEventListener('click', () => showView('view-input'));
