function renderAuthUI() {
  const container = document.getElementById('auth-container');
  if (!container) return;

  if (isAuthenticated()) {
    const user = getUser();
    const avatar = user.user_metadata?.avatar_url || '';
    const name = user.user_metadata?.full_name || user.email || '';
    container.innerHTML =
      '<div class="auth-user">' +
        (avatar ? '<img src="' + avatar + '" class="auth-avatar" alt="">' : '') +
        '<span class="auth-name">' + name + '</span>' +
        '<button class="auth-btn auth-btn-out" id="auth-sign-out">Sign out</button>' +
      '</div>';
    document.getElementById('auth-sign-out').addEventListener('click', () => signOut());
  } else {
    container.innerHTML =
      '<a href="/auth.html" class="auth-btn auth-btn-in">Log in / Sign up</a>';
  }
}

document.addEventListener('auth-changed', () => renderAuthUI());
