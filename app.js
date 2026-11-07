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

  showView('view-loading');

  try {
    const res = await fetch('/api/fight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fighter1: f1, fighter2: f2 }),
    });
    const data = await res.json();

    if (!data.valid) {
      document.getElementById('error-message').textContent = data.error || 'Something went wrong. Try again.';
      showView('view-error');
      return;
    }

    document.getElementById('result-winner').textContent = data.winner;
    document.getElementById('result-reasoning').textContent = data.reasoning;
    showView('view-result');
  } catch (err) {
    document.getElementById('error-message').textContent = 'Something went wrong. Try again.';
    showView('view-error');
  }
});

document.getElementById('back-btn').addEventListener('click', () => {
  showView('view-input');
});

document.getElementById('error-back-btn').addEventListener('click', () => {
  showView('view-input');
});
