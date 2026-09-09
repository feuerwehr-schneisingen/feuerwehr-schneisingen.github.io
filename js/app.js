let allData = null;
let chart = null;
let airConsumptionChart = null;
let overallTimeChart = null;
let bpChart = null;
let pulseChart = null;
let pulsoxyChart = null;
let comparisonCharts = {};

const comparisonDivIds = ['comparisonTest1', 'comparisonTest2', 'comparisonTest3', 'comparisonTest4', 'comparisonTest5', 'comparisonGesamtzeit', 'comparisonLuftverbrauch'];
const testNames = ['Gehen mit/ohne Schläuche', 'Hindernisparcours', 'Gehen mit Kanistern', 'Treppensteigen', 'Schlauchrollen'];

const PASSWORD_HASH = 'c9ee2cd36e45c21d63b0dad2a2aa7654cedaa0ee254505347e04ca070acf6b5e';
const LOGIN_SESSION_KEY = 'fw_login';

function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', data).then(buf => {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  });
}

function isLoggedIn() {
  return sessionStorage.getItem(LOGIN_SESSION_KEY) === '1';
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appContent').style.display = 'none';
  document.getElementById('loginError').style.display = 'none';
  const input = document.getElementById('loginPassword');
  input.value = '';
  input.focus();
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContent').style.display = '';
}

function attemptLogin() {
  const input = document.getElementById('loginPassword');
  const pw = input.value;
  sha256Hex(pw).then(hash => {
    if (hash === PASSWORD_HASH) {
      sessionStorage.setItem(LOGIN_SESSION_KEY, '1');
      document.getElementById('loginError').style.display = 'none';
      showApp();
      if (!allData) {
        loadData();
      }
    } else {
      document.getElementById('loginError').style.display = '';
      input.value = '';
      input.focus();
    }
  });
}

function logout() {
  sessionStorage.removeItem(LOGIN_SESSION_KEY);
  showLoginScreen();
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function isMobile() {
  return window.innerWidth < 768;
}

function applyResponsiveLayout(layout) {
  if (!isMobile()) return;
  const small = window.innerWidth < 480;
  layout.font = layout.font || {};
  layout.legend = layout.legend || {};
  layout.legend.font = Object.assign({}, layout.legend.font, { size: 10 });
  layout.xaxis = layout.xaxis || {};
  layout.yaxis = layout.yaxis || {};
  Object.assign(layout.xaxis, {
    tickfont: Object.assign({}, layout.xaxis.tickfont, { size: 11 }),
    tickangle: small ? -35 : -20
  });
  if (layout.xaxis.title) {
    layout.xaxis.title.font = Object.assign({}, layout.xaxis.title.font, { size: 12 });
  }
  Object.assign(layout.yaxis, {
    tickfont: Object.assign({}, layout.yaxis.tickfont, { size: 11 })
  });
  if (layout.yaxis.title) {
    layout.yaxis.title.font = Object.assign({}, layout.yaxis.title.font, { size: 12 });
  }
  if (layout.title && layout.title.font) {
    layout.title.font.size = small ? 14 : 15;
  }
  if (layout.margin) {
    Object.assign(layout.margin, { r: 12, l: 46, t: 55, b: 60 });
  }
}

async function loadData() {
  try {
    const response = await fetch('data/results.json');
    if (!response.ok) throw new Error('Failed to load data');
    allData = await response.json();
    populateMemberSelect();
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Fehler beim Laden der Daten: ' + error.message);
  }
}

function populateMemberSelect() {
  const select = document.getElementById('memberSelect');

  const alleOption = document.createElement('option');
  alleOption.value = 'alle';
  alleOption.textContent = 'Alle';
  select.appendChild(alleOption);

  allData.members.forEach((member, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = member.name;
    select.appendChild(option);
  });

  select.addEventListener('change', (e) => {
    const value = e.target.value;
    if (value === 'alle') {
      showComparisonView();
    } else {
      const memberIndex = parseInt(value);
      if (!isNaN(memberIndex)) {
        hideComparisonView();
        renderChart(memberIndex);
        renderOverallTimeChart(memberIndex);
        renderAirConsumptionChart(memberIndex);
        renderBpChart(memberIndex);
        renderPulseChart(memberIndex);
        renderPulsoxyChart(memberIndex);
        document.getElementById('statsRow').style.display = 'flex';
        document.getElementById('medicalStatsRow').style.display = 'flex';
        updateStats(memberIndex);
      }
    }
  });
}

function showComparisonView() {
  document.getElementById('yearSelectRow').style.display = 'flex';
  document.getElementById('comparisonSection').style.display = 'block';
  document.getElementById('memberChartsSection').style.display = 'none';
  document.getElementById('statsRow').style.display = 'none';
  document.getElementById('medicalStatsRow').style.display = 'none';
  document.querySelectorAll('.card').forEach(card => {
    const header = card.querySelector('.card-header h5');
    if (header && header.textContent.trim() === 'Medizinische Daten') {
      card.style.display = 'none';
    }
  });
  populateYearSelect();
}

function hideComparisonView() {
  document.getElementById('yearSelectRow').style.display = 'none';
  document.getElementById('comparisonSection').style.display = 'none';
  document.getElementById('memberChartsSection').style.display = '';
  document.querySelectorAll('.card').forEach(card => {
    const header = card.querySelector('.card-header h5');
    if (header && header.textContent.trim() === 'Medizinische Daten') {
      card.style.display = '';
    }
  });
  clearComparisonCharts();
}

function populateYearSelect() {
  const select = document.getElementById('yearSelect');
  const years = new Set();
  allData.members.forEach(member => {
    Object.keys(member.years).forEach(yr => years.add(yr));
  });
  const sortedYears = [...years].sort();

  select.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Jahr auswählen --';
  defaultOption.selected = true;
  defaultOption.disabled = true;
  select.appendChild(defaultOption);

  sortedYears.forEach(yr => {
    const option = document.createElement('option');
    option.value = yr;
    option.textContent = yr;
    select.appendChild(option);
  });

  select.onchange = () => {
    if (select.value) {
      renderAllComparisonCharts(select.value);
    }
  };
}

function renderAllComparisonCharts(year) {
  for (let i = 0; i < 5; i++) {
    renderComparisonTestChart(i, year);
  }
  renderComparisonGesamtzeit(year);
  renderComparisonLuftverbrauch(year);
}

function getMembersForYear(year) {
  return allData.members
    .filter(member => member.years[year])
    .map(member => ({
      name: member.name,
      data: member.years[year]
    }));
}

function buildComparisonLayout(titleText, yTitle, tickFormat, range) {
  const layout = {
    title: {
      text: titleText,
      font: { size: 16, color: '#212529', family: 'system-ui' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      title: { text: '', font: { size: 14 } },
      tickfont: { size: 12 },
      gridcolor: '#e9ecef',
      linecolor: '#dee2e6',
      type: 'category'
    },
    yaxis: {
      title: { text: yTitle, font: { size: 14 } },
      tickfont: { size: 13 },
      gridcolor: '#e9ecef',
      linecolor: '#dee2e6',
      rangemode: 'tozero'
    },
    legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'center', x: 0.5, font: { size: 11 } },
    margin: { t: 60, r: 30, b: 90, l: 70 },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    dragmode: false
  };

  if (tickFormat) {
    layout.yaxis.tickvals = tickFormat.tickvals;
    layout.yaxis.ticktext = tickFormat.ticktext;
  }
  if (range) {
    layout.yaxis.range = range;
  }
  return layout;
}

const comparisonConfig = {
  responsive: true,
  displayModeBar: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'resetScale2d'],
  displaylogo: false,
  locale: 'de'
};

const comparisonBarColors = ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f'];

function renderComparisonTestChart(testIndex, year) {
  const divId = `comparisonTest${testIndex + 1}`;
  const members = getMembersForYear(year);

  const xVals = members.map(m => m.name);
  const yVals = members.map(m => m.data.time_tests[testIndex]);

  const trace = {
    x: xVals,
    y: yVals,
    type: 'bar',
    marker: {
      color: members.map((_, i) => comparisonBarColors[i % comparisonBarColors.length]),
      line: { width: 1, color: 'rgba(0,0,0,0.1)' }
    },
    hovertemplate: `<b>%{x}</b><br>${testNames[testIndex]}: %{customdata}<extra></extra>`,
    customdata: yVals.map(v => formatTime(v)),
    hoverlabel: { bgcolor: 'white', bordercolor: '#dee2e6', font: { size: 12, family: 'system-ui' } }
  };

  const layout = buildComparisonLayout(`${testNames[testIndex]} - ${year}`, 'Zeit [min]', {
    tickvals: [0, 60, 120, 180, 240, 300],
    ticktext: ['0:00', '1:00', '2:00', '3:00', '4:00', '5:00']
  });

  plotComparison(divId, [trace], layout);
}

function renderComparisonLuftverbrauch(year) {
  const divId = 'comparisonLuftverbrauch';
  const members = getMembersForYear(year);

  const xVals = members.map(m => m.name);
  const yVals = members.map(m => m.data.air_consumption);

  const trace = {
    x: xVals,
    y: yVals,
    type: 'bar',
    marker: {
      color: members.map((_, i) => comparisonBarColors[i % comparisonBarColors.length]),
      line: { width: 1, color: 'rgba(0,0,0,0.1)' }
    },
    hovertemplate: '<b>%{x}</b><br>Luftverbrauch: %{y} bar<extra></extra>'
  };

  const layout = buildComparisonLayout(`Luftverbrauch - ${year}`, 'Druck [bar]');
  plotComparison(divId, [trace], layout);
}

function renderComparisonGesamtzeit(year) {
  const divId = 'comparisonGesamtzeit';
  const members = getMembersForYear(year);

  const xVals = members.map(m => m.name);
  const yVals = members.map(m => m.data.time_overall / 60);

  const trace = {
    x: xVals,
    y: yVals,
    type: 'bar',
    marker: {
      color: members.map((_, i) => comparisonBarColors[i % comparisonBarColors.length]),
      line: { width: 1, color: 'rgba(0,0,0,0.1)' }
    },
    hovertemplate: '<b>%{x}</b><br>Gesamtzeit: %{y} min<extra></extra>'
  };

  const layout = buildComparisonLayout(`Gesamtzeit - ${year}`, 'Zeit [min]');
  plotComparison(divId, [trace], layout);
}

function plotComparison(divId, traces, layout) {
  applyResponsiveLayout(layout);
  if (comparisonCharts[divId]) {
    Plotly.react(divId, traces, layout, comparisonConfig);
  } else {
    Plotly.newPlot(divId, traces, layout, comparisonConfig).then(() => {
      comparisonCharts[divId] = document.getElementById(divId);
    });
  }
}

function clearComparisonCharts() {
  comparisonDivIds.forEach(divId => {
    const div = document.getElementById(divId);
    if (div) {
      div.innerHTML = '';
      div.style.height = '300px';
    }
  });
  comparisonCharts = {};
}

function renderChart(memberIndex) {
  const member = allData.members[memberIndex];
  const years = Object.keys(member.years).sort();
  const numTests = 5;
  const testLabels = testNames;

  const traces = [];

  // Pastel1 color palette (9 colors)
  const pastel1Colors = ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec', '#f2f2f2'];

  years.forEach((year, yearIdx) => {
    const yValues = Array.from({ length: numTests }, (_, i) => member.years[year].time_tests[i]);

    traces.push({
      x: testLabels,
      y: yValues,
      name: year,
      type: 'bar',
      marker: {
        color: pastel1Colors[yearIdx % pastel1Colors.length],
        line: {
          width: 1,
          color: 'rgba(0,0,0,0.1)'
        }
      },
      hovertemplate: `<b>%{fullData.name}</b><br>Zeit: %{customdata}<extra></extra>`,
      customdata: yValues.map(v => formatTime(v)),
      hoverlabel: {
        bgcolor: pastel1Colors[yearIdx % pastel1Colors.length]
      }
    });
  });

  const layout = {
    barmode: 'group',
    bargap: 0.15,
    bargroupgap: 0.05,
    title: {
      text: `Testergebnisse - ${member.name}`,
      font: { size: 18, color: '#212529', family: 'system-ui' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      type: 'category'
    },
    yaxis: {
      title: { text: 'Zeit [min]', font: { size: 14 } },
      tickfont: { size: 13 },
      gridcolor: '#e9ecef',
      linecolor: '#dee2e6',
      tickformat: '.1f',
      hoverformat: '.1f',
      rangemode: 'tozero',
      tickvals: [0, 60, 120, 180, 240, 300],
      ticktext: ['0:00', '1:00', '2:00', '3:00', '4:00', '5:00']
    },
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'center',
      x: 0.5,
      font: { size: 12 },
      tracegroupgap: 10
    },
    margin: { t: 80, r: 30, b: 60, l: 70 },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: 'white',
      bordercolor: '#dee2e6',
      font: { size: 12, family: 'system-ui' }
    },
    dragmode: false
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'resetScale2d'],
    displaylogo: false,
    locale: 'de'
  };

  applyResponsiveLayout(layout);

  if (chart) {
    Plotly.react('chart', traces, layout, config);
  } else {
    Plotly.newPlot('chart', traces, layout, config).then(() => {
      chart = document.getElementById('chart');
    });
  }
}

function renderAirConsumptionChart(memberIndex) {
  const member = allData.members[memberIndex];
  const years = Object.keys(member.years).sort();

  const traces = [{
    x: years,
    y: years.map(y => member.years[y].air_consumption),
    name: 'Luftverbrauch',
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#6a51a3', width: 3 },
    marker: { size: 8, color: '#6a51a3', symbol: 'circle' },
    hovertemplate: '<b>%{x}</b><br>Luftverbrauch: %{y} bar<extra></extra>'
  }];

  const layout = {
    title: {
      text: `Luftverbrauch - ${member.name}`,
      font: { size: 16, color: '#212529', family: 'system-ui' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      title: { text: 'Jahr', font: { size: 14 } },
      tickfont: { size: 13 },
      gridcolor: '#e9ecef',
      linecolor: '#dee2e6',
      type: 'category'
    },
    yaxis: {
      title: { text: 'Druck [bar]', font: { size: 14 } },
      tickfont: { size: 13 },
      gridcolor: '#e9ecef',
      linecolor: '#dee2e6',
      rangemode: 'tozero'
    },
    legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'center', x: 0.5, font: { size: 11 } },
    margin: { t: 60, r: 30, b: 60, l: 70 },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    hovermode: 'x unified',
    hoverlabel: { bgcolor: 'white', bordercolor: '#dee2e6', font: { size: 12, family: 'system-ui' } },
    dragmode: false
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'resetScale2d'],
    displaylogo: false,
    locale: 'de'
  };

  applyResponsiveLayout(layout);

  if (airConsumptionChart) {
    Plotly.react('airConsumptionChart', traces, layout, config);
  } else {
    Plotly.newPlot('airConsumptionChart', traces, layout, config).then(() => {
      airConsumptionChart = document.getElementById('airConsumptionChart');
    });
  }
}

function renderOverallTimeChart(memberIndex) {
  const member = allData.members[memberIndex];
  const years = Object.keys(member.years).sort();

  const traces = [{
    x: years,
    y: years.map(y => member.years[y].time_overall / 60),
    name: 'Gesamtzeit',
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#2c7fb8', width: 3 },
    marker: { size: 8, color: '#2c7fb8', symbol: 'circle' },
    hovertemplate: '<b>%{x}</b><br>Gesamtzeit: %{y} min<extra></extra>'
  }];

  const layout = {
    title: {
      text: `Gesamtzeit - ${member.name}`,
      font: { size: 16, color: '#212529', family: 'system-ui' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      title: { text: 'Jahr', font: { size: 14 } },
      tickfont: { size: 13 },
      gridcolor: '#e9ecef',
      linecolor: '#dee2e6',
      type: 'category'
    },
    yaxis: {
      title: { text: 'Zeit [min]', font: { size: 14 } },
      tickfont: { size: 13 },
      gridcolor: '#e9ecef',
      linecolor: '#dee2e6',
      rangemode: 'tozero'
    },
    legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'center', x: 0.5, font: { size: 11 } },
    margin: { t: 60, r: 30, b: 60, l: 70 },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    hovermode: 'x unified',
    hoverlabel: { bgcolor: 'white', bordercolor: '#dee2e6', font: { size: 12, family: 'system-ui' } },
    dragmode: false
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'resetScale2d'],
    displaylogo: false,
    locale: 'de'
  };

  applyResponsiveLayout(layout);

  if (overallTimeChart) {
    Plotly.react('overallTimeChart', traces, layout, config);
  } else {
    Plotly.newPlot('overallTimeChart', traces, layout, config).then(() => {
      overallTimeChart = document.getElementById('overallTimeChart');
    });
  }
}

function renderBpChart(memberIndex) {
  const member = allData.members[memberIndex];
  const years = Object.keys(member.years).sort();

  const colors = {
    lowBefore: '#b3cde3',
    highBefore: '#fbb4ae',
    lowAfter: '#b3cde3',
    highAfter: '#fbb4ae'
  };

  const traces = [
    {
      x: years,
      y: years.map(y => member.years[y].health?.bp_before?.low).filter(v => v !== undefined),
      name: 'Start (DIA)',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: colors.lowBefore, width: 2 },
      marker: { size: 8, color: colors.lowBefore },
      hovertemplate: '<b>%{x}</b><br>Start (DIA): %{y} mmHg<extra></extra>'
    },
    {
      x: years,
      y: years.map(y => member.years[y].health?.bp_before?.high).filter(v => v !== undefined),
      name: 'Start (SYS)',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: colors.highBefore, width: 2 },
      marker: { size: 8, color: colors.highBefore },
      hovertemplate: '<b>%{x}</b><br>Start (SYS): %{y} mmHg<extra></extra>'
    },
    {
      x: years,
      y: years.map(y => member.years[y].health?.bp_after?.low).filter(v => v !== undefined),
      name: 'Ende (DIA)',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: colors.lowAfter, width: 2, dash: 'dot' },
      marker: { size: 8, color: colors.lowAfter, symbol: 'circle' },
      hovertemplate: '<b>%{x}</b><br>Ende (DIA): %{y} mmHg<extra></extra>'
    },
    {
      x: years,
      y: years.map(y => member.years[y].health?.bp_after?.high).filter(v => v !== undefined),
      name: 'Ende (SYS)',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: colors.highAfter, width: 2, dash: 'dot' },
      marker: { size: 8, color: colors.highAfter, symbol: 'circle' },
      hovertemplate: '<b>%{x}</b><br>Ende (SYS): %{y} mmHg<extra></extra>'
    }
  ];

  const layout = {
    title: {
      text: `Blutdruck - ${member.name}`,
      font: { size: 16, color: '#212529', family: 'system-ui' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      title: { text: 'Jahr', font: { size: 14 } },
      tickfont: { size: 13 },
      gridcolor: '#e9ecef',
      linecolor: '#dee2e6',
      type: 'category'
    },
    yaxis: {
      title: { text: 'Blutdruck [mmHg]', font: { size: 14 } },
      tickfont: { size: 13 },
      gridcolor: '#e9ecef',
      linecolor: '#dee2e6',
      rangemode: 'tozero'
    },
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'center',
      x: 0.5,
      font: { size: 11 }
    },
    margin: { t: 60, r: 30, b: 60, l: 70 },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: 'white',
      bordercolor: '#dee2e6',
      font: { size: 12, family: 'system-ui' }
    },
    dragmode: false
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'resetScale2d'],
    displaylogo: false,
    locale: 'de'
  };

  applyResponsiveLayout(layout);

  if (bpChart) {
    Plotly.react('bpChart', traces, layout, config);
  } else {
    Plotly.newPlot('bpChart', traces, layout, config).then(() => {
      bpChart = document.getElementById('bpChart');
    });
  }
}

function renderPulseChart(memberIndex) {
  const member = allData.members[memberIndex];
  const years = Object.keys(member.years).sort();

  const colors = {
    before: '#b3cde3',
    load: '#fbb4ae',
    after: '#b3cde3'
  };

  const traces = [
    {
      x: years,
      y: years.map(y => member.years[y].health?.pulse?.before).filter(v => v !== undefined),
      name: 'Start',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: colors.before, width: 2 },
      marker: { size: 8, color: colors.before, symbol: 'circle' },
      hovertemplate: '<b>%{x}</b><br>Start: %{y} bpm<extra></extra>'
    },
    {
      x: years,
      y: years.map(y => member.years[y].health?.pulse?.load).filter(v => v !== undefined),
      name: 'Puls Treppe',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: colors.load, width: 2 },
      marker: { size: 8, color: colors.load, symbol: 'circle' },
      hovertemplate: '<b>%{x}</b><br>Puls Treppe: %{y} bpm<extra></extra>'
    },
    {
      x: years,
      y: years.map(y => member.years[y].health?.pulse?.after).filter(v => v !== undefined),
      name: 'Ende',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: colors.after, width: 2, dash: 'dot' },
      marker: { size: 8, color: colors.after, symbol: 'circle' },
      hovertemplate: '<b>%{x}</b><br>Ende: %{y} bpm<extra></extra>'
    }
  ];

  const layout = {
    title: {
      text: `Puls - ${member.name}`,
      font: { size: 16, color: '#212529', family: 'system-ui' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      title: { text: 'Jahr', font: { size: 14 } },
      tickfont: { size: 13 },
      gridcolor: '#e9ecef',
      linecolor: '#dee2e6',
      type: 'category'
    },
    yaxis: {
      title: { text: 'Puls [bpm]', font: { size: 14 } },
      tickfont: { size: 13 },
      gridcolor: '#e9ecef',
      linecolor: '#dee2e6',
      rangemode: 'tozero'
    },
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'center',
      x: 0.5,
      font: { size: 11 }
    },
    margin: { t: 60, r: 30, b: 60, l: 70 },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: 'white',
      bordercolor: '#dee2e6',
      font: { size: 12, family: 'system-ui' }
    },
    dragmode: false
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'resetScale2d'],
    displaylogo: false,
    locale: 'de'
  };

  applyResponsiveLayout(layout);

  if (pulseChart) {
    Plotly.react('pulseChart', traces, layout, config);
  } else {
    Plotly.newPlot('pulseChart', traces, layout, config).then(() => {
      pulseChart = document.getElementById('pulseChart');
    });
  }
}

function renderPulsoxyChart(memberIndex) {
  const member = allData.members[memberIndex];
  const years = Object.keys(member.years).sort();

  const traces = [
    {
      x: years,
      y: years.map(y => member.years[y].health?.pulsoxy).filter(v => v !== undefined),
      name: 'SpO₂',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#5cb85c', width: 3 },
      marker: { size: 8, color: '#5cb85c', symbol: 'circle' },
      hovertemplate: '<b>%{x}</b><br>SpO₂: %{y}%<extra></extra>'
    }
  ];

  const layout = {
    title: {
      text: `O₂-Sättigung - ${member.name}`,
      font: { size: 16, color: '#212529', family: 'system-ui' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      title: { text: 'Jahr', font: { size: 14 } },
      tickfont: { size: 13 },
      gridcolor: '#e9ecef',
      linecolor: '#dee2e6',
      type: 'category'
    },
    yaxis: {
      title: { text: 'O₂-Sättigung [%]', font: { size: 14 } },
      tickfont: { size: 13 },
      gridcolor: '#e9ecef',
      linecolor: '#dee2e6',
      range: [90, 100]
    },
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'center',
      x: 0.5,
      font: { size: 11 }
    },
    margin: { t: 60, r: 30, b: 60, l: 70 },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: 'white',
      bordercolor: '#dee2e6',
      font: { size: 12, family: 'system-ui' }
    },
    dragmode: false
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'resetScale2d'],
    displaylogo: false,
    locale: 'de'
  };

  applyResponsiveLayout(layout);

  if (pulsoxyChart) {
    Plotly.react('pulsoxyChart', traces, layout, config);
  } else {
    Plotly.newPlot('pulsoxyChart', traces, layout, config).then(() => {
      pulsoxyChart = document.getElementById('pulsoxyChart');
    });
  }
}

function updateStats(memberIndex) {
  const member = allData.members[memberIndex];
  const years = Object.keys(member.years).sort();

  const totalTests = years.length;

  const overallTimes = years.map(y => member.years[y].time_overall);
  const avgOverallTime = overallTimes.reduce((a, b) => a + b, 0) / overallTimes.length;

  const airConsumptions = years.map(y => member.years[y].air_consumption);
  const avgAir = airConsumptions.reduce((a, b) => a + b, 0) / airConsumptions.length;

  const changes = [];
  for (let i = 1; i < years.length; i++) {
    const prev = member.years[years[i - 1]].time_tests;
    const curr = member.years[years[i]].time_tests;
    prev.forEach((p, tIdx) => {
      if (p > 0 && curr[tIdx] !== undefined) {
        changes.push(((p - curr[tIdx]) / p) * 100);
      }
    });
  }
  const avgChange = changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;

  document.getElementById('statTotalTests').textContent = totalTests;
  document.getElementById('statAvgTime').textContent = formatTime(Math.round(avgOverallTime));
  document.getElementById('statBestTime').textContent = `${avgAir.toFixed(1)} bar`;

  const changeEl = document.getElementById('statWorstTime');
  changeEl.textContent = `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(1)} %`;
  changeEl.style.color = avgChange >= 0 ? '#2e7d32' : '#c62828';

  // Health metrics averages
  const healthYears = years.filter(y => member.years[y].health);
  if (healthYears.length > 0) {
    const bpBeforeLow = healthYears.map(y => member.years[y].health.bp_before.low);
    const bpBeforeHigh = healthYears.map(y => member.years[y].health.bp_before.high);
    const bpAfterLow = healthYears.map(y => member.years[y].health.bp_after.low);
    const bpAfterHigh = healthYears.map(y => member.years[y].health.bp_after.high);
    const pulseBefore = healthYears.map(y => member.years[y].health.pulse.before);
    const pulseLoad = healthYears.map(y => member.years[y].health.pulse.load);
    const pulseAfter = healthYears.map(y => member.years[y].health.pulse.after);
    const pulsoxy = healthYears.map(y => member.years[y].health.pulsoxy);

    const avgBpBeforeLow = Math.round(bpBeforeLow.reduce((a, b) => a + b, 0) / bpBeforeLow.length);
    const avgBpBeforeHigh = Math.round(bpBeforeHigh.reduce((a, b) => a + b, 0) / bpBeforeHigh.length);
    const avgBpAfterLow = Math.round(bpAfterLow.reduce((a, b) => a + b, 0) / bpAfterLow.length);
    const avgBpAfterHigh = Math.round(bpAfterHigh.reduce((a, b) => a + b, 0) / bpAfterHigh.length);
    const avgPulseBefore = Math.round(pulseBefore.reduce((a, b) => a + b, 0) / pulseBefore.length);
    const avgPulseLoad = Math.round(pulseLoad.reduce((a, b) => a + b, 0) / pulseLoad.length);
    const avgPulseAfter = Math.round(pulseAfter.reduce((a, b) => a + b, 0) / pulseAfter.length);
    const avgPulsoxy = Math.round(pulsoxy.reduce((a, b) => a + b, 0) / pulsoxy.length);

    document.getElementById('statAvgBpBefore').textContent = `${avgBpBeforeHigh}/${avgBpBeforeLow}`;
    document.getElementById('statAvgBpAfter').textContent = `${avgBpAfterHigh}/${avgBpAfterLow}`;
    document.getElementById('statAvgPulseBefore').textContent = avgPulseBefore;
    document.getElementById('statAvgPulseLoad').textContent = avgPulseLoad;
    document.getElementById('statAvgPulseAfter').textContent = avgPulseAfter;
    document.getElementById('statAvgPulsoxy').textContent = `${avgPulsoxy}%`;
  } else {
    document.getElementById('statAvgBpBefore').textContent = 'N/A';
    document.getElementById('statAvgBpAfter').textContent = 'N/A';
    document.getElementById('statAvgPulseBefore').textContent = 'N/A';
    document.getElementById('statAvgPulseLoad').textContent = 'N/A';
    document.getElementById('statAvgPulseAfter').textContent = 'N/A';
    document.getElementById('statAvgPulsoxy').textContent = 'N/A';
  }
}

function showError(message) {
  const chartDiv = document.getElementById('chart');
  chartDiv.innerHTML = `
    <div class="alert alert-danger d-flex align-items-center" role="alert" style="height: 100%; justify-content: center;">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>${message}
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginBtn').addEventListener('click', attemptLogin);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      attemptLogin();
    }
  });

  if (isLoggedIn()) {
    showApp();
    loadData();
  } else {
    showLoginScreen();
  }
});

window.addEventListener('resize', () => {
  if (chart) {
    Plotly.Plots.resize(chart);
  }
  if (airConsumptionChart) {
    Plotly.Plots.resize(airConsumptionChart);
  }
  if (overallTimeChart) {
    Plotly.Plots.resize(overallTimeChart);
  }
  if (bpChart) {
    Plotly.Plots.resize(bpChart);
  }
  if (pulseChart) {
    Plotly.Plots.resize(pulseChart);
  }
  if (pulsoxyChart) {
    Plotly.Plots.resize(pulsoxyChart);
  }
  comparisonDivIds.forEach(divId => {
    if (comparisonCharts[divId]) {
      Plotly.Plots.resize(comparisonCharts[divId]);
    }
  });
});