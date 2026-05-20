/* bar_chart_module_v3.js
 * Lightweight dependency-free horizontal bar chart for Clinical1 pivot modules.
 */
(function(global){
  function fmt(x){
    if (x === null || x === undefined || isNaN(Number(x))) return '';
    const n = Number(x);
    if (Math.abs(n) >= 1000) return n.toLocaleString();
    if (Math.abs(n) >= 10) return String(Math.round(n * 10) / 10);
    return String(Math.round(n * 1000) / 1000);
  }
  function render(container, rows, options={}){
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    const labelKey = options.labelKey || 'canonical_name';
    const valueKey = options.valueKey || 'weighted_score';
    const subLabelKey = options.subLabelKey || '';
    const limit = options.limit || 25;
    const title = options.title || '';
    const data = (rows || []).slice(0, limit).filter(r => Number(r[valueKey] || 0) > 0);
    const max = Math.max(1, ...data.map(r => Number(r[valueKey] || 0)));
    el.innerHTML = `
      <div class="c1-chart-card">
        ${title ? `<div class="c1-chart-title">${title}</div>` : ''}
        <div class="c1-bars"></div>
      </div>`;
    const wrap = el.querySelector('.c1-bars');
    if (!data.length){ wrap.innerHTML = '<div class="c1-empty">沒有可顯示資料</div>'; return; }
    for (const r of data){
      const pct = Math.max(2, Math.round(Number(r[valueKey] || 0) / max * 100));
      const row = document.createElement('div');
      row.className = 'c1-bar-row';
      row.innerHTML = `
        <div class="c1-bar-label" title="${String(r[labelKey]||'')}">${r[labelKey] || '(未命名)'}</div>
        <div class="c1-bar-track"><div class="c1-bar-fill" style="width:${pct}%"></div></div>
        <div class="c1-bar-value">${fmt(r[valueKey])}</div>
        ${subLabelKey ? `<div class="c1-bar-sub">${r[subLabelKey] || ''}</div>` : ''}`;
      if (options.onRowClick){
        row.classList.add('clickable');
        row.addEventListener('click', () => options.onRowClick(r));
      }
      wrap.appendChild(row);
    }
  }
  global.Clinical1BarChart = { render };
})(window);
