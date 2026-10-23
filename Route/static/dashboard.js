'use strict';

/*
 * Audit Dashboard frontend
 *
 * Depends on globals defined elsewhere: sl(), local(), HOLIDAY_RATE, MILEAGE.
 *
 * Sections:
 *   1. State
 *   2. Helpers (escaping, formatting, money)
 *   3. API
 *   4. Navigation, login, logout
 *   5. Home (assigned audits)
 *   6. Audit detail modal
 *   7. Payslips
 *   8. View responses
 *   9. Routes
 *  10. Dropdowns
 *  11. Init
 */

/* ========================================================================
 * 1. State
 * ====================================================================== */

const state = {
  assigned: [],          // audits with status "assigned"
  completed: null,       // approved / submitted audits (null = not loaded)
  completedPromise: null,
  payslips: [],          // pay periods built from completed audits
  responseRows: [],      // search index for the responses page
  responseById: new Map(),
  lastRouteReport: null, // text report from the last generated route
};

const dropdownState = { route: 'heldkarp', address: 'home' };

function resetState() {
  state.assigned = [];
  state.completed = null;
  state.completedPromise = null;
  state.payslips = [];
  state.responseRows = [];
  state.responseById = new Map();
  state.lastRouteReport = null;
}

/* ========================================================================
 * 2. Helpers
 * ====================================================================== */

const DAY_MS = 86400000;
const COMPLETED_STATUSES = 'approved,approving_query,submitted,client_query';
const EXPENSE_FIELDS = [
  'reclaimable_expenses',
  'reclaimable_expenses_2',
  'reclaimable_expenses_3',
  'reclaimable_expenses_4',
];

// First pay-period cutoff and its pay date; later periods are every 14 days.
const PAY_ANCHOR_CUTOFF = new Date('2025-01-05T00:00:00Z');
const PAY_ANCHOR_PAYDAY = new Date('2025-01-14T00:00:00Z');

const $ = id => document.getElementById(id);

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

// Escape anything that comes from the API before putting it in innerHTML.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const fmtDate = d => new Date(d).toLocaleDateString('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric',
});

const money = n => '\u00a3' + (Number(n) || 0).toFixed(2);

const sumBy = (items, fn) => items.reduce((s, a) => s + fn(a), 0);
const num = v => Number(v) || 0;
const expensesOf = a => EXPENSE_FIELDS.reduce((s, k) => s + num(a[k]), 0);

// level is '' | 'warn' | 'urgent'
function urgencyOf(deadline) {
  const daysLeft = Math.ceil((new Date(deadline) - Date.now()) / DAY_MS);
  const level = daysLeft <= 2 ? 'urgent' : daysLeft <= 5 ? 'warn' : '';
  return { daysLeft, level };
}

const loadingHtml = (msg = 'Loading...') =>
  `<div style="font-size:13px;color:var(--nord3)">${esc(msg)}</div>`;

const emptyRow = (cols, msg) =>
  `<tr><td colspan="${cols}" class="table-empty">${esc(msg)}</td></tr>`;

/* ========================================================================
 * 3. API
 * ====================================================================== */

async function slJson(path) {
  const res = await sl(path);
  if (res.status === 401) {
    doLogout();
    throw new Error('Session expired. Please sign in again.');
  }
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Fetches every page for a status filter. Sequential to stay friendly to the API.
async function fetchAllAudits(status) {
  const url = page => `/api/v3/audits?limit=200&status=${status}&page=${page}`;
  const first = await slJson(url(1));
  const items = [...(first.items || [])];
  for (let page = 2; page <= (first.pages || 1); page++) {
    const next = await slJson(url(page));
    items.push(...(next.items || []));
  }
  return items;
}

// Loads completed audits once and shares the in-flight request.
function getCompletedAudits() {
  if (!state.completedPromise) {
    state.completedPromise = fetchAllAudits(COMPLETED_STATUSES)
      .then(items => {
        state.completed = items;
        buildResponseIndexes(items);
        return items;
      })
      .catch(err => {
        state.completedPromise = null; // allow retry
        throw err;
      });
  }
  return state.completedPromise;
}

/* ========================================================================
 * 4. Navigation, login, logout
 * ====================================================================== */

const PAGE_LOADERS = {
  payslips: loadPayslips,
  'view-responses': loadViewResponses,
  routes: loadRoutes,
};

function navigate(page) {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  $('page-' + page).classList.add('active');
  const loader = PAGE_LOADERS[page];
  if (loader) loader();
}

async function doLogin() {
  const username = $('usr').value.trim();
  const password = $('pwd').value;
  const btn = $('login-btn');
  const err = $('login-error');

  if (btn.disabled) return;
  if (!username || !password) {
    err.textContent = 'Please enter your email and password.';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Signing in...';
  err.textContent = '';

  try {
    const res = await local('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Login failed');
    sessionStorage.setItem('bearer', data.bearer);
    showDashboard();
  } catch (e) {
    err.textContent = e.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Sign in';
  }
}

function showDashboard() {
  $('login-screen').style.display = 'none';
  const dash = $('dashboard-screen');
  dash.style.display = 'flex';
  dash.style.flexDirection = 'column';
  loadName();
  loadHomeData();
}

async function loadName() {
  try {
    const data = await slJson('/api/v1/auditors/me');
    setText('topbar-name', data.preferred_name || '');
  } catch (_) { /* name is cosmetic */ }
}

function doLogout() {
  sessionStorage.removeItem('bearer');
  resetState();
  closeModalDirect();

  // Remove rendered data from the DOM as well as from memory.
  $('payslip-list').innerHTML = '';
  $('view-responses-container').innerHTML = '';
  const routeBody = routeTbody();
  if (routeBody) routeBody.innerHTML = '';
  $('audit-tbody').innerHTML = emptyRow(4, 'Loading...');
  $('route-links').innerHTML = '<div class="route-empty">Select a method and generate a route.</div>';
  ['stat-pending', 'stat-holiday', 'stat-count'].forEach(id => setText(id, '-'));
  ['home-error', 'payslips-error', 'route-error'].forEach(id => setText(id, ''));

  $('login-screen').style.display = 'flex';
  $('dashboard-screen').style.display = 'none';
  $('usr').value = '';
  $('pwd').value = '';
  navigate('home');
}

/* ========================================================================
 * 5. Home (assigned audits)
 * ====================================================================== */

async function loadHomeData() {
  const tbody = $('audit-tbody');
  tbody.innerHTML = emptyRow(4, 'Loading...');
  setText('home-error', '');

  try {
    state.assigned = await fetchAllAudits('assigned');

    const rawPay = sumBy(state.assigned, a => num(a.auditor_pay_per_audit));
    setText('stat-count', state.assigned.length);
    setText('stat-pending', money(rawPay));
    setText('stat-holiday', money(rawPay * HOLIDAY_RATE));

    if (state.assigned.length === 0) {
      tbody.innerHTML = emptyRow(4, 'No audits currently assigned.');
      return;
    }

    tbody.innerHTML = state.assigned.map((a, i) => {
      const { daysLeft, level } = urgencyOf(a.deadline_date);
      return `
        <tr>
          <td data-label="Audit">
            <div class="tbl-primary">${esc(a.site_name)}</div>
            <div class="tbl-secondary">${esc(a.site_post_code)} \u00b7 ${esc(a.client_name)}</div>
          </td>
          <td data-label="Deadline">
            <span class="deadline-badge ${level}">${fmtDate(a.deadline_date)}</span>
            <span class="days-left ${level}">${daysLeft}d left</span>
          </td>
          <td data-label="Pay" class="pay-cell">${money(num(a.auditor_pay_per_audit) * HOLIDAY_RATE)}</td>
          <td><button class="info-btn" data-action="assigned-detail" data-index="${i}">Details</button></td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    tbody.innerHTML = emptyRow(4, 'Could not load audits.');
    setText('home-error', e.message);
  }
}

/* ========================================================================
 * 6. Audit detail modal
 * ====================================================================== */

// valueHtml must already be escaped.
function modalField(label, valueHtml, { full = false, valueClass = 'modal-field-value' } = {}) {
  return `
    <div class="modal-field${full ? ' full' : ''}">
      <div class="modal-field-label">${esc(label)}</div>
      <div class="${valueClass}">${valueHtml}</div>
    </div>`;
}

function openAuditModal(a, { showResponses = false } = {}) {
  if (!a) return;

  const { daysLeft, level } = urgencyOf(a.deadline_date);
  const deadlineClass = { urgent: 'red', warn: 'amber' }[level] || '';
  const basePay = num(a.auditor_pay_per_audit);

  const responsesHtml = showResponses
    ? `
      <div class="modal-field full">
        <div class="modal-field-label">Responses</div>
        <div class="info-text">
          ${(a.survey_answers || []).map(x => `
            <div class="modal-field full">
              <div class="modal-field-value">${esc(x.id)}</div>
              <div class="modal-field-value">${esc(x.value)}</div>
            </div>`).join('')}
        </div>
      </div>`
    : '';

  $('modal-title').textContent = a.site_name || '';
  $('modal-subtitle').textContent = `${a.internal_id || ''} \u00b7 ${a.client_name || ''}`;
  $('modal-body').innerHTML = [
    modalField('Post code', esc(a.site_post_code)),
    modalField('Visit type', esc(a.item_to_order)),
    modalField('Base pay', money(basePay), { valueClass: 'modal-field-value mono green' }),
    modalField('Inc. holiday pay', money(basePay * HOLIDAY_RATE), { valueClass: 'modal-field-value mono green' }),
    modalField('Deadline', `${fmtDate(a.deadline_date)} (${daysLeft}d left)`,
      { valueClass: `modal-field-value ${deadlineClass}` }),
    modalField('Order window', `${fmtDate(a.start_date)} - ${fmtDate(a.end_date)}`),
    modalField('Order ID', esc(a.order_internal_id), { valueClass: 'modal-field-value mono' }),
    modalField('Schedule', esc(String(a.order_schedule_type || '').replace(/_/g, ' '))),
    modalField('Expenses', esc(String(a.estimated_expenses || 'None').trim()),
      { full: true, valueClass: 'expenses-text' }),
    modalField('Audit info', esc(a.visit_info), { full: true, valueClass: 'info-text' }),
    responsesHtml,
  ].join('');

  $('modal-backdrop').classList.add('open');
}

function closeModal(e) {
  if (e.target === $('modal-backdrop')) closeModalDirect();
}

function closeModalDirect() {
  $('modal-backdrop').classList.remove('open');
}

/* ========================================================================
 * 7. Payslips
 * ====================================================================== */

// Pure: groups audits into fortnightly pay periods by approval date.
// Returns only periods that contain audits, newest pay date first.
function buildPayPeriods(items, today = new Date()) {
  const periods = [];
  const makePeriod = (cutoff, payDate) => ({
    periodStart: new Date(cutoff.getTime() - 14 * DAY_MS),
    periodEnd: new Date(cutoff),
    payDate: new Date(payDate),
    audits: [],
  });

  let cutoff = new Date(PAY_ANCHOR_CUTOFF);
  let payDate = new Date(PAY_ANCHOR_PAYDAY);

  while (cutoff <= today) {
    periods.push(makePeriod(cutoff, payDate));
    cutoff = new Date(cutoff.getTime() + 14 * DAY_MS);
    payDate = new Date(payDate.getTime() + 14 * DAY_MS);
  }
  // Current open period (next payday)
  periods.push(makePeriod(cutoff, payDate));

  items.forEach(a => {
    if (!a.approval_date) return;
    const approved = new Date(a.approval_date);
    const period = periods.find(p => approved >= p.periodStart && approved < p.periodEnd);
    if (period) period.audits.push(a);
  });

  return periods
    .filter(p => p.audits.length > 0)
    .sort((a, b) => b.payDate - a.payDate);
}

async function loadPayslips() {
  const list = $('payslip-list');
  list.innerHTML = loadingHtml();
  setText('payslips-error', '');

  try {
    const items = await getCompletedAudits();
    renderPayslips(items);
  } catch (e) {
    list.innerHTML = loadingHtml('Could not load payslips.');
    setText('payslips-error', e.message);
  }
}

function renderPayslips(items) {
  const list = $('payslip-list');

  const total = sumBy(items, a => num(a.total_pay));
  const mileage = sumBy(items, a => num(a.mileage));
  const expenses = sumBy(items, expensesOf);
  const totalWithExpenses = total + expenses + mileage * MILEAGE;

  state.payslips = buildPayPeriods(items);

  const rows = state.payslips.map((p, i) => {
    const earnings = sumBy(p.audits, a => num(a.total_pay));
    const periodExpenses = sumBy(p.audits, expensesOf);
    const periodMileage = sumBy(p.audits, a => num(a.mileage));
    const earningsWithAll = earnings + periodExpenses + periodMileage * MILEAGE;
    return `
      <tr>
        <td data-label="Pay date"><span class="deadline-badge">${fmtDate(p.payDate)}</span></td>
        <td data-label="Earnings" class="pay-cell">${money(earnings)}</td>
        <td data-label="+ Expenses" class="pay-cell">${money(earningsWithAll)}</td>
        <td data-label="Period"><span class="tbl-secondary">${fmtDate(p.periodStart)} - ${fmtDate(p.periodEnd)}</span></td>
        <td><button class="info-btn" data-action="payslip-detail" data-index="${i}">Details</button></td>
      </tr>`;
  }).join('');

  list.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total earned</div>
        <div class="stat-value stat-accent">${money(total)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Audits completed</div>
        <div class="stat-value">${items.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total + expenses</div>
        <div class="stat-value stat-accent">${money(totalWithExpenses)}</div>
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
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function showPayslipDetail(i) {
  const p = state.payslips[i];
  if (!p) return;

  // NOTE: the list view uses total_pay, while this view uses
  // auditor_pay_per_audit + holiday_pay. Left as-is; check this is intended.
  const earnings = sumBy(p.audits, a => num(a.auditor_pay_per_audit));
  const holidayPay = sumBy(p.audits, a => num(a.holiday_pay));
  const expenses = sumBy(p.audits, expensesOf);
  const miles = sumBy(p.audits, a => num(a.mileage));

  const breakdown = p.audits.map(a => `
    <div class="modal-field full">
      <div class="modal-field-label">${esc(a.site_name)} \u00b7 ${esc(a.internal_id)}</div>
      <div style="display:flex;gap:1rem;margin-top:4px;flex-wrap:wrap">
        <span class="modal-field-value green">Pay: ${money(a.total_pay)}</span>
        <span class="modal-field-value" style="color:var(--nord9)">Expenses: ${money(expensesOf(a))}</span>
        <span class="modal-field-value" style="color:var(--nord9)">Mileage: ${money(num(a.mileage) * MILEAGE)}</span>
        <span class="modal-field-value" style="color:var(--nord3);font-size:11px">${fmtDate(a.approval_date)}</span>
      </div>
    </div>`).join('');

  $('modal-title').textContent = `${fmtDate(p.periodStart)} - ${fmtDate(p.periodEnd)}`;
  $('modal-subtitle').textContent = 'Pay date: ' + fmtDate(p.payDate);
  $('modal-body').innerHTML = `
    ${modalField('Base pay', money(earnings), { valueClass: 'modal-field-value mono green' })}
    ${modalField('Inc. holiday pay', money(earnings + holidayPay), { valueClass: 'modal-field-value mono green' })}
    ${modalField('Expenses', money(expenses), { valueClass: 'modal-field-value mono' })}
    ${modalField(`Mileage (${miles.toFixed(1)} mi)`, money(miles * MILEAGE), { valueClass: 'modal-field-value mono' })}

    <div class="modal-field full" style="background:none;border-color:var(--nord2);border-style:dashed">
      <div class="modal-field-label">Breakdown</div>
    </div>
    ${breakdown}
  `;

  $('modal-backdrop').classList.add('open');
}

/* ========================================================================
 * 8. View responses
 * ====================================================================== */

function getAuditSubmissionDate(a) {
  return a.submission_date || a.submitted_date || a.approval_date || null;
}

function buildResponseIndexes(items) {
  state.responseById = new Map();
  state.responseRows = items.map(a => {
    if (a.internal_id) state.responseById.set(String(a.internal_id).toLowerCase(), a);
    if (a.order_internal_id) state.responseById.set(String(a.order_internal_id).toLowerCase(), a);
    return {
      audit: a,
      searchText: [a.site_name, a.internal_id, a.order_internal_id, a.client_name]
        .filter(Boolean).join(' ').toLowerCase(),
      submissionDate: getAuditSubmissionDate(a),
    };
  });
}

async function loadViewResponses() {
  const container = $('view-responses-container');
  container.innerHTML = loadingHtml();
  try {
    await getCompletedAudits();
    renderViewResponses();
  } catch (e) {
    container.innerHTML = loadingHtml('Could not load responses.');
  }
}

function renderViewResponses() {
  $('view-responses-container').innerHTML = `
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

  $('response-search').addEventListener('input', applyResponseFilters);
  $('response-from').addEventListener('change', applyResponseFilters);
  $('response-to').addEventListener('change', applyResponseFilters);

  applyResponseFilters();
}

function clearResponseFilters() {
  $('response-search').value = '';
  $('response-from').value = '';
  $('response-to').value = '';
  applyResponseFilters();
}

function applyResponseFilters() {
  const query = $('response-search').value.trim().toLowerCase();
  const fromValue = $('response-from').value;
  const toValue = $('response-to').value;
  const from = fromValue ? new Date(fromValue + 'T00:00:00') : null;
  const to = toValue ? new Date(toValue + 'T23:59:59') : null;

  let rows = state.responseRows;

  if (query) {
    const exact = state.responseById.get(query);
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

function renderResponseResults(rows) {
  const results = $('response-results');

  if (rows.length === 0) {
    results.innerHTML = '<div class="table-empty">No responses found.</div>';
    return;
  }

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
          ${rows.map(({ audit: a }) => {
            const id = a.internal_id || a.order_internal_id || '';
            const submitted = getAuditSubmissionDate(a);
            return `
              <tr>
                <td data-label="Audit">
                  <div class="tbl-primary">${esc(a.site_name)}</div>
                  <div class="tbl-secondary">${esc(a.client_name)}</div>
                </td>
                <td data-label="Audit ID" class="pay-cell">${esc(id)}</td>
                <td data-label="Submission date">${submitted ? fmtDate(submitted) : '-'}</td>
                <td data-label="Status">${esc(a.status)}</td>
                <td><button class="info-btn" data-action="response-detail" data-id="${esc(id)}">View</button></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function showAuditDetailFromResponse(auditId) {
  const audit = (state.completed || []).find(a =>
    String(a.internal_id) === String(auditId) ||
    String(a.order_internal_id) === String(auditId));

  if (!audit) {
    alert('Audit not found.');
    return;
  }
  openAuditModal(audit, { showResponses: true });
}

/* ========================================================================
 * 9. Routes
 * ====================================================================== */

const routeTbody = () => document.querySelector('#route-stops-table tbody');
const selectAllBox = () => $('select-all-checkbox');

function loadRoutes() {
  renderRouteStopsTable();
}

function renderRouteStopsTable() {
  const tbody = routeTbody();
  if (!tbody) return;

  // Reset the master checkbox: freshly rendered rows start unchecked.
  const master = selectAllBox();
  if (master) {
    master.checked = false;
    master.indeterminate = false;
  }

  if (state.assigned.length === 0) {
    tbody.innerHTML = emptyRow(5, 'No audits available.');
    return;
  }

  tbody.innerHTML = state.assigned.map((a, index) => `
    <tr>
      <td style="text-align: center;" data-label="Select">
        <input type="checkbox" class="row-checkbox" data-index="${index}" style="accent-color: var(--nord10); cursor: pointer;">
      </td>
      <td data-label="Audit name">
        <div class="tbl-primary">${esc(a.site_name)}</div>
        <div class="tbl-secondary">${esc(a.client_name)}</div>
      </td>
      <td data-label="Audit ID" class="pay-cell">${esc(a.internal_id || a.order_internal_id)}</td>
      <td data-label="Deadline"><span class="deadline-badge">${fmtDate(a.deadline_date)}</span></td>
      <td data-label="Action" style="text-align: right;">
        <button class="info-btn" data-action="assigned-detail" data-index="${index}">Details</button>
      </td>
    </tr>
  `).join('');
}

// Bound once in init; uses delegation so re-rendering rows needs no re-binding.
function initRouteTable() {
  const tbody = routeTbody();
  const master = selectAllBox();
  if (!tbody || !master) return;

  tbody.addEventListener('change', e => {
    if (!e.target.classList.contains('row-checkbox')) return;
    e.target.closest('tr').style.background = e.target.checked ? 'var(--nord2)' : '';
    updateSelectAllState();
  });

  master.addEventListener('change', () => {
    tbody.querySelectorAll('.row-checkbox').forEach(cb => {
      cb.checked = master.checked;
      cb.closest('tr').style.background = master.checked ? 'var(--nord2)' : '';
    });
  });
}

function updateSelectAllState() {
  const boxes = Array.from(routeTbody().querySelectorAll('.row-checkbox'));
  const master = selectAllBox();
  const checked = boxes.filter(cb => cb.checked).length;
  master.checked = boxes.length > 0 && checked === boxes.length;
  master.indeterminate = checked > 0 && checked < boxes.length;
}

function getSelectedStops() {
  const boxes = routeTbody().querySelectorAll('.row-checkbox:checked');
  return Array.from(boxes)
    .map(cb => state.assigned[Number(cb.dataset.index)])
    .filter(Boolean);
}

async function fetchRoute() {
  const stops = getSelectedStops();
  if (stops.length < 1) {
    alert('No audits selected');
    return;
  }

  const btn = $('fetch-btn');
  const container = $('route-links');
  const errEl = $('route-error');

  btn.disabled = true;
  btn.textContent = 'Generating...';
  errEl.textContent = '';
  container.innerHTML = '<div class="route-empty">Calculating...</div>';
  state.lastRouteReport = null;

  const type = encodeURIComponent(dropdownState.route);
  const address = encodeURIComponent(dropdownState.address);

  try {
    // The routing algorithm lives on the local C++ server.
    const res = await fetch(`/api/route?type=${type}&address=${address}`, {
      method: 'POST',
      headers: {
        'Authorization': sessionStorage.getItem('bearer') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stops),
    });

    if (res.status === 401) {
      doLogout();
      throw new Error('Session expired. Please sign in again.');
    }
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Failed');

    const links = data.links || [];
    state.lastRouteReport = data.report || null;

    if (links.length === 0) {
      container.innerHTML = '<div class="route-empty">No routes returned.</div>';
      return;
    }

    container.innerHTML = links.map((url, i) => `
      <div class="route-link-item">
        <span class="route-link-num">${String(i + 1).padStart(2, '0')}</span>
        <a class="route-link-url" href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>
      </div>
    `).join('') + (state.lastRouteReport
      ? '<div style="margin-top:12px"><button class="info-btn" data-action="download-report">Download stop list</button></div>'
      : '');
  } catch (e) {
    container.innerHTML = '<div class="route-empty">No routes to display.</div>';
    errEl.textContent = e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate route';
  }
}

function downloadRouteReport() {
  if (!state.lastRouteReport) return;

  const blob = new Blob([state.lastRouteReport], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'audit-route-stops.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ========================================================================
 * 10. Dropdowns
 * ====================================================================== */

function closeAllDropdowns() {
  document.querySelectorAll('.cd-list').forEach(l => l.classList.remove('open'));
  document.querySelectorAll('.cd-trigger').forEach(t => t.classList.remove('open'));
}

function makeDropdown(triggerId, listId, labelId, stateKey) {
  const trigger = $(triggerId);
  const list = $(listId);
  const label = $(labelId);
  if (!trigger || !list || !label) return;
  const options = list.querySelectorAll('.cd-option');

  const initial = Array.from(options).find(o => o.dataset.value === dropdownState[stateKey]);
  if (initial) {
    options.forEach(o => o.classList.remove('selected'));
    initial.classList.add('selected');
    label.textContent = initial.textContent;
  }
  
  trigger.addEventListener('click', e => {
    e.stopPropagation();
    const wasOpen = list.classList.contains('open');
    closeAllDropdowns();
    if (!wasOpen) {
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
      closeAllDropdowns();
    });
  });
}

/* ========================================================================
 * 11. Init
 * ====================================================================== */

// One delegated handler for every generated button.
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;

  switch (el.dataset.action) {
    case 'assigned-detail':
      openAuditModal(state.assigned[Number(el.dataset.index)]);
      break;
    case 'payslip-detail':
      showPayslipDetail(Number(el.dataset.index));
      break;
    case 'response-detail':
      showAuditDetailFromResponse(el.dataset.id);
      break;
    case 'download-report':
      downloadRouteReport();
      break;
  }
});

document.addEventListener('click', closeAllDropdowns);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModalDirect();
  if (e.key === 'Enter' && $('login-screen').style.display !== 'none') doLogin();
});

document.addEventListener('DOMContentLoaded', () => {
  makeDropdown('cd-route-trigger', 'cd-route-list', 'cd-route-label', 'route');
  makeDropdown('cd-addr-trigger', 'cd-addr-list', 'cd-addr-label', 'address');
  initRouteTable();
});