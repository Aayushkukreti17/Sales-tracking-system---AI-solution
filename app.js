const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNum = (v) => (typeof v === 'number' ? v.toLocaleString('en-IN') : v);
const round2 = (n) => Math.round(n * 100) / 100;

function fmtCr(v) { return '₹' + (typeof v === 'number' ? v.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : v) + ' Cr'; }

function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add('hidden'), 2400);
}

const state = {
  screen: 'command',
  filters: { date: 'Sep 2026', category: 'All', region: 'All', scenario: 'Base' },
  catParam: null,
  regionParam: null,
  chartMetric: 'revenue',
  charts: {},
  scenarios: null,
  sliders: { vol: 0, price: 0, mkt: 0, procurement: 0, logistics: 0, returns: 0 },
};

function initScenarios() {
  const stored = JSON.parse(localStorage.getItem('fos_scenarios') || 'null');
  if (stored && stored.length) { state.scenarios = stored; return; }
  state.scenarios = [
    { name: 'Base', sliders: { vol: 0, price: 0, mkt: 0, procurement: 0, logistics: 0, returns: 0 } },
    { name: 'Growth', sliders: { vol: 12, price: 4, mkt: -8, procurement: 3, logistics: -2, returns: -2 } },
    { name: 'Conservative', sliders: { vol: -7, price: -3, mkt: 0, procurement: 5, logistics: 6, returns: 1 } },
  ];
  localStorage.setItem('fos_scenarios', JSON.stringify(state.scenarios));
}

function scenarioOutput(s) {
  const v = (k) => (((s && s.sliders) ? s.sliders[k] : 0)) / 100;
  const sales = 128.4 * (1 + v('vol')) * (1 + v('price'));
  const proc = 28.1 * (1 + v('procurement')) * (1 + v('vol'));
  const cogsOther = 28.0 * (1 + v('vol'));
  const fulfill = 16.4 * (1 + v('vol'));
  const logi = 10.9 * (1 + v('vol')) * (1 + v('logistics'));
  const mkt = 4.6 * (1 + v('mkt')) * (1 + v('vol') * 0.5);
  const returns = 3.2 * (1 + v('vol')) * (1 + v('returns'));
  const cost = round2(proc + cogsOther + fulfill + logi + mkt + returns);
  const salesR = round2(sales);
  const profit = round2(salesR - cost);
  const margin = round2((profit / salesR) * 100);
  return { sales: salesR, cost, profit, margin };
}

const NAV = [
  { group: 'Workspace', items: [
    { id: 'command', label: 'Command Center' },
    { id: 'forecasts', label: 'Forecasts' },
    { id: 'sales', label: 'Sales' },
    { id: 'costs', label: 'Costs' },
    { id: 'profitability', label: 'Profitability' },
    { id: 'products', label: 'Products' },
    { id: 'categories', label: 'Categories' },
    { id: 'regions', label: 'Regions' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'scenario', label: 'Scenario Lab' },
  ] },
  { group: 'Analytics', items: [
    { id: 'insights', label: 'Insights' },
    { id: 'variance', label: 'Variance Analysis' },
    { id: 'accuracy', label: 'Forecast Accuracy' },
    { id: 'reports', label: 'Reports' },
  ] },
  { group: 'Data & Models', items: [
    { id: 'datasets', label: 'Datasets' },
    { id: 'sources', label: 'Data Sources' },
    { id: 'models', label: 'Models' },
    { id: 'quality', label: 'Data Quality' },
  ] },
  { group: 'Admin', items: [
    { id: 'alerts', label: 'Alerts' },
    { id: 'audit', label: 'Audit Log' },
    { id: 'users', label: 'Users & Roles' },
    { id: 'settings', label: 'Settings' },
  ] },
];

let tableRegistry = [];

function cleanup() {
  for (const id of Object.keys(state.charts)) {
    const c = state.charts[id];
    if (c) { try { c.destroy(); } catch (e) { } }
  }
  state.charts = {};
  tableRegistry = [];
}

function renderKpis(items) {
  return '<div class="kpi-grid">' + items.map((k) => `
    <div class="kpi-card">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-delta ${k.dir || 'muted'}">${k.delta || ''}${k.sub ? ' <span style="color:var(--sub);font-weight:500">' + k.sub + '</span>' : ''}</div>
      ${k.bar ? `<div class="bar-track" style="margin-top:10px"><div class="bar-fill" style="width:${k.bar}%;background:${k.barColor || 'var(--accent)'}"></div></div>` : ''}
    </div>`).join('') + '</div>';
}

function statList(rows) {
  return '<div class="stat-list">' + rows.map((r) => {
    const dClass = r[2] && String(r[2]).startsWith('+') ? 'up' : (r[2] && String(r[2]).startsWith('-') ? 'down' : 'muted');
    return `<div class="stat-item"><span class="k">${r[0]}</span><span class="v small">${r[1]} <span class="kpi-delta ${dClass}" style="display:inline">${r[2]}</span></span></div>`;
  }).join('') + '</div>';
}

function riskBadge(name) {
  const map = { Low: 'ok', Medium: 'warn', High: 'danger', Critical: 'danger' };
  return `<span class="badge ${map[name] || 'neutral'}">${name}</span>`;
}

function pageHeader(title, subtitle, actions) {
  return `<div class="page-header">
    <div><div class="page-title">${title}</div><div class="page-subtitle">${subtitle}</div></div>
    <div class="page-actions">${actions || ''}</div>
  </div>`;
}

function standardHeader(title, subtitle) {
  return pageHeader(title, subtitle, `
    <button class="btn small" onclick="showToast('Exported report')">Export</button>
    <button class="btn small" onclick="showToast('Report scheduled')">Schedule</button>
    <button class="btn small" onclick="showToast('Share link copied')">Share</button>`);
}

function chartOpts(yLabel, yFormat, extra = {}) {
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11, family: 'Inter' }, color: '#5b6576' } },
      tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + yFormat(c.parsed.y) }, backgroundColor: '#111c2e', padding: 10, titleFont: { family: 'Inter', size: 12 }, bodyFont: { family: 'Inter', size: 12 } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#98a1b3' }, border: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: '#edf0f4' },
        border: { display: false },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#98a1b3', callback: (v) => yFormat(v) },
        title: { display: true, text: yLabel, color: '#98a1b3', font: { size: 11, family: 'Inter' } },
      },
      ...(extra.secondY ? {
        y1: {
          position: 'right', beginAtZero: true, grid: { display: false }, border: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#98a1b3' },
          title: { display: true, text: extra.secondY, color: '#98a1b3', font: { size: 11, family: 'Inter' } },
        },
      } : {}),
    },
  };
  if (extra.xTicks) opts.scales.x.ticks.maxTicksLimit = extra.xTicks;
  return opts;
}

function setChart(id, cfg) {
  const c = state.charts[id];
  if (c) { try { c.destroy(); } catch (e) { } }
  const canvas = document.getElementById(id);
  if (!canvas) return;
  state.charts[id] = new Chart(canvas, cfg);
}

const METRIC_META = {
  revenue: { label: 'Sales', color: '#2f6fed', y: 'Net sales (₹ Cr)', fmt: (v) => '₹' + v.toFixed(1) + ' Cr' },
  cost: { label: 'Cost', color: '#b45309', y: 'Total cost (₹ Cr)', fmt: (v) => '₹' + v.toFixed(1) + ' Cr' },
  profit: { label: 'Profit', color: '#15803d', y: 'Contribution profit (₹ Cr)', fmt: (v) => '₹' + v.toFixed(1) + ' Cr' },
  margin: { label: 'Margin', color: '#6d28d9', y: 'Margin (%)', fmt: (v) => v.toFixed(1) + '%' },
  orders: { label: 'Orders', color: '#2f6fed', y: 'Orders (K)', fmt: (v) => fmtNum(v) + 'K' },
  units: { label: 'Units', color: '#0284c7', y: 'Units (K)', fmt: (v) => fmtNum(v) + 'K' },
};

function forecastDatasets(metric) {
  const m = METRIC_META[metric];
  const vals = DATA.series(metric);
  const ciLo = vals.map((v, i) => (i < DATA.actualLength ? 0 : round2(v * 0.93)));
  const ciUp = vals.map((v, i) => (i < DATA.actualLength ? 0 : round2(v * 1.07)));
  const prev = metric === 'revenue' ? DATA.prevForecast : vals.map((v) => round2(v * 0.97));
  const tgt = metric === 'revenue' ? DATA.target : vals.map((v) => round2(v * 1.06));
  return [
    { label: 'Range', data: ciLo, stack: 'ci', borderWidth: 0, pointRadius: 0, fill: false, tension: 0.35 },
    { label: 'Confidence interval', data: ciUp.map((u, i) => u - ciLo[i]), stack: 'ci', borderWidth: 0, pointRadius: 0, fill: true, backgroundColor: m.color + '22', tension: 0.35, tooltip: { callbacks: { label: () => '' } } },
    { label: m.label + ' (actual + forecast)', data: vals, borderColor: m.color, backgroundColor: m.color, borderWidth: 2.2, pointRadius: 2.5, pointBackgroundColor: m.color, tension: 0.35, fill: false },
    { label: 'Previous forecast', data: prev, borderColor: '#98a1b3', borderWidth: 1.4, borderDash: [5, 4], pointRadius: 0, tension: 0.35, fill: false },
    { label: 'Target / Budget', data: tgt, borderColor: '#f59e0b', borderWidth: 1.4, borderDash: [2, 3], pointRadius: 0, tension: 0.35, fill: false },
  ];
}

function forecastChartConfig(metric, opts = {}) {
  const m = METRIC_META[metric];
  return {
    type: 'line',
    data: { labels: DATA.labels, datasets: forecastDatasets(metric) },
    options: chartOpts(m.y, m.fmt, { xTicks: opts.xTicks || 15 }),
  };
}

class DataTable {
  constructor(container, columns, rows, opts = {}) {
    this.container = container;
    this.columns = columns;
    this.rows = rows;
    this.opts = Object.assign({ pageSize: 10, searchable: true, selectable: false }, opts);
    this.page = 1;
    this.sortKey = null;
    this.sortDir = 1;
    this.query = '';
    this.density = 'compact';
    this.selected = new Set();
    tableRegistry.push(this);
  }

  viewRows() {
    let out = this.rows;
    if (this.query) {
      const q = this.query.toLowerCase();
      out = out.filter((r) => this.colText(r).toLowerCase().includes(q));
    }
    if (this.sortKey) {
      const c = this.columns.find((x) => x.key === this.sortKey);
      out = out.slice().sort((a, b) => {
        let av = a[this.sortKey], bv = b[this.sortKey];
        if (c && c.num) { av = parseFloat(av); bv = parseFloat(bv); }
        if (av < bv) return -1 * this.sortDir;
        if (av > bv) return 1 * this.sortDir;
        return 0;
      });
    }
    return out;
  }

  colText(r) {
    return this.columns.map((c) => (c.fmt ? c.fmt(r[c.key], r) : String(r[c.key]))).join(' ');
  }

  render() {
    const v = this.viewRows();
    const ps = this.opts.pageSize;
    const totalP = Math.max(1, Math.ceil(v.length / ps));
    if (this.page > totalP) this.page = totalP;
    const start = (this.page - 1) * ps;
    const pageRows = v.slice(start, start + ps);
    const id = this.opts.id || 't';

    this.container.innerHTML = `
      <div class="dt-toolbar">
        ${this.opts.selectable ? `<span id="${id}-sel">0 selected</span>` : ''}
        ${this.opts.title ? `<b style="font-size:13px">${this.opts.title}</b>` : ''}
        ${this.opts.selectable ? `<button class="btn small primary dt-bulk-actions hidden" id="${id}-bulk">Bulk actions ▾</button>` : ''}
        <div class="spacer"></div>
        ${this.opts.searchable ? `<input type="search" placeholder="Search..." value="${esc(this.query)}" class="dt-search">` : ''}
        <select class="dt-density"><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select>
        <button class="btn small dt-export">Export CSV</button>
      </div>
      ${this.opts.selectable ? `<div class="bulkbar hidden" id="${id}-bulkbar"><b id="${id}-bulkcount">0 selected</b></div>` : ''}
      <div class="table-wrap">
        <table class="dt ${this.density}">
          <thead><tr>
            ${this.opts.selectable ? '<th style="width:30px"><input type="checkbox" class="dt-all"></th>' : ''}
            ${this.columns.map((c) => {
              const sorted = this.sortKey === c.key ? (this.sortDir === 1 ? '▲' : '▼') : '';
              return `<th${c.num ? ' class="num"' : ''} data-key="${c.key}">${c.label}<span class="sort">${sorted}</span></th>`;
            }).join('')}
          </tr></thead>
          <tbody>
            ${pageRows.length === 0
              ? `<tr><td colspan="${this.columns.length + (this.opts.selectable ? 1 : 0)}" style="text-align:center;color:var(--sub);padding:28px">No records match the current filters.</td></tr>`
              : pageRows.map((r) => `<tr class="${this.selected.has(r) ? 'selected' : ''}" ${this.opts.selectable ? `data-key="${esc(String(r[this.opts.idKey || 'sku']))}"` : ''}>
                ${this.opts.selectable ? `<td><input type="checkbox" class="dt-row" ${this.selected.has(r) ? 'checked' : ''}></td>` : ''}
                ${this.columns.map((c) => { const val = c.fmt ? c.fmt(r[c.key], r) : r[c.key]; return `<td${c.num ? ' class="num"' : ''}>${val === undefined || val === null ? '—' : val}</td>`; }).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="dt-footer">
        <span>${v.length === 0 ? '0 records' : `${start + 1}–${Math.min(start + ps, v.length)} of ${fmtNum(v.length)}`}${this.query ? ` (filtered from ${fmtNum(this.rows.length)})` : ''}</span>
        <div class="spacer"></div>
        <div class="pager">
          <button class="dt-page" data-p="${this.page - 1}" ${this.page <= 1 ? 'disabled' : ''}>‹</button>
          ${this.pagerNumbers(totalP).map((p) => p === '…' ? '<span style="color:var(--sub)">…</span>' : `<button class="dt-page ${p === this.page ? 'current' : ''}" data-p="${p}">${p}</button>`).join('')}
          <button class="dt-page" data-p="${this.page + 1}" ${this.page >= totalP ? 'disabled' : ''}>›</button>
        </div>
      </div>`;
    this.bind();
  }

  pagerNumbers(totalP) {
    const cur = this.page;
    const set = new Set([1, totalP, cur - 1, cur, cur + 1]);
    const arr = [...set].filter((n) => n >= 1 && n <= totalP).sort((a, b) => a - b);
    const res = [];
    let prev = 0;
    for (const n of arr) { if (n - prev > 1) res.push('…'); res.push(n); prev = n; }
    return res;
  }

  bind() {
    const c = this.container;
    const q = $('.dt-search', c);
    if (q) q.addEventListener('input', (e) => { this.query = e.target.value; this.page = 1; this.render(); });
    const d = $('.dt-density', c);
    if (d) d.addEventListener('change', (e) => { this.density = e.target.value; this.render(); });
    const ex = $('.dt-export', c);
    if (ex) ex.addEventListener('click', () => this.exportCsv());
    $$('.dt-page', c).forEach((b) => b.addEventListener('click', () => { this.page = +b.dataset.p; this.render(); }));
    $$('th[data-key]', c).forEach((th) => th.addEventListener('click', () => {
      const k = th.dataset.key;
      if (this.sortKey === k) this.sortDir = -this.sortDir; else { this.sortKey = k; this.sortDir = 1; }
      this.render();
    }));
    if (this.opts.selectable && $('.dt-all', c)) {
      $('.dt-all', c).addEventListener('change', (e) => {
        this.selected = e.target.checked ? new Set(this.viewRows()) : new Set();
        this.render();
      });
      $$('.dt-row', c).forEach((cb) => cb.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        const r = this.rows.find((x) => String(x[this.opts.idKey || 'sku']) === tr.dataset.key);
        if (e.target.checked) this.selected.add(r); else this.selected.delete(r);
        this.render();
      }));
      this.updateBulk();
    }
    if (this.opts.rowClick) {
      $$('tbody tr', c).forEach((tr) => tr.addEventListener('click', (e) => {
        if (e.target.closest('input')) return;
        this.opts.rowClick(tr, e);
      }));
    }
  }

  updateBulk() {
    if (!this.opts.selectable) return;
    const id = this.opts.id || 't';
    const n = this.selected.size;
    const selEl = $('#' + id + '-sel');
    const bb = $('#' + id + '-bulkbar');
    const bt = $('#' + id + '-bulk');
    const bc = $('#' + id + '-bulkcount');
    if (selEl) selEl.textContent = n + ' selected';
    if (bb && bt) {
      bb.classList.toggle('hidden', n === 0);
      bt.classList.toggle('hidden', n === 0);
      if (bc) bc.textContent = n + ' selected';
    }
    const actions = this.opts.actions;
    if (bt && actions) {
      const span = $('#' + id + '-bulk');
      if (!span.dataset.bound) {
        span.dataset.bound = '1';
        span.addEventListener('click', () => showToast('Bulk action on ' + n + ' items — create report / add to scenario / export'));
      }
    }
  }

  exportCsv() {
    const v = this.viewRows();
    const head = this.columns.map((x) => x.label).join(',');
    const body = v.map((r) => this.columns.map((x) => '"' + String(x.fmt ? x.fmt(r[x.key], r) : r[x.key]).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tipscart_' + Date.now() + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('CSV downloaded');
  }
}

function renderNav() {
  const nav = $('#nav');
  nav.innerHTML = NAV.map((g) => `<div class="group">
    <div class="nav-group-title">${g.group}</div>
    ${g.items.map((i) => `<div class="nav-item ${state.screen === i.id ? 'active' : ''}" data-id="${i.id}">${i.label}</div>`).join('')}
  </div>`).join('');
  $$('.nav-item', nav).forEach((el) => el.addEventListener('click', () => { location.hash = '/' + el.dataset.id; }));
}

function mountScreen() {
  cleanup();
  const el = document.getElementById('screen');
  el.innerHTML = SCREENS[state.screen]();
  const fn = window['mount_' + state.screen];
  if (typeof fn === 'function') { try { fn(); } catch (e) { console.error(e); showToast('Screen error: ' + e.message); } }
}

function router() {
  const id = (location.hash || '#/command').replace('#/', '').split('?')[0];
  state.screen = SCREENS[id] ? id : 'command';
  renderNav();
  mountScreen();
  window.scrollTo(0, 0);
}

function renderFilterBar() {
  const fb = $('#filterBar');
  fb.innerHTML = `
    <span class="filters-label">Filters</span>
    <select data-f="date"><option>Sep 2026</option><option>Aug 2026</option><option>Q3 2026</option><option>Fiscal YTD</option></select>
    <select data-f="category"><option>Category: All</option>${DATA.categories.map((c) => `<option>${c.name}</option>`).join('')}</select>
    <select data-f="region"><option>Region: All</option>${DATA.regions.map((r) => `<option>${r.name}</option>`).join('')}</select>
    <select data-f="scenario"><option>Scenario: Base</option><option>Growth</option><option>Conservative</option></select>
    <button class="fb" onclick="showToast('3 more filter dimensions available')">More filters</button>
    <button class="fb" onclick="showToast('View saved')">Save view</button>
    <div class="spacer" style="flex:1"></div><span style="font-size:11px;color:var(--sub)">Last data sync: 2 min ago</span>`;
  $$('select[data-f]', fb).forEach((s) => s.addEventListener('change', (e) => {
    state.filters[e.dataset.f] = e.target.value.split(': ')[1] || e.target.value;
    showToast('Filter applied: ' + e.target.value);
  }));
}

function searchIndex() {
  const items = [];
  DATA.products.forEach((p) => items.push({ t: 'Products', k: p.sku, label: p.product, hint: p.sku }));
  DATA.categories.forEach((c) => items.push({ t: 'Categories', k: c.name, label: c.name, hint: c.growth + '% growth', go: 'categories' }));
  DATA.reports.forEach((r) => items.push({ t: 'Reports', k: r.name, label: r.name, hint: r.cadence }));
  DATA.datasets.forEach((d) => items.push({ t: 'Datasets', k: d.name, label: d.name, hint: d.rows + ' rows' }));
  items.unshift({ t: 'Recent', k: 'Command Center', label: 'Command Center', hint: '', go: 'command' });
  items.unshift({ t: 'Recent', k: 'Scenario Lab', label: 'Scenario Lab', hint: '', go: 'scenario' });
  return items;
}

function openSearch() { $('#searchOverlay').classList.remove('hidden'); $('#searchInput').value = ''; renderSearch(''); setTimeout(() => $('#searchInput').focus(), 30); }
function closeSearch() { $('#searchOverlay').classList.add('hidden'); }

function renderSearch(q) {
  const box = $('#searchResults');
  const groups = {};
  searchIndex().forEach((i) => {
    if (q && !(i.label + ' ' + i.hint + ' ' + i.k).toLowerCase().includes(q.toLowerCase())) return;
    (groups[i.t] = groups[i.t] || []).push(i);
  });
  box.innerHTML = Object.keys(groups).map((g) => `
    <div class="sr-group-title">${g}</div>
    ${groups[g].map((i) => `<div class="sr-item" data-go="${i.go || ''}" data-k="${esc(i.label)}"><span>${i.label}</span><span class="sr-k">${i.hint || i.t}</span></div>`).join('')}
  `).join('') || '<div class="empty-state" style="padding:24px">No results for "' + esc(q) + '"</div>';
  $$('.sr-item', box).forEach((el) => el.addEventListener('click', () => {
    closeSearch();
    if (el.dataset.go) { location.hash = '/' + el.dataset.go; }
    else if (DATA.categories.find((c) => c.name === el.dataset.k)) { state.catParam = el.dataset.k; location.hash = '/categories'; }
    else if (DATA.products.find((p) => p.product === el.dataset.k || p.sku === el.dataset.k)) { state.catParam = null; location.hash = '/products'; showToast('Showing products — drill to SKU tooltip'); }
    else showToast('Opened: ' + el.dataset.k);
  }));
}

const SCREENS = {};

/* ============ Command Center ============ */
SCREENS.command = () => `
  ${pageHeader('Command Center', 'Business performance and forecast outlook', `
    <button class="btn small" onclick="showToast('Exported snapshot')">Export</button>
    <button class="btn small" onclick="showToast('Report scheduled')">Schedule report</button>
    <button class="btn small" onclick="showToast('Period compared')">Compare period</button>
    <button class="btn small" onclick="showToast('Share link copied')">Share</button>`)}
  ${renderKpis([
    { label: 'Net Sales', value: DATA.kpis.netSales.value, delta: DATA.kpis.netSales.delta, dir: 'up', sub: DATA.kpis.netSales.sub },
    { label: 'Forecast Sales', value: DATA.kpis.forecastSales.value, delta: DATA.kpis.forecastSales.delta, dir: 'up', sub: DATA.kpis.forecastSales.sub },
    { label: 'Total Cost', value: DATA.kpis.totalCost.value, delta: DATA.kpis.totalCost.delta, dir: 'down', sub: DATA.kpis.totalCost.sub },
    { label: 'Contribution Profit', value: DATA.kpis.contributionProfit.value, delta: DATA.kpis.contributionProfit.delta, dir: 'up', sub: DATA.kpis.contributionProfit.sub },
    { label: 'Contribution Margin', value: DATA.kpis.contributionMargin.value, delta: DATA.kpis.contributionMargin.delta, dir: 'up', sub: DATA.kpis.contributionMargin.sub },
    { label: 'Forecast Accuracy', value: DATA.kpis.forecastAccuracy.value, delta: DATA.kpis.forecastAccuracy.delta, dir: 'muted', sub: DATA.kpis.forecastAccuracy.sub },
  ])}
  <div class="panel" style="margin-bottom:16px">
    <div class="panel-head">
      <div><div class="panel-title">Sales, Cost & Profit Outlook</div><div class="panel-sub">Actual Sep'25 – Aug'26 · Forecast Sep–Nov'26 (90% CI)</div></div>
      <div class="tabs" style="border:none;margin:0" id="cmd-tabs">
        ${['revenue', 'cost', 'profit', 'margin'].map((m) => `<div class="tab ${state.chartMetric === m ? 'active' : ''}" data-m="${m}">${METRIC_META[m].label}</div>`).join('')}
      </div>
    </div>
    <div class="panel-body flat"><div class="chart-box" style="height:300px"><canvas id="cmd-main"></canvas></div></div>
  </div>
  <div class="grid-4" style="margin-bottom:16px">
    <div class="panel"><div class="panel-head"><div class="panel-title">Demand</div></div><div class="panel-body">${statList(DATA.health.demand)}</div></div>
    <div class="panel"><div class="panel-head"><div class="panel-title">Cost</div></div><div class="panel-body">${statList(DATA.health.cost)}</div></div>
    <div class="panel"><div class="panel-head"><div class="panel-title">Profitability</div></div><div class="panel-body">${statList(DATA.health.profitability)}</div></div>
    <div class="panel"><div class="panel-head"><div class="panel-title">Risk</div></div>
      <div class="panel-body"><div class="risk-list">${DATA.health.risk.map((r) => `<div class="risk-item"><div class="r-left"><span class="status-dot ${r[2] === 'High' ? 'danger' : 'warn'}"></span><span>${r[0]}</span></div><b style="font-size:13px">${r[1]}</b></div>`).join('')}</div></div>
    </div>
  </div>
  <div class="grid-2">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Executive Insights</div><a class="link" href="#/insights">View all -></a></div>
      <div class="panel-body">
        ${DATA.insights.slice(0, 2).map((i) => `
          <div class="insight ${'border-' + i.border}" style="margin-bottom:10px">
            <div class="insight-priority">${i.priority} · ${i.cat}</div>
            <div class="insight-title">${i.title}</div>
            <div class="insight-detail">${i.detail}</div>
            <div class="insight-impact ${i.pos ? 'pos' : 'neg'}">${i.impact}</div>
            <div class="insight-meta"><span>Confidence <b>${i.conf}%</b></span><span>Driver: <b>${i.driver}</b></span></div>
          </div>`).join('')}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Drill-down · Revenue forecast → SKU</div><div class="panel-sub">Metric → Explain → Drill → Act</div></div>
      <div class="panel-body">
        <div class="risk-list" style="margin-bottom:14px">
          <div class="risk-item"><div class="r-left"><b style="font-size:14px">₹142.7 Cr</b>&nbsp;<span class="kpi-delta up">Forecast Sales</span></div><a class="link" href="#/forecasts">Open forecast →</a></div>
          <div class="risk-item"><div class="r-left">Category &nbsp;<select class="fb" id="drill-cat">${DATA.categories.map((c) => `<option>${c.name}</option>`).join('')}</select></div><a class="link" href="#/categories">Explore →</a></div>
          <div class="risk-item"><div class="r-left">Product family &nbsp; Audio &gt; Headphones</div></div>
          <div class="risk-item"><div class="r-left">SKU-48391 &nbsp;<span class="badge info">94% confidence</span></div><a class="link" href="#/scenario">Run scenario →</a></div>
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px">
          <b style="font-size:13px">Why is the forecast changing?</b>
          ${DATA.drivers.map((d) => `<div class="stat-item" style="padding:5px 0"><span class="k">${d[0]}</span><span class="v small ${d[2] === '+' ? 'up' : 'down'}">${d[1].startsWith('-') ? '' : '+'}${d[1]}</span></div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;

window.mount_command = () => {
  setChart('cmd-main', forecastChartConfig(state.chartMetric));
  $$('#cmd-tabs .tab').forEach((t) => t.addEventListener('click', () => {
    state.chartMetric = t.dataset.m;
    $$('#cmd-tabs .tab').forEach((x) => x.classList.toggle('active', x === t));
    setChart('cmd-main', forecastChartConfig(state.chartMetric));
  }));
  const dc = $('#drill-cat');
  if (dc) dc.addEventListener('change', function () { state.catParam = this.value; });
};

/* ============ Forecasts ============ */
SCREENS.forecasts = () => `
  ${standardHeader('Forecasts', 'Actual vs predicted outlook — confidence, drivers and decomposition')}
  <div class="tab-row">
    <div class="tabs" style="margin:0;flex:1" id="f-tabs">
      ${['revenue', 'orders', 'units', 'cost', 'profit', 'margin'].map((m) => `<div class="tab ${state.chartMetric === m ? 'active' : ''}" data-m="${m}">${METRIC_META[m].label}</div>`).join('')}
    </div>
    <div class="control">Horizon <select><option>30 days</option><option>60 days</option><option>90 days</option></select></div>
    <div class="control">Model <select><option>Production v3.8</option><option>Production v3.7</option></select></div>
    <div class="control">Confidence <select><option>90%</option><option>80%</option><option>95%</option></select></div>
    <div class="control">Scenario <select><option>Base</option><option>Growth</option><option>Conservative</option></select></div>
  </div>
  <div class="grid-2">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Actual vs Forecast</div><div class="panel-sub">Shaded band = 90% confidence interval · Dashed = previous forecast & target</div></div>
      <div class="panel-body flat"><div class="chart-box" style="height:340px"><canvas id="f-main"></canvas></div></div>
    </div>
    <div class="col">
      <div class="grid-2" style="margin-bottom:14px">
        <div class="panel"><div class="panel-body">
          <div class="kpi-label">Forecast</div><div class="kpi-value" style="font-size:20px">₹142.7 Cr</div>
          <div class="stat-list" style="margin-top:8px">
            <div class="stat-item"><span class="k">Previous forecast</span><span class="v">₹139.2 Cr</span></div>
            <div class="stat-item"><span class="k">Change</span><span class="v up">+2.5%</span></div>
            <div class="stat-item"><span class="k">Confidence</span><span class="v">91%</span></div>
          </div>
        </div></div>
        <div class="panel"><div class="panel-body">
          <div class="kpi-label">Forecast confidence</div>
          <div class="kpi-value" style="font-size:20px">91% <span class="badge ok" style="vertical-align:middle">High</span></div>
          <div class="bar-track" style="margin:8px 0"><div class="bar-fill" style="width:91%;background:var(--green)"></div></div>
          <div class="stat-list">
            <div class="stat-item"><span class="k">Expected range</span><span class="v small">₹139.8 – ₹146.2 Cr</span></div>
            <div class="stat-item"><span class="k">Data freshness</span><span class="v small">2 hrs</span></div>
            <div class="stat-item"><span class="k">Historical coverage</span><span class="v small">24 months</span></div>
            <div class="stat-item"><span class="k">Model MAPE</span><span class="v small">7.6%</span></div>
            <div class="stat-item"><span class="k">Recent volatility</span><span class="v small">Low</span></div>
          </div>
        </div></div>
      </div>
      <div class="panel" style="margin-bottom:14px">
        <div class="panel-head"><div class="panel-title">Forecast decomposition</div></div>
        <div class="panel-body">
          ${DATA.decomposition.map((d) => `<div class="stat-item" style="padding:4px 0"><span class="k">${d[0]}</span><span class="v small ${d[2] === '+' ? 'up' : 'down'}">${d[1]}</span></div>`).join('')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><div class="panel-title">Why is the forecast changing?</div><button class="btn small" onclick="showToast('Exploring drivers')">Explore drivers</button></div>
        <div class="panel-body">
          ${DATA.drivers.map((d) => `
            <div class="driver-item">
              <div class="d-head"><b>${d[0]}</b><span>${d[2] === '+' ? '+' : ''}${d[1]}</span></div>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.abs(parseFloat(d[1])) * 22 + 20}%;background:${d[2] === '+' ? 'var(--green)' : 'var(--red)'}"></div></div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;

window.mount_forecasts = () => {
  setChart('f-main', forecastChartConfig(state.chartMetric, { xTicks: 15 }));
  $$('#f-tabs .tab').forEach((t) => t.addEventListener('click', () => {
    state.chartMetric = t.dataset.m;
    $$('#f-tabs .tab').forEach((x) => x.classList.toggle('active', x === t));
    setChart('f-main', forecastChartConfig(state.chartMetric, { xTicks: 15 }));
  }));
};

/* ============ Sales ============ */
SCREENS.sales = () => `
  ${standardHeader('Sales Intelligence', 'Analyze actual and predicted sales performance')}
  ${renderKpis([
    { label: 'GMV', value: '₹135.9 Cr', delta: '+11.7%', dir: 'up', sub: 'vs previous period' },
    { label: 'Net Sales', value: '₹128.4 Cr', delta: '+12.8%', dir: 'up' },
    { label: 'Orders', value: '3.42M', delta: '+9.1%', dir: 'up' },
    { label: 'Units', value: '11.8M', delta: '+7.4%', dir: 'up' },
    { label: 'AOV', value: '₹1,480', delta: '+2.9%', dir: 'up' },
    { label: 'Conversion', value: '3.6%', delta: '+0.2 pts', dir: 'up' },
  ])}
  <div class="grid-2" style="margin-bottom:16px">
    <div class="panel"><div class="panel-head"><div class="panel-title">Sales Trend</div></div><div class="panel-body flat"><div class="chart-box"><canvas id="s-trend"></canvas></div></div></div>
    <div class="panel"><div class="panel-head"><div class="panel-title">Category Contribution</div></div><div class="panel-body flat"><div class="chart-box"><canvas id="s-cat"></canvas></div></div></div>
    <div class="panel"><div class="panel-head"><div class="panel-title">Region Contribution</div></div><div class="panel-body flat"><div class="chart-box"><canvas id="s-reg"></canvas></div></div></div>
    <div class="panel"><div class="panel-head"><div class="panel-title">Seller Contribution</div></div><div class="panel-body flat"><div class="chart-box"><canvas id="s-seller"></canvas></div></div></div>
  </div>
  <div class="panel">
    <div class="dt-toolbar" style="border-bottom:1px solid var(--border)"><b style="font-size:13px">Products</b><div class="spacer"></div></div>
    <div id="sales-table"></div>
  </div>`;

window.mount_sales = () => {
  setChart('s-trend', {
    type: 'line',
    data: { labels: DATA.labels, datasets: [
      { label: 'Sales (actual + forecast)', data: [...DATA.salesActual, ...DATA.salesForecast], borderColor: '#2f6fed', backgroundColor: '#2f6fed', borderWidth: 2.2, pointRadius: 2.5, tension: 0.35 },
      { label: 'Previous forecast', data: DATA.prevForecast, borderColor: '#98a1b3', borderWidth: 1.4, borderDash: [5, 4], pointRadius: 0, tension: 0.35 },
    ] },
    options: chartOpts('Net sales (₹ Cr)', (v) => '₹' + v + ' Cr', { xTicks: 15 }),
  });

  const hBar = (canvasId, data, color) => setChart(canvasId, {
    type: 'bar',
    data: { labels: data.map((d) => d[0]), datasets: [{ data: data.map((d) => d[1]), backgroundColor: color, borderRadius: 5, barThickness: 22 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ' ₹' + c.parsed.y.toFixed(1) + ' Cr' }, backgroundColor: '#111c2e' } },
      scales: { x: { grid: { color: '#edf0f4' }, ticks: { callback: (v) => '₹' + v, font: { size: 11 } }, border: { display: false } }, y: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 } } } },
    },
  });

  hBar('s-cat', DATA.categories.map((c) => [c.name, c.sales]), '#2f6fed');
  hBar('s-reg', DATA.regions.map((r) => [r.name, r.sales]), '#0284c7');
  hBar('s-seller', [['Amazon Retail', 58.2], ['FBA Partners', 42.6], ['Third-party', 19.1], ['Own channels', 8.5]], '#7c3aed');

  new DataTable($('#sales-table'), [
    { key: 'product', label: 'Product' },
    { key: 'category', label: 'Category' },
    { key: 'sales', label: 'Sales', num: true, fmt: (v) => fmtCr(v) },
    { key: 'units', label: 'Units', num: true, fmt: (v) => fmtNum(v) + 'K' },
    { key: 'growth', label: 'Growth', num: true, fmt: (v) => `${v >= 0 ? '+' : ''}${v}%` },
    { key: 'forecast', label: 'Forecast', num: true, fmt: (v) => `${v >= 0 ? '+' : ''}${v}%` },
    { key: 'conf', label: 'Confidence', num: true, fmt: (v) => v + '%' },
  ], DATA.products.map((p) => ({ ...p })), { pageSize: 8, id: 'sales', title: 'Sales table' }).render();
};

/* ============ Costs ============ */
SCREENS.costs = () => `
  ${standardHeader('Cost Intelligence', 'Understand spend and predict future costs')}
  ${renderKpis([
    { label: 'Total Cost', value: '₹91.2 Cr', delta: '+8.1%', dir: 'down' },
    { label: 'Fulfillment Cost', value: '₹16.4 Cr', delta: '+9.4%', dir: 'down' },
    { label: 'Logistics Cost', value: '₹10.9 Cr', delta: '+12.2%', dir: 'down' },
    { label: 'Marketing Cost', value: '₹4.6 Cr', delta: '+3.1%', dir: 'down' },
    { label: 'Procurement Cost', value: '₹28.1 Cr', delta: '+7.0%', dir: 'down' },
    { label: 'Return Cost', value: '₹3.2 Cr', delta: '+4.5%', dir: 'down' },
  ])}
  <div class="grid-2" style="margin-bottom:16px">
    <div class="panel"><div class="panel-head"><div class="panel-title">Cost Waterfall · Revenue to Contribution</div></div><div class="panel-body">${waterfallHtml()}</div></div>
    <div class="panel"><div class="panel-head"><div class="panel-title">Cost by Category</div></div><div class="panel-body flat"><div class="chart-box"><canvas id="c-cat"></canvas></div></div></div>
  </div>
  <div class="grid-2">
    ${['logistics', 'fulfillment', 'procurement', 'marketing'].map((key) => `
      <div class="panel">
        <div class="panel-head"><div class="panel-title">${key[0].toUpperCase() + key.slice(1)} · Driver Analysis</div>
          <span class="badge ${key === 'logistics' ? 'danger' : (key === 'procurement' ? 'warn' : 'neutral')}">${key === 'logistics' ? '+12.2%' : key === 'procurement' ? '+7.0%' : key === 'fulfillment' ? '+9.4%' : '+3.1%'}</span></div>
        <div class="panel-body">
          ${DATA.costDrivers[key].map((d) => `
            <div class="driver-item">
              <div class="d-head"><b>${d.name}</b><span>${d.delta}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--sub)"><span>Expected 30-day impact</span><b style="color:var(--red)">${d.impact}</b></div>
            </div>`).join('')}
        </div>
      </div>`).join('')}
  </div>`;

function waterfallHtml() {
  const rev = 128.4;
  const items = [...DATA.costBreakdown.map((c) => ({ name: c.name, v: c.value })), { name: 'Contribution Profit', v: 37.2 }];
  let cur = rev;
  const rows = items.map((it) => {
    const start = cur;
    cur -= it.v;
    const end = cur;
    const down = end < start;
    return { it, seg: { left: Math.min(start, end), w: Math.abs(start - end), down }, end };
  });
  return `<div class="waterfall">
    <div class="wf-row"><div class="wf-label"><b>Revenue</b></div><div class="wf-track"><div class="wf-seg" style="left:0;width:100%;background:#2f6fed"></div></div><div class="wf-value">₹128.4 Cr</div></div>
    ${rows.map((r) => `
      <div class="wf-row">
        <div class="wf-label">${r.it.name}</div>
        <div class="wf-track">
          <div class="wf-seg" style="left:${(r.seg.left / rev) * 100}%;width:${(r.seg.w / rev) * 100}%;background:${r.it.name === 'Contribution Profit' ? 'var(--green)' : (r.seg.down ? '#98a2b3' : '#d3d9e3')}"></div>
        </div>
        <div class="wf-value ${r.it.name === 'Contribution Profit' ? 'up' : ''}">₹${r.it.v} Cr</div>
      </div>`).join('')}
  </div>`;
}

window.mount_costs = () => {
  const cCost = DATA.categories.map((c) => [c.name, round2(c.sales * (1 - c.margin))]);
  setChart('c-cat', {
    type: 'bar',
    data: { labels: cCost.map((d) => d[0]), datasets: [{ data: cCost.map((d) => d[1]), backgroundColor: ['#476788', '#8a6d3b', '#b45309', '#ca8a04', '#7c6f5f'], borderRadius: 5, barThickness: 30 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ' ₹' + c.parsed.y.toFixed(1) + ' Cr' }, backgroundColor: '#111c2e' } }, scales: { y: { grid: { color: '#edf0f4' }, border: { display: false }, ticks: { callback: (v) => '₹' + v, font: { size: 11 } } }, x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 } } } } },
  });
};

/* keep last line — guards against double init */
window.__appCoreLoaded = true;