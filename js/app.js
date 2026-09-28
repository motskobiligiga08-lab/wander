/* ===== Wander – Travel Companion PWA ===== */
(function () {
  'use strict';

  // ---------- Storage ----------
  const STORE_KEY = 'wander_data_v1';
  const defaultData = {
    trips: [],
    packingLists: [],
    expenses: [],
    journal: [],
    settings: { theme: 'light', currency: 'USD', budgetGoal: 0 }
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return structuredClone(defaultData);
      return { ...structuredClone(defaultData), ...JSON.parse(raw) };
    } catch {
      return structuredClone(defaultData);
    }
  }

  function save(data) {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  let state = load();

  // ---------- Helpers ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const fmtMoney = (n) => {
    const cur = state.settings.currency || 'USD';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(n || 0);
    } catch {
      return `${cur} ${(n || 0).toFixed(2)}`;
    }
  };
  const daysBetween = (a, b) => {
    const d1 = new Date(a + 'T00:00:00');
    const d2 = new Date(b + 'T00:00:00');
    return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
  };

  function toast(msg, ms = 2500) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add('hidden'), ms);
  }

  // ---------- Destinations data ----------
  const DESTINATIONS = [
    { id: 'paris', name: 'Paris', region: 'France · Europe', emoji: '🗼', tags: ['Culture', 'Food', 'Romance'], tips: 'Visit the Louvre early, try a classic croissant, and stroll along the Seine at sunset. Buy a Navigo pass for easy metro travel.' },
    { id: 'tokyo', name: 'Tokyo', region: 'Japan · Asia', emoji: '🏯', tags: ['Tech', 'Food', 'Culture'], tips: 'Get a Suica card, explore Asakusa & Shibuya, and try conveyor-belt sushi. Cherry blossom season (late March–April) is magical.' },
    { id: 'bali', name: 'Bali', region: 'Indonesia · Asia', emoji: '🏝️', tags: ['Beach', 'Nature', 'Wellness'], tips: 'Base yourself in Ubud or Canggu. Rent a scooter, visit rice terraces, and catch a sunrise at Mount Batur.' },
    { id: 'nyc', name: 'New York City', region: 'USA · North America', emoji: '🗽', tags: ['City', 'Culture', 'Food'], tips: 'Walk Central Park, take the Staten Island Ferry for free skyline views, and explore neighborhoods beyond Manhattan.' },
    { id: 'rome', name: 'Rome', region: 'Italy · Europe', emoji: '🏛️', tags: ['History', 'Food', 'Art'], tips: 'Book Colosseum tickets ahead, try authentic carbonara, and enjoy the golden hour at the Spanish Steps.' },
    { id: 'cape-town', name: 'Cape Town', region: 'South Africa · Africa', emoji: '🏔️', tags: ['Nature', 'Adventure', 'Wine'], tips: 'Hike Table Mountain, visit the Cape of Good Hope, and do a wine tasting in Stellenbosch.' },
    { id: 'sydney', name: 'Sydney', region: 'Australia · Oceania', emoji: 'オペラ', tags: ['Beach', 'City', 'Nature'], tips: 'Climb the Harbour Bridge, relax at Bondi, and take a ferry to Manly for a classic day out.' },
    { id: 'marrakech', name: 'Marrakech', region: 'Morocco · Africa', emoji: '🕌', tags: ['Culture', 'Markets', 'Food'], tips: 'Lose yourself in the medina, visit the Majorelle Garden, and try a traditional tagine.' },
    { id: 'barcelona', name: 'Barcelona', region: 'Spain · Europe', emoji: '⛪', tags: ['Architecture', 'Beach', 'Food'], tips: 'Explore Gaudí’s masterpieces, stroll La Rambla, and enjoy tapas in the Gothic Quarter.' },
    { id: 'reykjavik', name: 'Reykjavik', region: 'Iceland · Europe', emoji: '🌋', tags: ['Nature', 'Adventure', 'Northern Lights'], tips: 'Drive the Golden Circle, soak in the Blue Lagoon, and chase the aurora in winter.' }
  ];

  // ---------- Packing templates ----------
  const PACK_TEMPLATES = {
    general: [
      { cat: 'Documents', items: ['Passport / ID', 'Boarding passes', 'Travel insurance', 'Credit cards', 'Local currency'] },
      { cat: 'Clothing', items: ['T-shirts', 'Pants / jeans', 'Underwear', 'Socks', 'Sleepwear', 'Jacket / hoodie'] },
      { cat: 'Toiletries', items: ['Toothbrush & toothpaste', 'Shampoo', 'Deodorant', 'Sunscreen', 'Medications'] },
      { cat: 'Electronics', items: ['Phone + charger', 'Power bank', 'Adapters', 'Headphones', 'Camera'] },
      { cat: 'Misc', items: ['Reusable water bottle', 'Daypack', 'Snacks', 'Eye mask / earplugs'] }
    ],
    beach: [
      { cat: 'Beach Essentials', items: ['Swimsuit', 'Beach towel', 'Sunglasses', 'Hat', 'Flip-flops', 'Reef-safe sunscreen'] }
    ],
    cold: [
      { cat: 'Cold Weather', items: ['Warm coat', 'Thermal layers', 'Gloves', 'Scarf', 'Beanie', 'Waterproof boots'] }
    ],
    business: [
      { cat: 'Business', items: ['Formal outfit', 'Dress shoes', 'Laptop', 'Notebook', 'Business cards'] }
    ]
  };

  // ---------- Modal ----------
  function openModal(title, bodyHtml, footerHtml = '') {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = bodyHtml;
    $('#modal-footer').innerHTML = footerHtml;
    $('#modal').classList.remove('hidden');
  }
  function closeModal() {
    $('#modal').classList.add('hidden');
  }
  $('#modal-close').addEventListener('click', closeModal);
  $('.modal-backdrop').addEventListener('click', closeModal);

  // ---------- Navigation ----------
  let currentView = 'dashboard';

  function setActiveNav(view) {
    $$('.nav-item, .bottom-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });
  }

  function navigate(view) {
    currentView = view;
    setActiveNav(view);
    closeSidebar();
    render();
    window.scrollTo(0, 0);
  }

  $$('.nav-item, .bottom-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });

  // Sidebar
  function openSidebar() {
    $('#sidebar').classList.add('open');
    $('#overlay').classList.add('show');
  }
  function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#overlay').classList.remove('show');
  }
  $('#menu-btn').addEventListener('click', openSidebar);
  $('#overlay').addEventListener('click', closeSidebar);

  // Theme
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.settings.theme);
    $('#theme-btn').textContent = state.settings.theme === 'dark' ? '☀️' : '🌙';
  }
  $('#theme-btn').addEventListener('click', () => {
    state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    save(state);
    applyTheme();
  });

  // ---------- Renderers ----------
  function render() {
    const main = $('#main');
    switch (currentView) {
      case 'dashboard': main.innerHTML = renderDashboard(); break;
      case 'trips': main.innerHTML = renderTrips(); break;
      case 'packing': main.innerHTML = renderPacking(); break;
      case 'budget': main.innerHTML = renderBudget(); break;
      case 'journal': main.innerHTML = renderJournal(); break;
      case 'destinations': main.innerHTML = renderDestinations(); break;
      case 'settings': main.innerHTML = renderSettings(); break;
      default: main.innerHTML = renderDashboard();
    }
    bindViewEvents();
  }

  // --- Dashboard ---
  function renderDashboard() {
    const upcoming = state.trips
      .filter(t => t.endDate >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const totalSpent = state.expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const packedLists = state.packingLists.length;
    const entries = state.journal.length;

    return `
      <h2 class="section-title">Welcome back 👋</h2>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${state.trips.length}</div><div class="stat-label">Trips</div></div>
        <div class="stat-card"><div class="stat-value">${fmtMoney(totalSpent)}</div><div class="stat-label">Total spent</div></div>
        <div class="stat-card"><div class="stat-value">${packedLists}</div><div class="stat-label">Packing lists</div></div>
        <div class="stat-card"><div class="stat-value">${entries}</div><div class="stat-label">Journal entries</div></div>
      </div>
      <div class="quick-actions">
        <button class="quick-btn" data-action="new-trip"><div class="icon">🗓</div><span>New Trip</span></button>
        <button class="quick-btn" data-action="new-pack"><div class="icon">🧳</div><span>Packing List</span></button>
        <button class="quick-btn" data-action="new-expense"><div class="icon">💰</div><span>Add Expense</span></button>
        <button class="quick-btn" data-action="new-journal"><div class="icon">📔</div><span>Journal</span></button>
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title">Upcoming trips</h3>
          <button class="btn btn-sm btn-secondary" data-action="goto-trips">View all</button>
        </div>
        ${upcoming.length === 0 ? `
          <div class="empty-state">
            <div class="icon">✈️</div>
            <h3>No upcoming trips</h3>
            <p>Start planning your next adventure!</p>
            <button class="btn btn-primary" data-action="new-trip">Create a trip</button>
          </div>` : upcoming.slice(0, 3).map(t => tripCardHtml(t)).join('')}
      </div>
    `;
  }

  function tripCardHtml(t) {
    const days = daysBetween(t.startDate, t.endDate);
    return `
      <div class="trip-card" data-trip-id="${t.id}">
        <div class="trip-card-banner"><h3>${escapeHtml(t.name)}</h3></div>
        <div class="trip-card-body">
          <div class="trip-meta">
            <span>📍 ${escapeHtml(t.destination || 'TBD')}</span>
            <span>📅 ${fmtDate(t.startDate)} – ${fmtDate(t.endDate)}</span>
            <span>⏱ ${days} day${days > 1 ? 's' : ''}</span>
          </div>
          <div class="trip-actions">
            <button class="btn btn-sm btn-primary" data-action="view-trip" data-id="${t.id}">Itinerary</button>
            <button class="btn btn-sm btn-ghost" data-action="edit-trip" data-id="${t.id}">Edit</button>
          </div>
        </div>
      </div>`;
  }

  // --- Trips ---
  function renderTrips() {
    const sorted = [...state.trips].sort((a, b) => b.startDate.localeCompare(a.startDate));
    return `
      <div class="card-header" style="margin-bottom:1rem">
        <h2 class="section-title" style="margin:0">Trips & Itinerary</h2>
        <button class="btn btn-primary" data-action="new-trip">+ New Trip</button>
      </div>
      ${sorted.length === 0 ? `
        <div class="card"><div class="empty-state">
          <div class="icon">🗓</div><h3>No trips yet</h3>
          <p>Plan your first adventure with a day-by-day itinerary.</p>
          <button class="btn btn-primary" data-action="new-trip">Create trip</button>
        </div></div>` : sorted.map(t => tripCardHtml(t)).join('')}
    `;
  }

  function showTripDetail(id) {
    const trip = state.trips.find(t => t.id === id);
    if (!trip) return;
    if (!trip.days) trip.days = [];
    const daysHtml = trip.days.length === 0
      ? `<div class="empty-state"><p>No activities yet. Add a day to start planning.</p></div>`
      : trip.days.map((d, i) => `
        <div class="day-card">
          <div class="day-header">
            <span>Day ${i + 1} · ${fmtDate(d.date)}</span>
            <button class="btn btn-sm btn-ghost" data-action="add-activity" data-trip="${id}" data-day="${i}">+ Activity</button>
          </div>
          ${(d.activities || []).map((a, ai) => `
            <div class="activity-item">
              <div class="activity-time">${escapeHtml(a.time || '—')}</div>
              <div class="activity-content">
                <div class="activity-title">${escapeHtml(a.title)}</div>
                ${a.note ? `<div class="activity-note">${escapeHtml(a.note)}</div>` : ''}
              </div>
              <button class="icon-btn" data-action="del-activity" data-trip="${id}" data-day="${i}" data-act="${ai}" title="Remove">🗑</button>
            </div>`).join('') || '<div class="activity-item"><em style="color:var(--text-muted)">No activities</em></div>'}
        </div>`).join('');

    openModal(trip.name, `
      <p style="color:var(--text-muted);margin-bottom:1rem">📍 ${escapeHtml(trip.destination || '—')} · ${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}</p>
      ${daysHtml}
      <button class="btn btn-secondary btn-block" style="margin-top:1rem" data-action="add-day" data-id="${id}">+ Add Day</button>
    `, `<button class="btn btn-ghost" data-action="close-modal">Close</button>
        <button class="btn btn-primary" data-action="edit-trip" data-id="${id}">Edit Trip</button>`);
  }

  function showNewTripForm(existing = null) {
    const t = existing || {};
    openModal(existing ? 'Edit Trip' : 'New Trip', `
      <div class="form-group"><label>Trip name</label>
        <input class="form-control" id="f-name" value="${escapeHtml(t.name || '')}" placeholder="Summer in Italy" /></div>
      <div class="form-group"><label>Destination</label>
        <input class="form-control" id="f-dest" value="${escapeHtml(t.destination || '')}" placeholder="Rome, Italy" /></div>
      <div class="form-row">
        <div class="form-group"><label>Start date</label>
          <input class="form-control" type="date" id="f-start" value="${t.startDate || ''}" /></div>
        <div class="form-group"><label>End date</label>
          <input class="form-control" type="date" id="f-end" value="${t.endDate || ''}" /></div>
      </div>
      <div class="form-group"><label>Notes</label>
        <textarea class="form-control" id="f-notes" placeholder="Optional notes...">${escapeHtml(t.notes || '')}</textarea></div>
    `, `
      <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" data-action="save-trip" data-id="${t.id || ''}">Save</button>
    `);
  }

  // --- Packing ---
  function renderPacking() {
    return `
      <div class="card-header" style="margin-bottom:1rem">
        <h2 class="section-title" style="margin:0">Packing Lists</h2>
        <button class="btn btn-primary" data-action="new-pack">+ New List</button>
      </div>
      ${state.packingLists.length === 0 ? `
        <div class="card"><div class="empty-state">
          <div class="icon">🧳</div><h3>No packing lists</h3>
          <p>Create a smart list for your next trip.</p>
          <button class="btn btn-primary" data-action="new-pack">Create list</button>
        </div></div>` : state.packingLists.map(pl => {
          const total = pl.items.reduce((s, c) => s + c.items.length, 0);
          const checked = pl.items.reduce((s, c) => s + c.items.filter(i => i.checked).length, 0);
          const pct = total ? Math.round((checked / total) * 100) : 0;
          return `
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">${escapeHtml(pl.name)}</h3>
                  <small style="color:var(--text-muted)">${checked}/${total} packed · ${pct}%</small>
                </div>
                <div style="display:flex;gap:0.4rem">
                  <button class="btn btn-sm btn-ghost" data-action="edit-pack" data-id="${pl.id}">Edit</button>
                  <button class="btn btn-sm btn-danger" data-action="del-pack" data-id="${pl.id}">Delete</button>
                </div>
              </div>
              <div class="pack-progress"><div class="pack-progress-bar" style="width:${pct}%"></div></div>
              ${pl.items.map(cat => `
                <div class="pack-category">
                  <h4>${escapeHtml(cat.cat)}</h4>
                  ${cat.items.map((item, ii) => `
                    <div class="pack-item ${item.checked ? 'checked' : ''}">
                      <input type="checkbox" ${item.checked ? 'checked' : ''}
                        data-action="toggle-pack" data-list="${pl.id}" data-cat="${escapeHtml(cat.cat)}" data-idx="${ii}" />
                      <label>${escapeHtml(item.name)}</label>
                    </div>`).join('')}
                </div>`).join('')}
            </div>`;
        }).join('')}
    `;
  }

  function showNewPackForm() {
    openModal('New Packing List', `
      <div class="form-group"><label>List name</label>
        <input class="form-control" id="f-pname" placeholder="Beach trip – Bali" /></div>
      <div class="form-group"><label>Template</label>
        <select class="form-control" id="f-ptemplate">
          <option value="general">General travel</option>
          <option value="beach">+ Beach essentials</option>
          <option value="cold">+ Cold weather</option>
          <option value="business">+ Business travel</option>
        </select></div>
    `, `
      <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" data-action="save-pack">Create</button>
    `);
  }

  // --- Budget ---
  function renderBudget() {
    const total = state.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const goal = Number(state.settings.budgetGoal) || 0;
    const remaining = goal - total;
    const byCat = {};
    state.expenses.forEach(e => {
      byCat[e.category || 'Other'] = (byCat[e.category || 'Other'] || 0) + (Number(e.amount) || 0);
    });

    return `
      <div class="card-header" style="margin-bottom:1rem">
        <h2 class="section-title" style="margin:0">Budget Tracker</h2>
        <button class="btn btn-primary" data-action="new-expense">+ Expense</button>
      </div>
      <div class="budget-summary">
        <div class="budget-box spent"><div class="amount">${fmtMoney(total)}</div><div class="stat-label">Spent</div></div>
        <div class="budget-box remaining"><div class="amount">${fmtMoney(remaining)}</div><div class="stat-label">${goal ? 'Remaining' : 'No goal set'}</div></div>
      </div>
      ${Object.keys(byCat).length ? `
        <div class="card">
          <h3 class="card-title" style="margin-bottom:0.75rem">By category</h3>
          ${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v]) => `
            <div class="expense-item">
              <span>${escapeHtml(c)}</span>
              <span class="expense-amount">${fmtMoney(v)}</span>
            </div>`).join('')}
        </div>` : ''}
      <div class="card">
        <div class="card-header"><h3 class="card-title">Recent expenses</h3></div>
        ${state.expenses.length === 0 ? `
          <div class="empty-state"><div class="icon">💰</div><h3>No expenses yet</h3>
            <p>Track what you spend on your trips.</p>
            <button class="btn btn-primary" data-action="new-expense">Add expense</button>
          </div>` : [...state.expenses].reverse().slice(0, 20).map(e => `
            <div class="expense-item">
              <div class="expense-info">
                <strong>${escapeHtml(e.title)}</strong>
                <span class="expense-cat">${escapeHtml(e.category || 'Other')} · ${fmtDate(e.date)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem">
                <span class="expense-amount negative">${fmtMoney(e.amount)}</span>
                <button class="icon-btn" data-action="del-expense" data-id="${e.id}" title="Delete">🗑</button>
              </div>
            </div>`).join('')}
      </div>
    `;
  }

  function showNewExpenseForm() {
    openModal('Add Expense', `
      <div class="form-group"><label>Description</label>
        <input class="form-control" id="f-etitle" placeholder="Dinner at local restaurant" /></div>
      <div class="form-row">
        <div class="form-group"><label>Amount</label>
          <input class="form-control" type="number" step="0.01" id="f-eamount" placeholder="0.00" /></div>
        <div class="form-group"><label>Category</label>
          <select class="form-control" id="f-ecat">
            <option>Food</option><option>Transport</option><option>Accommodation</option>
            <option>Activities</option><option>Shopping</option><option>Other</option>
          </select></div>
      </div>
      <div class="form-group"><label>Date</label>
        <input class="form-control" type="date" id="f-edate" value="${new Date().toISOString().slice(0,10)}" /></div>
    `, `
      <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" data-action="save-expense">Save</button>
    `);
  }

  // --- Journal ---
  function renderJournal() {
    const sorted = [...state.journal].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return `
      <div class="card-header" style="margin-bottom:1rem">
        <h2 class="section-title" style="margin:0">Travel Journal</h2>
        <button class="btn btn-primary" data-action="new-journal">+ Entry</button>
      </div>
      ${sorted.length === 0 ? `
        <div class="card"><div class="empty-state">
          <div class="icon">📔</div><h3>No journal entries</h3>
          <p>Capture memories, thoughts, and moments from your travels.</p>
          <button class="btn btn-primary" data-action="new-journal">Write first entry</button>
        </div></div>` : sorted.map(j => `
          <div class="journal-entry">
            <div class="journal-meta">
              <span class="journal-mood">${j.mood || '😊'}</span>
              ${fmtDate(j.date)} ${j.location ? '· 📍 ' + escapeHtml(j.location) : ''}
            </div>
            <h3 class="journal-title">${escapeHtml(j.title)}</h3>
            <div class="journal-body">${escapeHtml(j.body)}</div>
            <div style="margin-top:0.75rem">
              <button class="btn btn-sm btn-ghost" data-action="del-journal" data-id="${j.id}">Delete</button>
            </div>
          </div>`).join('')}
    `;
  }

  function showNewJournalForm() {
    openModal('New Journal Entry', `
      <div class="form-group"><label>Title</label>
        <input class="form-control" id="f-jtitle" placeholder="Sunset in Santorini" /></div>
      <div class="form-row">
        <div class="form-group"><label>Date</label>
          <input class="form-control" type="date" id="f-jdate" value="${new Date().toISOString().slice(0,10)}" /></div>
        <div class="form-group"><label>Mood</label>
          <select class="form-control" id="f-jmood">
            <option>😊</option><option>🤩</option><option>😌</option><option>😍</option>
            <option>🤔</option><option>😅</option><option>😢</option>
          </select></div>
      </div>
      <div class="form-group"><label>Location (optional)</label>
        <input class="form-control" id="f-jloc" placeholder="Santorini, Greece" /></div>
      <div class="form-group"><label>Your story</label>
        <textarea class="form-control" id="f-jbody" rows="5" placeholder="What happened today?"></textarea></div>
    `, `
      <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" data-action="save-journal">Save</button>
    `);
  }

  // --- Destinations ---
  function renderDestinations() {
    return `
      <h2 class="section-title">Discover Destinations</h2>
      <p style="color:var(--text-muted);margin-bottom:1.25rem">Inspiration for your next adventure. Tap a place for tips.</p>
      <div class="dest-grid">
        ${DESTINATIONS.map(d => `
          <div class="dest-card" data-action="view-dest" data-id="${d.id}">
            <div class="dest-image">${d.emoji}</div>
            <div class="dest-body">
              <div class="dest-name">${d.name}</div>
              <div class="dest-region">${d.region}</div>
              <div class="dest-tags">${d.tags.map(t => `<span class="badge badge-primary">${t}</span>`).join('')}</div>
            </div>
          </div>`).join('')}
      </div>
    `;
  }

  function showDestDetail(id) {
    const d = DESTINATIONS.find(x => x.id === id);
    if (!d) return;
    openModal(d.name, `
      <div style="font-size:3rem;text-align:center;margin-bottom:0.75rem">${d.emoji}</div>
      <p style="color:var(--text-muted);text-align:center;margin-bottom:1rem">${d.region}</p>
      <div class="dest-tags" style="justify-content:center;margin-bottom:1.25rem">
        ${d.tags.map(t => `<span class="badge badge-primary">${t}</span>`).join('')}
      </div>
      <h4 style="margin-bottom:0.5rem">Travel tips</h4>
      <p style="line-height:1.6">${d.tips}</p>
    `, `
      <button class="btn btn-ghost" data-action="close-modal">Close</button>
      <button class="btn btn-primary" data-action="plan-dest" data-name="${escapeHtml(d.name)}">Plan a trip here</button>
    `);
  }

  // --- Settings ---
  function renderSettings() {
    return `
      <h2 class="section-title">Settings</h2>
      <div class="card">
        <div class="form-group">
          <label>Theme</label>
          <select class="form-control" id="set-theme">
            <option value="light" ${state.settings.theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${state.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
          </select>
        </div>
        <div class="form-group">
          <label>Currency</label>
          <select class="form-control" id="set-currency">
            ${['USD','EUR','GBP','JPY','AUD','CAD','CHF','INR','SGD'].map(c =>
              `<option value="${c}" ${state.settings.currency === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Overall budget goal</label>
          <input class="form-control" type="number" id="set-budget" value="${state.settings.budgetGoal || ''}" placeholder="e.g. 2000" />
        </div>
        <button class="btn btn-primary" data-action="save-settings">Save settings</button>
      </div>
      <div class="card" style="margin-top:1rem">
        <h3 class="card-title" style="margin-bottom:0.75rem">Data</h3>
        <p style="font-size:0.9rem;color:var(--text-muted);margin-bottom:1rem">All data is stored locally on this device. Export or clear anytime.</p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="btn btn-secondary" data-action="export-data">Export JSON</button>
          <button class="btn btn-danger" data-action="clear-data">Clear all data</button>
        </div>
      </div>
      <div class="card" style="margin-top:1rem">
        <h3 class="card-title">About Wander</h3>
        <p style="font-size:0.9rem;color:var(--text-muted);margin-top:0.5rem">
          Your offline-first travel companion. Plan itineraries, pack smart, track budgets, journal memories, and discover destinations — all in one place.
        </p>
      </div>
    `;
  }

  // ---------- Event binding ----------
  function bindViewEvents() {
    // Quick actions & generic data-action
    $$('[data-action]').forEach(el => {
      el.addEventListener('click', handleAction);
    });
    // Packing checkboxes
    $$('input[data-action="toggle-pack"]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const listId = e.target.dataset.list;
        const catName = e.target.dataset.cat;
        const idx = Number(e.target.dataset.idx);
        const list = state.packingLists.find(l => l.id === listId);
        if (!list) return;
        const cat = list.items.find(c => c.cat === catName);
        if (cat && cat.items[idx]) {
          cat.items[idx].checked = e.target.checked;
          save(state);
          render();
        }
      });
    });
  }

  function handleAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    switch (action) {
      case 'close-modal': closeModal(); break;
      case 'new-trip': showNewTripForm(); break;
      case 'edit-trip': showNewTripForm(state.trips.find(t => t.id === id)); break;
      case 'view-trip': showTripDetail(id); break;
      case 'goto-trips': navigate('trips'); break;
      case 'save-trip': {
        const name = $('#f-name')?.value.trim();
        if (!name) return toast('Please enter a trip name');
        const start = $('#f-start')?.value;
        const end = $('#f-end')?.value;
        if (!start || !end) return toast('Please set start and end dates');
        if (end < start) return toast('End date must be after start');
        const existingId = btn.dataset.id;
        if (existingId) {
          const t = state.trips.find(x => x.id === existingId);
          if (t) {
            t.name = name;
            t.destination = $('#f-dest')?.value.trim();
            t.startDate = start;
            t.endDate = end;
            t.notes = $('#f-notes')?.value.trim();
          }
        } else {
          state.trips.push({
            id: uid(), name,
            destination: $('#f-dest')?.value.trim(),
            startDate: start, endDate: end,
            notes: $('#f-notes')?.value.trim(),
            days: []
          });
        }
        save(state); closeModal(); render(); toast('Trip saved');
        break;
      }
      case 'add-day': {
        const trip = state.trips.find(t => t.id === id);
        if (!trip) return;
        if (!trip.days) trip.days = [];
        const last = trip.days.length
          ? new Date(trip.days[trip.days.length - 1].date + 'T00:00:00')
          : new Date(trip.startDate + 'T00:00:00');
        last.setDate(last.getDate() + (trip.days.length ? 1 : 0));
        trip.days.push({ date: last.toISOString().slice(0, 10), activities: [] });
        save(state);
        showTripDetail(id);
        toast('Day added');
        break;
      }
      case 'add-activity': {
        const tripId = btn.dataset.trip;
        const dayIdx = Number(btn.dataset.day);
        openModal('Add Activity', `
          <div class="form-group"><label>Title</label>
            <input class="form-control" id="f-atitle" placeholder="Visit Colosseum" /></div>
          <div class="form-group"><label>Time (optional)</label>
            <input class="form-control" type="time" id="f-atime" /></div>
          <div class="form-group"><label>Notes</label>
            <textarea class="form-control" id="f-anote" placeholder="Book tickets in advance..."></textarea></div>
        `, `
          <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
          <button class="btn btn-primary" data-action="save-activity" data-trip="${tripId}" data-day="${dayIdx}">Add</button>
        `);
        break;
      }
      case 'save-activity': {
        const title = $('#f-atitle')?.value.trim();
        if (!title) return toast('Enter an activity title');
        const trip = state.trips.find(t => t.id === btn.dataset.trip);
        if (!trip) return;
        const day = trip.days[Number(btn.dataset.day)];
        if (!day) return;
        if (!day.activities) day.activities = [];
        day.activities.push({
          title,
          time: $('#f-atime')?.value || '',
          note: $('#f-anote')?.value.trim() || ''
        });
        save(state);
        showTripDetail(trip.id);
        toast('Activity added');
        break;
      }
      case 'del-activity': {
        const trip = state.trips.find(t => t.id === btn.dataset.trip);
        if (!trip) return;
        const day = trip.days[Number(btn.dataset.day)];
        if (day?.activities) {
          day.activities.splice(Number(btn.dataset.act), 1);
          save(state);
          showTripDetail(trip.id);
        }
        break;
      }
      case 'new-pack': showNewPackForm(); break;
      case 'save-pack': {
        const name = $('#f-pname')?.value.trim() || 'My packing list';
        const tpl = $('#f-ptemplate')?.value || 'general';
        let items = structuredClone(PACK_TEMPLATES.general);
        if (tpl !== 'general' && PACK_TEMPLATES[tpl]) {
          items = items.concat(structuredClone(PACK_TEMPLATES[tpl]));
        }
        items.forEach(c => c.items = c.items.map(n => ({ name: n, checked: false })));
        state.packingLists.push({ id: uid(), name, items });
        save(state); closeModal(); render(); toast('Packing list created');
        break;
      }
      case 'del-pack': {
        if (!confirm('Delete this packing list?')) return;
        state.packingLists = state.packingLists.filter(l => l.id !== id);
        save(state); render(); toast('List deleted');
        break;
      }
      case 'new-expense': showNewExpenseForm(); break;
      case 'save-expense': {
        const title = $('#f-etitle')?.value.trim();
        const amount = parseFloat($('#f-eamount')?.value);
        if (!title || isNaN(amount)) return toast('Enter description and amount');
        state.expenses.push({
          id: uid(), title, amount,
          category: $('#f-ecat')?.value,
          date: $('#f-edate')?.value || new Date().toISOString().slice(0, 10)
        });
        save(state); closeModal(); render(); toast('Expense added');
        break;
      }
      case 'del-expense': {
        state.expenses = state.expenses.filter(e => e.id !== id);
        save(state); render(); toast('Expense removed');
        break;
      }
      case 'new-journal': showNewJournalForm(); break;
      case 'save-journal': {
        const title = $('#f-jtitle')?.value.trim();
        const body = $('#f-jbody')?.value.trim();
        if (!title || !body) return toast('Please fill title and story');
        state.journal.push({
          id: uid(), title, body,
          date: $('#f-jdate')?.value,
          mood: $('#f-jmood')?.value,
          location: $('#f-jloc')?.value.trim()
        });
        save(state); closeModal(); render(); toast('Entry saved');
        break;
      }
      case 'del-journal': {
        if (!confirm('Delete this entry?')) return;
        state.journal = state.journal.filter(j => j.id !== id);
        save(state); render(); toast('Entry deleted');
        break;
      }
      case 'view-dest': showDestDetail(btn.dataset.id); break;
      case 'plan-dest': {
        closeModal();
        showNewTripForm({ destination: btn.dataset.name, name: `Trip to ${btn.dataset.name}` });
        break;
      }
      case 'save-settings': {
        state.settings.theme = $('#set-theme')?.value || 'light';
        state.settings.currency = $('#set-currency')?.value || 'USD';
        state.settings.budgetGoal = parseFloat($('#set-budget')?.value) || 0;
        save(state); applyTheme(); toast('Settings saved');
        break;
      }
      case 'export-data': {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `wander-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        toast('Data exported');
        break;
      }
      case 'clear-data': {
        if (!confirm('This will permanently delete all your trips, packing lists, expenses and journal entries. Continue?')) return;
        state = structuredClone(defaultData);
        save(state); render(); toast('All data cleared');
        break;
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---------- PWA Install ----------
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $('#install-btn').classList.remove('hidden');
  });
  $('#install-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $('#install-btn').classList.add('hidden');
  });

  // ---------- Init ----------
  function init() {
    applyTheme();
    setTimeout(() => {
      $('#splash').classList.add('hide');
      render();
    }, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
