// ─── Route generation ─────────────────────────────────────────────────────────

function renderRouteAudits() {
  const tbody = document.getElementById('route-audit-tbody');
  if (!tbody) return;

  if (auditCache.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No audits assigned.</td></tr>';
    return;
  }

  tbody.innerHTML = auditCache.map((a, i) => {
    const deadline    = new Date(a.deadline_date);
    const daysLeft    = Math.ceil((deadline - Date.now()) / 86400000);
    const urgency     = daysLeft <= 2 ? 'urgent' : daysLeft <= 5 ? 'warn' : '';
    const deadlineStr = deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `
      <tr>
        <td data-label="Select" style="width:2.5rem">
          <input type="checkbox" class="route-checkbox" data-index="${i}" />
        </td>
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
}

function toggleSelectAll() {
  const checkboxes = document.querySelectorAll('.route-checkbox');
  const allChecked = [...checkboxes].every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
  document.getElementById('select-all-btn').textContent = allChecked ? 'Select all' : 'Deselect all';
}

function getSelectedAudits() {
  return [...document.querySelectorAll('.route-checkbox:checked')]
    .map(cb => auditCache[Number(cb.dataset.index)])
    .filter(Boolean);
}

async function fetchRoute() {
  const btn       = document.getElementById('fetch-btn');
  const container = document.getElementById('route-links');
  const errEl     = document.getElementById('route-error');

  btn.disabled    = true;
  btn.textContent = 'Generating...';
  errEl.textContent = '';
  container.innerHTML = '<div class="route-empty">Calculating...</div>';

  const homeValue    = dropdownState.address;
  const selectedRoute = dropdownState.route;
  const selected     = getSelectedAudits();

  try {
    const res  = await local(`/api/route?type=${selectedRoute}&address=${homeValue}`, {
      headers: { 'Authorization': sessionStorage.getItem('bearer') || '' }
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Failed');

    const links = data.links || [];
    if (links.length === 0) {
      container.innerHTML = '<div class="route-empty">No routes returned.</div>';
      return;
    }

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
    btn.disabled    = false;
    btn.textContent = 'Generate route';
  }
}