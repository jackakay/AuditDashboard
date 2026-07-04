// ─── Home ─────────────────────────────────────────────────────────────────────

let auditCache = [];

async function loadHomeData() {
  const tbody = document.getElementById('audit-tbody');
  tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Loading...</td></tr>';

  try {
    const res  = await sl('/api/v3/audits?limit=200&status=assigned');
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
    document.getElementById('stat-pending').textContent = '£' + rawPay.toFixed(2);
    document.getElementById('stat-holiday').textContent = '£' + (rawPay * HOLIDAY_RATE).toFixed(2);

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
            <div class="tbl-secondary">${a.site_post_code} · ${a.client_name}</div>
          </td>
          <td data-label="Deadline">
            <span class="deadline-badge ${urgency}">${deadlineStr}</span>
            <span class="days-left ${urgency}">${daysLeft}d left</span>
          </td>
          <td data-label="Pay" class="pay-cell">£${Number(a.auditor_pay_per_audit * HOLIDAY_RATE || 0).toFixed(2)}</td>
          <td><button class="info-btn" onclick="showAuditDetail(${i})">Details</button></td>
        </tr>
      `;
    }).join('');

    renderRouteAudits();

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
  document.getElementById('modal-subtitle').textContent = a.internal_id + ' · ' + a.client_name;
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
      <div class="modal-field-value mono green">£${Number(a.auditor_pay_per_audit).toFixed(2)}</div>
    </div>
    <div class="modal-field">
      <div class="modal-field-label">Inc. holiday pay</div>
      <div class="modal-field-value mono green">£${(a.auditor_pay_per_audit * HOLIDAY_RATE).toFixed(2)}</div>
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