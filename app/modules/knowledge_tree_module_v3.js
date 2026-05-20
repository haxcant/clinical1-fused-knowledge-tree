/* clinical1 knowledge tree UI module v5.6.9
 * Student-facing node-link upstream/downstream map with pan/zoom/fullscreen. Abstract high-dimensional charts are removed from the main student UI.
 */
(function(global){
  'use strict';
  const $ = (sel, root=document) => root.querySelector(sel);
  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const short = (s,n=80)=>{s=String(s??''); return s.length>n?s.slice(0,n-1)+'…':s;};
  const relLabel = r => ({
    explicit_structured_table:'結構表', explicit_clause:'條文', explicit_component:'組成', question_observation:'考題', inferred_support:'推論支持', cooccurrence:'共現', section_outline:'章節', taxonomy_variant_alias:'方族/別名', explicit_or_seed_relation:'考題/種子關係'
  }[r]||r||'關係');
  const typeLabel = t => ({
    outline:'綱目', disease:'病證', pattern:'證型', formula:'方劑', herb:'藥物', diagnostic_feature:'線索', question:'考題', section:'章節', source_doc:'來源', formula_authority_record:'官方方劑', official_source:'官方來源', unknown:'未知'
  }[t]||t||'未知');
  const relBucket = rel => {
    rel=String(rel||'').toLowerCase();
    if(/hierarchy|chapter|section|outline|contains/.test(rel)) return 'core';
    if(/formula|variant|component|herb|composition|方/.test(rel)) return 'formula';
    if(/symptom|feature|clue|support|diagnostic|evidence|pattern/.test(rel)) return 'clue';
    if(/question|exam|stem|option|answer|tested|考/.test(rel)) return 'exam';
    if(/cooc|same|alias|family|variant/.test(rel)) return 'association';
    return 'other';
  };
  const bucketLabel = b => ({core:'核心層',formula:'方劑/成分',clue:'診斷線索',exam:'考題層',association:'共現/別名',other:'其他'}[b]||b);

  const arrField = (v,k)=>{const x=v&&v[k]; if(Array.isArray(x))return x.filter(Boolean); if(!x)return []; return String(x).split(/[、,，；;|]/).map(s=>s.trim()).filter(Boolean);};
  const changeText = c=>{ if(!c)return ''; if(typeof c==='string')return c; const b=c.base_dose||c.base_processing||'原方'; const v=c.variant_dose||c.variant_processing||'變方'; return `${c.herb_name||''}（${b}→${v}）`; };
  const variantDeltaHtml = v=>{ const added=arrField(v,'added_herbs_computed_v4_6'), removed=arrField(v,'removed_herbs_computed_v4_6'), changed=Array.isArray(v.dose_or_processing_changes_v4_6)?v.dose_or_processing_changes_v4_6:[]; const rows=[]; if(added.length)rows.push(`<div class="kt-small"><b>加：</b>${added.map(x=>`<span class="kt-chip add">${esc(x)}</span>`).join('')}</div>`); if(removed.length)rows.push(`<div class="kt-small"><b>去：</b>${removed.map(x=>`<span class="kt-chip remove">${esc(x)}</span>`).join('')}</div>`); if(changed.length)rows.push(`<div class="kt-small"><b>劑量／炮製調整：</b>${changed.map(x=>`<span class="kt-chip dose">${esc(changeText(x))}</span>`).join('')}</div>`); return rows.length?`<div class="kt-variant-delta">${rows.join('')}</div>`:`<div class="kt-small kt-muted">未能由結構化組成判定明確加減，請看原文依據。</div>`; };
  const typeColor = t => ({
    outline:'#7a5c38', disease:'#a45f2b', pattern:'#2f6f62', formula:'#7c3f98', herb:'#57863b', diagnostic_feature:'#b88918', question:'#a83d4b', section:'#64748b', source_doc:'#94a3b8', formula_authority_record:'#0f766e', official_source:'#64748b'
  }[t]||'#6b7280');
  const sourceId = l => l.source_id || l.source || '';
  const targetId = l => l.target_id || l.target || '';

  class Clinical1KnowledgeTree{
    constructor(root, opts){
      this.root=root; this.opts=opts||{}; this.adapter=null;
      const initialView = this.opts.relationMode ? 'entity_center' : 'zhengzhi_sections';
      this.state={view:initialView, mode:'tree', selectedEntity:null, selectedNode:null, centerDepth:1, centerLimit:160, centerDirection:'both', activeGraphNode:null, graphClickTimer:null, graphLastFocusAt:0, graphLastFocusId:null, graphIsDragging:false};
    }
    async init(){
      this.adapter = this.opts.adapter || await global.Clinical1KnowledgeTreeAdapter.load(this.opts.payloadUrl||'data/knowledge_tree_payload_v3.json');
      this.renderShell(); this.bind(); this.renderTreeView(this.state.view);
      return this;
    }
    renderShell(){
      this.root.innerHTML = `<div class="kt-app"><header class="kt-header"><div class="kt-brand"><div class="kt-logo">樹</div><div><h1>臨床一融合知識樹 v5.6.9</h1><p>五本書 PDF 綱目／章節樹、節點中心網路與考題 scope 聯動。</p></div></div><div class="kt-tools"><input id="ktSearch" class="kt-input" style="width:280px" placeholder="搜尋節點，如 桂枝湯、氣分兼表、脈浮"><button id="ktSearchBtn" class="kt-btn primary">搜尋</button></div></header><div class="kt-shell"><aside class="kt-pane kt-left"><div class="kt-nav" id="ktViewBtns"></div><div id="ktTree" class="kt-tree"></div></aside><main class="kt-pane kt-main"><div id="ktMain"></div></main><aside class="kt-pane kt-right"><h2 class="kt-subtitle">節點細節／聯動</h2><div id="ktRight"><div class="kt-muted">點擊左側或搜尋結果。</div></div></aside></div></div>`;
      const mainViews = [
        ['shanghan_sections','傷寒綱目'],['jingui_sections','金匱綱目'],['wenbing_sections','溫病綱目'],['zhengzhi_sections','證治綱目'],['diagnosis_sections','診斷綱目']
      ];
      const centerBtn=this.opts.disableCenterView?'':`<button class="kt-btn" data-view="entity_center">節點中心／關係圖</button>`;
      $('#ktViewBtns',this.root).innerHTML = mainViews.map(([id,label])=>`<button class="kt-btn ${id===this.state.view?'active':''}" data-view="${esc(id)}">${esc(label)}</button>`).join('') + centerBtn;
    }
    bind(){
      this.root.addEventListener('click', e=>{
        const ov=e.target.closest('[data-kt-overview]'); if(ov){ e.preventDefault(); e.stopPropagation(); this.state.view='zhengzhi_sections'; this.setGraphOnly(false); this.renderTreeView(this.state.view); return; }
        const v=e.target.closest('[data-view]'); if(v){ e.preventDefault(); e.stopPropagation(); this.state.view=v.dataset.view; this.renderTreeView(this.state.view); return; }
        const fe=e.target.closest('[data-kt-focus-entity]'); if(fe){ e.preventDefault(); e.stopPropagation(); this.focusEntity(fe.dataset.ktFocusEntity); return; }
        const n=e.target.closest('[data-node-id]'); if(n){ e.preventDefault(); e.stopPropagation(); this.handleTreeNodeClick(n.dataset.nodeId); return; }
        const gnode=e.target.closest('.kt-map-node[data-graph-entity-id]'); if(gnode){ e.preventDefault(); e.stopPropagation(); this.handleGraphNodeClick(gnode.dataset.graphEntityId); return; }
        const ent=e.target.closest('[data-entity-id]'); if(ent){ e.preventDefault(); e.stopPropagation(); this.renderEntity(ent.dataset.entityId); return; }
        const quiz=e.target.closest('[data-quiz-scope]'); if(quiz){ e.preventDefault(); e.stopPropagation(); try{const s=this.parseScope(quiz.dataset.quizScope); this.requestQuiz(s);}catch(err){console.error(err)} return; }
        const preset=e.target.closest('[data-kt-preset]'); if(preset){ e.preventDefault(); e.stopPropagation(); const q=$('#ktSearch',this.root); const term=preset.dataset.ktPreset||''; if(q)q.value=term; const hit=(this.adapter.searchEntities(term,8)||[]).find(x=>x.id); if(hit)this.focusEntity(hit.id); else this.renderSearch(term); return; }
        const zoom=e.target.closest('[data-kt-zoom]'); if(zoom){ e.preventDefault(); e.stopPropagation(); this.graphZoom(zoom.dataset.ktZoom); return; }
        const fs=e.target.closest('[data-kt-fullscreen]'); if(fs){ e.preventDefault(); e.stopPropagation(); const box=fs.closest('.kt-network'); if(box?.requestFullscreen) box.requestFullscreen(); return; }
      });
      this.root.addEventListener('dblclick', e=>{
        const gnode=e.target.closest('.kt-map-node[data-graph-entity-id]');
        if(gnode){ e.preventDefault(); e.stopPropagation(); this.handleGraphNodeDblClick(gnode.dataset.graphEntityId); }
      });
      this.root.addEventListener('change', e=>{
        const el=e.target;
        if(el?.id==='ktCenterDepth'){ this.state.centerDepth=Number(el.value)||2; if(this.state.selectedEntity) this.renderEntity(this.state.selectedEntity); }
        if(el?.id==='ktCenterDirection'){ this.state.centerDirection=el.value||'both'; if(this.state.selectedEntity) this.renderEntity(this.state.selectedEntity); }
        if(el?.id==='ktCenterLimit'){ this.state.centerLimit=Number(el.value)||160; const inp=$('#ktCenterLimitInput',this.root); if(inp)inp.value=String(this.state.centerLimit); if(this.state.selectedEntity) this.renderEntity(this.state.selectedEntity); }
        if(el?.id==='ktCenterLimitInput'){ this.state.centerLimit=clamp(Number(el.value)||160,20,1200); if(this.state.selectedEntity) this.renderEntity(this.state.selectedEntity); }
      });
      this.root.addEventListener('input', e=>{ const el=e.target; if(el?.id==='ktCenterLimitInput'){ this.state.centerLimit=clamp(Number(el.value)||160,20,1200); } });
      $('#ktSearchBtn',this.root).addEventListener('click',()=>this.renderSearch($('#ktSearch',this.root).value));
      $('#ktSearch',this.root).addEventListener('keydown',e=>{ if(e.key==='Enter') this.renderSearch(e.target.value); });
      global.addEventListener('clinical1:quiz-scope-requested', e=>{
        const el=$('#ktRight',this.root); if(el) el.insertAdjacentHTML('afterbegin', `<div class="kt-card soft"><b>已送出題庫範圍</b><p class="kt-muted">題庫系統已收到目前節點／章節範圍。</p></div>`);
      });
      global.addEventListener('clinical1:tree-entity-focus', e=>{ const id=e.detail?.entity_id; if(id) this.focusEntity(id); });
    }
    parseScope(raw){
      if(!raw) return {};
      try{return JSON.parse(raw);}catch(_){return JSON.parse(decodeURIComponent(raw));}
    }
    setActiveViewButton(viewId){ this.root.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active', b.dataset.view===viewId)); }
    setGraphOnly(on){
      const app=this.root.querySelector('.kt-app');
      if(app) app.classList.toggle('kt-graph-only', !!on);
    }
    getDefaultCenterEntity(){
      // Default must be an actual formula node, not the source document node for 證治學.
      // Earlier builds checked source_doc before fuzzy search, so the graph could start from
      // the wrong high-level document node. Prefer exact formula-name hits first.
      const exactHit=(this.adapter.searchEntities('桂枝湯',12)||[]).find(x=>{
        const e=this.adapter.getEntity(x.id||x.entity_id||x.canonical_id);
        return e && e.type==='formula' && e.name==='桂枝湯';
      });
      if(exactHit) return exactHit.id||exactHit.entity_id||exactHit.canonical_id;
      const preferred=['can_2849adeebb','formula__桂枝湯','桂枝湯'];
      for(const id of preferred){ const e=this.adapter.getEntity(id); if(e) return e.id; }
      const hit=(this.adapter.searchEntities('桂枝湯',8)||[]).find(x=>x.id);
      if(hit) return hit.id;
      const any=Object.values(this.adapter.entities||{}).find(e=>e.type==='formula') || Object.values(this.adapter.entities||{})[0];
      return any?.id || null;
    }
    renderTreeView(viewId){
      if(this.opts.disableCenterView && (viewId==='entity_center'||viewId==='highdim_lab')) viewId=this.state.view&&this.state.view!=='entity_center'?this.state.view:'zhengzhi_sections';
      this.setActiveViewButton(viewId);
      this.setGraphOnly(viewId==='entity_center' || viewId==='highdim_lab');
      if(viewId==='entity_center'){
        $('#ktTree',this.root).innerHTML=this.renderCenterHelp();
        $('#ktRight',this.root).innerHTML=this.renderCenterControls();
        const id=this.state.selectedEntity || this.getDefaultCenterEntity();
        if(id){ this.renderEntity(id); }
        else { $('#ktMain',this.root).innerHTML='<h2 class="kt-title">節點中心網路</h2><div class="kt-card">目前資料庫沒有可繪製節點。</div>'; }
        return;
      }
      if(viewId==='highdim_lab'){
        this.state.view='entity_center';
        $('#ktTree',this.root).innerHTML=this.renderCenterHelp();
        $('#ktRight',this.root).innerHTML=this.renderCenterControls();
        const id=this.state.selectedEntity || this.getDefaultCenterEntity();
        if(id) this.renderEntity(id);
        return;
      }
      const tree=this.adapter.getTreeView(viewId);
      if(!tree){ $('#ktTree',this.root).innerHTML='<div class="kt-card">找不到此 view。</div>'; return; }
      $('#ktTree',this.root).innerHTML = this.renderTreeNodes(tree.children||[], 0);
      $('#ktMain',this.root).innerHTML = `<h2 class="kt-title">${esc(tree.label)}</h2><div class="kt-card soft"><p>此 view 以 PDF 目錄綱目為主：章、節、子目皆視為可出題範圍。點任一綱目會收集該節點與下層綱目的題目 ID，不再用空的 group 節點硬篩。</p></div>`;
      $('#ktRight',this.root).innerHTML = `<div class="kt-card"><b>${esc(tree.label)}</b><p class="kt-muted">支援章節／節點聯動；點擊節點後可送出該範圍考題。</p></div>`;
    }
    renderCenterHelp(){
      return `<div class="kt-card soft"><b>關係圖快速測試</b><p class="kt-muted">預設以桂枝湯為中心、展開 1 跳。單擊節點可高光相連路徑，再次單擊取消；雙擊節點則以該節點為中心重繪。圖可拖曳、滾輪縮放與全螢幕。</p><div class="kt-quiz-row"><button class="kt-btn" data-kt-overview>返回知識樹總覽</button><button class="kt-btn" data-kt-preset="桂枝湯">桂枝湯</button><button class="kt-btn" data-kt-preset="咳嗽">咳嗽</button><button class="kt-btn" data-kt-preset="痰熱鬱肺">痰熱鬱肺</button><button class="kt-btn" data-kt-preset="舌紅少苔">舌紅少苔</button></div></div>`;
    }
    renderCenterControls(){
      const lim=Number(this.state.centerLimit)||160;
      const opt=v=>`<option value="${v}" ${lim===v?'selected':''}>${v}</option>`;
      return `<div class="kt-card kt-graph-controls"><b>中心網路參數</b><label class="kt-control">深度<select id="ktCenterDepth"><option value="1" ${this.state.centerDepth===1?'selected':''}>1 跳</option><option value="2" ${this.state.centerDepth===2?'selected':''}>2 跳</option><option value="3" ${this.state.centerDepth===3?'selected':''}>3 跳</option><option value="4" ${this.state.centerDepth===4?'selected':''}>4 跳</option></select></label><label class="kt-control">方向<select id="ktCenterDirection"><option value="both" ${this.state.centerDirection==='both'?'selected':''}>上下游</option><option value="out" ${this.state.centerDirection==='out'?'selected':''}>只看下游</option><option value="in" ${this.state.centerDirection==='in'?'selected':''}>只看上游</option></select></label><label class="kt-control">節點上限<select id="ktCenterLimit">${[60,100,160,260,400,650,900].map(opt).join('')}</select></label><label class="kt-control">自訂上限<input id="ktCenterLimitInput" type="number" min="20" max="1200" step="20" value="${esc(lim)}"></label><p class="kt-muted">預設 1 跳、160 節點以降低延遲；需要更完整關聯時再提高上限或深度。</p></div>`;
    }
    renderTreeNodes(nodes, depth){
      if(!nodes || !nodes.length) return '';
      return `<ul>${nodes.map(n=>{const m=n.meta||{}; const qc=Number(m.question_count||0); const direct=Number(m.question_count_direct||0); const sc=Number(m.scope_question_count||0); const inherited=(!qc && sc && m.scope_scope_type==='nearest_nonempty_pdf_parent'); const empty=(!qc && !sc); const kind=[n.kind||'', qc?`題${qc}`:(inherited?`上層題${sc}`:(empty?'暫無題':'')), direct&&direct!==qc?`直${direct}`:''].filter(Boolean).join('｜'); return `<li><button class="kt-node ${empty?'kt-node-empty':''} ${inherited?'kt-node-inherited':''}" style="padding-left:${Math.min(depth*8+8,40)}px" data-node-id="${esc(n.id)}"><span>${esc(n.label)}</span><span class="kind">${esc(kind)}</span></button>${this.renderTreeNodes(n.children||[], depth+1)}</li>`;}).join('')}</ul>`;
    }
    findTreeNode(id, nodes){
      for(const n of nodes||[]){ if(n.id===id) return n; const x=this.findTreeNode(id,n.children); if(x) return x; }
      return null;
    }
    splitIds(v){ return String(v||'').split(/[；;|,，、]/).map(x=>x.trim()).filter(Boolean); }
    pushUnique(arr,v){ v=String(v||'').trim(); if(v&&!arr.includes(v))arr.push(v); }
    extractKeywords(text){
      return String(text||'').split(/[，,、；;。．.：:\s]+/).map(x=>x.replace(/[（）()【】「」『』]/g,'').trim()).filter(x=>x.length>=2&&x.length<=14&&/(病|證|汤|湯|散|丸|方|分類|溫|温|太陽|陽明|少陽|太陰|少陰|厥陰|桂枝|麻黃|柴胡|白虎|承氣|瀉心|真武|四逆|咳|痰|舌|脈)/.test(x));
    }
    scopeFromTreeNode(n){
      const acc={layer:'all', tree_scope:true, tree_node_id:n.id, tree_kind:n.kind, tree_label:n.label, tree_path:(n.meta||{}).path||n.label, section_ids:[], entity_ids:[], keywords:[], book_ids:[], source_pages:[], question_ids:[], question_ids_direct:[], question_markers:[]};
      const walk=(x)=>{
        if(!x)return; const m=x.meta||{};
        this.pushUnique(acc.keywords,x.label);
        this.pushUnique(acc.keywords,m.path);
        this.extractKeywords(m.sample_text).forEach(k=>this.pushUnique(acc.keywords,k));
        this.extractKeywords(m.symptoms).forEach(k=>this.pushUnique(acc.keywords,k));
        this.extractKeywords(m.evidence).forEach(k=>this.pushUnique(acc.keywords,k));
        if(m.book_id)this.pushUnique(acc.book_ids,m.book_id);
        if(m.source_pages)this.pushUnique(acc.source_pages,m.source_pages);
        if(m.source_page)this.pushUnique(acc.source_pages,m.source_page);
        if(m.section_id)this.pushUnique(acc.section_ids,m.section_id);
        const scopeIds = (Array.isArray(m.scope_question_ids)?m.scope_question_ids:this.splitIds(m.scope_question_ids));
        const ownIds = (Array.isArray(m.question_ids)?m.question_ids:this.splitIds(m.question_ids));
        (scopeIds.length ? scopeIds : ownIds).forEach(id=>this.pushUnique(acc.question_ids,id));
        (Array.isArray(m.question_ids_direct)?m.question_ids_direct:this.splitIds(m.question_ids_direct)).forEach(id=>this.pushUnique(acc.question_ids_direct,id));
        const scopeMarkers = (Array.isArray(m.scope_question_markers)?m.scope_question_markers:this.splitIds(m.scope_question_markers));
        (scopeMarkers.length ? scopeMarkers : (Array.isArray(m.question_markers)?m.question_markers:this.splitIds(m.question_markers))).forEach(id=>this.pushUnique(acc.question_markers,id));
        if(m.scope_scope_type==='nearest_nonempty_pdf_parent'){
          acc.scope_inherited_from_label = acc.scope_inherited_from_label || m.scope_inherited_from_label || '';
          acc.scope_inherited_from_path = acc.scope_inherited_from_path || m.scope_inherited_from_path || '';
        }
        if(m.pattern_id)this.pushUnique(acc.entity_ids,m.pattern_id);
        if(m.topic_entity_id)this.pushUnique(acc.entity_ids,m.topic_entity_id);
        if(m.state_entity_id)this.pushUnique(acc.entity_ids,m.state_entity_id);
        this.splitIds(m.formula_ids||m.linked_formula_ids).forEach(id=>this.pushUnique(acc.entity_ids,id));
        (x.children||[]).forEach(walk);
      };
      walk(n);
      if(acc.book_ids.length===1)acc.book_id=acc.book_ids[0];
      if(acc.section_ids.length===1)acc.section_id=acc.section_ids[0];
      if(acc.entity_ids.length===1)acc.entity_id=acc.entity_ids[0];
      if(acc.keywords.length>80)acc.keywords=acc.keywords.slice(0,80);
      acc.strict_question_ids=true;
      acc.pdf_toc_scope=true;
      acc.allow_keyword_fallback=false;
      if(acc.question_ids.length) acc.layer='all';
      acc.scope_note=acc.question_ids.length ? (acc.scope_inherited_from_label ? `此小標題沒有獨立題組，已沿用 PDF 上層綱目「${acc.scope_inherited_from_label}」共 ${acc.question_ids.length} 題；不使用關鍵字或全題庫 fallback。` : `此卷由知識樹 PDF 綱目「${n.label}」及其下層綱目直接帶入 ${acc.question_ids.length} 題；綱目是章節範圍，不是單一關鍵字。`) : `PDF 綱目「${n.label}」目前沒有可對應的題目 ID；系統不會改用關鍵字或全題庫硬出題。`;
      return acc;
    }
    handleTreeNodeClick(nodeId){
      const view=this.adapter.getTreeView(this.state.view); const n=this.findTreeNode(nodeId, view?view.children:[]); if(!n) return;
      this.root.querySelectorAll('.kt-node').forEach(b=>b.classList.toggle('active', b.dataset.nodeId===nodeId));
      const m=n.meta||{};
      const chips=[];
      if(m.formula_ids){ String(m.formula_ids).split(/[；;|,，]/).filter(Boolean).forEach(fid=>chips.push(`<button class="kt-btn" data-entity-id="${esc(fid)}">方劑 ${esc((this.adapter.getEntity(fid)||{}).name||fid)}</button>`)); }
      if(m.pattern_id) chips.push(`<button class="kt-btn" data-entity-id="${esc(m.pattern_id)}">證型節點</button>`);
      if(m.topic_entity_id) chips.push(`<button class="kt-btn" data-entity-id="${esc(m.topic_entity_id)}">病種節點</button>`);
      if(m.state_entity_id) chips.push(`<button class="kt-btn" data-entity-id="${esc(m.state_entity_id)}">分期節點</button>`);
      const scope=this.scopeFromTreeNode(n);
      const hasQuiz=Array.isArray(scope.question_ids)&&scope.question_ids.length>0;
      const quizBtn=hasQuiz?`<button class="kt-btn primary" data-quiz-scope="${encodeURIComponent(JSON.stringify(scope))}">用此 PDF 範圍出題</button>`:`<button class="kt-btn" disabled>此 PDF 範圍暫無題</button>`;
      const inheritNote=scope.scope_inherited_from_label?`<div class="kt-card soft"><b>小標題沿用上層題組</b><p class="kt-muted">此節點本身沒有獨立題組；依 PDF 綱目歸屬，會使用上層「${esc(scope.scope_inherited_from_label)}」的題目。</p></div>`:'';
      $('#ktMain',this.root).innerHTML = `<h2 class="kt-title">${esc(n.label)}</h2>${inheritNote}<div class="kt-card"><div class="kt-legend"><span class="kt-chip">${esc(n.kind)}</span>${m.book_id?`<span class="kt-chip">${esc(m.book_id)}</span>`:''}${m.source_page?`<span class="kt-chip">p.${esc(m.source_page)}</span>`:''}${m.clause_no?`<span class="kt-chip">條文 ${esc(m.clause_no)}</span>`:''}</div><div class="kt-detail-text">${esc(m.sample_text||m.symptoms||m.evidence||'')}</div>${m.treatment?`<p><b>治法：</b>${esc(m.treatment)}</p>`:''}${m.formulas?`<p><b>方劑：</b>${esc(m.formulas)}</p>`:''}${m.linked_formulas?`<p><b>連結方劑：</b>${esc(m.linked_formulas)}</p>`:''}<div class="kt-quiz-row">${chips.join('')}${quizBtn}</div></div>`;
      $('#ktRight',this.root).innerHTML = `<div class="kt-card soft kt-action-card"><b>目前節點</b><p>${esc(n.label)}</p><div class="kt-quiz-row">${quizBtn}<button class="kt-btn" data-kt-overview>返回總覽</button></div><div class="kt-muted">知識樹出題已改為 PDF 綱目題組；有題就用 question_ids 嚴格出題，沒有題就明確顯示暫無題，不再關鍵字亂篩。</div><div class="kt-stat-row"><span>章節 ${scope.section_ids?.length||0}</span><span>節點 ${scope.entity_ids?.length||0}</span><span>題目 ${scope.question_ids?.length||0}</span><span>關鍵句 ${scope.keywords?.length||0}</span></div></div>`;
    }
    renderSearch(q){
      const hits=this.adapter.searchEntities(q,60);
      const cards=hits.map(h=>{
        const id=h.id||h.entity_id||h.canonical_id||'';
        const ent=this.adapter.getEntity(id)||h;
        const isFormula=ent.type==='formula';
        const label=h.name||ent.name||id;
        return `<div class="kt-card kt-search-result"><b>${esc(label)}</b><div class="kt-small">${esc(typeLabel(ent.type||h.type))}｜score ${esc(h.score||'')}</div>${(h.aliases||ent.aliases||[]).slice(0,5).map(a=>`<span class="kt-chip">${esc(a)}</span>`).join('')}<div class="kt-quiz-row">${id?`<button class="kt-btn primary" data-kt-focus-entity="${esc(id)}">${isFormula?'以此方為中心':'以此節點為中心'}</button><button class="kt-btn" data-quiz-scope="${encodeURIComponent(JSON.stringify({entity_id:id,layer:'official_exam'}))}">出題</button>`:'<button class="kt-btn" disabled>缺少節點 id</button>'}</div></div>`;
      }).join('');
      const exact=(hits||[]).find(h=>String(h.name||'').trim()===String(q||'').trim());
      const exactId=exact&&(exact.id||exact.entity_id||exact.canonical_id);
      $('#ktMain',this.root).innerHTML = `<h2 class="kt-title">搜尋：${esc(q)}</h2>${exactId?`<div class="kt-card soft"><button class="kt-btn primary" data-kt-focus-entity="${esc(exactId)}">直接以「${esc(exact.name||q)}」為中心繪圖</button></div>`:''}<div class="kt-grid">${cards || '<div class="kt-card">沒有命中。</div>'}</div>`;
      $('#ktRight',this.root).innerHTML = this.renderCenterControls();
    }
    focusEntity(entityId){
      this.state.view='entity_center';
      this.state.selectedEntity=entityId;
      try{ window.__clinical1CurrentRelationEntity = entityId; }catch(_){ }
      this.setActiveViewButton('entity_center');
      this.renderEntity(entityId);
    }
    renderEntity(entityId){
      this.state.selectedEntity=entityId;
      const g=this.adapter.getEntityGraph(entityId,{limit:400});
      if(!g.entity){ $('#ktMain',this.root).innerHTML='<div class="kt-card">找不到節點。</div>'; return; }
      const e=g.entity; const entityQuiz={entity_id:entityId,layer:'official_exam'};
      let formulaBlock = ''; try{ formulaBlock = g.formula ? this.renderFormulaBlock(g.formula) : ''; }catch(err){ formulaBlock = `<div class="kt-card warn-box"><b>方劑本體區塊載入失敗</b><pre>${esc(err.stack||err.message||err)}</pre></div>`; console.error(err); }
      const centerData=this.adapter.getNeighborhood(entityId,{depth:this.state.centerDepth, limit:this.state.centerLimit, direction:this.state.centerDirection, includeCrossLinks:false});
      
      this.setGraphOnly(true);
      $('#ktTree',this.root).innerHTML = this.renderCenterHelp();
      $('#ktMain',this.root).innerHTML = `<div class="kt-graph-page-head"><h2 class="kt-title">${esc(e.name)}｜節點中心關係圖</h2><div class="kt-quiz-row"><button class="kt-btn primary" data-quiz-scope="${encodeURIComponent(JSON.stringify(entityQuiz))}">以此節點出題</button></div></div><div class="kt-network kt-network-big" id="ktNetwork"><div class="kt-card">準備繪製關係圖…</div></div><details class="kt-graph-details"><summary>節點摘要、方劑變體、關係邊與相關題目</summary>${this.renderStudentNodeSummary(entityId, e, g, centerData, entityQuiz)}${formulaBlock}<h3 class="kt-subtitle">關係邊明細</h3><div>${g.edges.slice(0,80).map(r=>this.renderEdge(r, entityId)).join('') || '<div class="kt-card">目前沒有關係邊索引。</div>'}</div><h3 class="kt-subtitle">相關題目</h3><div>${g.questions.map(q=>this.renderQuestionRef(q)).join('') || '<div class="kt-card">目前沒有題目索引。</div>'}</div></details>`;
      $('#ktRight',this.root).innerHTML = `${this.renderCenterControls()}<div class="kt-card kt-action-card"><b>節點中心</b><p>${esc(e.name)}</p><div class="kt-quiz-row"><button class="kt-btn primary" data-quiz-scope="${encodeURIComponent(JSON.stringify(entityQuiz))}">以此節點出題</button><button class="kt-btn" data-kt-overview>返回總覽</button></div><div class="kt-muted">關係圖中心會與目前節點同步；原始 JSON scope 已收起，避免干擾閱讀。</div></div>`;
      try{ this.drawNetwork(entityId, centerData); }catch(err){ const box=$('#ktNetwork',this.root); if(box)box.innerHTML=`<div class="kt-card warn-box"><b>關係圖繪製失敗</b><pre>${esc(err.stack||err.message||err)}</pre></div>`; console.error(err); }
    }
    renderFormulaIndicationBox(ind){
      if(!ind) return '';
      const trustChip = lvl => `<span class="kt-chip trust-${esc(lvl||'NA')}">${esc(lvl||'未標')}</span>`;
      const list = (xs, n=8) => Array.isArray(xs) ? xs.slice(0,n) : [];
      const summary = list(ind.summary, 5).map(x=>`<li>${esc(x)}</li>`).join('');
      const patterns = list(ind.target_patterns_or_diseases, 10).map(x=>{
        const text=x.name || x.text || x.label || '';
        const src=x.source || x.source_book || '';
        return `<span class="kt-chip">${trustChip(x.source_trust_level)} ${esc(text)}${src?`｜${esc(src)}`:''}</span>`;
      }).join('');
      const symptoms = list(ind.symptom_hints, 16).map(x=>`<span class="kt-chip clue">${trustChip(x.source_trust_level)} ${esc(x.name||x.text||'')}${x.official_cooccurrence_count!=null?` ×${esc(x.official_cooccurrence_count)}`:''}</span>`).join('');
      const clauseRows = (xs, title) => {
        xs=list(xs, 10);
        if(!xs.length) return '';
        return `<h5>${esc(title)}</h5>${xs.map(c=>`<div class="kt-edge formula-clause-row"><span class="kt-chip">${trustChip(c.source_trust_level)}</span><span class="kt-edge-type">${esc(c.source_book||'')}</span>${c.clause_no!=null?` 條文 ${esc(c.clause_no)}`:''}<div class="kt-detail-text">${esc(c.text||'')}</div>${Array.isArray(c.symptom_terms)&&c.symptom_terms.length?`<div>${c.symptom_terms.slice(0,10).map(t=>`<span class="kt-chip clue">${esc(t)}</span>`).join('')}</div>`:''}</div>`).join('')}`;
      };
      return `<div class="kt-card formula-indication-card"><h3 class="kt-subtitle">方證要點／適用症狀／對應條文</h3>${ind.display_policy?`<p class="kt-muted">${esc(ind.display_policy)}</p>`:''}${summary?`<ul class="kt-compact-list">${summary}</ul>`:''}${patterns?`<h5>相關證候／病證</h5><div class="kt-chip-row">${patterns}</div>`:''}${symptoms?`<h5>考場線索／症狀提示</h5><div class="kt-chip-row">${symptoms}</div>`:''}${clauseRows(ind.classic_clauses_primary,'對應條文')}${clauseRows(ind.classic_clauses_caution,'禁例／非適用條文')}${clauseRows(ind.classic_clauses_related,'相關條文')}${ind.source_trust_note?`<details><summary>來源等級說明</summary><p class="kt-muted">${esc(ind.source_trust_note)}</p></details>`:''}</div>`;
    }
    renderFormulaBlock(fb){
      const f=fb.formula||{}, fam=fb.family, vars=Array.isArray(fb.variants)?fb.variants:[];
      const famIds=Array.isArray(fam?.member_formula_ids)?fam.member_formula_ids:[];
      const famNames=Array.isArray(fam?.member_formula_names)?fam.member_formula_names:[];
      const indicationHtml=this.renderFormulaIndicationBox ? this.renderFormulaIndicationBox(f.indications_v5_6) : '';
      return `<div class="kt-card"><h3 class="kt-subtitle">方劑本體</h3><p><b>${esc(f.name||'')}</b> <span class="kt-chip">${esc(f.formula_type||'')}</span></p>${fam?`<p><b>方族：</b>${esc(fam.name)}｜成員 ${esc(fam.member_count)}</p><div>${famIds.slice(0,12).map((id,i)=>`<button class="kt-btn" data-entity-id="${esc(id)}">${esc(famNames[i]||id)}</button>`).join('')}</div>`:''}${indicationHtml}${vars.length?`<h4>加減／變方</h4>${vars.slice(0,12).map(v=>`<div class="kt-edge"><span class="kt-edge-type">${esc(v.relation_type||v.relation_type_normalized||'加減／變方')}</span> ${esc(v.base_formula_name||'')} ↔ ${esc(v.variant_formula_name||v.target_formula_name||'')}${variantDeltaHtml(v)}<div class="kt-small">${esc(v.evidence||v.evidence_text||'')}</div></div>`).join('')}`:''}</div>`;
    }
    renderEdge(r, center){
      const other = r.source_id===center ? {id:r.target_id,name:r.target_name,type:r.target_type,dir:'→'} : {id:r.source_id,name:r.source_name,type:r.source_type,dir:'←'};
      const isEntity = (r.source_id===center ? r.target_kind : r.source_kind)==='entity';
      return `<div class="kt-edge"><span class="kt-chip">${esc(relLabel(r.evidence_class))}</span> <span class="kt-edge-type">${esc(r.relation_type)}</span> ${esc(other.dir)} ${isEntity?`<button class="kt-btn" data-entity-id="${esc(other.id)}">${esc(other.name)}</button>`:esc(other.name)} <div class="kt-small">${esc(r.source_book)}｜${esc(r.confidence_label)}｜${esc(r.evidence_preview||'')}</div></div>`;
    }
    renderQuestionRef(q){ const qq=q.question||{}; return `<div class="kt-card"><span class="kt-chip question">${esc(q.location)}</span> ${esc(qq.period||q.period)}-${esc(qq.subject||q.subject)}-${esc(qq.no||q.no)} <b>${esc(qq.answer||qq.answer_label||'')}</b><div class="kt-small">${esc(qq.stem||qq.stem_preview||'')}</div></div>`; }
    relationText(l){ if(!l)return ''; return String(l.relation_type || l.relation || l.type || ''); }
    edgeTouchesCenter(l, centerId){ return sourceId(l)===centerId || targetId(l)===centerId; }
    directEdgeForNode(nodeId, centerId, links){
      return (links||[]).find(l => this.edgeTouchesCenter(l, centerId) && (sourceId(l)===nodeId || targetId(l)===nodeId)) || null;
    }
    nodeRole(node, centerId, links){
      if(!node || node.id===centerId) return 'center';
      const direct=this.directEdgeForNode(node.id, centerId, links);
      const rel=this.relationText(direct).toLowerCase();
      const t=String(node.type||'unknown');
      const incoming=direct && targetId(direct)===centerId;
      const outgoing=direct && sourceId(direct)===centerId;
      if(t==='question' || /question|exam|answer|distractor|option|stem|考/.test(rel)) return 'exam';
      if(/variant|family|alias|authority|official|differentiation/.test(rel)) return 'compare';
      if(t==='herb' || /component|composition|contains_herb|藥|herb/.test(rel)) return 'component';
      if(t==='diagnostic_feature' || /feature|symptom|clue|evidence|support|diagnostic|舌|脈|症/.test(rel)) return 'clue';
      if(t==='pattern' || t==='disease' || /pattern|disease|treats|uses_formula|證|病/.test(rel)) return incoming ? 'upstream' : 'clinical';
      if(t==='outline' || t==='section' || t==='source_doc' || /chapter|section|outline|source|contains/.test(rel)) return 'upstream';
      if(incoming && !outgoing) return 'upstream';
      if(outgoing && !incoming) return 'downstream';
      return Number(node._depth||0)<=1 ? 'downstream' : 'context';
    }
    summarizeRelation(node, centerId, links){
      const direct=this.directEdgeForNode(node.id, centerId, links);
      if(!direct) return `距中心 ${Number(node._depth||'?')} 跳`;
      const arrow=sourceId(direct)===centerId?'中心 → 此節點':'此節點 → 中心';
      return `${arrow}｜${relLabel(direct.evidence_class)}｜${this.relationText(direct)}`;
    }
    bucketNeighborhood(centerId, data){
      const nodes=(data.nodes||[]).filter(n=>n&&n.id);
      const links=(data.edges||data.links||[]).filter(Boolean);
      const center=this.adapter.getEntity(centerId)||nodes.find(n=>n.id===centerId)||{};
      const buckets={upstream:[],clinical:[],clue:[],component:[],compare:[],exam:[],downstream:[],context:[]};
      const seen=new Set([centerId]);
      const sorted=nodes.filter(n=>n.id!==centerId).sort((a,b)=>{
        const da=Number(a._depth||9), db=Number(b._depth||9);
        const qa=Number(a.question_count||0), qb=Number(b.question_count||0);
        return da-db || qb-qa || String(a.type||'').localeCompare(String(b.type||''),'zh-Hant') || String(a.name||'').localeCompare(String(b.name||''),'zh-Hant');
      });
      for(const n of sorted){
        if(seen.has(n.id)) continue;
        seen.add(n.id);
        const role=this.nodeRole(n, centerId, links);
        (buckets[role]||buckets.context).push(n);
      }
      const limits={upstream:16,clinical:16,clue:20,component:24,compare:16,exam:24,downstream:16,context:12};
      for(const k of Object.keys(buckets)) buckets[k]=buckets[k].slice(0,limits[k]||14);
      return {center,buckets,links,nodes};
    }
    renderStudentNodeSummary(entityId, e, g, data, entityQuiz){
      const qRows=this.adapter.questionsForNodes((data.nodes||[]).map(n=>n.id));
      const typeRows=this.adapter.computeHighDimStats(data).typeRows.slice(0,6);
      const formulaHint=g.formula?.family ? `<span class="kt-chip formula">方族：${esc(g.formula.family.name)}</span>` : '';
      return `<div class="kt-card soft kt-student-summary"><div><span class="kt-chip">${esc(typeLabel(e.type))}</span><span class="kt-chip question">直接題數 ${esc(e.question_count||0)}</span><span class="kt-chip">局部題目 ${esc(qRows.length)}</span><span class="kt-chip">in ${esc(e.relation_in||0)} / out ${esc(e.relation_out||0)}</span>${formulaHint}</div><p class="kt-muted">此區優先回答考生會問的問題：這個節點從哪裡來、連到哪些證型/線索/方劑/藥物、哪些考題會考、能不能用這群節點直接出題。抽象統計圖已移除，主畫面只保留上下游關係與可出題範圍。</p><div class="kt-quiz-row"><button class="kt-btn primary" data-quiz-scope="${encodeURIComponent(JSON.stringify(entityQuiz))}">以此節點出題</button></div><div class="kt-mini-metrics">${typeRows.map(r=>`<span>${esc(typeLabel(r.label))} ${esc(r.value)}</span>`).join('')}</div></div>`;
    }
    drawNetwork(centerId, data){
      const box=$('#ktNetwork',this.root); if(!box) return;
      const packed=this.bucketNeighborhood(centerId,data);
      const center=packed.center;
      if(!center||!center.id){ box.innerHTML='<div class="kt-card">找不到中心節點。</div>'; return; }
      const W=1500,H=920;
      const colDefs=[
        {key:'upstream',title:'上游定位／來源',x:155,desc:'章節、病證、證型來源與使用此方/節點的上層脈絡'},
        {key:'center',title:'中心節點',x:455,desc:'目前正在觀察的核心'},
        {key:'clinical',title:'辨證與下游內容',x:760,desc:'相關證型、病證、治法脈絡'},
        {key:'clue',title:'線索／藥物／組成',x:1065,desc:'症狀、舌脈、藥物與組成'},
        {key:'exam',title:'考題／類方鑑別',x:1340,desc:'歷屆題目、干擾選項、方族與變方'}
      ];
      const roleToCol={upstream:'upstream',clinical:'clinical',downstream:'clinical',context:'upstream',clue:'clue',component:'clue',compare:'exam',exam:'exam'};
      const colMap={upstream:[],clinical:[],clue:[],exam:[]};
      for(const [role,arr] of Object.entries(packed.buckets)){
        const col=roleToCol[role]||'clinical';
        colMap[col].push(...arr.map(n=>({...n,_role:role})));
      }
      const placed=new Map();
      const yStart=128, yGap=48;
      for(const col of ['upstream','clinical','clue','exam']){
        const arr=colMap[col].slice(0, col==='exam'?24:22);
        const x=colDefs.find(c=>c.key===col).x;
        const totalH=(arr.length-1)*yGap;
        const base=Math.max(yStart, H/2-totalH/2);
        arr.forEach((n,i)=>placed.set(n.id,{...n,x,y:base+i*yGap}));
      }
      placed.set(centerId,{...center,x:colDefs.find(c=>c.key==='center').x,y:H/2,_role:'center'});
      const nodes=[...placed.values()];
      const idSet=new Set(nodes.map(n=>n.id));
      const links=packed.links.filter(l=>idSet.has(sourceId(l))&&idSet.has(targetId(l))).slice(0,1200);
      const noLinkNote=links.length?'':`<div class="kt-card warn-box">此節點目前沒有可顯示的上下游關係邊；已先顯示中心節點。可試著提高深度／節點上限，或改搜尋同義節點。</div>`;
      const colHeader=colDefs.map(c=>`<g><rect x="${c.x-110}" y="18" width="220" height="72" rx="16" fill="var(--panel)" stroke="var(--line)"></rect><text x="${c.x}" y="46" text-anchor="middle" font-size="15" font-weight="900" fill="var(--accent2)">${esc(c.title)}</text><text x="${c.x}" y="68" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(short(c.desc,34))}</text></g>`).join('');
      const linkSvg=links.map(l=>{const s=placed.get(sourceId(l)), t=placed.get(targetId(l)); if(!s||!t) return ''; const b=relBucket(this.relationText(l)); const stroke=b==='exam'?'#9f4f71':b==='formula'?'#5f8a48':b==='clue'?'#b88918':b==='core'?'#7a5c38':'#9aa0a6'; const sw=b==='core'?2.6:1.8; const mid=(s.x+t.x)/2; const path=`M ${s.x} ${s.y} C ${mid} ${s.y}, ${mid} ${t.y}, ${t.x} ${t.y}`; return `<path class="kt-map-link" data-link-source="${esc(sourceId(l))}" data-link-target="${esc(targetId(l))}" d="${path}" fill="none" stroke="${stroke}" stroke-width="${sw}" opacity=".52"><title>${esc(s.name)} → ${esc(t.name)}｜${esc(this.relationText(l))}</title></path>`;}).join('');
      const nodeSvg=nodes.map(n=>{const isC=n.id===centerId; const w=isC?190:152, h=isC?62:38; const x=n.x-w/2, y=n.y-h/2; const fill=isC?'var(--accent2)': typeColor(n.type); const label=short(n.name||n.id,isC?16:12); const meta=isC?typeLabel(n.type):`${typeLabel(n.type)}｜${this.summarizeRelation(n,centerId,packed.links)}`; return `<g class="kt-map-node" data-graph-entity-id="${esc(n.id)}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill}" opacity="${isC?'.96':'.88'}" stroke="${isC?'#2b2118':'#fff'}" stroke-width="${isC?3:1.6}"></rect><text x="${n.x}" y="${n.y-2}" text-anchor="middle" font-size="${isC?15:12}" font-weight="900" fill="#fff">${esc(label)}</text><text x="${n.x}" y="${n.y+16}" text-anchor="middle" font-size="10" fill="rgba(255,255,255,.9)">${esc(typeLabel(n.type))}${Number(n.question_count||0)?`｜題${esc(n.question_count)}`:''}</text><title>${esc(n.name)}｜${esc(meta)}</title></g>`;}).join('');
      const roleCards=[
        ['upstream','上游定位',colMap.upstream],['clinical','辨證/下游',colMap.clinical],['clue','線索/藥物',colMap.clue],['exam','考題/類方',colMap.exam]
      ].map(([k,title,arr])=>`<div class="kt-route-card"><b>${esc(title)}</b><span>${arr.length} 節點</span>${arr.slice(0,8).map(n=>`<button class="kt-btn mini" data-entity-id="${esc(n.id)}">${esc(short(n.name,10))}</button>`).join('')}</div>`).join('');
      box.innerHTML=`<div class="kt-network-toolbar"><b>節點上下游連結圖：</b>${esc(center.name)}<span class="kt-muted">｜${nodes.length} 顯示節點 / ${links.length} 顯示邊｜深度 ${this.state.centerDepth}｜節點上限 ${esc(this.state.centerLimit)}｜方向 ${esc(this.state.centerDirection)}</span><button class="kt-btn mini" data-kt-zoom="in">＋</button><button class="kt-btn mini" data-kt-zoom="out">－</button><button class="kt-btn mini" data-kt-zoom="reset">重置</button><button class="kt-btn mini" data-kt-fullscreen>全螢幕</button></div>${noLinkNote}<div class="kt-graph-selection-note">單擊節點高光相連路徑；再次單擊取消；雙擊節點改以它為中心重繪。</div><svg class="kt-flow-svg" viewBox="0 0 ${W} ${H}" role="img"><g class="kt-zoom-layer">${colHeader}${linkSvg}${nodeSvg}</g></svg><div class="kt-route-grid">${roleCards}</div><div class="kt-legend">${Object.entries({outline:'綱目/章節',disease:'病證',pattern:'證型',formula:'方劑',diagnostic_feature:'線索',herb:'藥物',question:'考題'}).map(([t,l])=>`<span class="kt-legend-item"><i style="background:${typeColor(t)}"></i>${l}</span>`).join('')}</div>`;
      this.installGraphInteractions(box);
    }
    renderHighDimOverview(){
      return `<h2 class="kt-title">關係圖</h2><div class="kt-card soft">v5.0a7 已修復中心網路繪圖與初始效能；請搜尋節點後查看上下游關係圖。</div>`;
    }
    renderHighDimPanel(entityId, stats, data){ return ''; }
    table(headers, rows, limit=30){
      return `<div class="kt-table-wrap"><table class="kt-mini-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,limit).map(r=>`<tr>${r.map(c=>`<td>${String(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    svgWrap(inner,w=760,h=300){ return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" class="kt-chart-svg">${inner}</svg>`; }
    svgText(x,y,text,opts={}){ const size=opts.size||12, anchor=opts.anchor||'start', weight=opts.weight||'400'; return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" font-weight="${weight}" fill="var(--ink)">${esc(text)}</text>`; }
    barChart(rows, opts={}){
      const w=opts.w||760,h=opts.h||320, ml=opts.ml||150, mr=30, mt=34, mb=28;
      const data=(rows||[]).slice(0,opts.limit||18).filter(r=>Number.isFinite(+r.value));
      const max=Math.max(1,...data.map(r=>+r.value)); const bh=Math.max(10,(h-mt-mb)/Math.max(1,data.length)-4);
      let inner=this.svgText(w/2,20,opts.title||'',{anchor:'middle',size:14,weight:'700'});
      data.forEach((r,i)=>{ const y=mt+i*(bh+4); const bw=(w-ml-mr)*(+r.value/max); inner+=`<rect x="${ml}" y="${y}" width="${bw}" height="${bh}" rx="4" fill="var(--brand-strong)" opacity=".82"></rect>`; inner+=this.svgText(ml-8,y+bh*.72,short(r.label,20),{anchor:'end',size:11}); inner+=this.svgText(ml+bw+5,y+bh*.72,String(r.value),{size:11}); });
      return this.svgWrap(inner,w,h);
    }
    heatmapChart(labels, matrix, opts={}){
      labels=(labels||[]).slice(0,10); matrix=(matrix||[]).slice(0,labels.length).map(r=>r.slice(0,labels.length));
      const n=labels.length, cell=Math.max(28, Math.min(54, Math.floor(500/Math.max(1,n))));
      const ml=150, mt=94, w=ml+n*cell+24, h=mt+n*cell+40;
      const max=Math.max(1,...matrix.flat());
      let inner=this.svgText(w/2,22,opts.title||'關係矩陣熱圖',{anchor:'middle',size:14,weight:'700'});
      labels.forEach((lab,i)=>{ inner+=this.svgText(ml+i*cell+cell/2,mt-10,short(typeLabel(lab),8),{anchor:'middle',size:10}); inner+=this.svgText(ml-8,mt+i*cell+cell*.62,short(typeLabel(lab),12),{anchor:'end',size:11}); });
      for(let i=0;i<n;i++) for(let j=0;j<n;j++){ const v=matrix[i][j]||0, op=.10+.82*(v/max); inner+=`<rect x="${ml+j*cell}" y="${mt+i*cell}" width="${cell-2}" height="${cell-2}" fill="var(--brand-strong)" opacity="${op.toFixed(3)}" rx="3"><title>${esc(typeLabel(labels[i]))} → ${esc(typeLabel(labels[j]))}: ${v}</title></rect>`; if(v) inner+=this.svgText(ml+j*cell+cell/2,mt+i*cell+cell*.62,String(v),{anchor:'middle',size:10}); }
      return this.svgWrap(inner,w,h);
    }
    scatterChart(rows, opts={}){
      const w=opts.w||760,h=opts.h||340, ml=56,mr=24,mt=38,mb=48;
      const data=(rows||[]).filter(r=>Number.isFinite(+r.x)&&Number.isFinite(+r.y)).slice(0,opts.limit||500);
      const xmax=Math.max(1,...data.map(r=>+r.x)), ymax=Math.max(1,...data.map(r=>+r.y));
      let inner=this.svgText(w/2,20,opts.title||'',{anchor:'middle',size:14,weight:'700'});
      inner+=`<line x1="${ml}" y1="${h-mb}" x2="${w-mr}" y2="${h-mb}" stroke="var(--line)"></line><line x1="${ml}" y1="${mt}" x2="${ml}" y2="${h-mb}" stroke="var(--line)"></line>`;
      data.forEach(r=>{ const x=ml+(w-ml-mr)*(+r.x/xmax); const y=h-mb-(h-mt-mb)*(+r.y/ymax); inner+=`<circle cx="${x}" cy="${y}" r="${r.r||4}" fill="${typeColor(r.type)}" opacity=".72"><title>${esc(r.label)}｜x=${(+r.x).toFixed(2)}｜y=${(+r.y).toFixed(2)}</title></circle>`; });
      inner+=this.svgText((w+ml-mr)/2,h-12,opts.xLabel||'x',{anchor:'middle',size:12});
      inner+=this.svgText(8,mt+12,opts.yLabel||'y',{size:12});
      return this.svgWrap(inner,w,h);
    }



    handleGraphNodeClick(nodeId){
      if(!nodeId || this.state.graphIsDragging) return;
      // Browser double-click dispatches click-click-dblclick.  Delay the single-click
      // highlight briefly so dblclick can cancel it and re-center the graph cleanly.
      if(this.state.graphClickTimer){ clearTimeout(this.state.graphClickTimer); this.state.graphClickTimer=null; }
      this.state.graphClickTimer=setTimeout(()=>{
        this.state.graphClickTimer=null;
        this.toggleGraphHighlight(nodeId);
      }, 240);
    }
    handleGraphNodeDblClick(nodeId){
      if(!nodeId) return;
      if(this.state.graphClickTimer){ clearTimeout(this.state.graphClickTimer); this.state.graphClickTimer=null; }
      this.clearGraphHighlight();
      const now=Date.now();
      // Prevent rapid multi-clicks from firing repeated expensive redraws.
      if(this.state.graphLastFocusId===nodeId && now-this.state.graphLastFocusAt<360) return;
      this.state.graphLastFocusId=nodeId;
      this.state.graphLastFocusAt=now;
      this.focusEntity(nodeId);
    }
    toggleGraphHighlight(nodeId){
      const box=$('#ktNetwork',this.root); if(!box||!nodeId)return;
      if(this.state.activeGraphNode===nodeId){ this.clearGraphHighlight(box); this.state.activeGraphNode=null; return; }
      this.state.activeGraphNode=nodeId;
      const nodes=Array.from(box.querySelectorAll('.kt-map-node[data-graph-entity-id]'));
      const links=Array.from(box.querySelectorAll('.kt-map-link[data-link-source][data-link-target]'));
      const connected=new Set([nodeId]);
      links.forEach(l=>{ const s=l.dataset.linkSource, t=l.dataset.linkTarget; const hit=s===nodeId||t===nodeId; l.classList.toggle('active',hit); l.classList.toggle('dim',!hit); if(hit){connected.add(s); connected.add(t);} });
      nodes.forEach(n=>{ const id=n.dataset.graphEntityId; const hit=connected.has(id); n.classList.toggle('active',id===nodeId); n.classList.toggle('connected',hit&&id!==nodeId); n.classList.toggle('dim',!hit); });
      const note=box.querySelector('.kt-graph-selection-note');
      const ent=this.adapter.getEntity(nodeId)||{};
      if(note) note.innerHTML=`已高光：<b>${esc(ent.name||nodeId)}</b>；再次單擊取消，雙擊改以此節點為中心。`;
    }
    clearGraphHighlight(box){
      box=box||$('#ktNetwork',this.root); if(!box)return;
      box.querySelectorAll('.kt-map-node,.kt-map-link').forEach(el=>el.classList.remove('active','connected','dim'));
      const note=box.querySelector('.kt-graph-selection-note'); if(note) note.textContent='單擊節點高光相連路徑；再次單擊取消；雙擊節點改以它為中心重繪。';
    }
    graphZoom(mode){
      const box=$('#ktNetwork',this.root); if(!box) return;
      const svg=box.querySelector('svg'); const layer=box.querySelector('.kt-zoom-layer'); if(!svg||!layer) return;
      let scale=Number(svg.dataset.scale||1), tx=Number(svg.dataset.tx||0), ty=Number(svg.dataset.ty||0);
      if(mode==='in') scale=Math.min(4,scale*1.18);
      else if(mode==='out') scale=Math.max(.35,scale/1.18);
      else {scale=1; tx=0; ty=0;}
      svg.dataset.scale=scale; svg.dataset.tx=tx; svg.dataset.ty=ty; layer.setAttribute('transform',`translate(${tx} ${ty}) scale(${scale})`);
    }
    installGraphInteractions(box){
      const svg=box.querySelector('svg'); const layer=box.querySelector('.kt-zoom-layer'); if(!svg||!layer||svg.dataset.ktPanInstalled) return;
      svg.dataset.ktPanInstalled='1'; svg.dataset.scale='1'; svg.dataset.tx='0'; svg.dataset.ty='0';
      let dragging=false,last=null;
      const apply=()=>layer.setAttribute('transform',`translate(${svg.dataset.tx||0} ${svg.dataset.ty||0}) scale(${svg.dataset.scale||1})`);
      svg.addEventListener('wheel',ev=>{ev.preventDefault(); let scale=Number(svg.dataset.scale||1), tx=Number(svg.dataset.tx||0), ty=Number(svg.dataset.ty||0); const factor=ev.deltaY<0?1.12:1/1.12; scale=Math.max(.35,Math.min(4,scale*factor)); svg.dataset.scale=scale; svg.dataset.tx=tx; svg.dataset.ty=ty; apply();},{passive:false});
      svg.addEventListener('pointerdown',ev=>{
        // Do not capture pointer events that start on a node; otherwise SVG pointer capture
        // retargets the later click to <svg>, so node single/double click handlers never run.
        if(ev.target.closest?.('.kt-map-node[data-graph-entity-id]')) return;
        dragging=true; last={x:ev.clientX,y:ev.clientY}; this.state.graphIsDragging=false; svg.setPointerCapture?.(ev.pointerId); svg.classList.add('dragging');
      });
      svg.addEventListener('pointermove',ev=>{if(!dragging||!last) return; const dx=ev.clientX-last.x, dy=ev.clientY-last.y; if(Math.abs(dx)+Math.abs(dy)>2)this.state.graphIsDragging=true; last={x:ev.clientX,y:ev.clientY}; svg.dataset.tx=Number(svg.dataset.tx||0)+dx; svg.dataset.ty=Number(svg.dataset.ty||0)+dy; apply();});
      const end=()=>{dragging=false; last=null; svg.classList.remove('dragging'); setTimeout(()=>{this.state.graphIsDragging=false;},0);}; svg.addEventListener('pointerup',end); svg.addEventListener('pointerleave',end);
    }
    requestQuiz(scope){ this.adapter.requestQuiz(scope); }
    static async mount(selectorOrEl, opts={}){ const el=typeof selectorOrEl==='string'?document.querySelector(selectorOrEl):selectorOrEl; const kt=new Clinical1KnowledgeTree(el,opts); await kt.init(); return kt; }
  }
  global.Clinical1KnowledgeTree = Clinical1KnowledgeTree;
})(window);
