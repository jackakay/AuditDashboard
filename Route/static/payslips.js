// ─── Payslips ─────────────────────────────────────────────────────────────────

let payslipData    = null;
let completedCache = [];

async function getApprovedAuditData() {
  if (payslipData) return payslipData;

  const res  = await sl('/api/v3/audits?limit=200&status=approved,approving_query,submitted,client_query');
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const numPages = data.pages;
  const items    = data.items || [];

  for (let i = 2; i <= numPages; i++) {
    const r = await sl('/api/v3/audits?limit=200&status=approved,approving_query,submitted,client_query&page=' + i);
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    items.push(...(d.items || []));
  }

  completedCache = items;
  payslipData    = items;
  buildResponseIndexes(items);

  return payslipData;
}

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

  try {
    const total          = items.reduce((s, a) => s + (Number(a.total_pay) || 0), 0);
    const mileage        = items.reduce((s, a) => s + (Number(a.mileage) || 0), 0);
    const reclaimableRaw = items.reduce((s, a) => {
      const fields = ['reclaimable_expenses', 'reclaimable_expenses_2', 'reclaimable_expenses_3', 'reclaimable_expenses_4'];
      return s + fields.reduce((s2, k) => s2 + (Number(a[k]) || 0), 0);
    }, 0);
    const totalWithExpenses = total + reclaimableRaw + (mileage * MILEAGE);

    // Generate biweekly periods from first cutoff
    const periods = [];
    let cutoff    = new Date('2026-01-05T00:00:00Z');
    let payDate   = new Date('2026-01-14T00:00:00Z');
    const today   = new Date();

    while (cutoff <= today) {
      const periodStart = new Date(cutoff.getTime() - 14 * 86400000);
      periods.push({ periodStart, periodEnd: new Date(cutoff), payDate: new Date(payDate), audits: [] });
      cutoff  = new Date(cutoff.getTime()  + 14 * 86400000);
      payDate = new Date(payDate.getTime() + 14 * 86400000);
    }

    // Add the current open period for the next payday
    const periodStart = new Date(cutoff.getTime() - 14 * 86400000);
    periods.push({ periodStart, periodEnd: new Date(cutoff), payDate: new Date(payDate), audits: [] });

    // Bucket by approval_date
    items.forEach(a => {
      if (!a.approval_date) return;
      const approved = new Date(a.approval_date);
      const period   = periods.find(p => approved >= p.periodStart && approved < p.periodEnd);
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
          <div class="stat-value stat-accent">£${total.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Audits completed</div>
          <div class="stat-value">${items.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total + expenses</div>
          <div class="stat-value stat-accent">£${totalWithExpenses.toFixed(2)}</div>
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
              const periodMileage  = p.audits.reduce((s, a) => s + (Number(a.mileage) || 0), 0);
              const earningsWithAll = earnings + expenses + (periodMileage * MILEAGE);
              return `
                <tr>
                  <td data-label="Pay date"><span class="deadline-badge">${fmt(p.payDate)}</span></td>
                  <td data-label="Earnings" class="pay-cell">£${earnings.toFixed(2)}</td>
                  <td data-label="+ Expenses" class="pay-cell">£${earningsWithAll.toFixed(2)}</td>
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

  const fmt        = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const earnings   = p.audits.reduce((s, a) => s + (Number(a.auditor_pay_per_audit) || 0), 0);
  const holidayPay = p.audits.reduce((s, a) => s + (Number(a.holiday_pay) || 0), 0);
  const expenses   = p.audits.reduce((s, a) => {
    const fields = ['reclaimable_expenses', 'reclaimable_expenses_2', 'reclaimable_expenses_3', 'reclaimable_expenses_4'];
    return s + fields.reduce((s2, k) => s2 + (Number(a[k]) || 0), 0);
  }, 0);
  const miles      = p.audits.reduce((s, a) => s + (Number(a.mileage) || 0), 0);
  const mileagePay = miles * MILEAGE;

  document.getElementById('modal-title').textContent    = fmt(p.periodStart) + ' - ' + fmt(p.periodEnd);
  document.getElementById('modal-subtitle').textContent = 'Pay date: ' + fmt(p.payDate);
  document.getElementById('modal-body').innerHTML = `
    <div class="modal-field">
      <div class="modal-field-label">Base pay</div>
      <div class="modal-field-value mono green">£${earnings.toFixed(2)}</div>
    </div>
    <div class="modal-field">
      <div class="modal-field-label">Inc. holiday pay</div>
      <div class="modal-field-value mono green">£${(earnings + holidayPay).toFixed(2)}</div>
    </div>
    <div class="modal-field">
      <div class="modal-field-label">Expenses</div>
      <div class="modal-field-value mono" style="color:var(--nord9)">£${expenses.toFixed(2)}</div>
    </div>
    <div class="modal-field">
      <div class="modal-field-label">Mileage (${miles.toFixed(1)} mi)</div>
      <div class="modal-field-value mono" style="color:var(--nord9)">£${mileagePay.toFixed(2)}</div>
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
          <div class="modal-field-label">${a.site_name} · ${a.internal_id}</div>
          <div style="display:flex;gap:1rem;margin-top:4px;flex-wrap:wrap">
            <span class="modal-field-value green">Pay: £${Number(a.total_pay || 0).toFixed(2)}</span>
            <span class="modal-field-value" style="color:var(--nord9)">Expenses: £${exp.toFixed(2)}</span>
            <span class="modal-field-value" style="color:var(--nord9)">Mileage: £${mi.toFixed(2)}</span>
            <span class="modal-field-value" style="color:var(--nord3);font-size:11px">${fmt(new Date(a.approval_date))}</span>
          </div>
        </div>
      `;
    }).join('')}
  `;

  document.getElementById('modal-backdrop').classList.add('open');
}