/**
 * DueTrack Pro - Core Application Logic
 */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    SETTINGS: 'duetrack_settings_v1',
    PEOPLE: 'duetrack_people_v1',
    EXPENSES: 'duetrack_expenses_v1',
    SETTLEMENTS: 'duetrack_settlements_v1'
  };

  // Application State
  const state = {
    settings: null,
    people: [],
    expenses: [],
    settlements: [],
    activePersonId: 'person-xyz',
    activeTab: 'expenses', // 'expenses' | 'settlements'
    filters: {
      search: '',
      category: 'all',
      status: 'all' // 'all' | 'due' | 'settled'
    },
    editingExpenseId: null
  };

  // Initialize
  function init() {
    loadState();
    applyTheme(state.settings.theme || 'dark');
    renderAll();
    attachEventListeners();
    setupTodayDates();
  }

  // State Persistence
  function loadState() {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      state.settings = savedSettings ? JSON.parse(savedSettings) : { ...DEFAULT_SETTINGS };

      const savedPeople = localStorage.getItem(STORAGE_KEYS.PEOPLE);
      state.people = savedPeople ? JSON.parse(savedPeople) : [...DEFAULT_PEOPLE];

      const savedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      state.expenses = savedExpenses ? JSON.parse(savedExpenses) : [...DEFAULT_EXPENSES];

      const savedSettlements = localStorage.getItem(STORAGE_KEYS.SETTLEMENTS);
      state.settlements = savedSettlements ? JSON.parse(savedSettlements) : [...DEFAULT_SETTLEMENTS];

      // Ensure active person exists
      if (!state.people.some(p => p.id === state.activePersonId)) {
        state.activePersonId = state.people[0]?.id || 'all';
      }
    } catch (e) {
      console.error('Failed to load state from localStorage:', e);
      state.settings = { ...DEFAULT_SETTINGS };
      state.people = [...DEFAULT_PEOPLE];
      state.expenses = [...DEFAULT_EXPENSES];
      state.settlements = [...DEFAULT_SETTLEMENTS];
      state.activePersonId = 'person-xyz';
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
      localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(state.people));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(state.expenses));
      localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(state.settlements));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
      showToast('Could not save changes to browser storage', 'warning');
    }
  }

  // Calculations & Metrics
  function getActivePerson() {
    if (state.activePersonId === 'all') {
      return { id: 'all', name: 'All Contacts (Consolidated)', avatarColor: '#6366f1' };
    }
    return state.people.find(p => p.id === state.activePersonId) || state.people[0];
  }

  function computeMetrics() {
    const personId = state.activePersonId;
    const filteredExpenses = personId === 'all'
      ? state.expenses
      : state.expenses.filter(e => e.personId === personId);

    const filteredSettlements = personId === 'all'
      ? state.settlements
      : state.settlements.filter(s => s.personId === personId);

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalSettled = filteredSettlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const netDue = Math.max(0, totalExpenses - totalSettled);

    return {
      totalExpenses,
      totalSettled,
      netDue,
      totalCount: filteredExpenses.length
    };
  }

  // Formatting helpers
  function formatCurrency(amount) {
    const symbol = state.settings.currencySymbol || '₹';
    const num = Number(amount || 0);
    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }

  function getCategoryObj(categoryId) {
    return CATEGORIES.find(c => c.id === categoryId) || { id: 'other', name: 'Other', icon: '📦', color: '#64748b' };
  }

  // Rendering
  function renderAll() {
    renderHeader();
    renderPersonStrip();
    renderKPIs();
    renderLedger();
    renderStatementPrintHeader();
  }

  function renderHeader() {
    const myNameEl = document.getElementById('header-user-name');
    if (myNameEl) myNameEl.textContent = state.settings.userName;

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = state.settings.theme === 'light'
        ? '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path></svg>'
        : '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
    }
  }

  function renderPersonStrip() {
    const container = document.getElementById('person-tabs-container');
    if (!container) return;

    let html = '';
    state.people.forEach(p => {
      const isActive = p.id === state.activePersonId;
      // calculate quick balance for this person
      const pExpenses = state.expenses.filter(e => e.personId === p.id).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const pSettled = state.settlements.filter(s => s.personId === p.id).reduce((sum, stl) => sum + Number(stl.amount || 0), 0);
      const due = Math.max(0, pExpenses - pSettled);

      html += `
        <button class="person-tab-btn ${isActive ? 'active' : ''}" data-person-id="${p.id}">
          <span class="person-avatar-dot" style="background-color: ${p.avatarColor || '#6366f1'};"></span>
          <span>${escapeHtml(p.name)}</span>
          ${due > 0 ? `<span style="font-size: 0.72rem; opacity: 0.85; margin-left: 2px;">(${formatCurrency(due)})</span>` : ''}
        </button>
      `;
    });

    // Add Consolidated tab
    const isAll = state.activePersonId === 'all';
    html += `
      <button class="person-tab-btn ${isAll ? 'active' : ''}" data-person-id="all" title="View all people combined">
        <span>🌐 All People</span>
      </button>
    `;

    container.innerHTML = html;

    // Render active person meta info
    const metaContainer = document.getElementById('active-person-meta');
    if (metaContainer) {
      const activePerson = getActivePerson();
      if (activePerson.id === 'all') {
        metaContainer.innerHTML = `<span>Showing aggregate expenses across <strong>${state.people.length} contacts</strong></span>`;
      } else {
        metaContainer.innerHTML = `
          <span>📞 ${activePerson.phone || 'No phone set'}</span>
          <span>${activePerson.notes ? `📝 ${escapeHtml(activePerson.notes)}` : ''}</span>
        `;
      }
    }
  }

  function renderKPIs() {
    const metrics = computeMetrics();
    const activePerson = getActivePerson();

    const dueEl = document.getElementById('kpi-net-due');
    if (dueEl) dueEl.textContent = formatCurrency(metrics.netDue);

    const totalEl = document.getElementById('kpi-total-advanced');
    if (totalEl) totalEl.textContent = formatCurrency(metrics.totalExpenses);

    const settledEl = document.getElementById('kpi-total-settled');
    if (settledEl) settledEl.textContent = formatCurrency(metrics.totalSettled);

    const kpiPersonNameEl = document.getElementById('kpi-person-name');
    if (kpiPersonNameEl) {
      kpiPersonNameEl.textContent = activePerson.name;
    }
  }

  function renderLedger() {
    const expensesTabBtn = document.getElementById('tab-btn-expenses');
    const settlementsTabBtn = document.getElementById('tab-btn-settlements');
    const expensesCountBadge = document.getElementById('expenses-count-badge');
    const settlementsCountBadge = document.getElementById('settlements-count-badge');

    const metrics = computeMetrics();
    if (expensesCountBadge) expensesCountBadge.textContent = metrics.totalCount;
    if (settlementsCountBadge) {
      const pSettlements = state.activePersonId === 'all'
        ? state.settlements
        : state.settlements.filter(s => s.personId === state.activePersonId);
      settlementsCountBadge.textContent = pSettlements.length;
    }

    if (expensesTabBtn && settlementsTabBtn) {
      if (state.activeTab === 'expenses') {
        expensesTabBtn.classList.add('active');
        settlementsTabBtn.classList.remove('active');
        renderExpensesTable();
      } else {
        settlementsTabBtn.classList.add('active');
        expensesTabBtn.classList.remove('active');
        renderSettlementsTable();
      }
    }
  }

  function renderExpensesTable() {
    const tableContainer = document.getElementById('ledger-table-container');
    if (!tableContainer) return;

    let items = state.activePersonId === 'all'
      ? [...state.expenses]
      : state.expenses.filter(e => e.personId === state.activePersonId);

    // Apply Search Filter
    if (state.filters.search) {
      const query = state.filters.search.toLowerCase();
      items = items.filter(e =>
        (e.title && e.title.toLowerCase().includes(query)) ||
        (e.notes && e.notes.toLowerCase().includes(query)) ||
        (e.referenceNo && e.referenceNo.toLowerCase().includes(query)) ||
        (e.paidVia && e.paidVia.toLowerCase().includes(query))
      );
    }

    // Apply Category Filter
    if (state.filters.category && state.filters.category !== 'all') {
      items = items.filter(e => e.category === state.filters.category);
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (items.length === 0) {
      tableContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🧾</div>
          <div class="empty-title">No expenses found</div>
          <div class="empty-desc">
            ${state.filters.search || state.filters.category !== 'all'
              ? 'No transactions match the selected filters. Try clearing your search.'
              : 'You have not recorded any expenses for this person yet. Click "+ Add Expense" or use a quick preset above!'}
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.dueTrackApp.openAddExpenseModal()">+ Add First Expense</button>
        </div>
      `;
      return;
    }

    let rowsHtml = '';
    items.forEach(exp => {
      const cat = getCategoryObj(exp.category);
      const person = state.people.find(p => p.id === exp.personId);

      rowsHtml += `
        <tr data-expense-id="${exp.id}">
          <td>
            <div style="font-weight: 600;">${formatDate(exp.date)}</div>
            ${state.activePersonId === 'all' && person ? `<div style="font-size: 0.75rem; color: var(--text-dim);">${escapeHtml(person.name)}</div>` : ''}
          </td>
          <td>
            <div class="category-cell">
              <div class="category-icon-box" style="border-color: ${cat.color}40; background: ${cat.color}15;">
                <span>${cat.icon}</span>
              </div>
              <div class="category-title-wrap">
                <span class="category-title">${escapeHtml(exp.title)}</span>
                <span class="category-subtitle">${cat.name}${exp.referenceNo ? ` • Ref: ${escapeHtml(exp.referenceNo)}` : ''}</span>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(exp.paidVia || 'UPI')}</div>
            ${exp.notes ? `<div style="font-size: 0.75rem; color: var(--text-dim); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(exp.notes)}">📝 ${escapeHtml(exp.notes)}</div>` : ''}
          </td>
          <td style="text-align: right;">
            <div class="amount-val">
              ${formatCurrency(exp.amount)}
            </div>
          </td>
          <td style="text-align: right;">
            <div class="action-cell">
              <button class="action-btn" title="Edit Expense" onclick="window.dueTrackApp.openEditExpenseModal('${exp.id}')">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="action-btn delete-btn" title="Delete Expense" onclick="window.dueTrackApp.deleteExpense('${exp.id}')">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tableContainer.innerHTML = `
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th style="width: 120px;">Date</th>
              <th>Expense Details</th>
              <th style="width: 180px;">Paid By Me Via</th>
              <th style="width: 140px; text-align: right;">Amount</th>
              <th style="width: 100px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderSettlementsTable() {
    const tableContainer = document.getElementById('ledger-table-container');
    if (!tableContainer) return;

    let items = state.activePersonId === 'all'
      ? [...state.settlements]
      : state.settlements.filter(s => s.personId === state.activePersonId);

    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (items.length === 0) {
      tableContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🤝</div>
          <div class="empty-title">No repayments recorded</div>
          <div class="empty-desc">
            When Person XYZ or anyone pays you back via GPay, PhonePe, Bank Transfer, or Cash, record it here to offset the balance.
          </div>
          <button class="btn btn-success btn-sm" onclick="window.dueTrackApp.openRecordSettlementModal()">+ Record Repayment</button>
        </div>
      `;
      return;
    }

    let rowsHtml = '';
    items.forEach(stl => {
      const person = state.people.find(p => p.id === stl.personId);
      rowsHtml += `
        <tr>
          <td>
            <div style="font-weight: 600;">${formatDate(stl.date)}</div>
            ${state.activePersonId === 'all' && person ? `<div style="font-size: 0.75rem; color: var(--text-dim);">${escapeHtml(person.name)}</div>` : ''}
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">Repayment Received</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${stl.notes ? escapeHtml(stl.notes) : 'General repayment against balance'}</div>
          </td>
          <td>
            <div style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(stl.mode || 'UPI')}</div>
            ${stl.referenceNo ? `<div style="font-size: 0.75rem; color: var(--text-dim);">Ref: ${escapeHtml(stl.referenceNo)}</div>` : ''}
          </td>
          <td>
            <span class="status-pill status-settled">
              <span class="status-dot"></span>
              Received
            </span>
          </td>
          <td style="text-align: right;">
            <div class="amount-val settled-text">
              +${formatCurrency(stl.amount)}
            </div>
          </td>
          <td style="text-align: right;">
            <div class="action-cell">
              <button class="action-btn delete-btn" title="Delete Settlement Record" onclick="window.dueTrackApp.deleteSettlement('${stl.id}')">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tableContainer.innerHTML = `
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th style="width: 120px;">Date</th>
              <th>Description</th>
              <th style="width: 180px;">Payment Mode</th>
              <th style="width: 140px;">Type</th>
              <th style="width: 140px; text-align: right;">Amount Received</th>
              <th style="width: 120px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderStatementPrintHeader() {
    const printHeader = document.getElementById('print-statement-header');
    if (!printHeader) return;

    const activePerson = getActivePerson();
    const metrics = computeMetrics();
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    printHeader.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
        <div>
          <h1 style="font-size: 1.5rem; margin: 0; color: #111;">STATEMENT OF EXPENSES PAID ON BEHALF</h1>
          <div style="font-size: 0.9rem; color: #555; margin-top: 4px;">Prepared by: <strong>${escapeHtml(state.settings.userName)}</strong></div>
          <div style="font-size: 0.85rem; color: #666;">Date of Generation: ${today}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.85rem; color: #666; text-transform: uppercase;">Beneficiary / For:</div>
          <div style="font-size: 1.25rem; font-weight: bold; color: #111;">${escapeHtml(activePerson.name)}</div>
          ${activePerson.phone ? `<div style="font-size: 0.85rem; color: #555;">Phone: ${escapeHtml(activePerson.phone)}</div>` : ''}
        </div>
      </div>
      <div style="background: #f4f4f5; padding: 12px 18px; border-radius: 6px; display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 20px;">
        <div>Total Expenses Advanced: <strong>${formatCurrency(metrics.totalExpenses)}</strong></div>
        <div>Total Repayments Received: <strong>${formatCurrency(metrics.totalSettled)}</strong></div>
        <div style="color: #b91c1c; font-weight: bold; font-size: 1rem;">NET BALANCE DUE: ${formatCurrency(metrics.netDue)}</div>
      </div>
      <div style="margin-bottom: 12px; font-weight: 600; font-size: 0.95rem;">Itemized Expenses Breakdown:</div>
    `;
  }

  // Modals & User Actions
  function openAddExpenseModal(prefillCategory = null, prefillTitle = '', prefillAmount = '') {
    state.editingExpenseId = null;
    document.getElementById('modal-expense-title').textContent = 'Add Expense Paid on Behalf';
    document.getElementById('exp-form-id').value = '';
    document.getElementById('exp-form-date').value = getTodayDateString();
    document.getElementById('exp-form-title').value = prefillTitle;
    document.getElementById('exp-form-amount').value = prefillAmount;
    document.getElementById('exp-form-category').value = prefillCategory || 'train';
    document.getElementById('exp-form-paidvia').value = 'UPI (GPay / PhonePe / Paytm)';
    document.getElementById('exp-form-ref').value = '';
    document.getElementById('exp-form-notes').value = '';

    // Populate person dropdown in modal
    const personSelect = document.getElementById('exp-form-person');
    personSelect.innerHTML = state.people.map(p => `
      <option value="${p.id}" ${p.id === state.activePersonId ? 'selected' : ''}>${escapeHtml(p.name)}</option>
    `).join('');

    openModal('modal-expense');
    document.getElementById('exp-form-title').focus();
  }

  function openEditExpenseModal(id) {
    const exp = state.expenses.find(e => e.id === id);
    if (!exp) return;

    state.editingExpenseId = id;
    document.getElementById('modal-expense-title').textContent = 'Edit Expense';
    document.getElementById('exp-form-id').value = exp.id;
    document.getElementById('exp-form-date').value = exp.date;
    document.getElementById('exp-form-title').value = exp.title;
    document.getElementById('exp-form-amount').value = exp.amount;
    document.getElementById('exp-form-category').value = exp.category;
    document.getElementById('exp-form-paidvia').value = exp.paidVia || 'UPI (GPay / PhonePe / Paytm)';
    document.getElementById('exp-form-ref').value = exp.referenceNo || '';
    document.getElementById('exp-form-notes').value = exp.notes || '';

    const personSelect = document.getElementById('exp-form-person');
    personSelect.innerHTML = state.people.map(p => `
      <option value="${p.id}" ${p.id === exp.personId ? 'selected' : ''}>${escapeHtml(p.name)}</option>
    `).join('');

    openModal('modal-expense');
  }

  function saveExpenseForm() {
    const form = document.getElementById('form-add-expense');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const id = document.getElementById('exp-form-id').value;
    const date = document.getElementById('exp-form-date').value;
    const personId = document.getElementById('exp-form-person').value;
    const title = document.getElementById('exp-form-title').value.trim();
    const amount = parseFloat(document.getElementById('exp-form-amount').value);
    const category = document.getElementById('exp-form-category').value;
    const paidVia = document.getElementById('exp-form-paidvia').value;
    const referenceNo = document.getElementById('exp-form-ref').value.trim();
    const notes = document.getElementById('exp-form-notes').value.trim();

    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid expense amount', 'warning');
      return;
    }

    if (id) {
      // Edit
      const index = state.expenses.findIndex(e => e.id === id);
      if (index !== -1) {
        state.expenses[index] = {
          ...state.expenses[index],
          date,
          personId,
          title,
          amount,
          category,
          paidVia,
          referenceNo,
          notes,
          updatedAt: new Date().toISOString()
        };
        showToast('Expense updated successfully', 'success');
      }
    } else {
      // Create new
      const newExp = {
        id: 'exp-' + Date.now(),
        personId,
        date,
        category,
        title,
        amount,
        paidVia,
        referenceNo,
        notes,
        isSettled: false,
        settlementId: null,
        createdAt: new Date().toISOString()
      };
      state.expenses.unshift(newExp);
      showToast(`Added ${title} (${formatCurrency(amount)})`, 'success');
    }

    saveState();
    closeModal('modal-expense');
    renderAll();
  }

  function quickToggleSettle(id) {
    const exp = state.expenses.find(e => e.id === id);
    if (!exp) return;

    exp.isSettled = !exp.isSettled;
    saveState();
    renderAll();

    if (exp.isSettled) {
      showToast(`Marked "${exp.title}" as Settled`, 'success');
    } else {
      showToast(`Marked "${exp.title}" as Due`, 'info');
    }
  }

  function deleteExpense(id) {
    const exp = state.expenses.find(e => e.id === id);
    if (!exp) return;

    if (confirm(`Are you sure you want to delete "${exp.title}" (${formatCurrency(exp.amount)})?`)) {
      state.expenses = state.expenses.filter(e => e.id !== id);
      saveState();
      renderAll();
      showToast('Expense deleted', 'info');
    }
  }

  // Settlement Form & Actions
  function openRecordSettlementModal() {
    const metrics = computeMetrics();
    const activePerson = getActivePerson();

    document.getElementById('stl-form-date').value = getTodayDateString();
    document.getElementById('stl-form-amount').value = metrics.netDue > 0 ? metrics.netDue : '';
    document.getElementById('stl-form-mode').value = 'UPI (GPay / PhonePe / Paytm)';
    document.getElementById('stl-form-ref').value = '';
    document.getElementById('stl-form-notes').value = `Full settlement of pending due (${formatCurrency(metrics.netDue)})`;

    const personSelect = document.getElementById('stl-form-person');
    personSelect.innerHTML = state.people.map(p => `
      <option value="${p.id}" ${p.id === activePerson.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>
    `).join('');

    openModal('modal-settlement');
  }

  function saveSettlementForm() {
    const personId = document.getElementById('stl-form-person').value;
    const date = document.getElementById('stl-form-date').value;
    const amount = parseFloat(document.getElementById('stl-form-amount').value);
    const mode = document.getElementById('stl-form-mode').value;
    const referenceNo = document.getElementById('stl-form-ref').value.trim();
    const notes = document.getElementById('stl-form-notes').value.trim();

    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid received amount', 'warning');
      return;
    }

    const newStl = {
      id: 'stl-' + Date.now(),
      personId,
      date,
      amount,
      mode,
      referenceNo,
      notes,
      createdAt: new Date().toISOString()
    };

    state.settlements.unshift(newStl);

    // If settled amount covers unpaid expenses, also mark them settled
    let remainingCredit = amount;
    const unpaid = state.expenses
      .filter(e => e.personId === personId && !e.isSettled)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    for (const exp of unpaid) {
      if (remainingCredit >= exp.amount) {
        exp.isSettled = true;
        exp.settlementId = newStl.id;
        remainingCredit -= exp.amount;
      }
    }

    saveState();
    closeModal('modal-settlement');
    renderAll();
    showToast(`Recorded repayment of ${formatCurrency(amount)}!`, 'success');
  }

  function deleteSettlement(id) {
    if (confirm('Are you sure you want to delete this repayment record?')) {
      // Revert expenses tied to this settlement
      state.expenses.forEach(e => {
        if (e.settlementId === id) {
          e.isSettled = false;
          e.settlementId = null;
        }
      });

      state.settlements = state.settlements.filter(s => s.id !== id);
      saveState();
      renderAll();
      showToast('Settlement record removed', 'info');
    }
  }

  // Statement & WhatsApp Generator
  function openStatementModal() {
    const activePerson = getActivePerson();
    const metrics = computeMetrics();

    let items = state.activePersonId === 'all'
      ? [...state.expenses]
      : state.expenses.filter(e => e.personId === state.activePersonId);

    // All items sorted by date
    const expenseList = items.sort((a, b) => new Date(a.date) - new Date(b.date));
    const symbol = state.settings.currencySymbol || '₹';
    const userName = state.settings.userName || 'Me';
    const upiId = state.settings.userUpiId || 'your-upi-id';
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    let lines = [];
    lines.push(`📋 *EXPENSE STATEMENT*`);
    lines.push(`From: *${userName}*`);
    lines.push(`For: *${activePerson.name}*`);
    lines.push(`Date: ${today}`);
    lines.push(`────────────────────────`);
    lines.push(`🧾 *Itemized Expenses Paid on Your Behalf:*`);

    if (expenseList.length === 0) {
      lines.push(`(No expenses recorded yet.)`);
    } else {
      expenseList.forEach((item, idx) => {
        const cat = getCategoryObj(item.category);
        lines.push(`${idx + 1}. *${formatDate(item.date)}* - ${item.title}`);
        lines.push(`   ↳ ${cat.icon} ${symbol}${item.amount.toLocaleString('en-IN')} [Paid via: ${item.paidVia || 'UPI'}]${item.referenceNo ? ` (Ref: ${item.referenceNo})` : ''}`);
      });
    }

    lines.push(`────────────────────────`);
    lines.push(`💰 *Total Expenses Advanced:* ${symbol}${metrics.totalExpenses.toLocaleString('en-IN')}`);
    lines.push(`✅ *Repayments Received:* ${symbol}${metrics.totalSettled.toLocaleString('en-IN')}`);
    lines.push(`🚨 *TOTAL BALANCE DUE: ${symbol}${metrics.netDue.toLocaleString('en-IN')}*`);
    lines.push(`────────────────────────`);
    lines.push(`📲 *Please settle up via UPI:*`);
    lines.push(`👉 *${upiId}*`);
    lines.push(``);
    lines.push(`_Kindly verify and confirm once settled. Thank you!_`);

    const fullMessage = lines.join('\n');
    document.getElementById('whatsapp-preview-box').textContent = fullMessage;
    document.getElementById('statement-for-name').textContent = activePerson.name;

    openModal('modal-statement');
  }

  function copyWhatsAppMessage() {
    const text = document.getElementById('whatsapp-preview-box').textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Statement copied to clipboard! Ready to paste into WhatsApp.', 'success');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Statement copied to clipboard!', 'success');
    } catch (err) {
      showToast('Failed to copy. Please select and copy manually.', 'warning');
    }
    document.body.removeChild(textArea);
  }

  function sendViaWhatsAppWeb() {
    const text = document.getElementById('whatsapp-preview-box').textContent;
    const activePerson = getActivePerson();
    let phoneParam = '';
    if (activePerson.phone) {
      const cleanPhone = activePerson.phone.replace(/[^0-9]/g, '');
      if (cleanPhone) phoneParam = `phone=${cleanPhone}&`;
    }
    const url = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  // Manage People Modal
  function openPeopleModal() {
    renderPeopleList();
    openModal('modal-people');
  }

  function renderPeopleList() {
    const container = document.getElementById('people-list-container');
    if (!container) return;

    let html = '';
    state.people.forEach(p => {
      const pExpenses = state.expenses.filter(e => e.personId === p.id).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const pSettled = state.settlements.filter(s => s.personId === p.id).reduce((sum, stl) => sum + Number(stl.amount || 0), 0);
      const due = Math.max(0, pExpenses - pSettled);

      html += `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-input); border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${p.avatarColor || '#6366f1'}; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff;">
              ${p.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight: 600;">${escapeHtml(p.name)}</div>
              <div style="font-size: 0.76rem; color: var(--text-muted);">${p.phone ? escapeHtml(p.phone) : 'No phone'} • Due: <strong>${formatCurrency(due)}</strong></div>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="action-btn delete-btn" title="Delete Person" onclick="window.dueTrackApp.deletePerson('${p.id}')">
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function addNewPerson() {
    const nameInput = document.getElementById('new-person-name');
    const phoneInput = document.getElementById('new-person-phone');
    const notesInput = document.getElementById('new-person-notes');

    const name = nameInput.value.trim();
    if (!name) {
      showToast('Please enter person name', 'warning');
      return;
    }

    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newPerson = {
      id: 'person-' + Date.now(),
      name,
      phone: phoneInput.value.trim(),
      notes: notesInput.value.trim(),
      avatarColor: randomColor,
      createdAt: new Date().toISOString()
    };

    state.people.push(newPerson);
    state.activePersonId = newPerson.id;
    saveState();

    nameInput.value = '';
    phoneInput.value = '';
    notesInput.value = '';

    renderPeopleList();
    renderAll();
    showToast(`Added contact "${name}"`, 'success');
  }

  function deletePerson(personId) {
    if (state.people.length <= 1) {
      showToast('You must have at least one person in your list', 'warning');
      return;
    }

    const person = state.people.find(p => p.id === personId);
    if (!person) return;

    if (confirm(`Delete "${person.name}" and all their associated expenses & settlements?`)) {
      state.people = state.people.filter(p => p.id !== personId);
      state.expenses = state.expenses.filter(e => e.personId !== personId);
      state.settlements = state.settlements.filter(s => s.personId !== personId);

      if (state.activePersonId === personId) {
        state.activePersonId = state.people[0]?.id || 'all';
      }

      saveState();
      renderPeopleList();
      renderAll();
      showToast(`Removed "${person.name}"`, 'info');
    }
  }

  // Settings Modal & Data Backup
  function openSettingsModal() {
    document.getElementById('settings-my-name').value = state.settings.userName || '';
    document.getElementById('settings-my-upi').value = state.settings.userUpiId || '';
    document.getElementById('settings-currency').value = state.settings.currencySymbol || '₹';
    openModal('modal-settings');
  }

  function saveSettings() {
    state.settings.userName = document.getElementById('settings-my-name').value.trim() || 'My Account';
    state.settings.userUpiId = document.getElementById('settings-my-upi').value.trim() || 'myupi@bank';
    state.settings.currencySymbol = document.getElementById('settings-currency').value.trim() || '₹';

    saveState();
    closeModal('modal-settings');
    renderAll();
    showToast('Settings saved successfully', 'success');
  }

  function exportBackupJson() {
    const backupData = {
      version: 1,
      exportDate: new Date().toISOString(),
      settings: state.settings,
      people: state.people,
      expenses: state.expenses,
      settlements: state.settlements
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ExpensesManager_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup JSON downloaded', 'success');
  }

  function importBackupJson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (data && data.expenses && data.people) {
          state.settings = data.settings || state.settings;
          state.people = data.people;
          state.expenses = data.expenses;
          state.settlements = data.settlements || [];
          state.activePersonId = state.people[0]?.id || 'all';

          saveState();
          renderAll();
          showToast('Backup restored successfully!', 'success');
          closeModal('modal-settings');
        } else {
          showToast('Invalid backup file format', 'warning');
        }
      } catch (err) {
        showToast('Error reading backup file', 'warning');
      }
    };
    reader.readAsText(file);
  }

  function exportCsv() {
    const items = state.activePersonId === 'all'
      ? state.expenses
      : state.expenses.filter(e => e.personId === state.activePersonId);

    if (items.length === 0) {
      showToast('No expenses to export', 'warning');
      return;
    }

    const headers = ['Date', 'Person', 'Category', 'Expense Title', 'Amount', 'Payment Mode', 'Reference No', 'Notes'];
    const rows = items.map(exp => {
      const p = state.people.find(person => person.id === exp.personId);
      const cat = getCategoryObj(exp.category);
      return [
        exp.date,
        p ? `"${p.name.replace(/"/g, '""')}"` : 'Unknown',
        `"${cat.name}"`,
        `"${(exp.title || '').replace(/"/g, '""')}"`,
        exp.amount,
        `"${(exp.paidVia || '').replace(/"/g, '""')}"`,
        `"${(exp.referenceNo || '').replace(/"/g, '""')}"`,
        `"${(exp.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ExpensesManager_${state.activePersonId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV export downloaded', 'success');
  }

  function resetSampleData() {
    if (confirm('Reset everything to initial sample data? All custom expenses will be overwritten.')) {
      state.settings = { ...DEFAULT_SETTINGS };
      state.people = [...DEFAULT_PEOPLE];
      state.expenses = [...DEFAULT_EXPENSES];
      state.settlements = [...DEFAULT_SETTLEMENTS];
      state.activePersonId = 'person-xyz';
      saveState();
      renderAll();
      showToast('Reset to default sample data', 'info');
      closeModal('modal-settings');
    }
  }

  // Theme Management
  function toggleTheme() {
    const newTheme = state.settings.theme === 'light' ? 'dark' : 'light';
    state.settings.theme = newTheme;
    applyTheme(newTheme);
    saveState();
    renderHeader();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Helper Functions
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
    }
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function setupTodayDates() {
    const today = getTodayDateString();
    const expDate = document.getElementById('exp-form-date');
    if (expDate) expDate.value = today;
    const stlDate = document.getElementById('stl-form-date');
    if (stlDate) stlDate.value = today;
  }

  // Event Listeners Setup
  function attachEventListeners() {
    // Person switch click
    document.getElementById('person-tabs-container').addEventListener('click', (e) => {
      const btn = e.target.closest('.person-tab-btn');
      if (!btn) return;
      const personId = btn.getAttribute('data-person-id');
      if (personId) {
        state.activePersonId = personId;
        renderAll();
      }
    });

    // Tab switch (Expenses vs Settlements)
    document.getElementById('tab-btn-expenses').addEventListener('click', () => {
      state.activeTab = 'expenses';
      renderLedger();
    });
    document.getElementById('tab-btn-settlements').addEventListener('click', () => {
      state.activeTab = 'settlements';
      renderLedger();
    });

    // Search input
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        renderExpensesTable();
      });
    }

    // Category filter
    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        state.filters.category = e.target.value;
        renderExpensesTable();
      });
    }



    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // Modal Close buttons (backdrop and close button)
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('open');
        }
      });
    });

    document.querySelectorAll('.modal-close-btn, .btn-modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-backdrop');
        if (modal) modal.classList.remove('open');
      });
    });
  }

  // Notion & CSV Import System
  let pendingNotionExpenses = [];

  function openNotionImportModal() {
    pendingNotionExpenses = [];
    const personSelect = document.getElementById('notion-import-person');
    if (personSelect) {
      personSelect.innerHTML = state.people.map(p => `
        <option value="${p.id}" ${p.id === state.activePersonId ? 'selected' : ''}>${escapeHtml(p.name)}</option>
      `).join('');
    }

    const fileInput = document.getElementById('notion-csv-file-input');
    if (fileInput) fileInput.value = '';
    const fileStatus = document.getElementById('notion-file-status');
    if (fileStatus) fileStatus.textContent = '';
    const pasteArea = document.getElementById('notion-paste-textarea');
    if (pasteArea) pasteArea.value = '';
    const previewBox = document.getElementById('notion-preview-box');
    if (previewBox) previewBox.style.display = 'none';

    switchNotionTab('upload');
    openModal('modal-notion-import');
  }

  function switchNotionTab(tab) {
    const uploadBtn = document.getElementById('notion-tab-upload-btn');
    const pasteBtn = document.getElementById('notion-tab-paste-btn');
    const uploadPanel = document.getElementById('notion-upload-panel');
    const pastePanel = document.getElementById('notion-paste-panel');

    if (tab === 'upload') {
      if (uploadBtn) uploadBtn.classList.add('active');
      if (pasteBtn) pasteBtn.classList.remove('active');
      if (uploadPanel) uploadPanel.style.display = 'block';
      if (pastePanel) pastePanel.style.display = 'none';
    } else {
      if (pasteBtn) pasteBtn.classList.add('active');
      if (uploadBtn) uploadBtn.classList.remove('active');
      if (uploadPanel) uploadPanel.style.display = 'none';
      if (pastePanel) pastePanel.style.display = 'block';
    }
  }

  function handleNotionFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileStatus = document.getElementById('notion-file-status');
    if (fileStatus) fileStatus.textContent = `Loaded: ${file.name} (${Math.round(file.size / 1024)} KB)`;

    const reader = new FileReader();
    reader.onload = function(e) {
      parseNotionData(e.target.result);
    };
    reader.readAsText(file);
  }

  function handleNotionPasteInput() {
    const pasteArea = document.getElementById('notion-paste-textarea');
    if (!pasteArea) return;
    parseNotionData(pasteArea.value);
  }

  function parseNotionData(text) {
    if (!text || !text.trim()) {
      pendingNotionExpenses = [];
      const previewBox = document.getElementById('notion-preview-box');
      if (previewBox) previewBox.style.display = 'none';
      return;
    }

    const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      return;
    }

    // Determine delimiter: tab or comma
    const firstLine = lines[0];
    const isTab = firstLine.includes('\t');
    const delimiter = isTab ? '\t' : ',';

    function splitLine(line) {
      if (isTab) {
        return line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
      }
      // Simple CSV split with quotes handling
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim().replace(/^["']|["']$/g, ''));
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim().replace(/^["']|["']$/g, ''));
      return result;
    }

    const header = splitLine(firstLine).map(h => h.toLowerCase().trim());
    
    // Column index matching
    let dateIdx = header.findIndex(h => h.includes('date') || h.includes('when') || h.includes('time') || h.includes('created'));
    let titleIdx = header.findIndex(h => h.includes('name') || h.includes('title') || h.includes('expense') || h.includes('item') || h.includes('description') || h.includes('particular'));
    let amountIdx = header.findIndex(h => h.includes('amount') || h.includes('cost') || h.includes('price') || h.includes('total') || h.includes('rs') || h.includes('inr') || h.includes('fee'));
    let catIdx = header.findIndex(h => h.includes('category') || h.includes('type') || h.includes('tag'));
    let statusIdx = header.findIndex(h => h.includes('status') || h.includes('settled') || h.includes('paid'));
    let refIdx = header.findIndex(h => h.includes('ref') || h.includes('pnr') || h.includes('id') || h.includes('bill'));
    let notesIdx = header.findIndex(h => h.includes('note') || h.includes('comment') || h.includes('remark'));

    // Fallbacks if no header detected
    if (titleIdx === -1 && header.length >= 1) titleIdx = 0;
    if (amountIdx === -1 && header.length >= 2) amountIdx = 1;
    if (dateIdx === -1) dateIdx = -1;

    const parsed = [];
    const today = getTodayDateString();

    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i]);
      if (cols.length === 0 || cols.every(c => !c)) continue;

      let rawTitle = titleIdx !== -1 && cols[titleIdx] ? cols[titleIdx] : `Expense #${i}`;
      let rawAmountStr = amountIdx !== -1 && cols[amountIdx] ? cols[amountIdx] : '0';
      // Clean amount: remove currency symbols, commas
      let cleanAmount = parseFloat(rawAmountStr.replace(/[^0-9.-]+/g, ''));
      if (isNaN(cleanAmount) || cleanAmount <= 0) continue;

      // Extract date
      let rawDate = dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx].trim() : today;
      let formattedDate = today;
      if (rawDate) {
        // Try parsing YYYY-MM-DD, DD/MM/YYYY, or Date.parse
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          formattedDate = rawDate;
        } else if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(rawDate)) {
          const parts = rawDate.split(/[\/-]/);
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          formattedDate = `${year}-${month}-${day}`;
        } else {
          const parsedD = new Date(rawDate);
          if (!isNaN(parsedD.getTime())) {
            formattedDate = parsedD.toISOString().split('T')[0];
          }
        }
      }

      // Infer Category
      let cat = 'other';
      const catText = ((catIdx !== -1 ? cols[catIdx] : '') + ' ' + rawTitle).toLowerCase();
      if (catText.includes('train') || catText.includes('irctc') || catText.includes('tatkal') || catText.includes('rail') || catText.includes('ticket')) {
        cat = 'train';
      } else if (catText.includes('recharge') || catText.includes('mobile') || catText.includes('jio') || catText.includes('airtel') || catText.includes('phone') || catText.includes('dth')) {
        cat = 'recharge';
      } else if (catText.includes('petty') || catText.includes('chai') || catText.includes('tea') || catText.includes('snack') || catText.includes('errand')) {
        cat = 'petty';
      } else if (catText.includes('cab') || catText.includes('auto') || catText.includes('uber') || catText.includes('ola') || catText.includes('taxi')) {
        cat = 'cab';
      } else if (catText.includes('food') || catText.includes('dinner') || catText.includes('lunch') || catText.includes('restaurant') || catText.includes('cafe')) {
        cat = 'food';
      } else if (catText.includes('grocer') || catText.includes('blinkit') || catText.includes('instamart') || catText.includes('supermarket')) {
        cat = 'groceries';
      } else if (catText.includes('bill') || catText.includes('wifi') || catText.includes('electric') || catText.includes('utilit')) {
        cat = 'utilities';
      }

      // Status
      let isSettled = false;
      if (statusIdx !== -1 && cols[statusIdx]) {
        const sVal = cols[statusIdx].toLowerCase();
        if (sVal.includes('settle') || sVal.includes('paid') || sVal.includes('done') || sVal.includes('cleared')) {
          isSettled = true;
        }
      }

      parsed.push({
        id: 'exp-notion-' + Date.now() + '-' + i,
        date: formattedDate,
        title: rawTitle,
        amount: cleanAmount,
        category: cat,
        paidVia: 'UPI / Direct',
        referenceNo: refIdx !== -1 && cols[refIdx] ? cols[refIdx] : '',
        notes: notesIdx !== -1 && cols[notesIdx] ? cols[notesIdx] : 'Imported from Notion',
        isSettled: isSettled,
        settlementId: null,
        createdAt: new Date().toISOString()
      });
    }

    pendingNotionExpenses = parsed;

    const previewBox = document.getElementById('notion-preview-box');
    const previewCount = document.getElementById('notion-preview-count');
    const previewTotal = document.getElementById('notion-preview-total');

    if (previewBox && previewCount && previewTotal) {
      if (parsed.length > 0) {
        previewBox.style.display = 'block';
        previewCount.textContent = `✅ ${parsed.length} expense(s) ready to import`;
        const totalSum = parsed.reduce((sum, item) => sum + item.amount, 0);
        previewTotal.textContent = `Total Sum: ${formatCurrency(totalSum)}`;
      } else {
        previewBox.style.display = 'none';
      }
    }
  }

  function confirmNotionImport() {
    if (pendingNotionExpenses.length === 0) {
      showToast('No valid expenses to import', 'warning');
      return;
    }

    const targetPersonId = document.getElementById('notion-import-person')?.value || state.activePersonId;

    pendingNotionExpenses.forEach(exp => {
      exp.personId = targetPersonId;
      state.expenses.unshift(exp);
    });

    saveState();
    closeModal('modal-notion-import');
    renderAll();
    showToast(`Successfully imported ${pendingNotionExpenses.length} expenses from Notion!`, 'success');
    pendingNotionExpenses = [];
  }

  // Expose global API for inline HTML handlers
  window.dueTrackApp = {
    openAddExpenseModal,
    openEditExpenseModal,
    saveExpenseForm,
    quickToggleSettle,
    deleteExpense,
    openRecordSettlementModal,
    saveSettlementForm,
    deleteSettlement,
    openStatementModal,
    copyWhatsAppMessage,
    sendViaWhatsAppWeb,
    openPeopleModal,
    addNewPerson,
    deletePerson,
    openSettingsModal,
    saveSettings,
    exportBackupJson,
    importBackupJson,
    exportCsv,
    resetSampleData,
    openNotionImportModal,
    switchNotionTab,
    handleNotionFileUpload,
    handleNotionPasteInput,
    confirmNotionImport,
    printStatement: () => window.print()
  };

  window.expensesManager = window.dueTrackApp;

  // Run init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

