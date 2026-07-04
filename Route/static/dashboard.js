let selectedRoute = 'brute';
let auditCache = [];
let completedCache = [];
let payslipData = null;
let responseSearchRows = [];
let responseById = new Map();

async function getApprovedAuditData() {
  if (payslipData) return payslipData;

  const res = await sl('/api/v3/audits?limit=200&status=approved,approving_query,submitted,client_query');
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const numPages = data.pages;
  const items = data.items || [];

  for (let i = 2; i <= numPages; i++) {
    const r = await sl('/api/v3/audits?limit=200&status=approved,approving_query,submitted,client_query&page=' + i);
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    items.push(...(d.items || []));
  }
  completedCache = items;
  payslipData = items;
  buildResponseIndexes(items);

  return payslipData;
}

function navigate(page) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if (page === 'payslips') loadPayslips();
    if (page === 'notes') loadNotes();
    if (page === 'view-responses') loadViewResponses();
  }

  async function doLogin() {
    const username = document.getElementById('usr').value.trim();
    const password = document.getElementById('pwd').value;
    const btn = document.getElementById('login-btn');
    const err = document.getElementById('login-error');
    if (!username || !password) { err.textContent = 'Please enter your email and password.'; return; }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Signing in...';
    err.textContent = '';
    try {
      const res = await local('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Login failed');
      sessionStorage.setItem('bearer', data.bearer);   // data.bearer as confirmed
      showDashboard();
    } catch (e) {
      err.textContent = e.message;
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Sign in';
    }
  }

  function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    const dash = document.getElementById('dashboard-screen');
    dash.style.display = 'flex';
    dash.style.flexDirection = 'column';
    loadName();
    loadHomeData();
  }

  async function loadName() {
    try {
      const res = await sl('/api/v1/auditors/me');
      const data = await res.json();
      document.getElementById('topbar-name').textContent = data.preferred_name || '';
    } catch (_) {}
  }

  async function loadHomeData() {
    const tbody = document.getElementById('audit-tbody');
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Loading...</td></tr>';
    try {
      const res = await sl('/api/v3/audits?limit=200&status=assigned');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const numPages = data.pages;
      auditCache = data.items || [];

      for (let i = 2; i <= numPages; i++) {
        const r = await sl('/api/v3/audits?limit=200&status=assigned&page=' + i);
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        auditCache.push(...(d.items || []));
      }
      const rawPay = auditCache.reduce((s, a) => s + (a.auditor_pay_per_audit || 0), 0);

      document.getElementById('stat-count').textContent   = auditCache.length;
      document.getElementById('stat-pending').textContent = '\u00a3' + rawPay.toFixed(2);
      document.getElementById('stat-holiday').textContent = '\u00a3' + (rawPay * HOLIDAY_RATE).toFixed(2);

      if (auditCache.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No audits currently assigned.</td></tr>';
        return;
      }

      tbody.innerHTML = auditCache.map((a, i) => {
        const deadline    = new Date(a.deadline_date);
        const daysLeft    = Math.ceil((deadline - Date.now()) / 86400000);
        const urgency     = daysLeft <= 2 ? 'urgent' : daysLeft <= 5 ? 'warn' : '';
        const deadlineStr = deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return `
          <tr>
            <td data-label="Audit">
              <div class="tbl-primary">${a.site_name}</div>
              <div class="tbl-secondary">${a.site_post_code} \u00b7 ${a.client_name}</div>
            </td>
            <td data-label="Deadline">
              <span class="deadline-badge ${urgency}">${deadlineStr}</span>
              <span class="days-left ${urgency}">${daysLeft}d left</span>
            </td>
            <td data-label="Pay" class="pay-cell">\u00a3${Number(a.auditor_pay_per_audit * HOLIDAY_RATE || 0).toFixed(2)}</td>
            <td><button class="info-btn" onclick="showAuditDetail(${i})">Details</button></td>
          </tr>
        `;
      }).join('');

    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Could not load audits.</td></tr>';
      document.getElementById('home-error').textContent = e.message;
    }
  }

  function showAuditDetail(i) {
    const a = auditCache[i];
    if (!a) return;
    const deadline    = new Date(a.deadline_date);
    const daysLeft    = Math.ceil((deadline - Date.now()) / 86400000);
    const urgency     = daysLeft <= 2 ? 'red' : daysLeft <= 5 ? 'amber' : '';
    const deadlineStr = deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const startStr    = new Date(a.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const endStr      = new Date(a.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('modal-title').textContent    = a.site_name;
    document.getElementById('modal-subtitle').textContent = a.internal_id + ' \u00b7 ' + a.client_name;
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-field">
        <div class="modal-field-label">Post code</div>
        <div class="modal-field-value">${a.site_post_code}</div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">Visit type</div>
        <div class="modal-field-value">${a.item_to_order}</div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">Base pay</div>
        <div class="modal-field-value mono green">\u00a3${Number(a.auditor_pay_per_audit).toFixed(2)}</div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">Inc. holiday pay</div>
        <div class="modal-field-value mono green">\u00a3${(a.auditor_pay_per_audit * HOLIDAY_RATE).toFixed(2)}</div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">Deadline</div>
        <div class="modal-field-value ${urgency}">${deadlineStr} (${daysLeft}d left)</div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">Order window</div>
        <div class="modal-field-value">${startStr} - ${endStr}</div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">Order ID</div>
        <div class="modal-field-value mono">${a.order_internal_id}</div>
      </div>
      <div class="modal-field">
        <div class="modal-field-label">Schedule</div>
        <div class="modal-field-value">${a.order_schedule_type.replace(/_/g, ' ')}</div>
      </div>
      <div class="modal-field full">
        <div class="modal-field-label">Expenses</div>
        <div class="expenses-text">${(a.estimated_expenses || 'None').trim()}</div>
      </div>
    `;
    document.getElementById('modal-backdrop').classList.add('open');
  }

  function closeModal(e) { if (e.target === document.getElementById('modal-backdrop')) closeModalDirect(); }
  function closeModalDirect() { document.getElementById('modal-backdrop').classList.remove('open'); }

  async function loadPayslips() {
    const list = document.getElementById('payslip-list');
    list.innerHTML = '<div style="font-size:13px;color:var(--nord3)">Loading...</div>';

    try {
      const items = await getApprovedAuditData();
      renderPayslips(items);
    } catch (e) {
      list.innerHTML = '<div style="font-size:13px;color:var(--nord3)">Could not load payslips.</div>';
      document.getElementById('payslips-error').textContent = e.message;
    }
  }

  async function renderPayslips(items) {
    const list = document.getElementById('payslip-list');
  
    list.innerHTML = '<div style="font-size:13px;color:var(--nord3)">Loading...</div>';
    try{
    const total            = items.reduce((s, a) => s + (Number(a.total_pay) || 0), 0);
    const mileage          = items.reduce((s, a) => s + (Number(a.mileage) || 0), 0);
    const reclaimableRaw   = items.reduce((s, a) => {
      const fields = ['reclaimable_expenses', 'reclaimable_expenses_2', 'reclaimable_expenses_3', 'reclaimable_expenses_4'];
      return s + fields.reduce((s2, k) => s2 + (Number(a[k]) || 0), 0);
    }, 0);
    //const totalWithHoliday  = total * HOLIDAY_RATE;
    const totalWithExpenses = total + reclaimableRaw + (mileage * MILEAGE);

    // generate biweekly periods from first cutoff
    const periods = [];
    let cutoff  = new Date('2026-01-05T00:00:00Z');
    let payDate = new Date('2026-01-14T00:00:00Z');
    const today = new Date();

    while (cutoff <= today) {
      const periodStart = new Date(cutoff.getTime() - 14 * 86400000);
      periods.push({ periodStart, periodEnd: new Date(cutoff), payDate: new Date(payDate), audits: [] });
      cutoff  = new Date(cutoff.getTime()  + 14 * 86400000);
      payDate = new Date(payDate.getTime() + 14 * 86400000);
    }

    // Add the current open period for the next payday
    const periodStart = new Date(cutoff.getTime() - 14 * 86400000);
    periods.push({ periodStart, periodEnd: new Date(cutoff), payDate: new Date(payDate), audits: [] });

    // bucket by approval_date
    items.forEach(a => {
      if (!a.approval_date) return;
      const approved = new Date(a.approval_date);
      const period = periods.find(p => approved >= p.periodStart && approved < p.periodEnd);
      if (period) period.audits.push(a);
    });

    const filled = periods
      .filter(p => p.audits.length > 0)
      .sort((a, b) => b.payDate - a.payDate);

    window.payslipCache = filled;

    const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    list.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Total earned</div>
          <div class="stat-value stat-accent">\u00a3${total.toFixed(2)}</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Audits completed</div>
          <div class="stat-value">${items.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total + expenses</div>
          <div class="stat-value stat-accent">\u00a3${totalWithExpenses.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total mileage</div>
          <div class="stat-value stat-accent">${mileage.toFixed(2)}</div>
        </div>
      </div>

      <div class="table-wrap" style="margin-top:1.5rem">
        <table>
          <thead>
            <tr>
              <th>Pay date</th>
              <th>Earnings</th>
              <th>Earnings + expenses</th>
              <th>Pay period</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${filled.map((p, i) => {
              const earnings = p.audits.reduce((s, a) => s + (Number(a.total_pay) || 0), 0);
              const expenses = p.audits.reduce((s, a) => {
                const fields = ['reclaimable_expenses', 'reclaimable_expenses_2', 'reclaimable_expenses_3', 'reclaimable_expenses_4'];
                return s + fields.reduce((s2, k) => s2 + (Number(a[k]) || 0), 0);
              }, 0);
              const periodMileage = p.audits.reduce((s, a) => s + (Number(a.mileage) || 0), 0);
              //const earningsWithHoliday = earnings * HOLIDAY_RATE;
              const earningsWithAll = earnings + expenses + (periodMileage * MILEAGE);
              return `
                <tr>
                  <td data-label="Pay date"><span class="deadline-badge">${fmt(p.payDate)}</span></td>
                  <td data-label="Earnings" class="pay-cell">\u00a3${earnings.toFixed(2)}</td>
                  <td data-label="+ Expenses" class="pay-cell">\u00a3${earningsWithAll.toFixed(2)}</td>
                  <td data-label="Period"><span class="tbl-secondary">${fmt(p.periodStart)} - ${fmt(p.periodEnd)}</span></td>
                  <td><button class="info-btn" onclick="showPayslipDetail(${i})">Details</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

  } catch (e) {
    list.innerHTML = '<div style="font-size:13px;color:var(--nord3)">Could not load payslips.</div>';
    document.getElementById('payslips-error').textContent = e.message;
  }
}

function showPayslipDetail(i) {
  const p = window.payslipCache[i];
  if (!p) return;
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const earnings    = p.audits.reduce((s, a) => s + (Number(a.auditor_pay_per_audit) || 0), 0);
  const holidayPay  = p.audits.reduce((s, a) => s + (Number(a.holiday_pay) || 0), 0);
  const expenses    = p.audits.reduce((s, a) => {
    const fields = ['reclaimable_expenses', 'reclaimable_expenses_2', 'reclaimable_expenses_3', 'reclaimable_expenses_4'];
    return s + fields.reduce((s2, k) => s2 + (Number(a[k]) || 0), 0);
  }, 0);
  const miles       = p.audits.reduce((s, a) => s + (Number(a.mileage) || 0), 0);
  const mileagePay  = miles * MILEAGE;

  document.getElementById('modal-title').textContent    = fmt(p.periodStart) + ' - ' + fmt(p.periodEnd);
  document.getElementById('modal-subtitle').textContent = 'Pay date: ' + fmt(p.payDate);

  document.getElementById('modal-body').innerHTML = `
    <div class="modal-field">
      <div class="modal-field-label">Base pay</div>
      <div class="modal-field-value mono green">\u00a3${earnings.toFixed(2)}</div>
    </div>
    <div class="modal-field">
      <div class="modal-field-label">Inc. holiday pay</div>
      <div class="modal-field-value mono green">\u00a3${(earnings + holidayPay).toFixed(2)}</div>
    </div>
    <div class="modal-field">
      <div class="modal-field-label">Expenses</div>
      <div class="modal-field-value mono" style="color:var(--nord9)">\u00a3${expenses.toFixed(2)}</div>
    </div>
    <div class="modal-field">
      <div class="modal-field-label">Mileage (${miles.toFixed(1)} mi)</div>
      <div class="modal-field-value mono" style="color:var(--nord9)">\u00a3${mileagePay.toFixed(2)}</div>
    </div>

    <div class="modal-field full" style="background:none;border-color:var(--nord2);border-style:dashed">
      <div class="modal-field-label">Breakdown</div>
    </div>

    ${p.audits.map(a => {
      const exp = ['reclaimable_expenses', 'reclaimable_expenses_2', 'reclaimable_expenses_3', 'reclaimable_expenses_4']
        .reduce((s, k) => s + (Number(a[k]) || 0), 0);
      const mi  = (Number(a.mileage) || 0) * MILEAGE;
      return `
        <div class="modal-field full">
          <div class="modal-field-label">${a.site_name} \u00b7 ${a.internal_id}</div>
          <div style="display:flex;gap:1rem;margin-top:4px;flex-wrap:wrap">
            <span class="modal-field-value green">Pay: \u00a3${Number(a.total_pay || 0).toFixed(2)}</span>
            <span class="modal-field-value" style="color:var(--nord9)">Expenses: \u00a3${exp.toFixed(2)}</span>
            <span class="modal-field-value" style="color:var(--nord9)">Mileage: \u00a3${mi.toFixed(2)}</span>
            <span class="modal-field-value" style="color:var(--nord3);font-size:11px">${fmt(new Date(a.approval_date))}</span>
          </div>
        </div>
      `;
    }).join('')}
  `;

  document.getElementById('modal-backdrop').classList.add('open');
}

  function selectRoute(type) {
    selectedRoute = type;
    document.getElementById('btn-nn').classList.toggle('active', type === 'nearest');
    document.getElementById('btn-bf').classList.toggle('active', type === 'brute');
  }

  async function fetchRoute() {
    const btn = document.getElementById('fetch-btn');
    const container = document.getElementById('route-links');
    const errEl = document.getElementById('route-error');
    btn.disabled = true;
    btn.textContent = 'Generating...';
    errEl.textContent = '';
    container.innerHTML = '<div class="route-empty">Calculating...</div>';
    homeValue = dropdownState.address;
    selectedRoute = dropdownState.route;
    try {
      // route stays on local C++ server - this is where the algorithm lives
      const res = await local(`/api/route?type=${selectedRoute}&address=${homeValue}`, {
      headers: { 'Authorization': sessionStorage.getItem('bearer') || '' }
    });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed');
      const links = data.links || [];
      if (links.length === 0) { container.innerHTML = '<div class="route-empty">No routes returned.</div>'; return; }
      container.innerHTML = links.map((url, i) => `
        <div class="route-link-item">
          <span class="route-link-num">${String(i + 1).padStart(2, '0')}</span>
          <a class="route-link-url" href="${url}" target="_blank" rel="noopener">${url}</a>
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = '<div class="route-empty">No routes to display.</div>';
      errEl.textContent = e.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate route';
    }
  }

  

  function loadNotes() {
    //functionality for the notes here
  }

  function clearNote(i) { document.getElementById('note-' + i).value = ''; }
  function suggestNote(i, siteName, visitType) {
    document.getElementById('note-' + i).value =
      `Audit conducted at ${siteName}. Visit type: ${visitType}. All areas inspected in accordance with required standards. No significant issues identified at time of visit. Documentation reviewed and found to be in order.`;
  }

  function doLogout() {
    sessionStorage.removeItem('bearer');
    auditCache = [];
    payslipData = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('usr').value = '';
    document.getElementById('pwd').value = '';
    document.getElementById('stat-pending').textContent = '-';
    document.getElementById('stat-holiday').textContent = '-';
    document.getElementById('stat-count').textContent = '-';
    document.getElementById('audit-tbody').innerHTML = '<tr><td colspan="4" class="table-empty">Loading...</td></tr>';
    document.getElementById('route-links').innerHTML = '<div class="route-empty">Select a method and generate a route.</div>';
    navigate('home');
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModalDirect();
    if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') doLogin();
  });

  function buildResponseIndexes(items) {
    responseById = new Map();

    responseSearchRows = items.map(a => {
      if (a.internal_id) responseById.set(String(a.internal_id).toLowerCase(), a);
      if (a.order_internal_id) responseById.set(String(a.order_internal_id).toLowerCase(), a);

      return {
        audit: a,
        searchText: [
          a.site_name,
          a.internal_id,
          a.order_internal_id,
          a.client_name
        ].filter(Boolean).join(' ').toLowerCase(),
        submissionDate: getAuditSubmissionDate(a)
      };
    });
  }

  function getAuditSubmissionDate(a) {
    return a.submission_date
        || a.submitted_date
        || a.approval_date
        || null;
  }


  async function loadViewResponses() {
  const container = document.getElementById('view-responses-container');
  container.innerHTML = '<div style="font-size:13px;color:var(--nord3)">Loading...</div>';

  try {
    await getApprovedAuditData();
    renderViewResponses();
  } catch (e) {
    container.innerHTML = '<div style="font-size:13px;color:var(--nord3)">Could not load responses.</div>';
  }
}
  function applyResponseFilters() {
    const query = document.getElementById('response-search').value.trim().toLowerCase();
    const fromValue = document.getElementById('response-from').value;
    const toValue = document.getElementById('response-to').value;

    const from = fromValue ? new Date(fromValue + 'T00:00:00') : null;
    const to = toValue ? new Date(toValue + 'T23:59:59') : null;

    let rows = responseSearchRows;

    if (query) {
      const exact = responseById.get(query);
      rows = exact
        ? [{ audit: exact, searchText: '', submissionDate: getAuditSubmissionDate(exact) }]
        : rows.filter(row => row.searchText.includes(query));
    }

    rows = rows.filter(row => {
      if (!row.submissionDate) return !from && !to;

      const date = new Date(row.submissionDate);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });

    renderResponseResults(rows);
  }
  
  function renderViewResponses() {
    const container = document.getElementById('view-responses-container');

    container.innerHTML = `
      <div class="response-toolbar">
        <input id="response-search" class="response-input" placeholder="Search name or audit ID" />
        <span class="field-label">From</span>
        <input id="response-from" class="response-input" type="date" />
        <span class="field-label">To</span>
        <input id="response-to" class="response-input" type="date" />
        <button class="info-btn" onclick="clearResponseFilters()">Clear</button>
      </div>
      <div id="response-results"></div>
    `;

    document.getElementById('response-search').addEventListener('input', applyResponseFilters);
    document.getElementById('response-from').addEventListener('change', applyResponseFilters);
    document.getElementById('response-to').addEventListener('change', applyResponseFilters);

    applyResponseFilters();
  }

  function renderResponseResults(rows) {
    const results = document.getElementById('response-results');

    if (rows.length === 0) {
      results.innerHTML = '<div class="table-empty">No responses found.</div>';
      return;
    }

    const fmt = d => new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    results.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Audit</th>
              <th>Audit ID</th>
              <th>Submission date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => {
              const a = row.audit;
              const submitted = getAuditSubmissionDate(a);

              return `
                <tr>
                  <td data-label="Audit">
                    <div class="tbl-primary">${a.site_name || ''}</div>
                    <div class="tbl-secondary">${a.client_name || ''}</div>
                  </td>
                  <td data-label="Audit ID" class="pay-cell">${a.internal_id || a.order_internal_id || ''}</td>
                  <td data-label="Submission date">${submitted ? fmt(submitted) : '-'}</td>
                  <td data-label="Status">${a.status || ''}</td>
                  <td><button class="info-btn" onclick="showAuditDetailFromResponse('${a.internal_id || a.order_internal_id}')">View</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  function showAuditDetailFromResponse(auditID) {
    //We need to get the index of the audit in the main cache to reuse the existing detail modal
    const auditObj = completedCache.find(a => 
      String(a.internal_id) === String(auditID) || 
      String(a.order_internal_id) === String(auditID)
    );
    console.log(completedCache.length);
    if (!auditObj) {
      alert('Audit not found in cache.');
      return;
    }
    console.log(JSON.stringify(auditObj));
  }

  //dropdown functionality 


const dropdownState = { route: 'brute', address: 'home' };

function makeDropdown(triggerId, listId, labelId, stateKey) {
  const trigger = document.getElementById(triggerId);
  const list = document.getElementById(listId);
  const label = document.getElementById(labelId);
  const options = list.querySelectorAll('.cd-option');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = list.classList.contains('open');
    document.querySelectorAll('.cd-list').forEach(l => l.classList.remove('open'));
    document.querySelectorAll('.cd-trigger').forEach(t => t.classList.remove('open'));
    if (!isOpen) {
      list.classList.add('open');
      trigger.classList.add('open');
    }
  });

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      label.textContent = opt.textContent;
      dropdownState[stateKey] = opt.dataset.value;
      list.classList.remove('open');
      trigger.classList.remove('open');
    });
  });
}
//make sure its loaded after the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  makeDropdown('cd-route-trigger', 'cd-route-list', 'cd-route-label', 'route');
  makeDropdown('cd-addr-trigger', 'cd-addr-list', 'cd-addr-label', 'address');
});
document.addEventListener('click', () => {
  document.querySelectorAll('.cd-list').forEach(l => l.classList.remove('open'));
  document.querySelectorAll('.cd-trigger').forEach(t => t.classList.remove('open'));
});
