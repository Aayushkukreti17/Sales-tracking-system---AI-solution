/* ============ Profitability ============ */
SCREENS.profitability = () => `
  ${standardHeader('Profitability', 'Connect sales and costs to margin')}
  ${renderKpis([
    { label: 'Gross Profit', value: '₹72.3 Cr', delta: '+12.4%', dir: 'up' },
    { label: 'Contribution Profit', value: '₹37.2 Cr', delta: '+18.3%', dir: 'up' },
    { label: 'Gross Margin', value: '56.3%', delta: '+0.8 pts', dir: 'up' },
    { label: 'Contribution Margin', value: '29.1%', delta: '+1.4 pts', dir: 'up' },
    { label: 'Profit per Order', value: '₹10.9', delta: '+8.4%', dir: 'up' },
    { label: 'Profit per SKU', value: '₹4.2K', delta: '+6.1%', dir: 'up' },
  ])}
  <div class="grid-2" style="margin-bottom:16px">
    <div class="panel"><div class="panel-head"><div class="panel-title">Profitability Trend</div></div><div class="panel-body flat"><div class="chart-box"><canvas id="p-trend"></canvas></div></div></div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Margin by Category</div><div class="panel-sub">Contribution margin heatmap</div></div>
      <div class="panel-body">
        <div class="heatmap">
          <div class="hm-row"><div class="hm-name">Category</div><div class="hm-name">Margin</div><div class="hm-name">Trend</div></div>
          ${DATA.categories.map((c) => {
            const m = (c.margin * 100).toFixed(0);
            const col = c.margin > 0.32 ? '#15803d' : c.margin > 0.22 ? '#2f6fed' : c.margin > 0.15 ? '#b45309' : '#d92d20';
            return `<div class="hm-row"><div class="hm-name">${c.name}</div><div class="hm-band" style="background:${col}">${m}%</div><div class="hm-name">${c.growth >= 0 ? '+' : ''}${c.growth}%</div></div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>
  <div class="panel"><div class="dt-toolbar" style="border-bottom:1px solid var(--border)"><b style="font-size:13px">Profit per SKU</b><div class="spacer"></div></div><div id="profit-table"></div></div>`;

window.mount_profitability = () => {
  const profitS = DATA.series('profit').map((p, i) => (i < 12 ? p : null));
  const marginS = DATA.series('margin').map((m, i) => (i < 12 ? m : null));
  setChart('p-trend', {
    type: 'line',
    data: { labels: DATA.labels, datasets: [
      { label: 'Contribution profit (₹ Cr)', data: profitS, borderColor: '#15803d', backgroundColor: '#15803d', borderWidth: 2.2, pointRadius: 2, spanGaps: true, tension: 0.35 },
      { label: 'Margin (%)', data: marginS, borderColor: '#6d28d9', borderWidth: 2, yAxisID: 'y1', pointRadius: 2, spanGaps: true, tension: 0.35 },
    ] },
    options: chartOpts('₹ Cr', (v) => '₹' + v, { secondY: 'Margin (%)', xTicks: 15 }),
  });
  new DataTable($('#profit-table'), [
    { key: 'product', label: 'Product' },
    { key: 'category', label: 'Category' },
    { key: 'sales', label: 'Sales', num: true, fmt: (v) => fmtCr(v) },
    { key: 'margin', label: 'Margin', num: true, fmt: (v) => v + '%' },
    { key: 'growth', label: 'Growth', num: true, fmt: (v) => `${v >= 0 ? '+' : ''}${v}%` },
    { key: 'risk', label: 'Risk', fmt: (v) => riskBadge(v) },
  ], DATA.products.map((p) => ({ ...p })).sort((a, b) => b.margin - a.margin), { pageSize: 8, id: 'profit' }).render();
};

/* ============ Products ============ */
SCREENS.products = () => `
  ${pageHeader('Product Intelligence', 'Portfolio-level view with bulk actions and drill-down', `
    <button class="btn small" onclick="showToast('View saved')">Save view</button>
    <button class="btn small primary" onclick="showToast('Comparing selected products')">Compare</button>`)}
  <div class="panel">
    <div class="dt-toolbar" style="border-bottom:1px solid var(--border)">
      <select id="p-cat" class="fb"><option>All categories</option>${DATA.categories.map((c) => `<option>${c.name}</option>`).join('')}</select>
      <select id="p-risk" class="fb"><option>All risks</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>
      <div class="spacer"></div>
      ${['Create report', 'Add to scenario', 'Export'].map((a) => `<button class="btn small" data-action="${esc(a)}">${a}</button>`).join('')}
    </div>
    <div id="product-table"></div>
  </div>`;

window.mount_products = () => {
  const mkTable = () => {
    const container = $('#product-table');
    container.innerHTML = '';
    let rows = DATA.products;
    const cat = $('#p-cat').value;
    const ris = $('#p-risk').value;
    if (cat !== 'All categories') rows = rows.filter((p) => p.category === cat);
    if (ris !== 'All risks') rows = rows.filter((p) => p.risk === ris);

    const t = new DataTable(container, [
      { key: 'sku', label: 'SKU' },
      { key: 'product', label: 'Product' },
      { key: 'category', label: 'Category' },
      { key: 'sales', label: 'Sales', num: true, fmt: (v) => fmtCr(v) },
      { key: 'units', label: 'Units', num: true, fmt: (v) => fmtNum(v) + 'K' },
      { key: 'forecast', label: 'Forecast', num: true, fmt: (v) => `${v >= 0 ? '+' : ''}${v}%` },
      { key: 'conf', label: 'Forecast Risk', num: true, fmt: (v) => (v >= 90 ? '<span class="badge ok">' + v + '%</span>' : v >= 80 ? '<span class="badge warn">' + v + '%</span>' : '<span class="badge danger">' + v + '%</span>') },
      { key: 'margin', label: 'Margin', num: true, fmt: (v) => v + '%' },
      { key: 'stock', label: 'Inventory', num: true, fmt: (v) => fmtNum(v) },
      { key: 'cover', label: 'Days Cover', num: true, fmt: (v) => v },
      { key: 'risk', label: 'Stockout Risk', fmt: (v) => riskBadge(v) },
    ], rows.map((p) => ({ ...p })), { pageSize: 10, id: 'prod', searchable: true, selectable: true, idKey: 'sku', actions: true });
    t.render();
  };

  $('#p-cat').addEventListener('change', mkTable);
  $('#p-risk').addEventListener('change', mkTable);
  mkTable();
};

/* ============ Categories ============ */
SCREENS.categories = () => `
  ${standardHeader('Category Intelligence', 'Category manager workspace with performance and drivers')}
  <div class="cat-pills" id="cat-pills">
    ${DATA.categories.map((c, i) => `<button class="chip ${i === 0 ? 'active' : ''}" data-cat="${c.name}">${c.name}</button>`).join('')}
  </div>
  <div id="cat-content"></div>`;

window.mount_categories = () => {
  let current = state.catParam || DATA.categories[0].name;
  const pills = $$('#cat-pills .chip');
  const apply = () => {
    $$('#cat-pills .chip').forEach((x) => x.classList.toggle('active', x.dataset.cat === current));
    const c = DATA.categories.find((x) => x.name === current);
    document.getElementById('cat-content').innerHTML = `
      <div class="cat-summary">
        ${[[ 'Sales', fmtCr(c.sales) ], [ 'Forecast', fmtCr(c.forecast) ], [ 'Growth', '+' + c.growth + '%' ], [ 'Margin', (c.margin * 100).toFixed(1) + '%' ], [ 'Forecast Accuracy', '94.1%' ]].map((x) => `
          <div class="kpi-card"><div class="kpi-label">${x[0]}</div><div class="kpi-value" style="font-size:20px">${x[1]}</div></div>`).join('')}
      </div>
      <div class="grid-2" style="margin-bottom:16px">
        <div class="panel"><div class="panel-head"><div class="panel-title">Category Trend · ${c.name}</div></div><div class="panel-body flat"><div class="chart-box"><canvas id="cat-trend"></canvas></div></div></div>
        <div class="panel"><div class="panel-head"><div class="panel-title">Subcategory Performance</div></div><div class="panel-body">
          ${catSubcategories(current).map((s) => `<div class="stat-item" style="padding:6px 0"><span class="k">${s[0]}</span><span class="v small">${fmtCr(s[1])} <span class="kpi-delta ${s[2] >= 0 ? 'up' : 'down'}">${s[2] >= 0 ? '+' : ''}${s[2]}%</span></span></div>`).join('')}
        </div></div>
      </div>
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><div class="panel-title">Top Products</div></div>
          <div class="panel-body flat"><div id="cat-top"></div></div>
        </div>
        <div class="panel">
          <div class="panel-head"><div class="panel-title">Declining Products</div></div>
          <div class="panel-body flat"><div id="cat-declining"></div></div>
        </div>
      </div>`;
    state.catParam = current;
    const prods = DATA.products.filter((p) => p.category === current);
    new DataTable($('#cat-top'), [
      { key: 'product', label: 'Product' }, { key: 'sales', label: 'Sales', num: true, fmt: (v) => fmtCr(v) },
      { key: 'growth', label: 'Growth', num: true, fmt: (v) => (v >= 0 ? '+' : '') + v + '%' },
      { key: 'conf', label: 'Risk', num: true, fmt: (v) => (v >= 90 ? '<span class="badge ok">' + v + '%</span>' : '<span class="badge warn">' + v + '%</span>') },
    ], prods.slice().sort((a, b) => b.sales - a.sales).slice(0, 6), { pageSize: 6, searchable: false }).render();
    new DataTable($('#cat-declining'), [
      { key: 'product', label: 'Product' }, { key: 'growth', label: 'Growth', num: true, fmt: (v) => v + '%' },
      { key: 'conf', label: 'Forecast', num: true, fmt: (v) => v + '%' },
    ], prods.filter((p) => p.growth < 5).length ? prods.filter((p) => p.growth < 5) : prods.slice().sort((a, b) => a.growth - b.growth).slice(0, 3),
    { pageSize: 6, searchable: false, title: 'Watchlist' }).render();

    const base = DATA.series('revenue').map((v) => round2(v * c.share));
    setChart('cat-trend', {
      type: 'line',
      data: { labels: DATA.labels, datasets: [
        { label: c.name + ' sales', data: base, borderColor: '#2f6fed', backgroundColor: 'rgba(47,111,237,0.12)', borderWidth: 2.2, pointRadius: 2, tension: 0.35, fill: true },
        { label: 'Forecast', data: base.map((v, i) => (i < 12 ? null : v)), borderColor: '#6d28d9', borderWidth: 1.6, borderDash: [5, 4], pointRadius: 3, tension: 0.35, spanGaps: true },
      ] },
      options: chartOpts('₹ Cr', (v) => '₹' + v + ' Cr', { xTicks: 15 }),
    });
  };
  pills.forEach((p) => p.addEventListener('click', () => { current = p.dataset.cat; apply(); }));
  apply();
};

function catSubcategories(name) {
  const map = {
    Electronics: [['Audio', 14.2, 18], ['Mobiles', 12.8, 12], ['Computers', 9.6, 9], ['Cameras', 5.8, -3]],
    Fashion: [['Men', 11.9, 11], ['Women', 9.8, 6], ['Kids', 6.5, 4]],
    Home: [['Furniture', 8.6, 7], ['Appliances', 9.1, 11], ['Decor', 4.1, 2]],
    Grocery: [['Staples', 8.9, 4], ['Dairy', 6.2, 6], ['Snacks', 4.2, 3]],
    Beauty: [['Skin', 6.7, 21], ['Hair', 5.2, 16], ['Makeup', 4.8, 18]],
  };
  return map[name] || map.Electronics;
}

/* ============ Regions ============ */
SCREENS.regions = () => `
  ${standardHeader('Regional Intelligence', 'Sales, cost and margin by region with drill-down')}
  <div class="region-grid" id="region-grid">
    ${DATA.regions.map((r) => `
      <div class="region-card ${state.regionParam === r.name ? 'active' : ''}" data-region="${r.name}">
        <div class="r-name">${r.name}</div>
        <div class="r-rows">
          <div><span>Sales</span><b>${fmtCr(r.sales)}</b></div>
          <div><span>Growth</span><b class="${r.growth >= 0 ? 'up' : 'down'}">${r.growth >= 0 ? '+' : ''}${r.growth}%</b></div>
          <div><span>Margin</span><b>${r.margin}%</b></div>
          <div><span>Cost</span><b>${fmtCr(r.cost)}</b></div>
        </div>
      </div>`).join('')}
  </div>
  <div id="region-content"></div>`;

window.mount_regions = () => {
  let current = state.regionParam || 'West';
  const render = (name) => {
    $$('#region-grid .region-card').forEach((x) => x.classList.toggle('active', x.dataset.region === name));
    state.regionParam = name;
    const r = DATA.regions.find((x) => x.name === name);
    document.getElementById('region-content').innerHTML = `
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><div class="panel-title">Demand pattern · ${name}</div></div>
          <div class="panel-body flat"><div class="chart-box"><canvas id="reg-trend"></canvas></div></div>
        </div>
        <div class="panel">
          <div class="panel-head"><div class="panel-title">City footprint · ${name}</div></div>
          <div class="panel-body">
            <div class="stat-list">${regionCities(name).map((ct) => `
              <div class="stat-item"><span class="k">${ct[0]}</span><span class="v small">${fmtCr(ct[1])} <span class="kpi-delta ${ct[2] >= 0 ? 'up' : 'down'}">${ct[2] >= 0 ? '+' : ''}${ct[2]}%</span></span></div>`).join('')}</div>
          </div>
        </div>
      </div>`;
    const share = r.sales / 128.4;
    const base = DATA.series('revenue').map((v) => round2(v * share));
    setChart('reg-trend', {
      type: 'line',
      data: { labels: DATA.labels, datasets: [
        { label: name + ' sales', data: base, borderColor: '#0284c7', backgroundColor: 'rgba(2,132,199,0.12)', borderWidth: 2.2, pointRadius: 2, tension: 0.35, fill: true },
        { label: 'Forecast', data: base.map((v, i) => (i < 12 ? null : v)), borderColor: '#6d28d9', borderWidth: 1.6, borderDash: [5, 4], pointRadius: 3, spanGaps: true, tension: 0.35 },
      ] },
      options: chartOpts('₹ Cr', (v) => '₹' + v + ' Cr', { xTicks: 15 }),
    });
  };
  $$('#region-grid .region-card').forEach((c) => c.addEventListener('click', () => render(c.dataset.region)));
  render(current);
};

function regionCities(name) {
  const map = {
    North: [['Delhi NCR', 18.4, 9], ['Lucknow', 5.8, 7], ['Chandigarh', 4.1, 5], ['Jaipur', 2.9, 6]],
    West: [['Mumbai', 22.1, 15], ['Pune', 10.4, 13], ['Ahmedabad', 7.1, 11], ['Nagpur', 3.1, 9]],
    South: [['Bengaluru', 16.2, 13], ['Chennai', 9.4, 10], ['Hyderabad', 9.5, 12]],
    East: [['Kolkata', 11.2, 7], ['Bhubaneswar', 4.4, 5], ['Guwahati', 3.8, 4]],
  };
  return map[name] || map.West;
}

/* ============ Inventory ============ */
SCREENS.inventory = () => `
  ${standardHeader('Inventory & Demand', 'Connecting forecast with operations — cover, risk and lost sales')}
  ${renderKpis([
    { label: 'Forecast Demand', value: '₹152.1 Cr', delta: '+10.2%', dir: 'up' },
    { label: 'Available Inventory', value: '₹98.4 Cr (value)', delta: '2.4M units', dir: 'muted' },
    { label: 'Inventory Cover', value: '24 days', delta: 'target 22', dir: 'muted' },
    { label: 'Stockout Risk', value: '12 SKUs', delta: '+4 vs last week', dir: 'down' },
    { label: 'Overstock Risk', value: '8 SKUs', delta: '-2 vs last week', dir: 'up' },
    { label: 'Expected Lost Sales', value: '₹2.1 Cr', delta: 'this horizon', dir: 'down' },
  ])}
  <div class="panel">
    <div class="dt-toolbar" style="border-bottom:1px solid var(--border)"><b style="font-size:13px">Replenishment watchlist</b><div class="spacer"></div></div>
    <div id="inv-table"></div>
  </div>`;

window.mount_inventory = () => {
  new DataTable($('#inv-table'), [
    { key: 'sku', label: 'SKU' },
    { key: 'product', label: 'Product' },
    { key: 'cover', label: 'Days Cover', num: true, fmt: (v) => v },
    { key: 'stock', label: 'Available Stock', num: true, fmt: (v) => fmtNum(v) },
    { key: 'risk', label: 'Stockout Risk', fmt: (v) => riskBadge(v) },
    { key: 'lostSales', label: 'Expected Lost Sales', num: true, fmt: (v) => (v ? fmtCr(v) : '—') },
  ], DATA.products.map((p) => ({ ...p, lostSales: p.cover < 10 ? round2(p.sales * 0.12) : null })), { pageSize: 10, id: 'inv' }).render();
};

/* ============ Scenario Lab ============ */
SCREENS.scenario = () => `
  ${pageHeader('Scenario Lab', 'Model business decisions before making them', `
    <button class="btn small" onclick="saveScenario()">Save scenario</button>
    <button class="btn small primary" onclick="showToast('Scenarios compared and exported')">Compare & export</button>`)}
  <div class="grid-2">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Assumption controls</div><div class="panel-sub">Adjust drivers and watch the impact instantly</div></div>
      <div class="panel-body" id="scenario-sliders"></div>
    </div>
    <div class="col">
      <div class="panel" style="margin-bottom:14px">
        <div class="panel-head"><div class="panel-title">Output</div></div>
        <div class="panel-body" id="scenario-output"></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div class="panel-title">Scenario comparison</div><div class="panel-sub">Base as reference</div></div>
        <div class="panel-body scenario-compare" id="scenario-compare"></div>
      </div>
    </div>
  </div>`;

const SLIDERS = [
  ['vol', 'Sales volume', 80, 120, ' %'],
  ['price', 'Average price', 90, 110, ' %'],
  ['mkt', 'Marketing spend', 70, 130, ' %'],
  ['procurement', 'Procurement cost', 90, 110, ' %'],
  ['logistics', 'Logistics cost', 85, 115, ' %'],
  ['returns', 'Return rate', 90, 110, ' %'],
];

function renderScenarioSliders() {
  const box = $('#scenario-sliders');
  if (!box) return;
  box.innerHTML = SLIDERS.map((s) => `
    <div class="slider-row">
      <div class="sl-label"><span>${s[1]}</span><b>${state.sliders[s[0]] >= 0 ? '+' : ''}${state.sliders[s[0]]}${s[3]}</b></div>
      <input type="range" data-k="${s[0]}" min="${s[2]}" max="${s[3]}" value="${state.sliders[s[0]] + 100}" step="1">
    </div>`).join('');
  $$('input[type=range]', box).forEach((r) => r.addEventListener('input', (e) => {
    state.sliders[e.target.dataset.k] = +e.target.value - 100;
    renderScenarioSliders();
    renderScenarioOutput();
    const d = state.sliders;
    const out = scenarioOutput({ sliders: d });
    document.querySelectorAll('.slider-out').forEach((x) => { });
    showToast('Recalculated: profit ' + (out.profit >= 0 ? '+' : '') + fmtCr(out.profit));
  }));
}

function renderScenarioOutput() {
  const out = scenarioOutput({ sliders: state.sliders });
  const base = scenarioOutput({ sliders: { vol: 0, price: 0, mkt: 0, procurement: 0, logistics: 0, returns: 0 } });
  const impact = round2(out.profit - base.profit);
  document.getElementById('scenario-output').innerHTML = `
    <table class="scenario-compare" style="width:100%">
      <thead><tr><th></th><th>Current</th><th>Scenario</th><th>Δ</th></tr></thead>
      <tbody>
        <tr><td class="row-label">Sales</td><td>${fmtCr(base.sales)}</td><td>${fmtCr(out.sales)}</td><td class="${out.sales - base.sales >= 0 ? 'delta-pos' : 'delta-neg'}">${out.sales - base.sales >= 0 ? '+' : ''}${fmtCr(round2(out.sales - base.sales))}</td></tr>
        <tr><td class="row-label">Cost</td><td>${fmtCr(base.cost)}</td><td>${fmtCr(out.cost)}</td><td class="${out.cost - base.cost >= 0 ? 'delta-neg' : 'delta-pos'}">${out.cost - base.cost >= 0 ? '+' : ''}${fmtCr(round2(out.cost - base.cost))}</td></tr>
        <tr><td class="row-label">Profit</td><td>${fmtCr(base.profit)}</td><td>${fmtCr(out.profit)}</td><td class="${impact >= 0 ? 'delta-pos' : 'delta-neg'}">${impact >= 0 ? '+' : ''}${fmtCr(impact)}</td></tr>
        <tr><td class="row-label">Margin</td><td>${base.margin}%</td><td>${out.margin}%</td><td class="${out.margin - base.margin >= 0 ? 'delta-pos' : 'delta-neg'}">${round2(out.margin - base.margin) >= 0 ? '+' : ''}${round2(out.margin - base.margin)} pts</td></tr>
      </tbody>
    </table>
    <div style="margin-top:12px;font-size:13px;color:var(--muted)">Profit impact <b class="${impact >= 0 ? 'up' : 'down'}" style="font-size:18px">${impact >= 0 ? '+' : ''}${fmtCr(impact)}</b></div>`;
  renderScenarioCompare();
}

function renderScenarioCompare() {
  const box = document.getElementById('scenario-compare');
  if (!box) return;
  const rows = ['sales', 'cost', 'profit', 'margin'];
  const base = scenarioOutput(state.scenarios[0]);
  box.innerHTML = `<table>
    <thead><tr><th>Metric</th>${state.scenarios.map((s) => `<th>${esc(s.name)}</th>`).join('')}<th>State</th></tr></thead>
    <tbody>
      ${rows.map((k) => `<tr><td class="row-label">${k[0].toUpperCase() + k.slice(1)}</td>
        ${state.scenarios.map((s) => { const o = scenarioOutput(s); const diff = k === 'margin' ? round2(o.margin - base.margin) : round2(o[k] - base[k]); return `<td class="${diff >= 0 ? 'delta-pos' : 'delta-neg'}">${k === 'margin' ? o.margin + '%' : fmtCr(o[k])}${diff !== 0 ? ` <span style="font-size:11px">(${diff >= 0 ? '+' : ''}${k === 'margin' ? diff + ' pts' : fmtCr(diff)})</span>` : ''}</td>`; }).join('')}
        <td><button class="btn small" onclick="showToast('Scenario exported as report')">Export</button></td></tr>`).join('')}
    </tbody>
  </table>`;
}

function saveScenario() {
  const name = prompt('Scenario name:', 'My Scenario');
  if (!name) return;
  state.scenarios.push({ name, sliders: { ...state.sliders } });
  localStorage.setItem('fos_scenarios', JSON.stringify(state.scenarios));
  renderScenarioCompare();
  showToast('Scenario saved & autosaved');
}

window.mount_scenario = () => {
  if (!state.scenarios) initScenarios();
  renderScenarioSliders();
  renderScenarioOutput();
};