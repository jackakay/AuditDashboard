// ─── Auth ─────────────────────────────────────────────────────────────────────

async function doLogin() {
  const username = document.getElementById('usr').value.trim();
  const password = document.getElementById('pwd').value;
  const btn      = document.getElementById('login-btn');
  const err      = document.getElementById('login-error');

  if (!username || !password) {
    err.textContent = 'Please enter your email and password.';
    return;
  }

  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span>Signing in...';
  err.textContent = '';

  try {
    const res  = await local('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Login failed');
    sessionStorage.setItem('bearer', data.bearer);
    showDashboard();
  } catch (e) {
    err.textContent = e.message;
  } finally {
    btn.disabled  = false;
    btn.innerHTML = 'Sign in';
  }
}

function doLogout() {
  sessionStorage.removeItem('bearer');
  auditCache  = [];
  payslipData = null;

  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard-screen').style.display = 'none';
  document.getElementById('usr').value = '';
  document.getElementById('pwd').value = '';
  document.getElementById('stat-pending').textContent  = '-';
  document.getElementById('stat-holiday').textContent  = '-';
  document.getElementById('stat-count').textContent    = '-';
  document.getElementById('audit-tbody').innerHTML     =
    '<tr><td colspan="4" class="table-empty">Loading...</td></tr>';
  document.getElementById('route-links').innerHTML     =
    '<div class="route-empty">Select a method and generate a route.</div>';

  navigate('home');
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  const dash = document.getElementById('dashboard-screen');
  dash.style.display        = 'flex';
  dash.style.flexDirection  = 'column';
  loadName();
  loadHomeData();
}

async function loadName() {
  try {
    const res  = await sl('/api/v1/auditors/me');
    const data = await res.json();
    document.getElementById('topbar-name').textContent = data.preferred_name || '';
  } catch (_) {}
}