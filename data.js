const DATA = (() => {
  const labels = [
    "Sep'25", "Oct'25", "Nov'25", "Dec'25", "Jan'26", "Feb'26",
    "Mar'26", "Apr'26", "May'26", "Jun'26", "Jul'26", "Aug'26",
    "Sep'26", "Oct'26", "Nov'26",
  ];
  const actualLength = 12;
  const salesActual = [9.0, 9.4, 9.9, 10.2, 10.4, 11.0, 10.7, 11.5, 11.8, 12.3, 11.8, 11.4];
  const salesForecast = [12.4, 11.9, 13.6];
  const costActual = [6.4, 6.7, 7.0, 7.2, 7.4, 7.8, 7.6, 8.2, 8.4, 8.7, 8.4, 8.1];
  const costForecast = [9.1, 8.8, 10.1];
  const prevForecast = [8.8, 9.1, 9.6, 9.9, 10.1, 10.7, 10.4, 11.2, 11.5, 12.0, 11.5, 11.1, 12.0, 11.6, 13.2];
  const target = [9.4, 9.9, 10.4, 10.7, 10.9, 11.6, 11.2, 12.1, 12.4, 12.9, 12.4, 12.0, 13.0, 12.5, 14.3];
  const ciLower = [...new Array(actualLength).fill(0), 11.6, 11.2, 12.6];
  const ciUpper = [...new Array(actualLength).fill(0), 13.2, 12.7, 14.6];

  const series = (metric) => {
    if (metric === 'revenue') return [...salesActual, ...salesForecast];
    if (metric === 'orders') {
      return [...salesActual, ...salesForecast].map(v => Math.round((v * 1e7 / 1480) * 10 / 10));
    }
    if (metric === 'units') {
      return [...salesActual, ...salesForecast].map(v => Math.round((v * 1e7 / 1480) * 1.6));
    }
    if (metric === 'cost') return [...costActual, ...costForecast];
    if (metric === 'profit') {
      return [...salesActual, ...salesForecast].map((v, i) => v - [...costActual, ...costForecast][i]);
    }
    if (metric === 'margin') {
      return [...salesActual, ...salesForecast].map((v, i) => +(((v - [...costActual, ...costForecast][i]) / v) * 100).toFixed(1));
    }
    return [...salesActual, ...salesForecast];
  };

  const kpis = {
    netSales: { value: '₹128.4 Cr', delta: '+12.8%', dir: 'up', sub: 'vs previous period' },
    forecastSales: { value: '₹142.7 Cr', delta: '+10.4%', dir: 'up', sub: '12-month outlook' },
    totalCost: { value: '₹91.2 Cr', delta: '+8.1%', dir: 'down', sub: 'vs previous period' },
    contributionProfit: { value: '₹37.2 Cr', delta: '+18.3%', dir: 'up', sub: 'vs previous period' },
    contributionMargin: { value: '29.1%', delta: '+1.4 pts', dir: 'up', sub: 'vs previous period' },
    forecastAccuracy: { value: '92.4%', delta: 'MAPE 7.6%', dir: 'muted', sub: 'last 30 days' },
  };

  const categories = [
    { name: 'Electronics', share: 0.33, margin: 0.21, growth: 14, sub: 'Audio, Mobiles, Computers' },
    { name: 'Fashion', share: 0.22, margin: 0.34, growth: 8, sub: 'Men, Women, Kids' },
    { name: 'Home', share: 0.17, margin: 0.28, growth: 6, sub: 'Furniture, Appliances' },
    { name: 'Grocery', share: 0.15, margin: 0.11, growth: 4, sub: 'Daily essentials, Staples' },
    { name: 'Beauty', share: 0.13, margin: 0.39, growth: 19, sub: 'Skin, Hair, Makeup' },
  ];
  const totalSales = 128.4;
  for (const c of categories) {
    c.sales = +(totalSales * c.share).toFixed(1);
    c.forecast = +(c.sales * (1 + c.growth / 100) * 1.03).toFixed(1);
  }

  const costBreakdown = [
    { name: 'COGS', value: 56.1, pct: 61.5, color: '#667085' },
    { name: 'Fulfillment', value: 16.4, pct: 18.0, color: '#98a2b3' },
    { name: 'Logistics', value: 10.9, pct: 12.0, color: '#b42318' },
    { name: 'Marketing', value: 4.6, pct: 5.0, color: '#d92d20' },
    { name: 'Returns', value: 3.2, pct: 3.5, color: '#f97066' },
  ];

  const regions = [
    { name: 'North', sales: 31.2, growth: 8, margin: 24, cost: 23.1, cities: 'Delhi NCR, Lucknow, Chandigarh' },
    { name: 'West', sales: 42.7, growth: 14, margin: 29, cost: 29.8, cities: 'Mumbai, Pune, Ahmedabad' },
    { name: 'South', sales: 35.1, growth: 11, margin: 27, cost: 25.6, cities: 'Bengaluru, Chennai, Hyderabad' },
    { name: 'East', sales: 19.4, growth: 6, margin: 21, cost: 12.7, cities: 'Kolkata, Bhubaneswar, Guwahati' },
  ];

  const products = [
    { sku: 'SKU-10021', product: 'iPhone 16 256GB', category: 'Electronics', sales: 8.4, units: 182, growth: 14, forecast: 11, conf: 94, margin: 32, stock: 8200, cover: 18, risk: 'Low' },
    { sku: 'SKU-10012', product: 'HP Pavilion 15 Laptop', category: 'Electronics', sales: 6.4, units: 82, growth: 12, forecast: 9, conf: 93, margin: 19, stock: 5100, cover: 34, risk: 'Low' },
    { sku: 'SKU-10045', product: 'Samsung Galaxy S25', category: 'Electronics', sales: 5.2, units: 61, growth: 5, forecast: 3, conf: 88, margin: 24, stock: 2800, cover: 12, risk: 'High' },
    { sku: 'SKU-10033', product: 'Sony WH-1000XM5', category: 'Electronics', sales: 3.1, units: 47, growth: 8, forecast: 7, conf: 91, margin: 35, stock: 4100, cover: 26, risk: 'Low' },
    { sku: 'SKU-20017', product: "Levi's 511 Jeans", category: 'Fashion', sales: 2.8, units: 96, growth: 9, forecast: 8, conf: 90, margin: 40, stock: 12400, cover: 22, risk: 'Low' },
    { sku: 'SKU-20029', product: 'Adidas Running Shoes', category: 'Fashion', sales: 3.0, units: 88, growth: 11, forecast: 10, conf: 92, margin: 37, stock: 9800, cover: 19, risk: 'Medium' },
    { sku: 'SKU-20041', product: 'Zara Summer Dress', category: 'Fashion', sales: 1.9, units: 54, growth: -2, forecast: -5, conf: 74, margin: 31, stock: 1700, cover: 8, risk: 'Critical' },
    { sku: 'SKU-30022', product: 'Philips Air Fryer', category: 'Home', sales: 2.4, units: 41, growth: 13, forecast: 10, conf: 90, margin: 26, stock: 2900, cover: 16, risk: 'Medium' },
    { sku: 'SKU-30009', product: 'IKEA Malm Dresser', category: 'Home', sales: 2.2, units: 22, growth: 6, forecast: 4, conf: 89, margin: 30, stock: 900, cover: 41, risk: 'Low' },
    { sku: 'SKU-30031', product: 'Dyson V15 Vacuum', category: 'Home', sales: 1.8, units: 16, growth: -4, forecast: -8, conf: 68, margin: 18, stock: 500, cover: 9, risk: 'High' },
    { sku: 'SKU-40005', product: 'Amul Butter 500g', category: 'Grocery', sales: 1.6, units: 310, growth: 4, forecast: 3, conf: 92, margin: 12, stock: 45000, cover: 14, risk: 'Medium' },
    { sku: 'SKU-40008', product: 'Tata Salt 1kg', category: 'Grocery', sales: 1.2, units: 420, growth: 2, forecast: 1, conf: 93, margin: 8, stock: 88000, cover: 30, risk: 'Low' },
    { sku: 'SKU-50012', product: 'Lakmé Kajal', category: 'Beauty', sales: 1.4, units: 240, growth: 10, forecast: 9, conf: 95, margin: 45, stock: 31000, cover: 17, risk: 'Low' },
    { sku: 'SKU-50019', product: 'Olay Night Cream', category: 'Beauty', sales: 1.1, units: 82, growth: 7, forecast: 6, conf: 91, margin: 38, stock: 12800, cover: 21, risk: 'Low' },
    { sku: 'SKU-50027', product: 'Nykaa Foundation', category: 'Beauty', sales: 0.9, units: 41, growth: 15, forecast: 12, conf: 96, margin: 42, stock: 2600, cover: 6, risk: 'Critical' },
  ];

  const riskLevel = {
    Low: { badge: 'ok', cover: null },
    Medium: { badge: 'warn', cover: null },
    High: { badge: 'danger', cover: null },
    Critical: { badge: 'danger', cover: null },
  };

  const insights = [
    { priority: 'HIGH IMPACT', border: 'red', cat: 'Cost', title: 'Fulfillment cost pressure', detail: 'Expected fulfillment cost increase over the next 30 days', impact: '-₹2.4 Cr', pos: false, conf: 88, driver: 'Higher regional shipment distance', driver2: 'Fuel surcharge + order density', action: 'View cost drivers' },
    { priority: 'HIGH IMPACT', border: 'green', cat: 'Sales', title: 'Demand acceleration in Audio', detail: 'Headphones category sales forecast raised by 8%', impact: '+₹1.9 Cr', pos: true, conf: 91, driver: 'New product launches & promotions', driver2: 'Returning customer rate up', action: 'View category' },
    { priority: 'HIGH IMPACT', border: 'red', cat: 'Risk', title: 'Low-confidence forecast in South', detail: 'Electronics forecast confidence drops to 68%', impact: '₹0.8 Cr at risk', pos: false, conf: 68, driver: 'Recent demand volatility', driver2: 'Data pipeline delays', action: 'Review model' },
    { priority: 'MEDIUM', border: 'amber', cat: 'Inventory', title: 'Stockout risk rising', detail: '12 SKUs below 15 days of cover ahead of festive demand', impact: '-₹2.1 Cr lost sales', pos: false, conf: 84, driver: 'High demand + slow restock', driver2: 'Fulfillment center transfer', action: 'Plan replenishment' },
    { priority: 'MEDIUM', border: 'amber', cat: 'Margin', title: 'Grocery margin compression', detail: 'Contribution margin down 1.6 pts quarter over quarter', impact: '-₹0.6 Cr', pos: false, conf: 82, driver: 'Procurement cost +7%', driver2: 'Promotion intensity up', action: 'Renegotiate procurement' },
    { priority: 'LOW', border: 'info', cat: 'Data', title: 'Inventory feed stale', detail: 'Inventory snapshot pipeline last synced 3 days ago', impact: 'None yet', pos: true, conf: 95, driver: 'Pipeline connector error', driver2: 'Retry scheduled', action: 'Inspect pipeline' },
  ];

  const costDrivers = {
    logistics: [
      { name: 'Fuel surcharge', delta: '+4.2%', impact: '+₹0.46 Cr' },
      { name: 'Distance per order', delta: '+3.1%', impact: '+₹0.34 Cr' },
      { name: 'Regional mix', delta: '+2.8%', impact: '+₹0.30 Cr' },
      { name: 'Shipment volume', delta: '+1.9%', impact: '+₹0.21 Cr' },
    ],
    fulfillment: [
      { name: 'Order density', delta: '+3.6%', impact: '+₹0.42 Cr' },
      { name: 'Warehouse labor cost', delta: '+2.4%', impact: '+₹0.28 Cr' },
      { name: 'Package mix', delta: '+1.7%', impact: '+₹0.20 Cr' },
    ],
    marketing: [
      { name: 'ACOS efficiency', delta: '-2.1%', impact: '-₹0.18 Cr' },
      { name: 'Campaign spend', delta: '+1.4%', impact: '+₹0.12 Cr' },
    ],
    procurement: [
      { name: 'Commodity inflation', delta: '+4.1%', impact: '+₹1.60 Cr' },
      { name: 'Vendor mix', delta: '+1.2%', impact: '+₹0.47 Cr' },
    ],
  };

  const health = {
    demand: [
      ['Orders', '3.42M', '+9.1%'],
      ['Units', '11.8M', '+7.4%'],
      ['Conversion', '3.6%', '+0.2 pts'],
      ['AOV', '₹1,480', '+2.9%'],
      ['Demand forecast', '₹152.1 Cr', '+10.2%'],
    ],
    cost: [
      ['Fulfillment', '₹16.4 Cr', '+9.4%'],
      ['Logistics', '₹10.9 Cr', '+12.2%'],
      ['Marketing', '₹4.6 Cr', '+3.1%'],
      ['Procurement', '₹28.1 Cr', '+7.0%'],
      ['Returns', '₹3.2 Cr', '+4.5%'],
    ],
    profitability: [
      ['Gross profit', '₹72.3 Cr', '+12.4%'],
      ['Contribution profit', '₹37.2 Cr', '+18.3%'],
      ['Contribution margin', '29.1%', '+1.4 pts'],
      ['Cost per order', '₹267', '+4.9%'],
    ],
    risk: [
      ['Forecast anomalies', '4', 'High' ],
      ['Low-confidence forecasts', '9', 'Med' ],
      ['Cost spikes', '2', 'High' ],
      ['Stockout risk (Critical)', '2', 'High' ],
    ],
  };

  const decomposition = [
    ['Volume impact', '+₹7.4 Cr', '+'],
    ['Price impact', '+₹2.1 Cr', '+'],
    ['Category mix', '+₹1.8 Cr', '+'],
    ['Promotion impact', '+₹0.9 Cr', '+'],
    ['Seasonality', '+₹1.2 Cr', '+'],
    ['Returns', '-₹0.7 Cr', '-'],
  ];

  const drivers = [
    ['Demand growth', '+3.4', '+'],
    ['Price increase', '+1.2', '+'],
    ['Promotion lift', '+0.8', '+'],
    ['Returning customers', '+0.6', '+'],
    ['Inventory constraints', '-0.9', '-'],
    ['Increased returns', '-0.5', '-'],
    ['Logistics disruption', '-0.4', '-'],
  ];

  const variance = [
    ['Sales', '128.4', '131.8', '125.9', '-3.4', 'down'],
    ['Cost', '91.2', '88.7', '93.4', '+2.5', 'up'],
    ['Profit', '37.2', '43.1', '32.5', '-5.9', 'down'],
    ['Margin', '29.1%', '32.7%', '25.8%', '-3.6 pts', 'down'],
  ];

  const varianceExplanations = [
    'Sales missed forecast in Fashion (promotion timing pushed to next period).',
    'Fulfillment cost ran above budget due to fuel surcharge revisions.',
    'Electronics outperformed on price hikes during new launch window.',
  ];

  const accuracy = {
    kpis: [
      ['MAPE', '7.6%', 'muted'],
      ['MAE', '₹0.92 Cr', 'muted'],
      ['RMSE', '₹1.34 Cr', 'muted'],
      ['Bias', '+0.8%', 'ok'],
    ],
    overTime: [94.1, 93.6, 93.9, 93.1, 92.8, 93.2, 92.4, 92.1, 91.9, 92.6, 92.3, 92.4],
    byArea: [
      ['Electronics', 94.2], ['Fashion', 91.8], ['Grocery', 89.4], ['Home', 93.1], ['Beauty', 95.6],
    ],
    byRegion: [
      ['North', 93.1], ['West', 94.2], ['South', 90.4], ['East', 92.8],
    ],
    byHorizon: [
      ['7 days', 95.2], ['30 days', 92.4], ['60 days', 89.8], ['90 days', 86.3],
    ],
  };

  const model = {
    name: 'Production Model', version: 'v3.8.2', status: 'Healthy', trained: '12 Sep 2026',
    trainingData: '24 months', horizon: '90 days', mape: '7.6%', mae: '₹0.92 Cr', rmse: '₹1.34 Cr',
    drift: '0.02', freshness: '2 hrs ago', featureHealth: '97%',
    features: [
      ['Order volume (lag 1-7)', 0.24], ['Price index', 0.18], ['Promotion intensity', 0.15],
      ['Seasonality', 0.14], ['Category mix', 0.11], ['Fuel surcharge index', 0.08], ['Inventory cover', 0.06],
    ],
    runSteps: [
      ['Preparing data', true], ['Validating dataset', true], ['Running prediction model', false],
      ['Calculating confidence', false], ['Publishing forecast', false],
    ],
  };

  const datasets = [
    { name: 'sales_order_items', owner: 'Data Platform', rows: '48,291,302', range: 'Jan 2024 – Sep 2026', quality: 97, updated: '12 Sep 2026', status: 'Healthy' },
    { name: 'catalog_products', owner: 'Catalog Team', rows: '2,148,233', range: 'Jan 2023 – Sep 2026', quality: 94, updated: '12 Sep 2026', status: 'Healthy' },
    { name: 'fulfillment_tickets', owner: 'Operations', rows: '18,440,911', range: 'Jun 2024 – Sep 2026', quality: 99, updated: '11 Sep 2026', status: 'Healthy' },
    { name: 'marketing_spend_daily', owner: 'Growth', rows: '963,120', range: 'Jan 2024 – Sep 2026', quality: 91, updated: '12 Sep 2026', status: 'Warning' },
    { name: 'inventory_snapshots', owner: 'Supply Chain', rows: '12,086,514', range: 'Mar 2025 – Sep 2026', quality: 71, updated: '9 Sep 2026', status: 'Stale' },
    { name: 'returns_line_items', owner: 'Customer Service', rows: '3,241,880', range: 'Jan 2024 – Sep 2026', quality: 96, updated: '12 Sep 2026', status: 'Healthy' },
  ];

  const datasetDetail = {
    rows: '48,291,302', columns: 37, coverage: 'Jan 2024 – Sep 2026',
    missing: '0.8%', duplicate: '0.1%', quality: 97,
    schema: ['order_id', 'sku', 'product_category', 'region', 'seller_id', 'quantity', 'unit_price', 'unit_cost', 'promotion_id', 'fulfillment_type', 'order_dt'],
  };

  const dataSources = [
    { name: 'Sales Warehouse', status: 'Connected', sync: '5 min ago', records: '512M', schema: 'v14', errors: 0 },
    { name: 'Order Platform', status: 'Connected', sync: '2 min ago', records: '184M', schema: 'v9', errors: 0 },
    { name: 'Inventory System', status: 'Stale', sync: '3 days ago', records: '96M', schema: 'v11', errors: 3 },
    { name: 'Marketing Platform', status: 'Warning', sync: '6 hrs ago', records: '4M', schema: 'v7', errors: 1 },
    { name: 'Finance ERP', status: 'Connected', sync: '1 hr ago', records: '22M', schema: 'v5', errors: 0 },
    { name: 'Logistics Platform', status: 'Connected', sync: '11 min ago', records: '78M', schema: 'v8', errors: 0 },
  ];

  const dataQuality = {
    score: 97,
    checks: [
      ['Schema valid', true], ['Fresh data', true], ['No critical missing fields', true],
      ['1.4% missing product attributes', false], ['Duplicate rate below threshold', true],
      ['No stale date coverage', true], ['Outliers within expected range', true],
    ],
  };

  const reports = [
    { name: 'Executive Forecast', type: 'PDF, CSV', cadence: 'Weekly', owner: 'Forecasting' },
    { name: 'Sales Forecast', type: 'CSV', cadence: 'Daily', owner: 'Category Managers' },
    { name: 'Cost Forecast', type: 'PDF', cadence: 'Weekly', owner: 'Finance' },
    { name: 'Margin Report', type: 'PDF', cadence: 'Weekly', owner: 'Finance' },
    { name: 'Category Report', type: 'PDF, CSV', cadence: 'Monthly', owner: 'Category Managers' },
    { name: 'Regional Report', type: 'CSV', cadence: 'Monthly', owner: 'Operations' },
    { name: 'Forecast Accuracy', type: 'PDF', cadence: 'Weekly', owner: 'Analysts' },
    { name: 'Scenario Comparison', type: 'PDF', cadence: 'On demand', owner: 'Finance' },
  ];

  const alerts = [
    { name: 'Forecast sales decreases > 10%', scope: 'Electronics', notify: 'Category Managers, Finance', channels: 'In-app, Email', status: 'Active' },
    { name: 'Total cost increase > 5%', scope: 'Fulfillment (All regions)', notify: 'Operations, Finance', channels: 'In-app, Email, Slack', status: 'Active' },
    { name: 'Forecast confidence < 75%', scope: 'South region', notify: 'Analysts', channels: 'In-app', status: 'Active' },
    { name: 'Inventory cover < 10 days', scope: 'Top 50 SKUs', notify: 'Supply Chain', channels: 'In-app, Email', status: 'Active' },
    { name: 'Data freshness failure', scope: 'Inventory System', notify: 'Data Platform', channels: 'Email, PagerDuty', status: 'Active' },
    { name: 'Margin decrease > 2 pts', scope: 'Grocery', notify: 'Finance', channels: 'In-app', status: 'Paused' },
  ];

  const audit = [
    { user: 'A. Kumar', action: 'Updated forecast scenario', object: 'Electronics Q4', time: '12 Sep 2026, 11:42' },
    { user: 'P. Sharma', action: 'Exported report', object: 'India Sales Forecast', time: '12 Sep 2026, 10:15' },
    { user: 'R. Iyer', action: 'Changed model parameters', object: 'Production v3.8.2', time: '12 Sep 2026, 09:04' },
    { user: 'S. Nair', action: 'Created alert', object: 'Forecast confidence < 75%', time: '11 Sep 2026, 18:22' },
    { user: 'M. Khan', action: 'Shared dashboard', object: 'Command Center', time: '11 Sep 2026, 16:47' },
    { user: 'T. Gupta', action: 'Generated forecast', object: 'Electronics Q4', time: '11 Sep 2026, 14:30' },
    { user: 'A. Kumar', action: 'Updated user role', object: 'V. Rao → Analyst', time: '11 Sep 2026, 12:08' },
  ];

  const roles = [
    { name: 'Admin', perms: ['View financial data', 'View forecasts', 'Create scenarios', 'Export reports', 'Manage users', 'Change model'] },
    { name: 'Executive', perms: ['View financial data', 'View forecasts', 'Create scenarios', 'Export reports'], blocked: ['Manage users', 'Change model'] },
    { name: 'Finance', perms: ['View financial data', 'View forecasts', 'Create scenarios', 'Export reports'], blocked: ['Manage users', 'Change model'] },
    { name: 'Category Manager', perms: ['View forecasts', 'View category data', 'Create scenarios'], blocked: ['View all financial data', 'Manage users', 'Change model', 'Export global reports'] },
    { name: 'Analyst', perms: ['View forecasts', 'View models', 'View datasets', 'View accuracy'], blocked: ['Create scenarios', 'Export reports', 'Manage users'] },
    { name: 'Operations', perms: ['View inventory', 'View regional data', 'View forecasts'], blocked: ['View financial data', 'Create scenarios'] },
    { name: 'Viewer', perms: ['View forecasts', 'View reports'], blocked: ['Export raw data', 'Create scenarios', 'Manage users'] },
  ];

  const users = [
    { name: 'A. Kumar', email: 'a.kumar@india.commerce', role: 'Admin', lastActive: 'Now', status: 'Active' },
    { name: 'P. Sharma', email: 'p.sharma@india.commerce', role: 'Finance', lastActive: '2 hrs ago', status: 'Active' },
    { name: 'R. Iyer', email: 'r.iyer@india.commerce', role: 'Analyst', lastActive: '1 day ago', status: 'Active' },
    { name: 'S. Nair', email: 's.nair@india.commerce', role: 'Category Manager', lastActive: '4 hrs ago', status: 'Active' },
    { name: 'M. Khan', email: 'm.khan@india.commerce', role: 'Operations', lastActive: '3 days ago', status: 'Invited' },
    { name: 'T. Gupta', email: 't.gupta@india.commerce', role: 'Executive', lastActive: 'Yesterday', status: 'Active' },
    { name: 'V. Rao', email: 'v.rao@india.commerce', role: 'Viewer', lastActive: '12 days ago', status: 'Disabled' },
  ];

  const savedViews = ['My Category', 'North Region', 'High-risk SKUs', 'Q4 Planning', 'Finance View'];

  return {
    labels, actualLength, salesActual, salesForecast, costActual, costForecast,
    prevForecast, target, ciLower, ciUpper, series, kpis,
    categories, totalSales, costBreakdown, regions, products, riskLevel,
    insights, costDrivers, health, decomposition, drivers,
    variance, varianceExplanations, accuracy, model,
    datasets, datasetDetail, dataSources, dataQuality, reports,
    alerts, audit, roles, users, savedViews,
  };
})();