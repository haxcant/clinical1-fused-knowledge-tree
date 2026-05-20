/* pivot_analysis_module_v3.js
 * Full-library pivot/bar analysis module. Reads pivot_analysis_payload.json.
 * It does not depend on quiz system; when row is clicked it emits clinical1:pivot-row-selected.
 */
(function(global){
  const byId = (id) => document.getElementById(id);
  const zhType = {
    formula:'方劑', pattern:'證型', disease:'病證', diagnostic_feature:'症狀／線索', diagnostic:'診斷概念', herb:'藥物', knowledge_item:'知識點', chapter_topic:'章節主題'
  };
  const metricLabels = {
    weighted_score:'加權分數', total_question_count:'總題數', answer_question_count:'正解題數', distractor_question_count:'干擾題數', stem_question_count:'題幹題數',
    question_count:'題數', event_count:'事件數', period_count:'出現期數', coverage_rate:'覆蓋率', exam_count:'出現考卷數', co_count:'共現題數', pair_question_count:'同題鑑別數', edge_count:'關係數'
  };
  function fmt(x){
    if (x === null || x === undefined || x === '') return '';
    if (!isNaN(Number(x))) return Number(x).toLocaleString(undefined, {maximumFractionDigits: 4});
    return String(x);
  }
  function option(label, value){ return `<option value="${value}">${label}</option>`; }
  function unique(arr){ return [...new Set(arr.filter(x => x !== null && x !== undefined && x !== ''))]; }

  class PivotAnalysis {
    constructor(root, payload){
      this.root = typeof root === 'string' ? document.querySelector(root) : root;
      this.payload = payload;
      this.state = { view:'hotspots', dataset_key:'formula_all', metric:'weighted_score', entity_type:'ALL', book_id:'ALL', position:'ALL', limit:25, sort:'value_desc' };
      this.renderShell();
      this.bind();
      this.refresh();
    }
    renderShell(){
      const p = this.payload;
      this.root.innerHTML = `
        <section class="pivot-shell">
          <div class="pivot-head">
            <div>
              <h1>臨床一樞紐分析 v3</h1>
              <p>資料來源：Phase J formal analysis v2 + fused master v3。考題系統維持外掛，不在此模組內混合。</p>
            </div>
            <div class="pivot-badges">
              <span>官方題 ${fmt(p.metadata.official_questions)}</span>
              <span>全檢索題 ${fmt(p.metadata.all_search_questions)}</span>
              <span>事件 ${fmt(p.metadata.event_rows)}</span>
            </div>
          </div>
          <div class="pivot-controls">
            <label>分析頁籤<select id="pa-view">
              ${option('熱點排行', 'hotspots')}
              ${option('考題位置樞紐', 'event_pivot')}
              ${option('各書題量／資料量', 'book_heat')}
              ${option('章節／主題熱度', 'section_heat')}
              ${option('類方干擾鑑別', 'differentiation')}
              ${option('覆蓋率 ROI', 'coverage')}
              ${option('109前後趨勢（進階描述）', 'trend')}
              ${option('穩定核心', 'stable')}
              ${option('共現關係', 'cooccurrence')}
            </select></label>
            <label id="dataset-box">資料集<select id="pa-dataset">
              ${option('方劑熱點｜全官方', 'formula_all')}
              ${option('證型熱點｜全官方', 'pattern_all')}
              ${option('病證熱點｜全官方', 'disease_all')}
              ${option('症狀線索熱點｜全官方', 'symptom_all')}
              ${option('方劑熱點｜臨床一', 'formula_clinical1')}
              ${option('證型熱點｜臨床一', 'pattern_clinical1')}
              ${option('病證熱點｜臨床一', 'disease_clinical1')}
              ${option('症狀線索熱點｜臨床一', 'symptom_clinical1')}
            </select></label>
            <label id="metric-box">指標<select id="pa-metric">
              ${option('加權分數', 'weighted_score')}
              ${option('總題數', 'total_question_count')}
              ${option('正解題數', 'answer_question_count')}
              ${option('干擾題數', 'distractor_question_count')}
              ${option('題幹題數', 'stem_question_count')}
              ${option('出現期數', 'period_count')}
            </select></label>
            <label id="book-box">書本<select id="pa-book"><option value="ALL">全部</option>${(p.books||[]).map(b=>option(b.book_name||b.book_id,b.book_id)).join('')}</select></label>
            <label id="etype-box">類型<select id="pa-etype"><option value="ALL">全部</option>${(p.ui_defaults.available_entity_types||[]).map(t=>option(zhType[t]||t,t)).join('')}</select></label>
            <label id="pos-box">位置<select id="pa-pos"><option value="ALL">全部</option>${option('正解','answer')}${option('干擾','distractor')}${option('題幹','stem')}${option('來源註記','source_note')}</select></label>
            <label>排序<select id="pa-sort"><option value="value_desc">數值高到低</option><option value="value_asc">數值低到高</option><option value="name">名稱排序</option></select></label><label>顯示筆數<select id="pa-limit"><option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="300">300</option><option value="500">500</option><option value="all">全部資料</option></select></label>
          </div>
          <div id="pa-note" class="pivot-note"></div><div id="pa-formula" class="metric-help"></div>
          <div id="pa-chart"></div>
          <div id="pa-table" class="pivot-table-wrap"></div>
        </section>`;
    }
    bind(){
      for (const [id,key] of [['pa-view','view'],['pa-dataset','dataset_key'],['pa-metric','metric'],['pa-book','book_id'],['pa-etype','entity_type'],['pa-pos','position'],['pa-sort','sort']]){
        const el = byId(id); if (el) el.addEventListener('change', e => { this.state[key]=e.target.value; this.refresh(); });
      }
      byId('pa-limit').addEventListener('change', e => { this.state.limit = e.target.value==='all' ? Infinity : Math.max(5, Number(e.target.value)||25); this.refresh(); });
    }
    getRows(){
      const ds = this.payload.datasets;
      const s = this.state;
      let rows=[], labelKey='canonical_name', valueKey=s.metric, note='';
      if (s.view === 'hotspots'){
        rows = (ds.hotspots||[]).filter(r=>r.dataset_key===s.dataset_key);
        rows.sort((a,b)=>Number(b[s.metric]||0)-Number(a[s.metric]||0));
        note = '熱點數字直接來自 Phase J formal analysis v2；正解／干擾／題幹分開計數。';
      } else if (s.view === 'event_pivot'){
        rows = (ds.event_pivot_top||[]).filter(r => (s.book_id==='ALL'||r.book_id===s.book_id) && (s.entity_type==='ALL'||r.canonical_entity_type===s.entity_type) && (s.position==='ALL'||r.location_standard===s.position));
        valueKey = 'weighted_score';
        rows.sort((a,b)=>Number(b.weighted_score||0)-Number(a.weighted_score||0));
        note = '由 fused question_entity_events_v3 重算，可依書本、entity type、正解／干擾／題幹切換。';
      } else if (s.view === 'book_heat'){
        rows = (ds.book_heat||[]).filter(r => r.question_layer === 'ALL');
        labelKey = 'book_name'; valueKey = 'question_count';
        rows.sort((a,b)=>Number(b.question_count||0)-Number(a.question_count||0));
        note = '各書／資料來源題量分布，用於檢查題庫覆蓋與來源結構。';
      } else if (s.view === 'section_heat'){
        rows = (ds.section_heat_top||[]).filter(r => s.book_id==='ALL'||r.source_book===s.book_id);
        labelKey = 'source_name'; valueKey = 'edge_count';
        rows.sort((a,b)=>Number(b.edge_count||0)-Number(a.edge_count||0));
        note = '章節／主題熱度由 cross-book relation graph 中的章節、題目與表格關係彙整。';
      } else if (s.view === 'differentiation'){
        rows = ds.formula_differentiation_top||[]; labelKey = 'answer_formula_name'; valueKey = 'pair_question_count';
        rows = rows.map(r=>Object.assign({}, r, {display_name: `${r.answer_formula_name} vs ${r.distractor_formula_name}`})); labelKey='display_name';
        note = '類方鑑別為 answer formula vs distractor formula，同題出現不等於醫理必然關係。';
      } else if (s.view === 'coverage'){
        rows = ds.coverage_roi||[]; labelKey='top_entities_preview'; valueKey='coverage_rate';
        note = '覆蓋率只代表題目中出現相關節點，不等於答對率。';
      } else if (s.view === 'trend'){
        rows = ds.trend_109_top||[]; labelKey='canonical_name'; valueKey='rate_diff_new_minus_old';
        rows.sort((a,b)=>Math.abs(Number(b.rate_diff_new_minus_old||0))-Math.abs(Number(a.rate_diff_new_minus_old||0)));
        note = '109前後趨勢只作進階描述：受題庫年份、章節覆蓋與標註方式影響，不建議放在一般考生主流程；若 q 值未顯著，不宣稱升溫或退潮。';
      } else if (s.view === 'stable'){
        rows = ds.stable_core||[]; labelKey='canonical_name'; valueKey='exam_count';
        rows.sort((a,b)=>Number(b.exam_count||0)-Number(a.exam_count||0));
        note = '穩定核心使用 period_count / current_streak / gap，適合讀書優先順序，不是押題保證。';
      } else if (s.view === 'cooccurrence'){
        rows = ds.cooccurrence_official_top||[]; labelKey='entity_a_name'; valueKey='co_count';
        rows = rows.map(r=>Object.assign({}, r, {display_name: `${r.entity_a_name} ↔ ${r.entity_b_name}`})); labelKey='display_name';
        note = '共現為同題共同出現，已與 explicit relation 分離，不當作醫理必然關係。';
      }
      return {rows, labelKey, valueKey, note};
    }
    applySort(rows,labelKey,valueKey){
      const s=this.state;
      if(s.sort==='value_asc') rows.sort((a,b)=>Number(a[valueKey]||0)-Number(b[valueKey]||0));
      else if(s.sort==='name') rows.sort((a,b)=>String(a[labelKey]||'').localeCompare(String(b[labelKey]||''),'zh-Hant'));
      else rows.sort((a,b)=>Number(b[valueKey]||0)-Number(a[valueKey]||0));
      return rows;
    }
    metricFormula(valueKey){
      const map={weighted_score:'加權分數＝正解×3 + 干擾×1.5 + 題幹×1。用於讀書優先順序，不等於答對率。',total_question_count:'總題數＝該節點出現在官方題目的不重複題數。',answer_question_count:'正解題數＝該節點作為正解或答案概念出現的題數。',distractor_question_count:'干擾題數＝該節點作為選項干擾項出現的題數。',stem_question_count:'題幹題數＝該節點作為題幹線索出現的題數。',coverage_rate:'覆蓋率＝選定清單可覆蓋的官方題比例；不是命中率或押題率。',rate_diff_new_minus_old:'109 後比率－109 前比率；顯著性需看 Fisher + BH-FDR q 值。',exam_count:'出現考卷數／期數，用於穩定核心判斷。',co_count:'共現題數＝兩節點同題出現；不代表醫理必然。',pair_question_count:'同題鑑別數＝某方為正解而另一方為干擾的題數。'};
      return map[valueKey]||'此指標來自 Phase J / fused v3，請以資料來源與欄位定義解讀。';
    }
    refresh(){
      const s=this.state;
      byId('dataset-box').style.display = s.view==='hotspots' ? '' : 'none';
      byId('metric-box').style.display = s.view==='hotspots' ? '' : 'none';
      byId('book-box').style.display = ['event_pivot','section_heat'].includes(s.view) ? '' : 'none';
      byId('etype-box').style.display = s.view==='event_pivot' ? '' : 'none';
      byId('pos-box').style.display = s.view==='event_pivot' ? '' : 'none';
      const {rows,labelKey,valueKey,note} = this.getRows();
      byId('pa-note').textContent = note;
      this.applySort(rows,labelKey,valueKey); byId('pa-formula').innerHTML = `<b>計算公式／解讀：</b>${this.metricFormula(valueKey)}<div class="sort-hint">目前排序：${this.state.sort==='name'?'名稱排序':this.state.sort==='value_asc'?'數值低到高':'數值高到低'}</div>`; const limited = Number.isFinite(this.state.limit) ? rows.slice(0, this.state.limit) : rows;
      Clinical1BarChart.render(byId('pa-chart'), limited, { labelKey, valueKey, limit:Number.isFinite(this.state.limit)?this.state.limit:limited.length, title: metricLabels[valueKey] || valueKey, onRowClick:(row)=>this.emitRow(row)});
      this.renderTable(limited, labelKey, valueKey);
    }
    emitRow(row){
      window.dispatchEvent(new CustomEvent('clinical1:pivot-row-selected', {detail: row}));
    }
    renderTable(rows, labelKey, valueKey){
      const cols = this.pickCols(rows, labelKey, valueKey);
      const th = cols.map(c=>`<th>${c.label}</th>`).join('');
      const trs = rows.map(r=>`<tr>${cols.map(c=>`<td>${fmt(r[c.key])}</td>`).join('')}</tr>`).join('');
      byId('pa-table').innerHTML = `<table class="pivot-table"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
    }
    pickCols(rows,labelKey,valueKey){
      const base=[{key:labelKey,label:'名稱'}, {key:valueKey,label:metricLabels[valueKey]||valueKey}];
      const optional=['canonical_entity_type','scope','book_id','location_standard','question_count','answer_question_count','distractor_question_count','stem_question_count','period_count','q_value_bh_all','old_rate','new_rate','coverage_rate','current_streak','gap_since_last_exam_units'];
      for (const k of optional){ if (rows.some(r=>r[k]!==undefined && r[k]!==null && r[k]!=='')) base.push({key:k,label:metricLabels[k]||k}); }
      return base.slice(0,10);
    }
  }
  async function mount(selector, payloadUrl='data/pivot_analysis_payload.json'){
    if (payloadUrl && typeof payloadUrl === 'object') payloadUrl = payloadUrl.payloadUrl || 'data/pivot_analysis_payload.json';
    const res = await fetch(payloadUrl);
    const payload = await res.json();
    return new PivotAnalysis(selector, payload);
  }
  global.Clinical1PivotAnalysis = { mount, PivotAnalysis };
})(window);
