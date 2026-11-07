const views = document.querySelectorAll('section[id^="view-"]');

function showView(id) {
  views.forEach(v => v.hidden = true);
  document.getElementById(id).hidden = false;
}

document.getElementById('fight-btn').addEventListener('click', () => {
  const f1 = document.getElementById('fighter1').value.trim();
  const f2 = document.getElementById('fighter2').value.trim();
  if (!f1 || !f2) {
    document.getElementById('error-message').textContent = 'Enter two fighters before hitting Fight.';
    showView('view-error');
    return;
  }
  // Stage 2 will add the real fight logic here
  showView('view-loading');
});

document.getElementById('back-btn').addEventListener('click', () => {
  showView('view-input');
});

document.getElementById('error-back-btn').addEventListener('click', () => {
  showView('view-input');
});
