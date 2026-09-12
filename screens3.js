/* ============ Insights ============ */
SCREENS.insights = () => `
  ${standardHeader('Insights', 'Central intelligence feed across demand, sales, cost, margin and risk')}
  <div class="cat-pills" id="ins-pills">
    <button class="chip active" data-cat="All">All</button>
    ${['Cost', 'Sales', 'Risk', 'Inventory', 'Margin', 'Data'].map((c) => `<button class="chip" data-cat="${c}">${c}</button>`).join('')}
  </div>
  <div class="insight-list" id="ins-list"></div>`;

window.mount_insights = () => {
  const render = (cat) => {
    const list = cat === 'All' ? DATA.insights : DATA.insights.filter((i) => i.cat === cat);
    document.getElementById('ins-list').innerHTML = list.map((i) => `
      <div class="insight ${'border-' + i.border}">
        <div class="insight-priority">${i.priority} · ${i.cat}</div>
        <div class="insight-title">${i.title}</div>
        <div class="insight-detail">${i.detail}</div>
        <div class="insight-impact ${i.pos ? 'pos' : 'neg'}">${i.impact}</div>
        <div class="insight-meta">
          <span>Confidence <b>${i.conf}%</b></span>
          <span>Primary driver: <b>${i.driver}</b></span>
          <span>Secondary: <b>${i.driver2}</b></span>
        </div>
        <div style="margin-top:10px"><button class="btn small" onclick="showToast('Investigating: ${esc(i.title)}')">${i.action}</button></div>
      </div>`).join('');
  };
  $$('#ins-pills .chip').forEach((p) => p.addEventListener('click', () => {
    $$('#ins-pills .chip').forEach((x) => x.classList.toggle('active', x === p));
    render(p.dataset.cat);
  }));
  render('All');
};

/* ============ Variance ============ */
SCREENS.variance = () => `
  ${standardHeader('Variance Analysis', 'Actual vs forecast vs budget with explanations')}
  <div class="panel" style="margin-bottom:16px">
    <div class="panel-head"><div class="panel-title">Headline variance</div><div class="panel-sub">₹ Cr, Sep 2026 vs forecast</div></div>
    <div class="panel-body flat">
      <table class="dt" style="width:100%">
        <thead><tr><th>Metric</th><th class="num">Actual</th><th class="num">Forecast</th><th class="num">Budget</th><th class="num">Variance</th><th></th></tr></thead>
        <tbody>
          ${DATA.variance.map((r) => `<tr>
            <td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td>
            <td class="num ${r[5] === 'down' ? 'down' : 'up'}" style="color:${r[5] === 'down' ? 'var(--red)' : 'var(--green)'}">${r[4]}</td>
            <td class="num"><button class="btn small" onclick="showToast('Variance detail for ${esc(r[0])}')">Explain</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
  <div class="grid-2">
    <div class="panel"><div class="panel-head"><div class="panel-title">Variance by metric</div></div><div class="panel-body flat"><div class="chart-box"><canvas id="v-bar"></canvas></div></div></div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Variance explanations</div></div>
      <div class="panel-body">
        <div class="risk-list">${DATA.varianceExplanations.map((x) => `<div class="risk-item"><div class="r-left"><span class="status-dot warn"></span><span>${x}</span></div></div>`).join('')}</div>
      </div>
    </div>
  </div>`;

window.mount_variance = () => {
  setChart('v-bar', {
    type: 'bar',
    data: { labels: ['Sales', 'Cost', 'Profit'], datasets: [{ data: [-3.4, 2.5, -5.9], backgroundColor: ['#d92d20', '#15803d', '#d92d20'], borderRadius: 5, barThickness: 34 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ' Variance: ' + c.parsed.y + ' Cr' } } }, scales: { y: { grid: { color: '#edf0f4' }, border: { display: false } }, x: { grid: { display: false }, border: { display: false } } } },
  });
};

/* ============ Forecast Accuracy ============ */
SCREENS.accuracy = () => `
  ${standardHeader('Forecast Accuracy', 'Monitor whether forecasts are trustworthy')}
  ${renderKpis(DATA.accuracy.kpis.map((k) => ({ label: k[0], value: k[1], delta: 'last 30 days', dir: k[2] || 'muted' })))}
  <div class="grid-2" style="margin-bottom:16px">
    <div class="panel"><div class="panel-head"><div class="panel-title">Accuracy over time (%)</div></div><div class="panel-body flat"><div class="chart-box"><canvas id="a-time"></canvas></div></div></div>
    <div class="panel"><div class="panel-head"><div class="panel-title">Actual vs predicted · selected period</div></div><div class="panel-body flat"><div class="chart-box"><canvas id="a-actual"></canvas></div></div></div>
  </div>
  <div class="grid-3">
    <div class="panel"><div class="panel-head"><div class="panel-title">Accuracy by area</div></div><div class="panel-body">${accList(DATA.accuracy.byArea)}</div></div>
    <div class="panel"><div class="panel-head"><div class="panel-title">Accuracy by region</div></div><div class="panel-body">${accList(DATA.accuracy.byRegion)}</div></div>
    <div class="panel"><div class="panel-head"><div class="panel-title">Accuracy by horizon</div></div><div class="panel-body">${accList(DATA.accuracy.byHorizon)}</div></div>
  </div>`;

function accList(rows) {
  return '<div class="stat-list">' + rows.map((r) => `
    <div class="stat-item"><span class="k">${r[0]}</span><span style="display:flex;align-items:center;gap:8px;flex:1">
      <div class="bar-track" style="flex:1;max-width:120px"><div class="bar-fill" style="width:${r[1]}%;background:${r[1] >= 92 ? 'var(--green)' : r[1] >= 88 ? 'var(--accent)' : 'var(--amber)'}"></div></div>
      <b class="v small">${r[1]}%</b></span></div>`).join('') + '</div>';
}

window.mount_accuracy = () => {
  setChart('a-time', {
    type: 'line',
    data: { labels: DATA.labels.slice(0, 12), datasets: [{ label: 'Accuracy (%)', data: DATA.accuracy.overTime, borderColor: '#15803d', backgroundColor: 'rgba(21,128,61,0.12)', borderWidth: 2.2, pointRadius: 2.5, tension: 0.35, fill: true }] },
    options: chartOpts('Forecast accuracy (%)', (v) => v.toFixed(1) + '%', { xTicks: 12, yFormat: (v) => v + '%' }),
  });
  setChart('a-actual', {
    type: 'line',
    data: { labels: DATA.labels.slice(0, 12), datasets: [
      { label: 'Actual', data: DATA.salesActual, borderColor: '#2f6fed', pointRadius: 2, tension: 0.35, fill: false },
      { label: 'Predicted', data: DATA.salesActual.map((v) => round2(v * 1.008)), borderColor: '#98a1b3', borderDash: [5, 4], pointRadius: 2, tension: 0.35, fill: false },
    ] },
    options: chartOpts('Net sales (₹ Cr)', (v) => '₹' + v + ' Cr', { xTicks: 12 }),
  });
};

/* ============ Models ============ */
SCREENS.models = () => `
  ${standardHeader('Model Monitoring', 'Production model transparency for analysts')}
  <div class="grid-2" style="margin-bottom:16px">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">${DATA.model.name}</div>
        <span class="badge ok"><span class="status-dot ok"></span>${DATA.model.status}</span></div>
      <div class="panel-body">
        <div class="stat-list">
          <div class="stat-item"><span class="k">Version</span><span class="v">${DATA.model.version}</span></div>
          <div class="stat-item"><span class="k">Last trained</span><span class="v">${DATA.model.trained}</span></div>
          <div class="stat-item"><span class="k">Training data</span><span class="v">${DATA.model.trainingData}</span></div>
          <div class="stat-item"><span class="k">Forecast horizon</span><span class="v">${DATA.model.horizon}</span></div>
        </div>
        <div class="grid-3" style="margin-top:14px">
          ${[['MAPE', DATA.model.mape], ['MAE', DATA.model.mae], ['RMSE', DATA.model.rmse], ['Drift', DATA.model.drift], ['Data freshness', DATA.model.freshness], ['Feature health', DATA.model.featureHealth]].map((m) => `
            <div class="kpi-card"><div class="kpi-label">${m[0]}</div><div class="kpi-value" style="font-size:16px">${m[1]}</div></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="col">
      <div class="panel" style="margin-bottom:14px">
        <div class="panel-head"><div class="panel-title">Feature importance</div></div>
        <div class="panel-body">
          ${DATA.model.features.map((f) => `
            <div class="driver-item">
              <div class="d-head"><b>${f[0]}</b><span>${(f[1] * 100).toFixed(0)}%</span></div>
              <div class="bar-track"><div class="bar-fill" style="width:${f[1] * 100 * 4}%;background:var(--accent)"></div></div>
            </div>`).join('')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><div class="panel-title">Generating forecast</div><div class="panel-sub">Latest run</div></div>
        <div class="panel-body">
          <div class="progress-steps">${DATA.model.runSteps.map((s, i) => `
            <div class="pstep ${s[1] ? 'done' : (i === DATA.model.runSteps.findIndex((x) => !x[1]) ? 'running' : '')}">
              <span class="sw">${s[1] ? '✓' : (i === DATA.model.runSteps.findIndex((x) => !x[1]) ? '●' : '○')}</span>
              ${s[0]}${s[1] ? '' : '...'}</div>`).join('')}
          </div>
          <button class="btn primary" style="margin-top:14px;width:100%" onclick="showToast('Forecast generation scheduled')">Regenerate forecast</button>
        </div>
      </div>
    </div>
  </div>`;

/* ============ Data Sources ============ */
SCREENS.sources = () => `
  ${standardHeader('Data Sources', 'Connected systems, sync status and record counts')}
  <div class="panel"><div id="sources-table"></div></div>`;

window.mount_sources = () => {
  new DataTable($('#sources-table'), [
    { key: 'name', label: 'Source', fmt: (v) => '<b>' + v + '</b>' },
    { key: 'status', label: 'Status', fmt: (v) => `<span class="status-dot ${v === 'Connected' ? 'ok' : v === 'Warning' ? 'warn' : 'danger'}"></span> ${v}` },
    { key: 'sync', label: 'Last sync' },
    { key: 'records', label: 'Records', num: true },
    { key: 'schema', label: 'Schema' },
    { key: 'errors', label: 'Errors', num: true, fmt: (v) => (v > 0 ? '<span class="badge danger">' + v + '</span>' : v) },
  ], DATA.dataSources.map((d) => ({ ...d })), { pageSize: 8, id: 'sources', title: 'Connections' }).render();
};

/* ============ Datasets ============ */
SCREENS.datasets = () => `
  ${standardHeader('Dataset Management', 'Inspect datasets powering forecasts')}
  <div class="panel" style="margin-bottom:16px"><div id="ds-table"></div></div>
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Dataset detail · sales_order_items</div></div>
    <div class="panel-body">
      <div class="cat-summary">
        ${[['Rows', DATA.datasetDetail.rows], ['Columns', DATA.datasetDetail.columns], ['Coverage', DATA.datasetDetail.coverage], ['Missing', DATA.datasetDetail.missing], ['Quality', DATA.datasetDetail.quality + '%']].map((x) => `
          <div class="kpi-card"><div class="kpi-label">${x[0]}</div><div class="kpi-value" style="font-size:18px">${x[1]}</div></div>`).join('')}
      </div>
      <b style="font-size:13px">Sample schema</b>
      <div class="cat-pills" style="margin-top:8px">${DATA.datasetDetail.schema.map((s) => `<span class="chip">${s}</span>`).join('')}</div>
    </div>
  </div>`;

window.mount_datasets = () => {
  new DataTable($('#ds-table'), [
    { key: 'name', label: 'Dataset', fmt: (v) => '<b>' + v + '</b>' },
    { key: 'owner', label: 'Owner' },
    { key: 'rows', label: 'Rows', num: true },
    { key: 'range', label: 'Date range' },
    { key: 'quality', label: 'Quality', num: true, fmt: (v) => (v >= 90 ? '<span class="badge ok">' + v + '%</span>' : v >= 75 ? '<span class="badge warn">' + v + '%</span>' : '<span class="badge danger">' + v + '%</span>') },
    { key: 'updated', label: 'Last updated' },
    { key: 'status', label: 'Status', fmt: (v) => `<span class="badge ${v === 'Healthy' ? 'ok' : v === 'Warning' ? 'warn' : 'danger'}">${v}</span>` },
  ], DATA.datasets.map((d) => ({ ...d })), { pageSize: 8, id: 'ds', title: 'Datasets' }).render();
};

/* ============ Data Quality ============ */
SCREENS.quality = () => `
  ${standardHeader('Data Quality', 'Enterprise checks across all connected datasets')}
  <div class="grid-2">
    <div class="panel"><div class="panel-head"><div class="panel-title">Overall quality score</div></div>
      <div class="panel-body">
        <div class="kpi-value" style="font-size:40px">${DATA.dataQuality.score}%</div>
        <div class="bar-track" style="margin:12px 0"><div class="bar-fill" style="width:${DATA.dataQuality.score}%;background:var(--green)"></div></div>
        <div class="stat-item" style="padding:4px 0"><span class="k">Datasets checked</span><span class="v">6</span></div>
        <div class="stat-item" style="padding:4px 0"><span class="k">Pipeline status</span><span class="v"><span class="badge ok">Healthy</span></span></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Checks</div></div>
      <div class="panel-body">
        <div class="risk-list">${DATA.dataQuality.checks.map((c) => `
          <div class="risk-item"><div class="r-left"><span class="status-dot ${c[1] ? 'ok' : 'warn'}"></span><span>${c[0]}</span></div><b style="font-size:13px;color:${c[1] ? 'var(--green)' : 'var(--amber)'}">${c[1] ? 'Pass' : 'Warn'}</b></div>`).join('')}</div>
      </div>
    </div>
  </div>`;

/* ============ Reports ============ */
SCREENS.reports = () => `
  ${standardHeader('Reports', 'Generate, schedule and share recurring reports')}
  <div class="grid-3" style="margin-bottom:16px">
    ${DATA.reports.map((r) => `
      <div class="panel">
        <div class="panel-body">
          <b style="font-size:14px">${r.name}</b>
          <div class="stat-item" style="padding:6px 0"><span class="k">Formats</span><span class="v small">${r.type}</span></div>
          <div class="stat-item" style="padding:6px 0"><span class="k">Cadence</span><span class="v small">${r.cadence}</span></div>
          <div class="stat-item" style="padding:6px 0"><span class="k">Owner</span><span class="v small">${r.owner}</span></div>
          <div style="display:flex;gap:6px;margin-top:10px">
            <button class="btn small primary" onclick="showToast('Generating ${esc(r.name)}')">Generate</button>
            <button class="btn small" onclick="showToast('Scheduled ${esc(r.name)}')">Schedule</button>
          </div>
        </div>
      </div>`).join('')}
  </div>`;

/* ============ Alerts ============ */
SCREENS.alerts = () => `
  ${standardHeader('Alerts', 'Configure and manage alert triggers')}
  <div class="panel" style="margin-bottom:16px">
    <div class="panel-head"><div class="panel-title">Create alert</div></div>
    <div class="panel-body">
      <div class="grid-3">
        <div class="control" style="flex-direction:column;align-items:flex-start;gap:6px"><span>Trigger</span>
          <select style="width:100%"><option>Forecast sales decreases &gt; 10%</option><option>Cost increase &gt; 5%</option><option>Forecast confidence &lt; 75%</option><option>Inventory cover &lt; 10 days</option><option>Data freshness failure</option><option>Margin decrease &gt; 2 pts</option></select></div>
        <div class="control" style="flex-direction:column;align-items:flex-start;gap:6px"><span>Scope</span>
          <select style="width:100%"><option>Electronics</option><option>All categories</option><option>South region</option><option>Top 50 SKUs</option></select></div>
        <div class="control" style="flex-direction:column;align-items:flex-start;gap:6px"><span>Channels</span>
          <select style="width:100%"><option>In-app, Email</option><option>In-app only</option><option>Email, Slack</option><option>All channels</option></select></div>
      </div>
      <button class="btn primary" style="margin-top:12px" onclick="showToast('Alert saved')">Save alert</button>
    </div>
  </div>
  <div class="panel"><div id="alerts-table"></div></div>`;

window.mount_alerts = () => {
  new DataTable($('#alerts-table'), [
    { key: 'name', label: 'Alert' },
    { key: 'scope', label: 'Scope' },
    { key: 'notify', label: 'Notify' },
    { key: 'channels', label: 'Channels' },
    { key: 'status', label: 'Status', fmt: (v) => `<span class="badge ${v === 'Active' ? 'ok' : 'neutral'}">${v}</span>` },
  ], DATA.alerts.map((a) => ({ ...a })), { pageSize: 8, id: 'alerts', title: 'Alert rules' }).render();
};

/* ============ Audit ============ */
SCREENS.audit = () => `
  ${standardHeader('Audit Log', 'Enterprise trust — every action, tracked')}
  <div class="panel"><div id="audit-table"></div></div>`;

window.mount_audit = () => {
  new DataTable($('#audit-table'), [
    { key: 'user', label: 'User' },
    { key: 'action', label: 'Action' },
    { key: 'object', label: 'Object' },
    { key: 'time', label: 'Timestamp' },
  ], DATA.audit.map((a) => ({ ...a })), { pageSize: 8, id: 'audit', title: 'Activity' }).render();
};

/* ============ Users & Roles ============ */
SCREENS.users = () => `
  ${standardHeader('Users & Roles', 'Role-based access control')}
  <div class="grid-3" style="margin-bottom:16px">
    ${DATA.roles.map((r) => `
      <div class="panel">
        <div class="panel-head"><div class="panel-title">${r.name}</div></div>
        <div class="panel-body">
          ${r.perms.map((p) => `<div class="permission-row"><span>${p}</span><span class="status-dot ok"></span></div>`).join('')}
          ${(r.blocked || []).map((p) => `<div class="permission-row"><span style="color:var(--sub)">${p}</span><span style="color:var(--sub)">—</span></div>`).join('')}
        </div>
      </div>`).join('')}
  </div>
  <div class="panel"><div id="users-table"></div></div>`;

window.mount_users = () => {
  new DataTable($('#users-table'), [
    { key: 'name', label: 'Name', fmt: (v) => '<b>' + v + '</b>' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', fmt: (v) => `<span class="badge neutral">${v}</span>` },
    { key: 'lastActive', label: 'Last active' },
    { key: 'status', label: 'Status', fmt: (v) => `<span class="badge ${v === 'Active' ? 'ok' : v === 'Invited' ? 'warn' : 'neutral'}">${v}</span>` },
  ], DATA.users.map((u) => ({ ...u })), { pageSize: 8, id: 'users', title: 'Users' }).render();
};

/* ============ Settings ============ */
SCREENS.settings = () => `
  ${standardHeader('Settings', 'Workspace, forecast defaults and preferences')}
  <div class="grid-2">
    <div class="col">
      <div class="panel" style="margin-bottom:14px"><div class="panel-body">
        <div class="settings-section" style="margin-bottom:0">
          <h3>Workspace</h3>
          ${frow('Workspace name', 'text', 'India Commerce')}
          ${frow('Currency', 'select', 'INR (₹)')}
          ${frow('Fiscal calendar', 'select', 'Apr – Mar (India)')}
        </div>
      </div></div>
      <div class="panel"><div class="panel-body">
        <div class="settings-section" style="margin-bottom:0">
          <h3>Forecast defaults</h3>
          ${frow('Default horizon', 'select', '30 days')}
          ${frow('Default confidence', 'select', '90%')}
          ${frow('Default model', 'select', 'Production v3.8')}
        </div>
      </div></div>
    </div>
    <div class="col">
      <div class="panel" style="margin-bottom:14px"><div class="panel-body">
        <div class="settings-section" style="margin-bottom:0">
          <h3>Notifications</h3>
          ${frow('Forecast completed', 'toggle', 'on')}
          ${frow('Cost anomaly', 'toggle', 'on')}
          ${frow('Inventory risk', 'toggle', 'on')}
          ${frow('Scheduled report ready', 'toggle', 'off')}
        </div>
      </div></div>
      <div class="panel"><div class="panel-body">
        <div class="settings-section" style="margin-bottom:0">
          <h3>Data retention & appearance</h3>
          ${frow('Retention period', 'select', '36 months')}
          ${frow('Theme', 'select', 'Light')}
          ${frow('Compact density default', 'toggle', 'on')}
        </div>
      </div></div>
    </div>
  </div>
  <div style="margin-top:16px"><button class="btn primary" onclick="showToast('Settings saved')">Save changes</button></div>`;

function frow(label, type, value) {
  const id = 'set-' + label.replace(/[^a-z]+/gi, '-').toLowerCase();
  if (type === 'toggle') {
    return `<div class="frow"><label>${label}</label><div class="spacer" style="flex:1"></div><button class="toggle ${value === 'on' ? 'on' : ''}" data-id="${id}"></button></div>`;
  }
  const opts = value.includes('(') ? value : value;
  return `<div class="frow"><label>${label}</label><input type="text" value="${opts}"><div class="spacer" style="flex:1"></div></div>`;
}

window.mount_settings = () => {
  $$('.frow .toggle').forEach((t) => t.addEventListener('click', () => t.classList.toggle('on')));
};

/* ============ Init ============ */
document.addEventListener('DOMContentLoaded', () => {
  initScenarios();
  renderFilterBar();
  renderNav();
  $('#sidebarToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('collapsed'));
  $('#searchTrigger').addEventListener('click', openSearch);
  $('#workspace').addEventListener('click', () => showToast('Workspace: India Commerce'));
  $('#searchOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeSearch(); });
  $('#searchInput').addEventListener('input', (e) => renderSearch(e.target.value));
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') closeSearch();
  });
  if (!location.hash) location.hash = '/command';
  window.addEventListener('hashchange', router);
  router();
});