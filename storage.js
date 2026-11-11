// --- Supabase Config ---
// Replace these with your Supabase project values (Dashboard > Settings > API)
const SUPABASE_URL = 'https://jzrpgayeomxdjdddkylp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cnBnYXllb214ZGpkZGRreWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMzAxNzMsImV4cCI6MjEwOTkwNjE3M30.3XqVaBv9A6pzgKYe1Ni9OwcnRxn-5K8po_yiF5AOojQ';

const _supa = (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// --- Keys ---
const DEX_KEY = 'battledex';
const LAST_FIGHT_KEY = 'lastFight';

// --- Auth state ---
let _session = null;

function isAuthenticated() { return !!_session; }
function getUser() { return _session?.user ?? null; }

// --- Synchronous localStorage reads (always available) ---

function loadDex() {
  try { return JSON.parse(localStorage.getItem(DEX_KEY)) || []; }
  catch { return []; }
}

function saveDex(dex) {
  localStorage.setItem(DEX_KEY, JSON.stringify(dex));
}

// --- Supabase sync: fetch remote dex into localStorage cache ---

async function syncDex() {
  if (!isAuthenticated() || !_supa) return;
  const { data, error } = await _supa.from('battledex')
    .select('name, image')
    .order('created_at', { ascending: true });
  if (!error && data) saveDex(data);
}

// --- Write-through operations ---

async function addFighter(name, image) {
  // Fast local dupe check (case-insensitive)
  const dex = loadDex();
  if (dex.some(e => e.name.toLowerCase() === name.toLowerCase())) return false;

  if (isAuthenticated() && _supa) {
    const { error } = await _supa.from('battledex')
      .insert({ user_id: getUser().id, name, image });
    if (error) return false;
    await syncDex();
    return true;
  }
  // localStorage-only
  dex.push({ name, image });
  saveDex(dex);
  return true;
}

async function removeFighter(name) {
  if (isAuthenticated() && _supa) {
    await _supa.from('battledex').delete().eq('name', name);
    await syncDex();
    return;
  }
  const dex = loadDex();
  const idx = dex.findIndex(e => e.name.toLowerCase() === name.toLowerCase());
  if (idx !== -1) { dex.splice(idx, 1); saveDex(dex); }
}

async function clearAllFighters() {
  if (isAuthenticated() && _supa) {
    await _supa.from('battledex').delete().eq('user_id', getUser().id);
    saveDex([]);
    return;
  }
  saveDex([]);
}

// --- First sign-in merge: localStorage -> Supabase ---

async function mergeLocalToRemote() {
  const local = loadDex();
  if (!local.length || !isAuthenticated() || !_supa) return;

  // Get existing remote names to avoid dupes
  const { data: remote } = await _supa.from('battledex')
    .select('name').eq('user_id', getUser().id);
  const remoteNames = new Set((remote || []).map(r => r.name.toLowerCase()));

  const newEntries = local.filter(e => !remoteNames.has(e.name.toLowerCase()));
  if (newEntries.length) {
    await _supa.from('battledex').insert(
      newEntries.map(e => ({ user_id: getUser().id, name: e.name, image: e.image }))
    );
  }
  await syncDex();
}

// --- Auth lifecycle ---

async function initAuth() {
  if (!_supa) return;
  const { data } = await _supa.auth.getSession();
  _session = data.session;
  if (_session) await syncDex();

  _supa.auth.onAuthStateChange(async (event, session) => {
    const wasAuthed = !!_session;
    _session = session;
    if (!wasAuthed && session) {
      await mergeLocalToRemote();
    }
    if (!session && wasAuthed) {
      localStorage.removeItem(DEX_KEY);
    }
    document.dispatchEvent(new CustomEvent('auth-changed', { detail: { session } }));
  });
}

async function signInWithGoogle() {
  if (!_supa) return;
  await _supa.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
}

async function signUpWithEmail(email, password) {
  if (!_supa) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await _supa.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin + '/' },
  });
  if (!error && data.user && !data.session) {
    return { data, needsConfirmation: true };
  }
  return { data, error };
}

async function signInWithEmail(email, password) {
  if (!_supa) return { error: { message: 'Supabase not configured' } };
  return await _supa.auth.signInWithPassword({ email, password });
}

async function signOut() {
  if (!_supa) return;
  await _supa.auth.signOut();
}
