// ===== BIZLENS APP - Main Orchestrator - UPDATED VERSION =====

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const escapeHtml = (str) => {
  if (str == null) return '';
  return String(str).replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', 
    "'": '&#39;', '"': '&quot;'
  }[c] || c));
};

const LibStatus = {
  chartAvailable: false,
  pdfAvailable: false
};

const checkLibraries = () => {
  LibStatus.chartAvailable = !!window.echarts;
  LibStatus.pdfAvailable = !!window.jspdf;

  if (!LibStatus.chartAvailable) {
    console.warn('ECharts not loaded — charts will show as text fallback');
  }
  if (!LibStatus.pdfAvailable) {
    console.warn('jsPDF not loaded — PDF export will be disabled');
    const pdfBtn = $('downloadPDFNav');
    if (pdfBtn) { pdfBtn.disabled = true; pdfBtn.title = 'PDF library unavailable (check internet)'; }
  }
  return true;
};

const STORAGE_KEY = 'bizlens_data_v4';
const DEFAULT_THRESHOLDS = {
  cashHigh: 3,
  cashGood: 6,
  deHigh: 1,
  deLow: 2,
  icrHigh: 1.5,
  icrLow: 3,
  concHigh: 50,
  concMed: 30,
  wcSalesHigh: 40,
  wcSalesMed: 25,
  ageingDiff: 5
};

const State = {
  clients: {},
  selectedId: null,
  thresholds: { ...DEFAULT_THRESHOLDS },
  savedScenarios: [],
  currentReport: null,
  currentView: 'operating',
  priorPeriods: [], // Array of computed prior period reports
  bizlensScore: null,
  trendData: null
};

const saveData = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      clients: State.clients,
      selectedId: State.selectedId,
      thresholds: State.thresholds,
      savedScenarios: State.savedScenarios
    }));
    return true;
  } catch (e) {
    console.error('Save failed:', e);
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      UI.toast('Storage full - please delete old clients or export data', 'error');
    } else {
      UI.toast('Failed to save data', 'error');
    }
    return false;
  }
};

const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('No data');
    const data = JSON.parse(raw);
    State.clients = data.clients || {};
    State.selectedId = data.selectedId;
    State.thresholds = { ...DEFAULT_THRESHOLDS, ...data.thresholds };
    State.savedScenarios = data.savedScenarios || [];
    if (!State.selectedId || !State.clients[State.selectedId]) {
      const ids = Object.keys(State.clients);
      State.selectedId = ids.length > 0 ? ids[0] : null;
      if (!State.selectedId) createNewClient('Default Client');
    }
  } catch (e) {
    createNewClient('Default Client');
  }
};

const createNewClient = (name) => {
  const safeName = name.replace(/[<>]/g, '').substring(0, 100);
  const id = 'c_' + Date.now();
  State.clients[id] = { id, name: safeName, inputs: {}, createdAt: new Date().toISOString() };
  State.selectedId = id;
  saveData();
  return id;
};

const getClient = () => State.clients[State.selectedId] || null;

const rebuildClientSelect = () => {
  const sel = $('clientSelect');
  if (!sel) return;
  sel.innerHTML = Object.values(State.clients)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => `<option value="${c.id}"${c.id === State.selectedId ? ' selected' : ''}>${escapeHtml(c.name)}</option>`)
    .join('');
};

const inputFields = [
  'inputM', 'inputR', 'inputVC', 'inputFC', 'inputPUR', 'inputINT', 'inputTP', 'inputINV', 'inputOI', 'inputNC',
  'inputDM', 'inputDL', 'inputPKG', 'inputOVC', 'inputRent', 'inputSal', 'inputUtil', 'inputMktg', 'inputAdmin',
  'bsCash', 'bsInv', 'bsAR', 'bsOtherCA', 'bsLoansAdv', 'bsAP', 'bsCLX', 'bsSTB', 'bsLTB', 'bsOtherLiab', 'bsEQ',
  'priorSales', 'priorOpProfit', 'priorVC', 'priorFC',
  'ar0', 'ar31', 'ar61', 'ar90', 'ap0', 'ap31', 'ap61', 'ap90',
  'topCust', 'topSupp', 'realisableFA'
];

const selectFields = ['arAgeingAvail', 'apAgeingAvail', 'custCredit', 'suppCredit'];

const fieldToKey = {
  inputM: 'M', inputR: 'R', inputVC: 'VC', inputFC: 'FC', inputPUR: 'PUR', inputINT: 'INT', inputTP: 'TP',
  inputINV: 'INV', inputOI: 'OI', inputNC: 'NC',
  inputDM: 'DM', inputDL: 'DL', inputPKG: 'PKG', inputOVC: 'OVC',
  inputRent: 'RENT', inputSal: 'SAL', inputUtil: 'UTIL', inputMktg: 'MKTG', inputAdmin: 'ADMIN',
  bsCash: 'BS_CASH', bsInv: 'BS_INV', bsAR: 'BS_AR',
  bsOtherCA: 'BS_OTHER_CA', bsLoansAdv: 'BS_LOANS_ADV',
  bsAP: 'BS_AP', bsCLX: 'BS_CLX', bsSTB: 'BS_STB', bsLTB: 'BS_LTB',
  bsOtherLiab: 'BS_OTHER_LIAB', bsEQ: 'BS_EQ',
  priorSales: 'priorSales', priorOpProfit: 'priorOpProfit', priorVC: 'priorVC', priorFC: 'priorFC',
  ar0: 'AR_0_30', ar31: 'AR_31_60', ar61: 'AR_61_90', ar90: 'AR_90P',
  ap0: 'AP_0_30', ap31: 'AP_31_60', ap61: 'AP_61_90', ap90: 'AP_90P',
  arAgeingAvail: 'AR_AGEING_AVAIL', apAgeingAvail: 'AP_AGEING_AVAIL',
  topCust: 'TOP_CUST_PCT', topSupp: 'TOP_SUPP_PCT',
  custCredit: 'CUST_CREDIT_MODE', suppCredit: 'SUPP_CREDIT_MODE',
  realisableFA: 'REALISABLE_FA'
};

const formatIndian = raw => {
  if (raw == null) return '';
  let s = String(raw).replace(/,/g, '');
  if (s === '' || s === '-') return s;
  const neg = s.startsWith('-');
  if (neg) s = s.slice(1);
  const parts = s.split('.');
  let int = (parts[0] || '').replace(/\D/g, '');
  const dec = parts[1] ? parts[1].replace(/\D/g, '') : null;
  const formatted = int ? Number(int).toLocaleString('en-IN') : '';
  return (neg ? '-' : '') + formatted + (dec != null ? '.' + dec : (parts.length > 1 ? '.' : ''));
};

const loadFormFromClient = () => {
  const c = getClient();
  if (!c) return;
  inputFields.forEach(id => {
    const el = $(id);
    if (el) el.value = formatIndian(c.inputs[fieldToKey[id]] || '');
  });
  selectFields.forEach(id => {
    const el = $(id);
    if (el) el.value = c.inputs[fieldToKey[id]] || el.options[0].value;
  });
  const fcYes = $('fcIncludesInterestYes');
  const fcNo = $('fcIncludesInterestNo');
  if (fcYes && fcNo) {
    fcYes.checked = c.inputs.FC_INCLUDES_INT === true || c.inputs.FC_INCLUDES_INT === 'yes';
    fcNo.checked = !fcYes.checked;
  }
  if ($('commitments')) $('commitments').value = c.inputs.commitments || '';
  toggleAgeingBoxes();
  // Update prior period chips
  if (typeof renderPriorPeriodChips === 'function') renderPriorPeriodChips();
};

const saveFormToClient = () => {
  const c = getClient();
  if (!c) return;
  inputFields.forEach(id => {
    const el = $(id);
    if (el) c.inputs[fieldToKey[id]] = el.value.replace(/,/g, '');
  });
  selectFields.forEach(id => {
    const el = $(id);
    if (el) c.inputs[fieldToKey[id]] = el.value;
  });
  const fcYes = $('fcIncludesInterestYes');
  c.inputs.FC_INCLUDES_INT = fcYes ? fcYes.checked : false;
  if ($('commitments')) c.inputs.commitments = $('commitments').value;
  saveData();
};

const toggleAgeingBoxes = () => {
  const arBox = $('arAgeingBox');
  const apBox = $('apAgeingBox');
  if (arBox) arBox.style.display = $('arAgeingAvail')?.value === 'yes' ? 'block' : 'none';
  if (apBox) apBox.style.display = $('apAgeingAvail')?.value === 'yes' ? 'block' : 'none';
};

const showPage = (page) => {
  const inputPage = $('pageInput');
  const reportPage = $('pageReport');
  if (!inputPage || !reportPage) return;
  
  if (page === 'input') {
    inputPage.style.display = 'block';
    reportPage.style.display = 'none';
    document.body.style.background = 'var(--bg)';
  } else {
    inputPage.style.display = 'none';
    reportPage.style.display = 'block';
    renderReport();
  }
  
  const goInput = $('goInput');
  const goReport = $('goReport');
  if (goInput) goInput.classList.toggle('active', page === 'input');
  if (goReport) goReport.classList.toggle('active', page === 'report');
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const showReportView = (view) => {
  State.currentView = view;
  
  const views = {
    operating: $('operatingView'),
    health: $('healthView'),
    insights: $('insightsView'),
    simulator: $('simulatorView'),
    summary: $('summaryView'),
    trends: $('trendsView')
  };
  const toggles = {
    operating: $('toggleOperating'),
    health: $('toggleHealth'),
    insights: $('toggleInsights'),
    simulator: $('toggleSimulator'),
    summary: $('toggleSummary'),
    trends: $('toggleTrends')
  };
  
  // Hide all views, show selected
  Object.values(views).forEach(v => { if (v) { v.style.display = 'none'; v.classList.remove('active'); } });
  Object.keys(toggles).forEach(k => { if (toggles[k]) toggles[k].classList.toggle('active', k === view); });
  
  const selectedView = views[view];
  if (selectedView) { selectedView.style.display = 'block'; selectedView.classList.add('active'); }
  
  if (view === 'health' && State.currentReport) {
    UI.renderHealthSection(State.currentReport, State.thresholds);
    renderHealthCharts(State.currentReport);
  }
  if (view === 'summary' && State.currentReport) {
    const insights = Insights.generateInsights(State.currentReport, getClient()?.inputs, State.thresholds);
    const summary = Insights.generateExecutiveSummary(State.currentReport, insights, State.thresholds, getClient()?.name);
    summary.bizlensScore = State.bizlensScore;
    UI.renderExecutiveSummary(summary, getClient()?.inputs);
  }
  if (view === 'operating' && State.currentReport) {
    renderStackChart(State.currentReport);
    renderCostBreakdownCharts(State.currentReport, getClient()?.inputs);
  }
  if (view === 'insights' && State.currentReport) {
    renderInsightsView(State.currentReport);
  }
  if (view === 'trends' && State.currentReport) {
    renderTrendsView(State.currentReport);
  }
};

let echartsInstances = {};
const disposeChart = (key) => { if (echartsInstances[key]) { echartsInstances[key].dispose(); delete echartsInstances[key]; } };
const destroyCharts = () => { Object.keys(echartsInstances).forEach(disposeChart); };
const getOrCreateChart = (domId) => {
  const dom = $(domId);
  if (!dom) return null;
  disposeChart(domId);
  const chart = echarts.init(dom);
  echartsInstances[domId] = chart;
  return chart;
};

const renderStackChart = (report) => {
  if (!window.echarts || !report) return;
  const { VCm, FCm, opProfit, Rm } = report.monthly;
  const chart = getOrCreateChart('chartStackCur');
  if (!chart) return;

  const profitColor = opProfit >= 0 ? '#14b8a6' : '#ef4444';
  const profitLabel = opProfit >= 0 ? 'Profit' : 'Loss';

  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: params => params.map(p => p.marker + ' ' + p.seriesName + ': ' + Finance.fmtMoney(p.value)).join('<br>') },
    legend: { bottom: 4, itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 11 } },
    grid: { left: 10, right: 10, top: 20, bottom: 40, containLabel: true },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: ['Monthly Split'], show: false },
    series: [
      { name: 'Variable Costs', type: 'bar', stack: 'total', data: [Math.abs(VCm)], itemStyle: { color: '#8b5cf6' }, barWidth: '60%', label: { show: true, position: 'inside', formatter: p => Finance.fmtMoneyCompact(p.value), fontSize: 11, color: '#fff', fontWeight: 600 } },
      { name: 'Fixed Costs', type: 'bar', stack: 'total', data: [Math.abs(FCm)], itemStyle: { color: '#f59e0b' }, label: { show: true, position: 'inside', formatter: p => Finance.fmtMoneyCompact(p.value), fontSize: 11, color: '#fff', fontWeight: 600 } },
      { name: profitLabel, type: 'bar', stack: 'total', data: [Math.abs(opProfit || 0)], itemStyle: { color: profitColor }, label: { show: true, position: 'inside', formatter: p => Finance.fmtMoneyCompact(p.value), fontSize: 11, color: '#fff', fontWeight: 600 } }
    ]
  });
};

const renderHealthCharts = (report) => {
  if (!window.echarts || !report) return;
  const h = report.health;

  const donutOption = (data, colors) => ({
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10 } },
    color: colors,
    series: [{ type: 'pie', radius: ['30%', '55%'], center: ['50%', '38%'], data, itemStyle: { borderRadius: 3, borderColor: '#fff', borderWidth: 2 },
      label: { show: false }, emphasis: { label: { show: false } } }]
  });

  if (h.arAgeing) {
    const chart = getOrCreateChart('arAgeingChart');
    if (chart) chart.setOption(donutOption(
      [{ value: h.arAgeing.d0_30, name: '0-30d' }, { value: h.arAgeing.d31_60, name: '31-60d' }, { value: h.arAgeing.d61_90, name: '61-90d' }, { value: h.arAgeing.d90p, name: '90+d' }],
      ['#22c55e', '#84cc16', '#f59e0b', '#ef4444']
    ));
  }
  if (h.apAgeing) {
    const chart = getOrCreateChart('apAgeingChart');
    if (chart) chart.setOption(donutOption(
      [{ value: h.apAgeing.d0_30, name: '0-30d' }, { value: h.apAgeing.d31_60, name: '31-60d' }, { value: h.apAgeing.d61_90, name: '61-90d' }, { value: h.apAgeing.d90p, name: '90+d' }],
      ['#22c55e', '#84cc16', '#f59e0b', '#ef4444']
    ));
  }

  const renderConc = (domId, value, label) => {
    if (value == null) return;
    const chart = getOrCreateChart(domId);
    if (chart) chart.setOption(donutOption(
      [{ value, name: 'Top ' + label }, { value: Math.max(0, 100 - value), name: 'Others' }],
      ['#3b82f6', '#e2e8f0']
    ));
  };

  renderConc('custConcChart', h.topCust, 'Customers');
  renderConc('suppConcChart', h.topSupp, 'Suppliers');
};

const renderCostBreakdownCharts = (report, inputs) => {
  if (!window.echarts || !report) return;
  const M = report.totals.M || 1;
  const VCm = report.monthly.VCm;
  const FCm = report.monthly.FCm;

  // Get individual VC items from saved inputs
  const dm = Finance.toNum(inputs?.DM) / M;
  const dl = Finance.toNum(inputs?.DL) / M;
  const pkg = Finance.toNum(inputs?.PKG) / M;
  const ovc = Finance.toNum(inputs?.OVC) / M;
  const knownVC = dm + dl + pkg + ovc;
  const otherVC = Math.max(0, VCm - knownVC);

  const vcData = [
    { value: Math.round(dm), name: 'Materials' },
    { value: Math.round(dl), name: 'Labor' },
    { value: Math.round(pkg), name: 'Packaging' },
    { value: Math.round(ovc > 0 ? ovc : otherVC), name: 'Other' }
  ].filter(d => d.value > 0);

  if (vcData.length === 0 && VCm > 0) {
    vcData.push({ value: Math.round(VCm), name: 'Variable Costs' });
  }

  const vcChart = getOrCreateChart('vcBreakdownChart');
  if (vcChart && vcData.length > 0) {
    vcChart.setOption({
      tooltip: { trigger: 'item', formatter: p => p.name + ': ' + Finance.fmtMoney(p.value) + ' (' + p.percent.toFixed(1) + '%)' },
      legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
      color: ['#d97706', '#3b82f6', '#10b981', '#6366f1'],
      series: [{ type: 'pie', radius: ['35%', '65%'], center: ['50%', '42%'], data: vcData,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: false }, emphasis: { label: { show: true, fontSize: 12 } } }]
    });
    if (vcData.length > 1) {
      const largest = vcData.reduce((a, b) => a.value > b.value ? a : b);
      const pct = VCm > 0 ? Math.round(largest.value / VCm * 100) : 0;
      const el = $('vcBreakdownInsight');
      if (el) el.innerHTML = '<strong>' + largest.name + '</strong> is your largest variable cost (' + pct + '%). Optimizing this yields the highest margin return.';
    }
  }

  // Fixed Cost Breakdown
  const rent = Finance.toNum(inputs?.RENT) / M;
  const sal = Finance.toNum(inputs?.SAL) / M;
  const util = Finance.toNum(inputs?.UTIL) / M;
  const mktg = Finance.toNum(inputs?.MKTG) / M;
  const admin = Finance.toNum(inputs?.ADMIN) / M;
  const knownFC = rent + sal + util + mktg + admin;
  const othFC = Math.max(0, FCm - knownFC);

  const fcData = [
    { value: Math.round(rent), name: 'Rent' },
    { value: Math.round(sal), name: 'Salaries' },
    { value: Math.round(util), name: 'Utilities' },
    { value: Math.round(mktg), name: 'Marketing' },
    { value: Math.round(admin + othFC), name: 'Admin/Gen' }
  ].filter(d => d.value > 0);

  if (fcData.length === 0 && FCm > 0) {
    fcData.push({ value: Math.round(FCm), name: 'Fixed Costs' });
  }

  const fcChart = getOrCreateChart('fcBreakdownChart');
  if (fcChart && fcData.length > 0) {
    fcChart.setOption({
      tooltip: { trigger: 'item', formatter: p => p.name + ': ' + Finance.fmtMoney(p.value) + ' (' + p.percent.toFixed(1) + '%)' },
      legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
      color: ['#7c3aed', '#ec4899', '#14b8a6', '#f97316', '#64748b'],
      series: [{ type: 'pie', radius: ['35%', '65%'], center: ['50%', '42%'], data: fcData,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: false }, emphasis: { label: { show: true, fontSize: 12 } } }]
    });
    if (fcData.length > 1) {
      const largest = fcData.reduce((a, b) => a.value > b.value ? a : b);
      const pct = FCm > 0 ? Math.round(largest.value / FCm * 100) : 0;
      const el = $('fcBreakdownInsight');
      if (el) el.innerHTML = '<strong>' + largest.name + '</strong> accounts for ' + pct + '% of fixed overheads.';
    }
  }
};

// === Red Flags Banner for Health Section === (REMOVED)
// const renderHealthRedFlags = (report) => {
//   // This function has been removed
// };

// === Insights View (WC Cycle + Worked Insights) ===
const renderInsightsView = (report) => {
  if (!report) return;
  const container = $('insightsContent');
  if (!container) return;
  
  const wcc = Finance.computeWCCycle(report, { INTm: report.monthly.INTm });
  const bed = Finance.computeBreakEvenDays(report);
  const { bs } = report;
  const fM = Finance.fmtMoney;
  const fC = Finance.fmtMoneyCompact;
  
  let html = '';
  
  // === Break-Even Days ===
  if (bed) {
    const costW = Math.min(100, (bed.beDays / 30) * 100);
    const profW = 100 - costW;
    html += `
      <section class="section insight-section mt14">
        <div class="section-header">
          <div class="section-title-wrap"><div class="section-icon icon-amber">📅</div><div><div class="section-title">Break-Even in Days</div><div class="section-subtitle">When does profit start each month?</div></div></div>
          <div class="bed-freedom-day">${bed.isLoss ? '—' : 'Day ' + bed.freedomDay}</div>
        </div>
        <div class="bed-visual mt14">
          <div class="bed-bar">
            <div class="bed-cost-zone" style="width:${costW}%"><span class="bed-zone-label">${bed.beDays}d → Costs</span></div>
            <div class="bed-profit-zone" style="width:${profW}%"><span class="bed-zone-label">${bed.profitDays}d → Profit</span></div>
          </div>
          <div class="bed-day-markers"><span>1st</span><span>5th</span><span>10th</span><span>15th</span><span>20th</span><span>25th</span><span>30th</span></div>
        </div>
        <div class="bed-hero mt14">
          ${bed.isLoss ? '<div class="bed-hero-text bad">The business doesn\'t break even within the month. Every day is spent covering costs.</div>' :
          '<div class="bed-hero-text">You work until the <strong>' + bed.beDays + 'th</strong> just to cover costs. <strong>Profit starts on the ' + bed.freedomDay + 'th.</strong></div>'}
        </div>
        <div class="insight-grid mt14">
          <div class="insight-card"><div class="insight-card-label">Daily Sales</div><div class="insight-card-value">${fM(bed.dailySales)}</div><div class="insight-card-explain">Revenue per day</div></div>
          <div class="insight-card"><div class="insight-card-label">Daily Profit</div><div class="insight-card-value ${bed.dailyProfit >= 0 ? 'good' : 'bad'}">${fM(bed.dailyProfit)}</div><div class="insight-card-explain">${bed.dailyProfit > 0 ? 'Earned after costs' : 'Lost per day'}</div></div>
          <div class="insight-card"><div class="insight-card-label">Cost Days</div><div class="insight-card-value">${bed.beDays} / 30</div><div class="insight-card-explain">${Math.round(bed.beRatio * 100)}% of month covers costs</div></div>
          <div class="insight-card"><div class="insight-card-label">Profit Days</div><div class="insight-card-value ${bed.profitDays > 5 ? 'good' : 'bad'}">${bed.profitDays} days</div><div class="insight-card-explain">${bed.profitDays > 0 ? 'Pure profit generation' : 'No profit days'}</div></div>
        </div>
        <div class="insight-narrative mt12">${bed.narrative}</div>
      </section>`;
  }
  
  // === Working Capital Cycle ===
  if (wcc) {
    const cccClass = wcc.ccc <= 0 ? 'good' : wcc.ccc <= 45 ? 'ok' : wcc.ccc <= 90 ? 'warn' : 'bad';
    const scoreClass = wcc.efficiencyScore >= 70 ? 'good' : wcc.efficiencyScore >= 45 ? 'warn' : 'bad';
    html += `
      <section class="section insight-section mt14">
        <div class="section-header">
          <div class="section-title-wrap"><div class="section-icon icon-blue">🔄</div><div><div class="section-title">Working Capital Cycle</div><div class="section-subtitle">How cash flows through your business</div></div></div>
          <div class="wcc-score wcc-${scoreClass}">${wcc.efficiencyScore}<span class="wcc-score-label">/100</span></div>
        </div>
        <div class="wcc-cycle-visual mt14">
          <div class="wcc-flow">
            <div class="wcc-node wcc-node-inv"><div class="wcc-node-icon">📦</div><div class="wcc-node-label">Inventory</div><div class="wcc-node-days">${wcc.dio}d</div><div class="wcc-node-value">${fC(bs.inv)}</div></div>
            <div class="wcc-arrow">→</div>
            <div class="wcc-node wcc-node-ar"><div class="wcc-node-icon">📄</div><div class="wcc-node-label">Receivables</div><div class="wcc-node-days">${wcc.dso}d</div><div class="wcc-node-value">${fC(bs.ar)}</div></div>
            <div class="wcc-arrow">→</div>
            <div class="wcc-node wcc-node-cash"><div class="wcc-node-icon">💰</div><div class="wcc-node-label">Cash</div><div class="wcc-node-days wcc-${cccClass}">${wcc.ccc}d</div><div class="wcc-node-value">${fC(bs.cash)}</div></div>
            <div class="wcc-arrow">→</div>
            <div class="wcc-node wcc-node-ap"><div class="wcc-node-icon">🏷️</div><div class="wcc-node-label">Payables</div><div class="wcc-node-days">${wcc.dpo}d</div><div class="wcc-node-value">${fC(bs.ap)}</div></div>
          </div>
        </div>
        <div class="wcc-metrics mt14">
          <div class="card wcc-metric-card"><div class="wcc-metric-title">Cash Conversion Cycle</div><div class="wcc-metric-value wcc-${cccClass}">${wcc.ccc} days</div><div class="wcc-metric-formula">DSO ${wcc.dso} + DIO ${wcc.dio} − DPO ${wcc.dpo}</div><div class="wcc-metric-explain">${wcc.ccc <= 0 ? 'Suppliers finance your operations.' : wcc.ccc <= 45 ? 'Efficient cycle.' : 'Cash locked for ' + wcc.ccc + ' days.'}</div></div>
          <div class="card wcc-metric-card"><div class="wcc-metric-title">Cash Locked</div><div class="wcc-metric-value">${fM(wcc.cashLockedInCycle)}</div><div class="wcc-metric-explain">Tied in operations</div></div>
          <div class="card wcc-metric-card"><div class="wcc-metric-title">Financing Cost</div><div class="wcc-metric-value">${fM(wcc.monthlyWCCost)}/mo</div><div class="wcc-metric-explain">Opportunity cost at 12% p.a.</div></div>
        </div>
        <div class="card wcc-scenarios mt14">
          <div class="h sub">What-If: Cycle Optimization</div>
          <div class="wcc-scenario-grid mt12">
            <div class="wcc-scenario-item"><span>Collect 5d faster</span><span class="wcc-scenario-result good">+${fC(wcc.scenarios.dsoMinus5)}</span></div>
            <div class="wcc-scenario-item"><span>Collect 10d faster</span><span class="wcc-scenario-result good">+${fC(wcc.scenarios.dsoMinus10)}</span></div>
            <div class="wcc-scenario-item"><span>5d less inventory</span><span class="wcc-scenario-result good">+${fC(wcc.scenarios.dioMinus5)}</span></div>
            <div class="wcc-scenario-item"><span>Negotiate 5d more to pay</span><span class="wcc-scenario-result good">+${fC(wcc.scenarios.dpoPlus5)}</span></div>
          </div>
        </div>
      </section>`;
  }
  
  container.innerHTML = html;
};

const renderTrendsView = (report) => {
  if (!report) return;
  const container = $('trendsContent');
  if (!container) return;

  let html = '';
  const trend = State.trendData;
  const fM = Finance.fmtMoney;

  // === Historical Trends ===
  html += '<section class="section insight-section"><div class="section-header"><div class="section-title-wrap"><div class="section-icon icon-purple">📊</div><div><div class="section-title">Trends & Forecasting</div><div class="section-subtitle">Historical performance and future projections</div></div></div></div>';

  if (trend && trend.periods >= 2) {
    const dirIcon = (d) => d.dir === 'up' ? '↑' : d.dir === 'down' ? '↓' : '→';
    const dirClass = (d, goodUp) => {
      if (d.dir === 'flat') return '';
      return (goodUp ? d.dir === 'up' : d.dir === 'down') ? 'good' : 'bad';
    };

    html += '<div class="h sub mt14">P&L Trends</div>';
    html += '<div class="insight-grid mt12">';
    html += '<div class="insight-card"><div class="insight-card-label">Sales Trend</div><div class="insight-card-value ' + dirClass(trend.directions.sales, true) + '">' + dirIcon(trend.directions.sales) + ' ' + trend.directions.sales.pct + '%</div><div class="insight-card-explain">' + (trend.directions.sales.dir === 'up' ? 'Revenue growing' : trend.directions.sales.dir === 'down' ? 'Revenue declining' : 'Stable') + '</div></div>';
    html += '<div class="insight-card"><div class="insight-card-label">Profit Trend</div><div class="insight-card-value ' + dirClass(trend.directions.profit, true) + '">' + dirIcon(trend.directions.profit) + ' ' + trend.directions.profit.pct + '%</div><div class="insight-card-explain">' + (trend.directions.profit.dir === 'up' ? 'Profitability improving' : trend.directions.profit.dir === 'down' ? 'Profitability declining' : 'Stable') + '</div></div>';
    html += '<div class="insight-card"><div class="insight-card-label">Margin Trend</div><div class="insight-card-value ' + dirClass(trend.directions.cm, true) + '">' + dirIcon(trend.directions.cm) + ' ' + trend.directions.cm.pct + '%</div><div class="insight-card-explain">' + (trend.directions.cm.dir === 'down' ? 'Margins compressing' : 'Margins holding') + '</div></div>';
    html += '<div class="insight-card"><div class="insight-card-label">Fixed Costs</div><div class="insight-card-value ' + dirClass(trend.directions.fc, false) + '">' + dirIcon(trend.directions.fc) + ' ' + trend.directions.fc.pct + '%</div><div class="insight-card-explain">' + (trend.directions.fc.dir === 'up' ? 'Costs rising' : 'Cost discipline') + '</div></div>';
    html += '</div>';

    const allInsights = [...trend.keyInsights, ...trend.healthInsights];
    if (allInsights.length > 0) {
      html += '<div class="h sub mt14">Key Observations</div><div class="trend-insight-list mt12">';
      allInsights.forEach(i => { html += '<div class="trend-insight ' + i.type + '">' + i.text + '</div>'; });
      html += '</div>';
    }
  } else {
    html += '<div class="empty-state mt14"><div class="muted">Add Prior Periods in the Inputs tab to view historical trend analysis.</div><div class="muted small mt8">(At least 2 periods recommended)</div></div>';
  }
  html += '</section>';

  // === Future Projections ===
  html += '<section class="section insight-section mt14"><div class="section-header"><div class="section-title-wrap"><div class="section-icon icon-blue">🔮</div><div><div class="section-title">Future Projections</div><div class="section-subtitle">Linear regression forecast based on historical data, projected forward. Add Prior Periods in the Inputs tab for more accuracy.</div></div></div></div>';

  const futureProj = Finance.computeFutureProjections ? Finance.computeFutureProjections(report, State.priorPeriods) : null;

  if (futureProj && futureProj.projections) {
    html += '<div class="insight-grid mt14">';
    futureProj.projections.forEach(p => {
      html += '<div class="insight-card"><div class="insight-card-label">' + p.period + '</div>';
      html += '<div class="insight-card-value">' + fM(p.sales) + '</div>';
      html += '<div class="insight-card-explain">Profit: ' + fM(p.profit) + (p.cmPct != null ? ' | CM: ' + Finance.fmtPct(p.cmPct) : '') + '</div></div>';
    });
    html += '</div>';
    if (futureProj.confidence) {
      html += '<div class="muted small mt8">Sales R²: ' + Finance.fmtNum(futureProj.confidence.sales, 2) + (futureProj.confidence.profit != null ? ' | Profit R²: ' + Finance.fmtNum(futureProj.confidence.profit, 2) : '') + '</div>';
    }
  } else {
    html += '<div class="empty-state mt14"><div class="muted">Add Prior Periods in the Inputs tab to view future projections.</div><div class="muted small mt8">(At least 2 periods recommended)</div></div>';
  }
  html += '</section>';

  container.innerHTML = html;
};

const openScenarioModal = () => {
  if (!State.currentReport) return;
  const changes = getSimChanges();
  if (!changes.salesAbs && !changes.salesPct && !changes.vcAbs && !changes.vcPct && !changes.fcAbs && !changes.fcPct) {
    UI.toast('Enter scenario changes first (Sales/VC/FC adjustments)', 'error');
    return;
  }
  const scenario = Finance.simulateScenario(
    State.currentReport.monthly, changes, State.currentReport.totals.M, State.currentReport.bs,
    { INTm: State.currentReport.monthly.INTm }
  );
  const base = State.currentReport.monthly;
  const fM = Finance.fmtMoney;
  const fC = Finance.fmtMoneyCompact;
  const fP = Finance.fmtPct;
  const delta = scenario.op - base.opProfit;
  const bi = scenario.bsImpact;
  
  // Build change description
  const changeParts = [];
  if (changes.salesAbs) changeParts.push('Sales ' + (changes.salesAbs > 0 ? '+' : '') + fM(changes.salesAbs));
  if (changes.salesPct) changeParts.push('Sales ' + (changes.salesPct > 0 ? '+' : '') + changes.salesPct + '%');
  if (changes.vcAbs) changeParts.push('VC ' + (changes.vcAbs > 0 ? '+' : '') + fM(changes.vcAbs));
  if (changes.vcPct) changeParts.push('VC ' + (changes.vcPct > 0 ? '+' : '') + changes.vcPct + '%');
  if (changes.fcAbs) changeParts.push('FC ' + (changes.fcAbs > 0 ? '+' : '') + fM(changes.fcAbs));
  if (changes.fcPct) changeParts.push('FC ' + (changes.fcPct > 0 ? '+' : '') + changes.fcPct + '%');
  const changeDesc = changeParts.length > 0 ? changeParts.join(', ') : 'No changes (matches base)';
  
  const existing = $('scenarioModal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'scenarioModal';
  modal.className = 'modal';
  modal.style.display = 'flex';
  
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <div>
          <div class="h">Scenario Analysis</div>
          <div class="muted small">${escapeHtml(changeDesc)}</div>
        </div>
        <button class="modal-close" id="closeScenarioModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="scenario-modal-grid">
          <div class="sm-section">
            <div class="sm-section-title">P&L Impact</div>
            <div class="sm-grid">
              <div class="sm-item">
                <div class="sm-label">Sales</div>
                <div class="sm-value">${fM(scenario.Rm)}/mo</div>
                <div class="sm-base">Base: ${fM(base.Rm)}</div>
              </div>
              <div class="sm-item">
                <div class="sm-label">Variable Costs</div>
                <div class="sm-value">${fM(scenario.VCm)}/mo</div>
                <div class="sm-base">Base: ${fM(base.VCm)}</div>
              </div>
              <div class="sm-item">
                <div class="sm-label">Contribution</div>
                <div class="sm-value">${fM(scenario.contribution)}/mo</div>
                <div class="sm-base">CM: ${fP(scenario.cmPct)}</div>
              </div>
              <div class="sm-item">
                <div class="sm-label">Fixed Costs</div>
                <div class="sm-value">${fM(scenario.FCm)}/mo</div>
                <div class="sm-base">Base: ${fM(base.FCm)}</div>
              </div>
              <div class="sm-item sm-highlight ${scenario.op >= 0 ? 'good' : 'bad'}">
                <div class="sm-label">Operating Profit</div>
                <div class="sm-value">${fM(scenario.op)}/mo</div>
                <div class="sm-base">Margin: ${fP(scenario.opPct)}</div>
              </div>
              <div class="sm-item sm-highlight ${delta >= 0 ? 'good' : 'bad'}">
                <div class="sm-label">Profit Change</div>
                <div class="sm-value">${delta >= 0 ? '+' : ''}${fM(delta)}/mo</div>
                <div class="sm-base">${delta >= 0 ? 'Improvement' : 'Decline'}</div>
              </div>
            </div>
          </div>
          
          <div class="sm-section">
            <div class="sm-section-title">Break-Even & Safety</div>
            <div class="sm-grid">
              <div class="sm-item">
                <div class="sm-label">Break-Even Point</div>
                <div class="sm-value">${fM(scenario.be)}/mo</div>
                <div class="sm-base">Base: ${fM(base.beSales)}</div>
              </div>
              <div class="sm-item">
                <div class="sm-label">Margin of Safety</div>
                <div class="sm-value">${fM(scenario.mos)}/mo</div>
                <div class="sm-base">${fP(scenario.mosPct)} of sales</div>
              </div>
              <div class="sm-item">
                <div class="sm-label">Total Sales (${State.currentReport.totals.M} mo)</div>
                <div class="sm-value">${fM(scenario.totalSales)}</div>
                <div class="sm-base">Base: ${fM(State.currentReport.totals.R)}</div>
              </div>
              <div class="sm-item">
                <div class="sm-label">Total Profit (${State.currentReport.totals.M} mo)</div>
                <div class="sm-value">${fM(scenario.op * State.currentReport.totals.M)}</div>
                <div class="sm-base">Base: ${fM(State.currentReport.totals.opTotal)}</div>
              </div>
            </div>
          </div>
          
          ${bi ? `
          <div class="sm-section">
            <div class="sm-section-title">Balance Sheet Impact</div>
            <div class="insight-narrative mt8" style="margin-bottom:12px;">
              ${bi.wcChange > 0 
                ? 'Growing sales sounds great, but your business will need <strong>' + fC(Math.abs(bi.wcChange)) + ' more working capital</strong> to support it — ' + (bi.estARChange > 0 ? fC(bi.estARChange) + ' more stuck in receivables' : '') + (bi.estInvChange > 0 ? (bi.estARChange > 0 ? ' and ' : '') + fC(bi.estInvChange) + ' more in inventory' : '') + '. ' + (bi.additionalDebtNeeded > 0 ? 'You\'ll need to arrange financing or use cash reserves to fund this growth.' : 'Plan for this cash need before scaling.')
                : 'This scenario frees up working capital — ' + fC(Math.abs(bi.wcChange)) + ' of cash currently locked in operations becomes available. That\'s money you can reinvest or use as a buffer.'
              }
            </div>
            <div class="sm-grid">
              <div class="sm-item ${bi.wcChange > 0 ? 'warn-bg' : 'good-bg'}">
                <div class="sm-label">Working Capital Change</div>
                <div class="sm-value">${bi.wcChange > 0 ? '+' : ''}${fM(bi.wcChange)}</div>
                <div class="sm-base">${bi.wcChange > 0 ? 'Additional capital needed' : 'Capital freed'}</div>
              </div>
              <div class="sm-item">
                <div class="sm-label">Receivables Change</div>
                <div class="sm-value">${bi.estARChange > 0 ? '+' : ''}${fM(bi.estARChange)}</div>
                <div class="sm-base">New AR: ${fC(bi.newAR)}</div>
              </div>
              <div class="sm-item">
                <div class="sm-label">Inventory Change</div>
                <div class="sm-value">${bi.estInvChange > 0 ? '+' : ''}${fM(bi.estInvChange)}</div>
                <div class="sm-base">New Inv: ${fC(bi.newInv)}</div>
              </div>
              <div class="sm-item">
                <div class="sm-label">Payables Change</div>
                <div class="sm-value">${bi.estAPChange > 0 ? '+' : ''}${fM(bi.estAPChange)}</div>
                <div class="sm-base">New AP: ${fC(bi.newAP)}</div>
              </div>
              ${bi.additionalDebtNeeded > 0 ? `
              <div class="sm-item warn-bg">
                <div class="sm-label">⚠️ Financing Needed</div>
                <div class="sm-value">${fM(bi.additionalDebtNeeded)}</div>
                <div class="sm-base">Interest: ${fM(bi.interestOnNewDebt)}/mo</div>
              </div>
              <div class="sm-item ${bi.adjustedOp >= 0 ? 'good-bg' : 'bad-bg'}">
                <div class="sm-label">Adjusted Profit</div>
                <div class="sm-value">${fM(bi.adjustedOp)}/mo</div>
                <div class="sm-base">After WC financing cost</div>
              </div>
              ` : `
              <div class="sm-item">
                <div class="sm-label">Net Cash Flow Impact</div>
                <div class="sm-value">${bi.cashFlowImpact >= 0 ? '+' : ''}${fM(bi.cashFlowImpact)}</div>
                <div class="sm-base">Profit gained minus WC absorbed</div>
              </div>
              `}
            </div>
            <div class="sm-section-title mt14">Equity & Cash Position Impact</div>
            <div class="sm-grid mt8">
              <div class="sm-item">
                <div class="sm-label">Cash Position</div>
                <div class="sm-value">${fM(bi.newCash)}</div>
                <div class="sm-base">${bi.newCashRunway != null ? 'Runway: ' + Finance.fmtNum(bi.newCashRunway, 1) + ' months' : '—'}</div>
              </div>
              <div class="sm-item ${bi.newEquity > bi.currentEquity ? 'good-bg' : bi.newEquity < bi.currentEquity ? 'warn-bg' : ''}">
                <div class="sm-label">Equity</div>
                <div class="sm-value">${fC(bi.currentEquity)} → ${fC(bi.newEquity)}</div>
                <div class="sm-base">${bi.retainedProfit >= 0 ? '+' : ''}${fC(bi.retainedProfit)} retained profit</div>
              </div>
              <div class="sm-item ${bi.newDE != null && bi.currentDE != null && bi.newDE > bi.currentDE ? 'warn-bg' : ''}">
                <div class="sm-label">Debt-Equity Ratio</div>
                <div class="sm-value">${bi.currentDE != null ? Finance.fmtNum(bi.currentDE, 2) + 'x' : '—'} → ${bi.newDE != null ? Finance.fmtNum(bi.newDE, 2) + 'x' : '—'}</div>
                <div class="sm-base">${bi.newDE != null && bi.currentDE != null ? (bi.newDE < bi.currentDE ? 'Leverage improving' : bi.newDE > bi.currentDE ? 'Leverage increasing' : 'No change') : '—'}</div>
              </div>
            </div>
            <div class="sm-assumptions">AR/Inventory scale with sales volume; AP scales with purchase growth; ${bi.actualRate ? 'Cost of debt: ' + Finance.fmtNum(bi.actualRate * 100, 1) + '% p.a.' : 'New debt at 12% p.a.'}</div>
          </div>
          ` : ''}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="scenarioModalClose">Close</button>
        <button class="btn btn-ghost" id="scenarioModalReset">🔄 Reset & Try Another</button>
        <button class="btn" id="scenarioModalSave">💾 Save Scenario</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const close = () => modal.remove();
  modal.querySelector('#closeScenarioModal').addEventListener('click', close);
  modal.querySelector('#scenarioModalClose').addEventListener('click', close);
  modal.querySelector('.modal-backdrop').addEventListener('click', close);
  modal.querySelector('#scenarioModalReset').addEventListener('click', () => {
    close();
    resetSimInputs();
    renderSimulator();
  });
  modal.querySelector('#scenarioModalSave').addEventListener('click', () => {
    close();
    saveScenario();
  });
};

const openMonteCarloModal = () => {
  const modal = $('monteCarloModal');
  if (modal) modal.style.display = 'flex';
  const resultsDiv = $('mcResults');
  if (resultsDiv) resultsDiv.style.display = 'none';
};

const runMonteCarloSim = () => {
  if (!State.currentReport || !Finance.runMonteCarlo) return;
  const changes = getSimChanges();
  if (!changes.salesAbs && !changes.salesPct && !changes.vcAbs && !changes.vcPct && !changes.fcAbs && !changes.fcPct) {
    UI.toast('Enter scenario changes first (Sales/VC/FC adjustments)', 'error');
    return;
  }
  const base = State.currentReport.monthly;
  const variances = {
    salesMin: Finance.toNum($('mcSalesMin')?.value),
    salesMax: Finance.toNum($('mcSalesMax')?.value),
    vcMin: Finance.toNum($('mcVCMin')?.value),
    vcMax: Finance.toNum($('mcVCMax')?.value),
    fcMin: Finance.toNum($('mcFCMin')?.value),
    fcMax: Finance.toNum($('mcFCMax')?.value)
  };

  const result = Finance.runMonteCarlo(base, variances, 1000);

  // Show results
  const resultsDiv = $('mcResults');
  if (resultsDiv) resultsDiv.style.display = 'block';

  UI.setText('mcWorst', Finance.fmtMoney(result.p5));
  UI.setText('mcMedian', Finance.fmtMoney(result.p50));
  UI.setText('mcBest', Finance.fmtMoney(result.p95));

  const probEl = $('mcProbability');
  if (probEl) {
    if (result.lossProbability === 0) {
      probEl.innerHTML = '<span class="good"><strong>0% probability</strong> of loss. The business is highly resilient to these variance ranges.</span>';
    } else {
      probEl.innerHTML = '<span class="' + (result.lossProbability > 20 ? 'bad' : 'warn') + '"><strong>' + result.lossProbability + '% probability</strong> of loss under these variance ranges.</span>';
    }
  }

  // Render ECharts histogram
  if (window.echarts) {
    const chart = getOrCreateChart('mcChartContainer');
    if (chart) {
      chart.setOption({
        tooltip: { trigger: 'axis', formatter: params => { const p = params[0]; return p.name + '<br>Count: ' + p.value; } },
        grid: { left: 40, right: 20, top: 10, bottom: 30 },
        xAxis: { type: 'category', data: result.bins.map(b => Finance.fmtMoneyCompact(b.lo)), axisLabel: { fontSize: 9, rotate: 30 } },
        yAxis: { type: 'value', show: false },
        series: [{ type: 'bar', data: result.bins.map(b => b.count), itemStyle: { color: '#7c3aed', borderRadius: [3, 3, 0, 0] }, barWidth: '80%' }]
      });
    }
  }
};

const renderReport = () => {
  const c = getClient();
  if (!c) return;
  
  const validationErrors = Finance.validateInputs(c.inputs);
  if (validationErrors.length > 0) {
    if ($('noReport')) $('noReport').style.display = 'block';
    if ($('reportWrap')) $('reportWrap').style.display = 'none';
    if ($('downloadPDFNav')) $('downloadPDFNav').disabled = true;
    UI.toast('Please fix input errors: ' + validationErrors[0], 'error');
    return;
  }
  
  const report = Finance.computeReport(c.inputs);
  if (!report || report.totals.R === 0) {
    if ($('noReport')) $('noReport').style.display = 'block';
    if ($('reportWrap')) $('reportWrap').style.display = 'none';
    if ($('downloadPDFNav')) $('downloadPDFNav').disabled = true;
    return;
  }
  
  State.currentReport = report;
  
  // Compute BizLens Score
  State.bizlensScore = Finance.computeBizLensScore(report, State.thresholds);
  
  // Compute trends from prior periods
  const priorData = c.inputs?.priorPeriods || [];
  if (priorData.length > 0) {
    const priorReports = priorData.map(p => {
      const pInputs = { ...c.inputs, ...p };
      return Finance.computeReport(pInputs);
    }).filter(Boolean);
    State.priorPeriods = priorReports;
    State.trendData = Finance.computeTrends(report, priorReports);
  } else {
    State.priorPeriods = [];
    State.trendData = null;
  }
  
  if ($('noReport')) $('noReport').style.display = 'none';
  if ($('reportWrap')) $('reportWrap').style.display = 'block';
  if ($('downloadPDFNav')) $('downloadPDFNav').disabled = false;
  
  UI.setText('reportTitle', escapeHtml(c.name) + ' — BizLens Report');
  UI.setText('generatedOn', Finance.todayStr());
  UI.setText('reportPeriodBadge', report.totals.M + ' months');
  
  UI.renderOperatingDashboard(report, c.inputs);
  renderSimulator();
  updateSavedScenariosUI();
  showReportView(State.currentView);
};

const getSimChanges = () => ({
  salesAbs: Finance.toNum($('dSalesAbs')?.value),
  salesPct: Finance.toNum($('dSalesPct')?.value),
  vcAbs: Finance.toNum($('dVCAbs')?.value),
  vcPct: Finance.toNum($('dVCPct')?.value),
  fcAbs: Finance.toNum($('dFCAbs')?.value),
  fcPct: Finance.toNum($('dFCPct')?.value)
});

const renderSimulator = () => {
  if (!State.currentReport) return;
  const changes = getSimChanges();
  const scenario = Finance.simulateScenario(
    State.currentReport.monthly, changes, State.currentReport.totals.M,
    State.currentReport.bs, { INTm: State.currentReport.monthly.INTm }
  );
  UI.renderSimulatorResults(scenario, State.currentReport);
  
  const c = getClient();
  const opt = Finance.calcOptimumScenarios(State.currentReport.monthly, c?.inputs?.TP || 0, State.currentReport.totals.M);
  UI.renderOptimumScenarios(opt, State.currentReport.monthly);
};

const resetSimInputs = () => {
  ['dSalesAbs', 'dSalesPct', 'dVCAbs', 'dVCPct', 'dFCAbs', 'dFCPct'].forEach(id => { const el = $(id); if (el) el.value = ''; });
};

const resetSimulator = () => {
  resetSimInputs();
  renderSimulator();
};

const saveScenario = () => {
  const changes = getSimChanges();
  const name = prompt('Scenario name:', 'Scenario ' + (State.savedScenarios.length + 1));
  if (!name) return;
  
  const safeName = name.substring(0, 100);
  const c = getClient();
  const scenario = Finance.simulateScenario(State.currentReport.monthly, changes, State.currentReport.totals.M, State.currentReport.bs, { INTm: State.currentReport.monthly.INTm });
  
  // Store base snapshot for stale scenario detection
  const baseSnapshot = {
    Rm: State.currentReport.monthly.Rm,
    VCm: State.currentReport.monthly.VCm,
    FCm: State.currentReport.monthly.FCm
  };
  
  State.savedScenarios.push({
    id: Date.now(), name: safeName, clientId: c?.id, clientName: c?.name,
    ...changes, result: scenario, baseSnapshot, createdAt: new Date().toISOString()
  });
  saveData();
  updateSavedScenariosUI();
  UI.toast('Scenario saved', 'success');
};

const updateSavedScenariosUI = () => {
  const chipsContainer = $('savedScenarioChips');
  if (!chipsContainer) return;
  
  const clientScenarios = State.savedScenarios.filter(s => s.clientId === State.selectedId);
  
  if (clientScenarios.length === 0) {
    chipsContainer.innerHTML = '';
    return;
  }
  
  chipsContainer.innerHTML = clientScenarios.map(s => `
    <span class="scenario-chip" data-id="${s.id}">
      <span class="chip-name">${escapeHtml(s.name)}</span>
      <span class="chip-delete" data-id="${s.id}" title="Delete">×</span>
    </span>
  `).join('') + '<span class="scenario-chip chip-compare" id="compareFromChips">📊 Compare</span>';
  
  // Chip click = load
  chipsContainer.querySelectorAll('.scenario-chip:not(.chip-compare)').forEach(chip => {
    chip.addEventListener('click', (e) => {
      if (e.target.classList.contains('chip-delete')) return;
      loadScenario(parseInt(chip.dataset.id));
    });
  });
  // Delete buttons
  chipsContainer.querySelectorAll('.chip-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteScenario(parseInt(btn.dataset.id));
    });
  });
  // Compare button
  chipsContainer.querySelector('#compareFromChips')?.addEventListener('click', showCompareScenarios);
};

const loadScenario = (id) => {
  const scenario = State.savedScenarios.find(s => s.id === id);
  if (!scenario) return;
  
  if ($('dSalesAbs')) $('dSalesAbs').value = scenario.salesAbs || '';
  if ($('dSalesPct')) $('dSalesPct').value = scenario.salesPct || '';
  if ($('dVCAbs')) $('dVCAbs').value = scenario.vcAbs || '';
  if ($('dVCPct')) $('dVCPct').value = scenario.vcPct || '';
  if ($('dFCAbs')) $('dFCAbs').value = scenario.fcAbs || '';
  if ($('dFCPct')) $('dFCPct').value = scenario.fcPct || '';
  
  renderSimulator();
  UI.toast('Scenario loaded: ' + scenario.name, 'info');
};

const deleteScenario = (id) => {
  const scenario = State.savedScenarios.find(s => s.id === id);
  if (!scenario) return;
  if (!confirm('Delete scenario "' + scenario.name + '"?')) return;
  
  State.savedScenarios = State.savedScenarios.filter(s => s.id !== id);
  saveData();
  updateSavedScenariosUI();
  UI.toast('Scenario deleted', 'info');
};

const showCompareScenarios = () => {
  const modal = $('compareScenariosModal');
  if (!modal) return;
  
  const clientScenarios = State.savedScenarios.filter(s => s.clientId === State.selectedId);
  const noScenarios = $('compareNoScenarios');
  const table = $('compareTable');
  
  if (clientScenarios.length === 0) {
    if (noScenarios) noScenarios.style.display = 'block';
    if (table) table.innerHTML = '';
  } else {
    if (noScenarios) noScenarios.style.display = 'none';
    
    // Check for stale scenarios (base data changed since scenario was saved)
    const base = State.currentReport?.monthly;
    const staleScenarios = clientScenarios.filter(s => {
      if (!s.baseSnapshot || !base) return false;
      return Math.abs(s.baseSnapshot.Rm - base.Rm) > 1 ||
             Math.abs(s.baseSnapshot.VCm - base.VCm) > 1 ||
             Math.abs(s.baseSnapshot.FCm - base.FCm) > 1;
    });
    
    if (staleScenarios.length > 0 && table) {
      const warningDiv = document.createElement('div');
      warningDiv.className = 'alert alert-warn mb12';
      warningDiv.textContent = '⚠️ ' + staleScenarios.length + ' scenario(s) were calculated with different base inputs. Results may not be directly comparable.';
      table.parentNode?.insertBefore(warningDiv, table);
    }
    
    renderCompareTable(clientScenarios);
  }
  
  modal.style.display = 'flex';
};

const renderCompareTable = (scenarios) => {
  const table = $('compareTable');
  if (!table || !State.currentReport) return;
  
  const base = State.currentReport.monthly;
  
  const metrics = [
    { key: 'sales', label: 'Monthly Sales', format: v => Finance.fmtMoney(v), getValue: s => s.result?.Rm || s.Rm },
    { key: 'vc', label: 'Variable Costs', format: v => Finance.fmtMoney(v), getValue: s => s.result?.VCm || s.VCm },
    { key: 'fc', label: 'Fixed Costs', format: v => Finance.fmtMoney(v), getValue: s => s.result?.FCm || s.FCm },
    { key: 'cm', label: 'Contribution Margin', format: v => Finance.fmtPct(v), getValue: s => s.result?.cmPct || s.cmPct, higherBetter: true },
    { key: 'be', label: 'Break-Even', format: v => Finance.fmtMoney(v), getValue: s => s.result?.be || s.be, higherBetter: false },
    { key: 'mos', label: 'Safety Margin', format: v => Finance.fmtMoney(v), getValue: s => s.result?.mos || s.mos, higherBetter: true },
    { key: 'mosPct', label: 'Safety %', format: v => Finance.fmtPct(v), getValue: s => s.result?.mosPct || s.mosPct, higherBetter: true },
    { key: 'op', label: 'Operating Profit', format: v => Finance.fmtMoney(v), getValue: s => s.result?.op || s.op, higherBetter: true }
  ];
  
  let html = '<table class="compare-table">';
  
  // Header row
  html += '<thead><tr><th>Metric</th><th class="base-header">Current</th>';
  scenarios.forEach(s => {
    html += `<th class="scenario-header">${escapeHtml(s.name)}</th>`;
  });
  html += '</tr></thead>';
  
  // Data rows
  html += '<tbody>';
  metrics.forEach(m => {
    const baseValue = m.key === 'sales' ? base.Rm : 
                     m.key === 'vc' ? base.VCm :
                     m.key === 'fc' ? base.FCm :
                     m.key === 'cm' ? base.cmPct :
                     m.key === 'be' ? base.beSales :
                     m.key === 'mos' ? base.mos :
                     m.key === 'mosPct' ? base.mosPct :
                     base.opProfit;
    
    const values = scenarios.map(s => m.getValue(s));
    const allValues = [baseValue, ...values].filter(v => v != null && !isNaN(v));
    
    const best = m.higherBetter !== false ? Math.max(...allValues) : Math.min(...allValues);
    const worst = m.higherBetter !== false ? Math.min(...allValues) : Math.max(...allValues);
    
    const getClass = (v) => {
      if (v === best) return 'best-value';
      if (v === worst && allValues.length > 2) return 'worst-value';
      return '';
    };
    
    html += `<tr><td>${m.label}</td>`;
    html += `<td class="${getClass(baseValue)}">${m.format(baseValue)}</td>`;
    scenarios.forEach(s => {
      const v = m.getValue(s);
      html += `<td class="${getClass(v)}">${m.format(v)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  
  table.innerHTML = html;
};

const clearAllScenarios = () => {
  if (!confirm('Delete ALL saved scenarios for this client?')) return;
  State.savedScenarios = State.savedScenarios.filter(s => s.clientId !== State.selectedId);
  saveData();
  updateSavedScenariosUI();
  const modal = $('compareScenariosModal');
  if (modal) modal.style.display = 'none';
  UI.toast('All scenarios cleared', 'info');
};

const downloadPDF = async () => {
  if (!window.jspdf) { UI.toast('PDF library not loaded. Check internet connection.', 'error'); return; }
  
  const c = getClient();
  if (!c || !State.currentReport) { UI.toast('Generate report first', 'error'); return; }
  
  // Use proper modal instead of window.prompt
  const periodString = await showPeriodModal();
  if (periodString === null) return; // User cancelled
  
  UI.showLoading(true, 'Generating PDF...');
  
  try {
    await new Promise(r => setTimeout(r, 300));
    const commitments = $('commitments')?.value || '';
    // Attach trend data for PDF if available
    const scenariosWithTrend = [...State.savedScenarios];
    scenariosWithTrend.__trendData = State.trendData;
    await PDF.generatePDF(State.currentReport, c.name, State.thresholds, scenariosWithTrend, commitments, periodString);
    UI.toast('PDF downloaded', 'success');
  } catch (e) {
    console.error('PDF Error:', e);
    UI.toast('PDF failed: ' + e.message, 'error');
  } finally {
    UI.showLoading(false);
  }
};

const loadThresholdsToUI = () => {
  const t = State.thresholds;
  if ($('thrCashHigh')) $('thrCashHigh').value = t.cashHigh;
  if ($('thrCashGood')) $('thrCashGood').value = t.cashGood;
  if ($('thrDEHigh')) $('thrDEHigh').value = t.deHigh;
  if ($('thrDELow')) $('thrDELow').value = t.deLow;
  if ($('thrICRHigh')) $('thrICRHigh').value = t.icrHigh;
  if ($('thrICRLow')) $('thrICRLow').value = t.icrLow;
  if ($('thrConcHigh')) $('thrConcHigh').value = t.concHigh;
  if ($('thrConcMed')) $('thrConcMed').value = t.concMed;
  if ($('thrWCSalesHigh')) $('thrWCSalesHigh').value = t.wcSalesHigh;
  if ($('thrWCSalesMed')) $('thrWCSalesMed').value = t.wcSalesMed;
};

const saveThresholdsFromUI = () => {
  const getThreshold = (id, defaultVal) => {
    const val = Finance.toNum($(id)?.value);
    // Allow 0 as a valid threshold; only fall back to default if field is empty/NaN
    const raw = $(id)?.value;
    if (raw == null || String(raw).trim() === '') return defaultVal;
    return val;
  };
  
  State.thresholds = {
    cashHigh: getThreshold('thrCashHigh', DEFAULT_THRESHOLDS.cashHigh),
    cashGood: getThreshold('thrCashGood', DEFAULT_THRESHOLDS.cashGood),
    deHigh: getThreshold('thrDEHigh', DEFAULT_THRESHOLDS.deHigh),
    deLow: getThreshold('thrDELow', DEFAULT_THRESHOLDS.deLow),
    icrHigh: getThreshold('thrICRHigh', DEFAULT_THRESHOLDS.icrHigh),
    icrLow: getThreshold('thrICRLow', DEFAULT_THRESHOLDS.icrLow),
    concHigh: getThreshold('thrConcHigh', DEFAULT_THRESHOLDS.concHigh),
    concMed: getThreshold('thrConcMed', DEFAULT_THRESHOLDS.concMed),
    wcSalesHigh: getThreshold('thrWCSalesHigh', DEFAULT_THRESHOLDS.wcSalesHigh),
    wcSalesMed: getThreshold('thrWCSalesMed', DEFAULT_THRESHOLDS.wcSalesMed)
  };
  saveData();
};

// === Validation Modal ===
const showValidationModal = (errors) => {
  // Remove existing modal if any
  const existing = $('validationModal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'validationModal';
  modal.className = 'modal';
  modal.style.display = 'flex';
  
  const errorItems = errors.map(e => {
    return '<div class="validation-error-item">' +
      '<span class="validation-icon">⚠️</span>' +
      '<span>' + escapeHtml(e) + '</span>' +
    '</div>';
  }).join('');
  
  // Detect zero-value positive signals for helpful messaging
  const c = getClient();
  const zeroHints = [];
  if (c) {
    const inp = c.inputs;
    if (inp.INT !== undefined && Finance.toNum(inp.INT) === 0) {
      zeroHints.push('<div class="validation-hint good">✓ Interest = 0 is valid — the business is free from interest obligations.</div>');
    }
    if (inp.PUR !== undefined && Finance.toNum(inp.PUR) === 0) {
      zeroHints.push('<div class="validation-hint good">✓ Purchases = 0 is valid for service businesses with no material purchases.</div>');
    }
    if (Finance.toNum(inp.BS_CASH) === 0 && inp.BS_CASH !== undefined && String(inp.BS_CASH).trim() !== '') {
      zeroHints.push('<div class="validation-hint info">ℹ️ Cash = 0 will result in zero cash runway. Is this correct?</div>');
    }
  }
  
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <div class="h">⚠️ Please Review</div>
        <button class="modal-close" id="closeValidation">&times;</button>
      </div>
      <div class="modal-body">
        <p class="muted mb12">Some inputs need attention before generating the report:</p>
        <div class="validation-errors">
          ${errorItems}
        </div>
        ${zeroHints.length > 0 ? '<div class="validation-hints mt12">' + zeroHints.join('') + '</div>' : ''}
        <p class="muted small mt12">Tip: Enter 0 for fields like Interest or Debt if the business has none — this is a positive indicator.</p>
      </div>
      <div class="modal-footer">
        <button class="btn" id="closeValidationBtn">Go Back to Fix</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const close = () => modal.remove();
  modal.querySelector('#closeValidation').addEventListener('click', close);
  modal.querySelector('#closeValidationBtn').addEventListener('click', close);
  modal.querySelector('.modal-backdrop').addEventListener('click', close);
};

// === PDF Period Modal (replaces window.prompt) ===
const showPeriodModal = () => {
  return new Promise((resolve) => {
    const existing = $('periodModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'periodModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <div class="h">Report Period</div>
          <button class="modal-close" id="closePeriod">&times;</button>
        </div>
        <div class="modal-body">
          <label class="mb8" style="display:block;font-weight:500;">Enter the report period:</label>
          <input type="text" id="periodInput" class="period-modal-input" placeholder="e.g., January 2025 - March 2025" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;">
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="cancelPeriod">Cancel</button>
          <button class="btn" id="confirmPeriod">Generate PDF</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = modal.querySelector('#periodInput');
    input.focus();
    
    const close = (result) => { modal.remove(); resolve(result); };
    
    modal.querySelector('#closePeriod').addEventListener('click', () => close(null));
    modal.querySelector('#cancelPeriod').addEventListener('click', () => close(null));
    modal.querySelector('#confirmPeriod').addEventListener('click', () => close(input.value.trim()));
    modal.querySelector('.modal-backdrop').addEventListener('click', () => close(null));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') close(input.value.trim()); });
  });
};

// === Ageing Reconciliation ===
const updateAgeingReconciliation = (type) => {
  const prefix = type === 'ar' ? 'ar' : 'ap';
  const bsField = type === 'ar' ? 'bsAR' : 'bsAP';
  const totalElId = prefix + 'AgeingTotal';
  const diffElId = prefix + 'AgeingDiff';
  
  const buckets = [
    Finance.toNum($(prefix + '0')?.value),
    Finance.toNum($(prefix + '31')?.value),
    Finance.toNum($(prefix + '61')?.value),
    Finance.toNum($(prefix + '90')?.value)
  ];
  const total = buckets.reduce((a, b) => a + b, 0);
  const bsValue = Finance.toNum($(bsField)?.value);
  const diff = total - bsValue;
  
  const totalEl = $(totalElId);
  const diffEl = $(diffElId);
  
  if (totalEl) totalEl.textContent = 'Total: ' + Finance.fmtMoney(total);
  if (diffEl) {
    if (total === 0 && bsValue === 0) {
      diffEl.textContent = '';
      diffEl.className = 'ageing-diff';
    } else if (Math.abs(diff) < 100) {
      diffEl.textContent = '✓ Reconciled';
      diffEl.className = 'ageing-diff reconciled';
    } else {
      diffEl.textContent = 'Diff: ' + Finance.fmtMoney(diff) + ' from ' + (type === 'ar' ? 'Receivables' : 'Payables');
      diffEl.className = 'ageing-diff mismatch';
    }
  }
};

const setupEventListeners = () => {
  $('goInput')?.addEventListener('click', () => showPage('input'));
  $('goReport')?.addEventListener('click', () => showPage('report'));
  $('goToInputs')?.addEventListener('click', () => showPage('input'));
  $('goToInputsEmpty')?.addEventListener('click', () => showPage('input'));
  
  $('toggleOperating')?.addEventListener('click', () => showReportView('operating'));
  $('toggleHealth')?.addEventListener('click', () => showReportView('health'));
  $('toggleInsights')?.addEventListener('click', () => showReportView('insights'));
  $('toggleSimulator')?.addEventListener('click', () => showReportView('simulator'));
  $('toggleSummary')?.addEventListener('click', () => showReportView('summary'));
  
  $('clientSelect')?.addEventListener('change', e => {
    State.selectedId = e.target.value;
    saveData();
    loadFormFromClient();
    State.currentReport = null;
    updateSavedScenariosUI();
    // If on report page, refresh the report
    const reportPage = $('pageReport');
    if (reportPage && reportPage.style.display !== 'none') {
      renderReport();
    }
  });
  
  $('newClient')?.addEventListener('click', () => {
    const name = prompt('Client name:');
    if (name?.trim()) { createNewClient(name.trim()); rebuildClientSelect(); loadFormFromClient(); updateSavedScenariosUI(); UI.toast('Client created', 'success'); }
  });
  
  $('renameClient')?.addEventListener('click', () => {
    const c = getClient();
    if (!c) return;
    const newName = prompt('New name:', c.name);
    if (newName?.trim()) { c.name = newName.trim().replace(/[<>]/g, '').substring(0, 100); saveData(); rebuildClientSelect(); UI.toast('Client renamed', 'success'); }
  });
  
  $('deleteClient')?.addEventListener('click', () => {
    const c = getClient();
    if (!c) return;
    if (!confirm('Delete "' + c.name + '"? This cannot be undone.')) return;
    delete State.clients[State.selectedId];
    const ids = Object.keys(State.clients);
    State.selectedId = ids.length > 0 ? ids[0] : null;
    if (!State.selectedId) createNewClient('Default Client');
    saveData(); rebuildClientSelect(); loadFormFromClient(); updateSavedScenariosUI(); UI.toast('Client deleted', 'info');
  });
  
  const autosaveIndicator = $('autosaveIndicator');
  let autosaveTimer;
  
  const triggerAutosave = () => {
    if (autosaveIndicator) { autosaveIndicator.textContent = 'Saving...'; autosaveIndicator.style.color = 'var(--amber)'; }
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      saveFormToClient();
      if (autosaveIndicator) { autosaveIndicator.textContent = '✓ Saved'; autosaveIndicator.style.color = 'var(--teal)'; }
    }, 800);
  };
  
  inputFields.forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', e => { if (id !== 'inputM') e.target.value = formatIndian(e.target.value); triggerAutosave(); });
    el.addEventListener('blur', () => { if (id !== 'inputM') el.value = formatIndian(el.value); });
  });
  
  selectFields.forEach(id => { const el = $(id); if (el) el.addEventListener('change', triggerAutosave); });
  
  // Scenario modal
  $('openScenarioDetail')?.addEventListener('click', openScenarioModal);
  
  $('arAgeingAvail')?.addEventListener('change', () => { toggleAgeingBoxes(); triggerAutosave(); });
  $('apAgeingAvail')?.addEventListener('change', () => { toggleAgeingBoxes(); triggerAutosave(); });
  
  // Ageing reconciliation - update on every ageing bucket change
  ['ar0', 'ar31', 'ar61', 'ar90'].forEach(id => {
    $(id)?.addEventListener('input', () => updateAgeingReconciliation('ar'));
  });
  ['ap0', 'ap31', 'ap61', 'ap90'].forEach(id => {
    $(id)?.addEventListener('input', () => updateAgeingReconciliation('ap'));
  });
  // Also reconcile when BS AR/AP values change
  $('bsAR')?.addEventListener('input', () => {
    if ($('arAgeingAvail')?.value === 'yes') updateAgeingReconciliation('ar');
  });
  $('bsAP')?.addEventListener('input', () => {
    if ($('apAgeingAvail')?.value === 'yes') updateAgeingReconciliation('ap');
  });
  
  document.querySelectorAll('input[name="fcIncludesInterest"]').forEach(r => { r.addEventListener('change', triggerAutosave); });
  
  $('inputForm')?.addEventListener('submit', e => {
    e.preventDefault();
    saveFormToClient();
    
    // Validate BEFORE navigating to report page
    const c = getClient();
    if (c) {
      const errors = Finance.validateInputs(c.inputs);
      if (errors.length > 0) {
        showValidationModal(errors);
        return;
      }
    }
    
    showPage('report');
  });
  
  $('downloadPDFNav')?.addEventListener('click', downloadPDF);
  
  ['dSalesAbs', 'dSalesPct', 'dVCAbs', 'dVCPct', 'dFCAbs', 'dFCPct'].forEach(id => { $(id)?.addEventListener('input', renderSimulator); });
  
  $('preset20')?.addEventListener('click', () => { if ($('dSalesPct')) $('dSalesPct').value = '20'; renderSimulator(); });
  $('presetMargin')?.addEventListener('click', () => { if ($('dVCPct')) $('dVCPct').value = '-5'; renderSimulator(); });
  $('presetCuts')?.addEventListener('click', () => { if ($('dFCPct')) $('dFCPct').value = '-10'; renderSimulator(); });
  $('resetSim')?.addEventListener('click', resetSimulator);
  $('runOptimum')?.addEventListener('click', renderSimulator);

  $('toggleTrends')?.addEventListener('click', () => showReportView('trends'));
  $('openMonteCarlo')?.addEventListener('click', openMonteCarloModal);
  $('runMonteCarlo')?.addEventListener('click', runMonteCarloSim);
  $('closeMonteCarlo')?.addEventListener('click', () => { const m = $('monteCarloModal'); if (m) m.style.display = 'none'; });
  $('closeMonteCarloBtn')?.addEventListener('click', () => { const m = $('monteCarloModal'); if (m) m.style.display = 'none'; });
  $('monteCarloModal')?.querySelector('.modal-backdrop')?.addEventListener('click', () => { const m = $('monteCarloModal'); if (m) m.style.display = 'none'; });

  $('closeCompareScenarios')?.addEventListener('click', () => { const modal = $('compareScenariosModal'); if (modal) modal.style.display = 'none'; });
  $('closeCompareBtn')?.addEventListener('click', () => { const modal = $('compareScenariosModal'); if (modal) modal.style.display = 'none'; });
  $('compareScenariosModal')?.querySelector('.modal-backdrop')?.addEventListener('click', () => { const modal = $('compareScenariosModal'); if (modal) modal.style.display = 'none'; });
  $('clearAllScenarios')?.addEventListener('click', clearAllScenarios);
  
  const commitEl = $('commitments');
  const commitIndicator = $('commitmentsAutosave');
  if (commitEl) {
    commitEl.addEventListener('input', () => {
      if (commitIndicator) { commitIndicator.textContent = '...'; commitIndicator.style.color = 'var(--amber)'; }
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => { saveFormToClient(); if (commitIndicator) { commitIndicator.textContent = '✓'; commitIndicator.style.color = 'var(--teal)'; } }, 1000);
    });
  }
  
  $('openSettings')?.addEventListener('click', () => { const modal = $('settingsModal'); if (modal) modal.style.display = 'flex'; loadThresholdsToUI(); });
  $('closeSettings')?.addEventListener('click', () => { const modal = $('settingsModal'); if (modal) modal.style.display = 'none'; });
  $('settingsModal')?.querySelector('.modal-backdrop')?.addEventListener('click', () => { const modal = $('settingsModal'); if (modal) modal.style.display = 'none'; });
  $('saveSettings')?.addEventListener('click', () => { saveThresholdsFromUI(); const modal = $('settingsModal'); if (modal) modal.style.display = 'none'; UI.toast('Settings saved', 'success'); });
  $('resetThresholds')?.addEventListener('click', () => { State.thresholds = { ...DEFAULT_THRESHOLDS }; loadThresholdsToUI(); UI.toast('Thresholds reset to defaults', 'info'); });
  
  // Shortcuts modal listeners removed
  
  // Prior Period Modal
  $('addPriorPeriod')?.addEventListener('click', openPriorPeriodModal);
  
  // === Monthly Snapshot Feature ===
  $('takeSnapshot')?.addEventListener('click', () => {
    const c = getClient();
    if (!c) return;

    // Read current form values as a snapshot
    const snap = {};
    inputFields.forEach(id => {
      const el = $(id);
      if (el) snap[fieldToKey[id]] = el.value.replace(/,/g, '');
    });

    // Validate minimum fields
    const sales = parseFloat(snap.R) || 0;
    const period = parseFloat(snap.M) || 0;
    if (!sales || !period) {
      UI.toast('Fill at least Period and Sales before saving a snapshot', 'error');
      return;
    }

    // Store as a prior period entry
    if (!c.inputs.priorPeriods) c.inputs.priorPeriods = [];

    // Check if a snapshot for this month already exists
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    const existing = c.inputs.priorPeriods.findIndex(p => p.snapshotMonth === monthKey);

    // Read period name from input, use "Period N" as default
    const periodNameEl = $('priorPeriodName');
    const periodName = periodNameEl?.value?.trim() || ('Period ' + (c.inputs.priorPeriods.length + 1));

    const priorData = {
      snapshotMonth: monthKey,
      snapshotDate: new Date().toISOString(),
      periodName: periodName,
      M: 1, // Snapshot represents 1 month
      R: snap.R, VC: snap.VC, FC: snap.FC, PUR: snap.PUR, INT: snap.INT,
      TP: snap.TP, INV_CHANGE: snap.INV_CHANGE, OI: snap.OI, NC: snap.NC,
      bsCash: snap.bsCash, bsInv: snap.bsInv, bsAR: snap.bsAR, bsAP: snap.bsAP,
      bsSTB: snap.bsSTB, bsLTB: snap.bsLTB, bsEQ: snap.bsEQ,
      bsOtherCA: snap.bsOtherCA, bsLoansAdv: snap.bsLoansAdv, bsCLX: snap.bsCLX,
      bsOtherLiab: snap.bsOtherLiab, realisableFA: snap.realisableFA,
      topCust: snap.topCust, topSupp: snap.topSupp,
      FC_INCLUDES_INT: snap.FC_INCLUDES_INT
    };
    
    if (existing >= 0) {
      c.inputs.priorPeriods[existing] = priorData;
    } else {
      c.inputs.priorPeriods.push(priorData);
    }
    
    // Keep only last 12 snapshots
    if (c.inputs.priorPeriods.length > 12) {
      c.inputs.priorPeriods = c.inputs.priorPeriods.slice(-12);
    }
    
    saveData();
    
    // Show feedback
    const fb = $('snapshotFeedback');
    if (fb) {
      const count = c.inputs.priorPeriods.length;
      fb.className = 'snapshot-feedback success';
      fb.style.display = 'block';
      fb.textContent = 'Snapshot saved for ' + monthKey + '. You now have ' + count + ' month(s) of history for trend analysis.';
      setTimeout(() => { fb.style.display = 'none'; }, 5000);
    }
    
    // Clear period name input and update chips
    if (periodNameEl) periodNameEl.value = '';
    renderPriorPeriodChips();
    UI.toast('Snapshot saved: ' + periodName, 'success');
  });
  
  // === Export Prompt Button ===
  $('exportPromptBtn')?.addEventListener('click', () => {
    const data = { 
      clients: State.clients, 
      thresholds: State.thresholds, 
      savedScenarios: State.savedScenarios, 
      exportedAt: new Date().toISOString() 
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = 'bizlens_backup_' + new Date().toISOString().slice(0, 10) + '.json'; 
    a.click();
    URL.revokeObjectURL(url);
    
    // Record last export time
    localStorage.setItem('bizlens_last_export', new Date().toISOString());
    UI.toast('Data exported successfully — save this file as your backup', 'success');
  });
  
  // === Auto Export Reminder (every 7 days) ===
  const lastExport = localStorage.getItem('bizlens_last_export');
  const daysSinceExport = lastExport ? (Date.now() - new Date(lastExport).getTime()) / (1000 * 60 * 60 * 24) : 999;
  if (daysSinceExport > 7) {
    setTimeout(() => {
      UI.toast('Reminder: Export your data to keep a backup. Click 💾 Export Data on the input page.', 'info', 8000);
    }, 3000);
  }
  
  $('exportAllData')?.addEventListener('click', () => {
    const data = { clients: State.clients, thresholds: State.thresholds, savedScenarios: State.savedScenarios, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bizlens_data_' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    URL.revokeObjectURL(url);
    UI.toast('Data exported', 'success');
  });
  
  $('importDataFile')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.clients) Object.assign(State.clients, data.clients);
        if (data.thresholds) State.thresholds = { ...DEFAULT_THRESHOLDS, ...data.thresholds };
        if (data.savedScenarios) State.savedScenarios = [...State.savedScenarios, ...data.savedScenarios];
        saveData(); rebuildClientSelect(); loadFormFromClient(); UI.toast('Data imported successfully', 'success');
      } catch (err) { UI.toast('Invalid JSON file', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
  
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 's': e.preventDefault(); saveFormToClient(); UI.toast('Saved', 'success'); break;
        case 'g': e.preventDefault(); saveFormToClient(); showPage('report'); break;
        case 'p': e.preventDefault(); downloadPDF(); break;
        case '1': e.preventDefault(); showPage('input'); break;
        case '2': e.preventDefault(); showPage('report'); break;
      }
    }
    if (e.key === 'Escape') { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }
  });
  
  // Strategic toggles on report page
  $('wcIntentional')?.addEventListener('change', e => {
    const c = getClient();
    if (c) {
      c.inputs.WC_INTENTIONAL = e.target.value;
      saveData();
      if (State.currentReport) {
        State.currentReport.health.wcIntentional = e.target.value === 'yes';
        UI.renderHealthSection(State.currentReport, State.thresholds);
      }
    }
  });
  
  $('apStrategic')?.addEventListener('change', e => {
    const c = getClient();
    if (c) {
      c.inputs.AP_STRATEGIC = e.target.value;
      saveData();
      if (State.currentReport) {
        State.currentReport.health.apStrategic = e.target.value === 'yes';
        UI.renderHealthSection(State.currentReport, State.thresholds);
        renderHealthCharts(State.currentReport);
      }
    }
  });
  
  // Save Priority Actions and Next Steps via custom events
  window.addEventListener('savePriorityActions', e => {
    const c = getClient();
    if (c) {
      c.inputs.customPriorityActions = e.detail;
      saveData();
    }
  });
  
  window.addEventListener('saveNextSteps', e => {
    const c = getClient();
    if (c) {
      c.inputs.customNextSteps = e.detail;
      saveData();
    }
  });

  // Cost breakdown toggle
  // Auto-sum VC breakdown → inputVC
  const vcBreakdownIds = ['inputDM', 'inputDL', 'inputPKG', 'inputOVC'];
  const updateVCTotal = () => {
    const sum = vcBreakdownIds.reduce((s, fid) => s + Finance.toNum($(fid)?.value?.replace(/,/g, '') || 0), 0);
    const el = $('inputVC');
    if (el) el.value = formatIndian(String(sum));
    // Trigger autosave
    saveFormToClient();
  };
  vcBreakdownIds.forEach(id => { const el = $(id); if (el) el.addEventListener('input', updateVCTotal); });

  // Auto-sum FC breakdown → inputFC
  const fcBreakdownIds = ['inputRent', 'inputSal', 'inputUtil', 'inputMktg', 'inputAdmin'];
  const updateFCTotal = () => {
    const sum = fcBreakdownIds.reduce((s, fid) => s + Finance.toNum($(fid)?.value?.replace(/,/g, '') || 0), 0);
    const el = $('inputFC');
    if (el) el.value = formatIndian(String(sum));
    saveFormToClient();
  };
  fcBreakdownIds.forEach(id => { const el = $(id); if (el) el.addEventListener('input', updateFCTotal); });
};

// === Prior Period Modal ===
const openPriorPeriodModal = () => {
  const c = getClient();
  if (!c) return;
  const existing = c.inputs?.priorPeriods || [];
  if (existing.length >= 3) { UI.toast('Maximum 3 prior periods allowed', 'info'); return; }
  
  const num = existing.length + 1;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content modal-lg" style="max-height: 90vh; overflow-y: auto;">
      <div class="modal-header"><div class="h">Prior Month ${num} Data</div><button class="modal-close" id="closePriorModal">&times;</button></div>
      <div class="modal-body">
        <p class="muted small mb12">Enter the same data as current period but for a previous month. This enables comprehensive trend analysis across all metrics.</p>
        
        <div class="h sub">Business Performance</div>
        <div class="prior-modal-grid mt8">
          <div><label>Period (months)</label><input id="ppM" value="1" type="number"></div>
          <div><label>Sales (₹)</label><input id="ppR" placeholder="Sales"></div>
          <div><label>Variable Costs (₹)</label><input id="ppVC" placeholder="Variable Costs"></div>
          <div><label>Fixed Costs (₹)</label><input id="ppFC" placeholder="Fixed Costs"></div>
          <div><label>Purchases (₹)</label><input id="ppPUR" placeholder="Purchases"></div>
          <div><label>Interest (₹)</label><input id="ppINT" placeholder="0"></div>
        </div>
        
        <div class="h sub mt14">Balance Sheet (that month)</div>
        <div class="prior-modal-grid mt8">
          <div><label>Cash</label><input id="ppCash" placeholder="Cash"></div>
          <div><label>Inventory</label><input id="ppInv" placeholder="Inventory"></div>
          <div><label>Receivables</label><input id="ppAR" placeholder="Receivables"></div>
          <div><label>Payables</label><input id="ppAP" placeholder="Payables"></div>
          <div><label>Short-term Debt</label><input id="ppSTB" placeholder="0"></div>
          <div><label>Long-term Debt</label><input id="ppLTB" placeholder="0"></div>
          <div><label>Equity</label><input id="ppEQ" placeholder="Equity"></div>
        </div>
        
        <div class="h sub mt14">Receivables Ageing</div>
        <div class="prior-modal-grid mt8">
          <div><label>0-30 days (₹)</label><input id="ppAR030" placeholder="0"></div>
          <div><label>31-60 days (₹)</label><input id="ppAR3160" placeholder="0"></div>
          <div><label>61-90 days (₹)</label><input id="ppAR6190" placeholder="0"></div>
          <div><label>90+ days (₹)</label><input id="ppAR90" placeholder="0"></div>
        </div>
        
        <div class="h sub mt14">Payables Ageing</div>
        <div class="prior-modal-grid mt8">
          <div><label>0-30 days (₹)</label><input id="ppAP030" placeholder="0"></div>
          <div><label>31-60 days (₹)</label><input id="ppAP3160" placeholder="0"></div>
          <div><label>61-90 days (₹)</label><input id="ppAP6190" placeholder="0"></div>
          <div><label>90+ days (₹)</label><input id="ppAP90" placeholder="0"></div>
        </div>
        
        <div class="h sub mt14">Customer Concentration</div>
        <div class="prior-modal-grid mt8">
          <div><label>Top Customer %</label><input id="ppTopCust" placeholder="0" type="number"></div>
          <div><label>Top 3 Customers %</label><input id="ppTop3Cust" placeholder="0" type="number"></div>
        </div>
        
        <div class="h sub mt14">Supplier Concentration</div>
        <div class="prior-modal-grid mt8">
          <div><label>Top Supplier %</label><input id="ppTopSupp" placeholder="0" type="number"></div>
          <div><label>Top 3 Suppliers %</label><input id="ppTop3Supp" placeholder="0" type="number"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="cancelPrior">Cancel</button>
        <button class="btn" id="savePrior">💾 Save Period</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  const close = () => modal.remove();
  modal.querySelector('#closePriorModal').addEventListener('click', close);
  modal.querySelector('.modal-backdrop').addEventListener('click', close);
  modal.querySelector('#cancelPrior').addEventListener('click', close);
  modal.querySelector('#savePrior').addEventListener('click', () => {
    const pp = {
      M: Finance.toNum(modal.querySelector('#ppM').value) || 1,
      R: Finance.toNum(modal.querySelector('#ppR').value),
      VC: Finance.toNum(modal.querySelector('#ppVC').value),
      FC: Finance.toNum(modal.querySelector('#ppFC').value),
      PUR: Finance.toNum(modal.querySelector('#ppPUR').value),
      INT: Finance.toNum(modal.querySelector('#ppINT').value),
      bsCash: Finance.toNum(modal.querySelector('#ppCash').value),
      bsInv: Finance.toNum(modal.querySelector('#ppInv').value),
      bsAR: Finance.toNum(modal.querySelector('#ppAR').value),
      bsAP: Finance.toNum(modal.querySelector('#ppAP').value),
      bsSTB: Finance.toNum(modal.querySelector('#ppSTB').value),
      bsLTB: Finance.toNum(modal.querySelector('#ppLTB').value),
      bsEQ: Finance.toNum(modal.querySelector('#ppEQ').value),
      // AR Ageing
      ar030: Finance.toNum(modal.querySelector('#ppAR030').value),
      ar3160: Finance.toNum(modal.querySelector('#ppAR3160').value),
      ar6190: Finance.toNum(modal.querySelector('#ppAR6190').value),
      ar90: Finance.toNum(modal.querySelector('#ppAR90').value),
      // AP Ageing  
      ap030: Finance.toNum(modal.querySelector('#ppAP030').value),
      ap3160: Finance.toNum(modal.querySelector('#ppAP3160').value),
      ap6190: Finance.toNum(modal.querySelector('#ppAP6190').value),
      ap90: Finance.toNum(modal.querySelector('#ppAP90').value),
      // Concentration
      topCust: Finance.toNum(modal.querySelector('#ppTopCust').value),
      top3Cust: Finance.toNum(modal.querySelector('#ppTop3Cust').value),
      topSupp: Finance.toNum(modal.querySelector('#ppTopSupp').value),
      top3Supp: Finance.toNum(modal.querySelector('#ppTop3Supp').value)
    };
    if (pp.R <= 0) { UI.toast('Sales is required', 'error'); return; }
    if (!c.inputs.priorPeriods) c.inputs.priorPeriods = [];
    c.inputs.priorPeriods.push(pp);
    saveData();
    renderPriorPeriodChips();
    close();
    UI.toast('Prior period ' + (c.inputs.priorPeriods.length) + ' added', 'success');
  });
};

const openEditPriorPeriodModal = (idx) => {
  const c = getClient();
  if (!c || !c.inputs.priorPeriods || !c.inputs.priorPeriods[idx]) return;
  const p = c.inputs.priorPeriods[idx];
  const name = p.periodName || ('Period ' + (idx + 1));

  const existing = $('editPriorModal');
  if (existing) existing.remove();

  const editFields = [
    { key: 'periodName', label: 'Period Name', val: name },
    { key: 'R', label: 'Sales (Rs)', val: p.R || '' },
    { key: 'VC', label: 'Variable Costs (Rs)', val: p.VC || '' },
    { key: 'FC', label: 'Fixed Costs (Rs)', val: p.FC || '' },
    { key: 'PUR', label: 'Purchases (Rs)', val: p.PUR || '' },
    { key: 'INT', label: 'Interest (Rs)', val: p.INT || '' },
    { key: 'bsCash', label: 'Cash (Rs)', val: p.bsCash || '' },
    { key: 'bsInv', label: 'Inventory (Rs)', val: p.bsInv || '' },
    { key: 'bsAR', label: 'Receivables (Rs)', val: p.bsAR || '' },
    { key: 'bsAP', label: 'Payables (Rs)', val: p.bsAP || '' },
    { key: 'bsSTB', label: 'Short-term Debt (Rs)', val: p.bsSTB || '' },
    { key: 'bsLTB', label: 'Long-term Debt (Rs)', val: p.bsLTB || '' },
    { key: 'bsEQ', label: 'Equity (Rs)', val: p.bsEQ || '' },
    { key: 'realisableFA', label: 'Realisable FA (Rs)', val: p.realisableFA || '' }
  ];

  const modal = document.createElement('div');
  modal.id = 'editPriorModal';
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.innerHTML = '<div class="modal-backdrop"></div>' +
    '<div class="modal-content modal-md">' +
    '<div class="modal-header"><div class="h">Edit Period: ' + escapeHtml(name) + '</div><button class="modal-close" id="closeEditPrior">&times;</button></div>' +
    '<div class="modal-body"><div class="edit-prior-grid">' +
    editFields.map(f => '<div class="edit-prior-field"><label>' + escapeHtml(f.label) + '</label><input id="ep_' + f.key + '" value="' + escapeHtml(String(f.val)) + '"></div>').join('') +
    '</div></div>' +
    '<div class="modal-footer"><button class="btn btn-ghost" id="cancelEditPrior">Cancel</button><button class="btn" id="saveEditPrior">Save Changes</button></div>' +
    '</div>';

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  $('closeEditPrior').addEventListener('click', closeModal);
  $('cancelEditPrior').addEventListener('click', closeModal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

  $('saveEditPrior').addEventListener('click', () => {
    editFields.forEach(f => {
      const el = $('ep_' + f.key);
      if (!el) return;
      const val = el.value.replace(/,/g, '').trim();
      if (f.key === 'periodName') {
        c.inputs.priorPeriods[idx].periodName = val || name;
      } else {
        c.inputs.priorPeriods[idx][f.key] = val;
      }
    });
    saveData();
    renderPriorPeriodChips();
    closeModal();
    UI.toast('Period updated', 'success');
  });
};

const renderPriorPeriodChips = () => {
  const c = getClient();
  if (!c) return;
  const periods = c.inputs?.priorPeriods || [];
  const container = $('priorPeriodChips');
  if (!container) return;
  if (periods.length === 0) { container.innerHTML = ''; return; }

  container.innerHTML = periods.map((p, i) => {
    const name = p.periodName || ('Period ' + (i + 1));
    return '<div class="prior-chip" data-idx="' + i + '">' +
      '<span class="prior-chip-grip" title="Drag to reorder">⋮⋮</span>' +
      '<span class="prior-chip-name">' + escapeHtml(name) + '</span>' +
      '<button class="prior-chip-btn" data-action="up" data-idx="' + i + '" title="Move up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button class="prior-chip-btn" data-action="down" data-idx="' + i + '" title="Move down"' + (i === periods.length - 1 ? ' disabled' : '') + '>↓</button>' +
      '<button class="prior-chip-btn" data-action="edit" data-idx="' + i + '" title="Edit period data">✎</button>' +
      '<button class="prior-chip-btn prior-chip-delete" data-action="delete" data-idx="' + i + '" title="Delete">×</button>' +
      '</div>';
  }).join('');

  container.querySelectorAll('.prior-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const action = btn.dataset.action;
      const c = getClient();
      if (!c || !c.inputs.priorPeriods) return;
      const arr = c.inputs.priorPeriods;

      if (action === 'delete') {
        if (!confirm('Delete this period?')) return;
        arr.splice(idx, 1);
        saveData();
        renderPriorPeriodChips();
      } else if (action === 'up' && idx > 0) {
        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
        saveData();
        renderPriorPeriodChips();
      } else if (action === 'down' && idx < arr.length - 1) {
        [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
        saveData();
        renderPriorPeriodChips();
      } else if (action === 'edit') {
        openEditPriorPeriodModal(idx);
      }
    });
  });
};

const init = () => {
  UI.showLoading(true, 'Starting BizLens...');
  
  setTimeout(() => {
    try {
      checkLibraries();
      loadData();
      rebuildClientSelect();
      loadFormFromClient();
      setupEventListeners();
      toggleAgeingBoxes();
      updateSavedScenariosUI();
      showPage('input');
      UI.showLoading(false);
    } catch (e) {
      console.error('Init error:', e);
      UI.toast('Initialization failed: ' + e.message, 'error');
      UI.showLoading(false);
    }
  }, 100);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
