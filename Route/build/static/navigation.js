// ─── Navigation ───────────────────────────────────────────────────────────────

function navigate(page) {
  document.querySelectorAll('.nav-item')
    .forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page')
    .forEach(el => el.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  if (page === 'payslips')       loadPayslips();
  if (page === 'notes')          loadNotes();
  if (page === 'view-responses') loadViewResponses();
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function closeModal(e) {
  if (e.target === document.getElementById('modal-backdrop')) closeModalDirect();
}

function closeModalDirect() {
  document.getElementById('modal-backdrop').classList.remove('open');
}

// ─── Global keyboard shortcuts ────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModalDirect();
  if (e.key === 'Enter' &&
      document.getElementById('login-screen').style.display !== 'none') doLogin();
});