
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const state={cache:{},searchEngine:null,quiz:null,currentScope:{},currentExam:[],wrongBook:[],stats:{done:0,correct:0},relationGraph:null,lastEntityId:null,nav:{back:[],forward:[],current:{kind:'tab',tab:'guide'},restoring:false}};
const titles={
 guide:['導覽頁','功能總覽：說明各頁面用途，並提供搜尋、出題、知識樹與資料頁入口。'],
 search:['搜尋入口','節點、章節、題目、條文與表格列搜尋。'],
 learning:['學習頁','五本書學習入口、章節路徑、方劑方證要點與考生化鑑別。'],
 entity:['節點頁','顯示單一節點的相關資料、考題、章節來源與關聯節點。'],
 tree:['知識樹','五本書綱目樹與章節出題入口；中心關係圖已獨立到「關係圖」。'],
 relationGraph:['關係圖','節點上下游關係圖：與目前節點同進退，預設桂枝湯，可拖曳、縮放、全螢幕。'],
 quiz:['考題系統','全庫題庫、指定範圍出題、錯題本、交卷與詳解檢視。'],
 qhotspot:['考題熱點','正解／干擾／題幹高頻節點，可直接點節點或出題。'],
 pivot:['樞紐分析','正解、干擾選項與題幹線索分開統計。'],
 formulaTools:['方劑工具','方劑反查、配方檢索、方劑精靈、類方鑑別、辨證框架、變體列表。'],
 shanghan:['傷寒論','六經、條文、方證、禁例／兼證資料頁。'],
 jingui:['金匱要略','篇章、病證、條文、方劑與婦人病等資料頁。'],
 wenbing:['溫病學','病種、衛氣營血、三焦、分期、治法、方劑資料頁。'],
 zhengzhi:['證治學','病證 → 證型 → 症狀 → 病機 → 治法 → 主方。'],
 diagnosis:['診斷學','四診／八綱／舌脈／面色 → 支持證型與題目。'],
 health:['資料概況','查看資料範圍、題目數、章節節點與主要工具入口。']
};
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function short(s,n=140){s=String(s??'');return s.length>n?s.slice(0,n)+'…':s}
const ZH={
  relation_type:{supports:'支持',section_contains_entity:'章節包含',formula_has_symptom_hint:'方劑相關線索',exam_mentions_feature:'考題提及',variant_of:'加減／變方',named_variant:'命名變方',addition_of:'加味方',subtraction_of:'去味方',compound_formula:'合方',similar_but_distinct:'類似但不同',alias_of:'別名',contains:'包含',formula_contains_herb:'方劑組成'},
  confidence:{high:'高可信',medium:'中可信',low:'低可信',candidate:'候選',display_or_seed:'顯示／輔助資料',secondary_seed_needs_pdf_verification:'輔助整理，需與原始資料交叉確認'},
  status:{display_or_seed:'顯示／輔助資料',usable:'可用',needs_sample_review:'需抽樣確認',secondary_seed_needs_pdf_verification:'輔助整理，需與原始資料交叉確認',safe_display:'可安全顯示',review:'待審核'},
  source:{mb_shanghan:'傷寒整理資料',mb_jingui:'金匱整理資料',shanghan:'傷寒論',jingui:'金匱要略',wenbing:'溫病學',zhengzhi:'中醫證治學',diagnosis:'中醫診斷學',official_formula:'官方／標準方資料'},
  layer:{official_exam:'官方考題',bula_note:'Bula 筆記題',seed_drill:'輔助練習題',fragment_or_excluded:'排除／殘片題',all:'全部可練題',wrongbook:'錯題本'}
};
function zh(group,v){v=String(v??'');return (ZH[group]&&ZH[group][v])||v.replace(/_/g,' ')}

const DOC_TYPE_ZH={entity:'節點',section:'章節',question:'題目',clause:'條文',structured_row:'結構表格列',formula_component:'方劑組成',source_page:'PDF來源頁',other:'其他'};
function docTypeZh(t){return DOC_TYPE_ZH[String(t||'')]||String(t||'其他').replace(/_/g,' ')}
function firstDefined(...xs){for(const x of xs){if(x!==undefined&&x!==null&&x!=='')return x}return ''}

function uniqueList(xs){return [...new Set((xs||[]).map(x=>String(x||'').trim()).filter(Boolean))]}
function asList(x){return Array.isArray(x)?x:(x?[x]:[])}
function parseQuizScope(raw){
  if(!raw)return null;
  const tries=[String(raw)];
  try{tries.push(decodeURIComponent(String(raw)))}catch(e){}
  for(const t of tries){
    try{const obj=JSON.parse(t);return obj&&typeof obj==='object'?obj:null}catch(e){}
  }
  return null;
}
function qText(q){return [q.stem,q.answer_text,(q.options||[]).map(o=>o.text).join(' '),q.book_scope,q.book_id,q.section_id,q.period,q.subject,(q.entity_ids||[]).map(id=>state.quiz?.entities?.[id]?.name||id).join(' ')].join(' ')}

function hasPinnedQuestionScope(scope){
  scope=scope||{};
  return uniqueList([...asList(scope.question_ids),...asList(scope.questions)]).length>0;
}
function scopeLabel(scope){
  scope=scope||{}; const parts=[];
  if(scope.tree_label||scope.tree_path)parts.push('知識樹：'+(scope.tree_path||scope.tree_label));
  if(scope.question_ids?.length)parts.push('指定題組：'+scope.question_ids.length+' 題');
  if(scope.entity_id)parts.push('節點：'+(state.quiz?.entities?.[scope.entity_id]?.name||scope.entity_id));
  if(scope.entity_ids?.length)parts.push('多節點：'+scope.entity_ids.map(id=>state.quiz?.entities?.[id]?.name||id).join('、'));
  if(scope.section_id)parts.push('章節：'+(state.quiz?.sections?.[scope.section_id]?.title||scope.section_id));
  if(scope.section_ids?.length)parts.push('多章節：'+scope.section_ids.length+' 個');
  if(scope.book_id)parts.push('書本：'+scope.book_id);
  if(scope.year)parts.push('年份：'+scope.year+'年');
  if(scope.period)parts.push('期別：'+scope.period);
  if(scope.formula_family_id)parts.push('方族：'+scope.formula_family_id);
  if(scope.keyword)parts.push('關鍵字：'+scope.keyword);
  if(scope.keywords?.length&&!parts.length)parts.push('關鍵詞：'+scope.keywords.slice(0,6).join('、'));
  return parts.join('；')
}
async function loadJSON(path){ if(state.cache[path])return state.cache[path]; const r=await fetch(path); if(!r.ok)throw new Error(path+' '+r.status); const j=await r.json(); state.cache[path]=j; return j;}
async function loadEntityPageL11(id){ if(window.Clinical1LazyData&&window.Clinical1LazyData.loadEntityPage){ return await window.Clinical1LazyData.loadEntityPage(id); } const pages=await loadJSON('data/clinical1_fused_entity_pages_v3.json'); return pages[id];}
function entityNameL11(id){ return state.quiz?.entities?.[id]?.name || window.Clinical1LazyData?.entityName?.(id) || id; }
function switchTab(tab){ $$('.tab').forEach(x=>x.classList.remove('active')); const el=$('#tab-'+tab); if(el)el.classList.add('active'); $$('#navTabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); $('#pageTitle').textContent=titles[tab]?.[0]||tab; $('#pageSub').textContent=titles[tab]?.[1]||''; const init={guide:renderGuidePage,learning:initLearning,tree:initTree,relationGraph:initRelationGraph,quiz:initQuiz,qhotspot:initQuestionHotspot,pivot:initPivot,formulaTools:initFormulaTools,shanghan:()=>initSourcePage('shanghan'),jingui:()=>initSourcePage('jingui'),wenbing:()=>initSourcePage('wenbing'),zhengzhi:initZhengzhi,diagnosis:initDiagnosis,health:renderHealth}[tab]; if(init)init().catch(e=>console.error('[Clinical1] 模組載入失敗:',tab,e));}
function makeSnapshot(kind,data){return Object.assign({kind},data||{});} 
function sameSnapshot(a,b){return JSON.stringify(a||{})===JSON.stringify(b||{});} 
function commitSnapshot(snap){if(state.nav.restoring)return; if(!snap)return; if(state.nav.current && !sameSnapshot(state.nav.current,snap)) state.nav.back.push(state.nav.current); state.nav.current=snap; state.nav.forward=[]; updateHistoryButtons();}
function replaceCurrentSnapshot(snap){if(state.nav.restoring)return; if(snap){state.nav.current=snap; updateHistoryButtons();}}
function updateHistoryButtons(){const p=$('#globalPrevTab'), n=$('#globalNextTab'); if(p)p.disabled=!state.nav.back.length; if(n)n.disabled=!state.nav.forward.length;}
async function applySnapshot(snap){if(!snap)return; state.nav.restoring=true; try{ if(snap.kind==='tab')switchTab(snap.tab); else if(snap.kind==='entity')await openEntity(snap.id,false); else if(snap.kind==='question')await openQuestion(snap.id,false); else if(snap.kind==='quiz_scope')await window.startQuizByScope(snap.scope||{},false); else if(snap.kind==='search'){switchTab('search'); if(!state.searchEngine) await initSearch(); const input=$('#searchInput'); if(input){input.value=snap.query||''; $('#searchBtn')?.click();}} else if(snap.kind==='relation_entity'){switchTab('relationGraph'); const kt=await initRelationGraph(); if(kt&&snap.id)kt.focusEntity(snap.id);} else if(snap.kind==='hotspot_test'){switchTab('qhotspot'); const qh=await initQuestionHotspot(); if(qh&&snap.id)await qh.openTest(snap.id);} else switchTab(snap.tab||'search'); } finally {state.nav.restoring=false; state.nav.current=snap; updateHistoryButtons();}}
async function moveHistory(delta){ if(delta<0){const prev=state.nav.back.pop(); if(!prev)return; if(state.nav.current)state.nav.forward.push(state.nav.current); await applySnapshot(prev);} else {const next=state.nav.forward.pop(); if(!next)return; if(state.nav.current)state.nav.back.push(state.nav.current); await applySnapshot(next);} }
function navigateTab(tab){commitSnapshot(makeSnapshot('tab',{tab})); switchTab(tab);} updateHistoryButtons();

async function renderGuidePage(){
  const root=$('#guideRoot');
  if(!root)return;
  const featureGroups=[
    {title:'先找資料',items:[
      {tab:'search',name:'搜尋入口',desc:'用關鍵字查節點、章節、題目、條文與表格列。適合不知道資料在哪裡時先查。',use:'輸入「桂枝湯」「氣分兼表」「咳嗽 痰熱鬱肺」等關鍵字。'},
      {tab:'entity',name:'節點頁',desc:'顯示單一節點的別名、來源、相關題目、關聯節點與資料卡。適合查一個方劑、病證、症狀的完整脈絡。',use:'通常從搜尋結果、知識樹、熱點或關係圖點進來。'},
      {tab:'learning',name:'學習頁',desc:'依五本書整理章節路徑、題型分析、方證要點與容易混淆內容。適合先讀架構再刷題。',use:'從主書入口或章節路徑進入，再回到考題系統練習。'}
    ]},
    {title:'出題與考古題',items:[
      {tab:'quiz',name:'考題系統',desc:'全庫出題、指定範圍出題、錯題本、交卷與詳解檢視。支援官方題、Bula 筆記題與輔助題分層。',use:'要正式練題時進入；若從知識樹點出題，會帶入該綱目與下層題目。'},
      {tab:'qhotspot',name:'考題熱點',desc:'查看正解、干擾選項、題幹高頻節點與考點分布。適合找高頻考點與容易被考成選項的概念。',use:'先看熱點，再點節點或直接用熱點出題。'},
      {tab:'pivot',name:'樞紐分析',desc:'用統計表方式比較正解、干擾、題幹、年度趨勢、共現與覆蓋率。適合做考點分析與讀書策略。',use:'用排序與篩選找高權重考點，不要把 seed drill 當官方趨勢。'}
    ]},
    {title:'知識結構與圖譜',items:[
      {tab:'tree',name:'知識樹',desc:'依五本 PDF 的綱目、章、節、小節建立樹狀架構，並能從節點指定出題。',use:'「綱目」代表 PDF 目錄中的章節範圍；點章節時應包含該節點與下層所有題目。'},
      {tab:'relationGraph',name:'關係圖',desc:'查看節點上下游關聯、支援關係、方劑與病證連結。適合理解跨章節、跨書的關係。',use:'可從節點頁、熱點或知識樹跳入，拖曳與縮放觀察鄰近關係。'},
      {tab:'health',name:'資料概況',desc:'查看資料範圍、題目數、章節節點與主要工具入口。',use:'若要快速了解目前收錄內容，可先查看本頁。'}
    ]},
    {title:'方劑與五本書資料頁',items:[
      {tab:'formulaTools',name:'方劑工具',desc:'方劑反查、配方檢索、方劑精靈、類方鑑別、變方與方族。適合查方劑組成與相似方比較。',use:'輸入方名、藥物、症狀或鑑別線索。'},
      {tab:'shanghan',name:'傷寒論',desc:'六經、條文、方證、禁例、兼證與章節資料頁。',use:'適合依太陽、陽明、少陽等綱目讀條文與題目。'},
      {tab:'jingui',name:'金匱要略',desc:'篇章、病證、條文、方劑與婦人病等資料頁。',use:'適合依篇名與病證切入，例如痙濕暍、胸痹、痰飲等。'},
      {tab:'wenbing',name:'溫病學',desc:'病因發病、衛氣營血、三焦、病種、治法、方劑與辨證狀態。',use:'適合依章節或病種查資料與出題。'},
      {tab:'zhengzhi',name:'證治學',desc:'病證、證型、症狀、病機、治法、主方的資料頁。',use:'適合內科病證辨證論治，例如感冒、咳嗽、喘證。'},
      {tab:'diagnosis',name:'診斷學',desc:'四診、八綱、氣血、臟腑、六淫痰食、傷寒溫病、經絡等診斷資料。',use:'適合查舌脈、問診、八綱與辨證分類。'}
    ]}
  ];
  const workflow=[
    {name:'快速查資料',steps:['到「搜尋入口」輸入關鍵字','從結果開「節點頁」或「題目」','需要更多脈絡時再開「關係圖」']},
    {name:'照 PDF 綱目出題',steps:['到「知識樹」選五本書綱目','點選章、節、小節的出題按鈕','進入「考題系統」後確認指定題組數量']},
    {name:'分析高頻考點',steps:['先看「考題熱點」或「樞紐分析」','找高頻正解與干擾選項','開啟節點後進入考題或關係圖驗證']},
    {name:'讀單本書',steps:['進入傷寒／金匱／溫病／證治／診斷資料頁','依章節瀏覽 PDF 綱目與內容','再用該章節或相關節點出題']}
  ];
  root.innerHTML=`
    <div class="guide-hero card">
      <div>
        <h2>功能導覽</h2>
        <p>本頁提供功能總覽，可依需求進入資料查詢、綱目出題、知識圖譜、考點分析或五本書資料頁。</p>
        <div class="chip-list"><span class="chip">先搜尋</span><span class="chip">再開節點</span><span class="chip">可由綱目出題</span><span class="chip">資料頁與考題聯動</span></div>
      </div>
      <div class="guide-quick-actions">
        <button class="btn primary" data-jump-tab="search">開始搜尋</button>
        <button class="btn" data-jump-tab="tree">用知識樹出題</button>
        <button class="btn" data-jump-tab="quiz">進入考題系統</button>
        <button class="btn" data-jump-tab="health">查看資料概況</button>
      </div>
    </div>
    <div class="guide-workflow grid">
      ${workflow.map(w=>`<div class="card guide-workflow-card"><h3>${esc(w.name)}</h3><ol>${w.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></div>`).join('')}
    </div>
    ${featureGroups.map(g=>`<section class="guide-section card"><h3>${esc(g.title)}</h3><div class="guide-feature-grid">${g.items.map(it=>`<article class="guide-feature-card"><div class="guide-feature-head"><h4>${esc(it.name)}</h4><button class="btn mini" data-jump-tab="${esc(it.tab)}">開啟</button></div><p>${esc(it.desc)}</p><div class="guide-use"><b>怎麼用：</b>${esc(it.use)}</div></article>`).join('')}</div></section>`).join('')}
  `;
}

async function initSearch(){const root=$('#searchRoot'); root.innerHTML=`<div class="card"><div class="search-row"><input id="searchInput" placeholder="搜尋：桂枝湯、氣分兼表、咳嗽 痰熱鬱肺、舌紅少苔"><select id="searchType"><option value="">全部類型</option><option value="entity">節點</option><option value="section">章節</option><option value="question">題目</option><option value="clause">條文</option><option value="structured_row">表格列</option></select><button class="btn primary" id="searchBtn">搜尋</button></div><div class="search-toolbar-2"><label>排序<select id="searchSort"><option value="score">相關度高到低</option><option value="type">依類型分組</option><option value="title">名稱筆畫／字序</option></select></label><label>顯示<select id="searchLayout"><option value="cards">區塊卡片</option><option value="list">條列清單</option><option value="compact">緊湊模式</option></select></label><span id="searchStatus" class="muted">輸入關鍵字後即可搜尋資料。</span></div></div><div id="searchResults" class="search-results cards"></div>`; async function ensure(){if(state.searchEngine)return; $('#searchStatus').textContent='載入搜尋資料…'; const p=await loadJSON('data/search/search_payload_v3.json'); state.searchEngine=new Clinical1SearchEngineV3(p); $('#searchStatus').textContent=`已載入 ${p.docs.length.toLocaleString()} 筆搜尋文件。`;} async function run(){await ensure(); const q=$('#searchInput').value.trim(); const typ=$('#searchType').value; let hits=state.searchEngine.search(q,{limit:160,doc_type:typ||undefined}); const sort=$('#searchSort').value; if(sort==='title')hits.sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'zh-Hant')); if(sort==='type')hits.sort((a,b)=>String(a.doc_type||'').localeCompare(String(b.doc_type||''))||Number(b.score||0)-Number(a.score||0)); renderSearchResults(hits,q,$('#searchLayout').value);} ['searchSort','searchLayout','searchType'].forEach(id=>$('#'+id).addEventListener('change',()=>{ if(state.searchEngine) run(); })); $('#searchBtn').onclick=run; $('#searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')run()}); $('#searchInput').value='桂枝湯'; $('#searchResults').innerHTML='<div class="card"><h3>搜尋說明</h3><p>可搜尋方劑、病證、證型、章節、考題與條文。輸入關鍵字後按下搜尋，即可查看相關資料。</p><div class="chip-list"><span class="chip">方劑</span><span class="chip">病證</span><span class="chip">考題</span><span class="chip">章節</span></div></div>';}
function renderSearchResults(hits,q,layout='cards'){const root=$('#searchResults'); root.className='search-results '+layout; const group={entity:[],section:[],question:[],clause:[],structured_row:[],other:[]}; hits.forEach(h=>(group[h.doc_type]||group.other).push(h)); const labels={entity:'節點',section:'章節',question:'題目',clause:'條文',structured_row:'結構表格列',other:'其他'}; root.innerHTML=`<div class="muted result-count">查詢「${esc(q||'')}」共 ${hits.length} 筆；可用上方切換排序與顯示密度。</div>`+Object.entries(group).filter(([k,v])=>v.length).map(([k,arr])=>`<h3 class="group-title">${labels[k]} (${arr.length})</h3>${arr.slice(0,40).map(renderResult).join('')}`).join('')||'<div class="card">沒有結果。</div>';}
function renderResult(h){
  let action='', label='開啟', disabled=false, note='';
  if(h.doc_type==='entity' && h.entity_id){ action=`data-open-entity="${esc(h.entity_id)}"`; label='開節點'; }
  else if(h.doc_type==='question' && h.question_id){ action=`data-open-question="${esc(h.question_id)}"`; label='開題目'; }
  else if(h.doc_type==='section' && h.section_id){ action=`data-quiz-scope='${esc(JSON.stringify({section_id:h.section_id,book_id:h.book_id||'',layer:'official_exam',scope_note:'搜尋結果章節範圍'}))}'`; label='以本章出題'; }
  else if(h.doc_type==='clause'){ action=`data-run-search="${esc(h.title||h.body||'')}"`; label='搜尋相關'; }
  else if(h.doc_type==='structured_row'){ action=`data-run-search="${esc(h.title||h.body||'')}"`; label='搜尋此列'; }
  else { disabled=true; label='暫無直接開啟'; note='此搜尋結果目前只有摘要資料，尚未建立可直接開啟的頁面。'; }
  const btn=disabled?`<button class="btn" disabled title="${esc(note)}">${esc(label)}</button>`:`<button class="btn primary" ${action}>${esc(label)}</button>`;
  return `<article class="card result-card"><div class="result-title"><div><b>${esc(h.title)}</b><div class="muted"><span class="result-doc-type">${esc(docTypeZh(h.doc_type))}</span>｜${esc(h.subtitle||h.source||'')}｜相關度 ${Math.round(h.score||0)}</div></div>${btn}</div><p>${esc(short(h.body||h.text,260))}</p>${note?`<p class="muted">${esc(note)}</p>`:''}<div>${(h.reasons||[]).slice(0,4).map(r=>`<span class="chip">${esc(r)}</span>`).join('')}</div></article>`;
}

async function openEntity(id, record=true){state.lastEntityId=id; if(state.relationGraph&&state.relationGraph.state){state.relationGraph.state.selectedEntity=id;} if(record)commitSnapshot(makeSnapshot('entity',{id})); switchTab('entity'); const root=$('#entityRoot'); root.innerHTML='<div class="card">載入節點頁…</div>'; const p=await loadEntityPageL11(id); if(!p){root.innerHTML=`<div class="card"><h3>找不到節點</h3><p class="muted">節點 id：${esc(id)}</p><p>該按鈕已觸發，但資料庫尚未建立可開啟的節點頁；可改用全庫搜尋追資料。</p><button class="btn primary" data-run-search="${esc(id)}">搜尋此 id</button></div>`;return} const ft=await loadJSON('data/formula_tools_payload_v3_1.json').catch(()=>({formula_blocks:{},zhengzhi_rows:[],wenbing_rows:[]})); const fblocks=ft.formula_blocks||await loadJSON('data/formula/formula_page_blocks_v3.json').catch(()=>({})); root.innerHTML=renderEntityPage(p,fblocks[id],ft);}
function renderEntityPage(p,fb,ft={}){const qstat=p.question_location_counts||{}; const qsample=p.questions_sample||[]; const sections=p.sections_sample||[]; const out=p.relations_out_sample||[], inn=p.relations_in_sample||[]; const ext=p.fused_v3_extension_refs||{}; return `<div class="entity-head"><div><h2 class="entity-title">${esc(p.name)}</h2><div><span class="badge">${esc(p.type)}</span>${(p.aliases||[]).slice(0,10).map(a=>`<span class="chip">${esc(a)}</span>`).join('')}</div></div><div class="entity-actions"><button class="btn primary" data-quiz-scope='${esc(JSON.stringify({entity_id:p.canonical_id,layer:'official_exam'}))}'>以此節點出題</button><button class="btn" data-tree-entity="${esc(p.canonical_id)}">看中心網路</button><button class="btn" data-hotspot-test="${esc(p.canonical_id)}">考頻檢定</button><button class="btn" data-run-search="${esc(p.name)}">全庫搜尋</button>${String(p.type||'').includes('formula')||fb?`<button class="btn" data-formula-action="reverse" data-formula-query="${esc(p.name)}">方劑反查</button><button class="btn" data-formula-action="diff" data-formula-query="${esc(p.name)}">類方鑑別</button><button class="btn" data-formula-action="variants" data-formula-query="${esc(p.name)}">變體／條件式處方</button>`:''}</div></div><div class="grid entity-section"><div class="card soft"><b>考題位置</b><p>正解 ${esc(qstat.answer||0)}｜干擾 ${esc(qstat.distractor||0)}｜題幹 ${esc(qstat.stem||0)}</p></div><div class="card soft"><b>延伸資料</b><p>證治 ${(ext.zhengzhi_row_ids||[]).length}｜溫病 ${(ext.wenbing_state_row_ids||[]).length}｜source refs ${(p.source_ref_ids||[]).length}</p></div></div>${fb?renderFormulaBlock(fb):''}${renderExtensionRefs(ext,ft)}<div class="split entity-section"><div class="card"><h3>相關考題</h3>${qsample.slice(0,12).map(renderQuestionFromEvent).join('')||'<p class="muted">無樣本。</p>'}</div><div class="card"><h3>章節來源</h3>${sections.slice(0,12).map(s=>`<div class="source-row">${esc(s.section_title)}<div class="muted">${esc(s.book_id_y||s.book_id)} p.${esc(s.page_start||'')}</div></div>`).join('')||'<p class="muted">無章節樣本。</p>'}</div></div><div class="split entity-section"><div class="card"><h3>下游關係</h3>${out.slice(0,16).map(renderRel).join('')||'<p class="muted">無。</p>'}</div><div class="card"><h3>上游關係</h3>${inn.slice(0,16).map(renderRel).join('')||'<p class="muted">無。</p>'}</div></div>`;}

function arrField(v,k){const x=v&&v[k]; if(Array.isArray(x))return x.filter(Boolean); if(!x)return []; return String(x).split(/[、,，；;|]/).map(s=>s.trim()).filter(Boolean);}
function changeText(c){if(!c)return ''; if(typeof c==='string')return c; const b=c.base_dose||c.base_processing||'原方'; const v=c.variant_dose||c.variant_processing||'變方'; return `${c.herb_name||''}（${b}→${v}）`;}
function variantDeltaHtml(v){
  const added=arrField(v,'added_herbs_computed_v4_6');
  const removed=arrField(v,'removed_herbs_computed_v4_6');
  const changed=Array.isArray(v&&v.dose_or_processing_changes_v4_6)?v.dose_or_processing_changes_v4_6:[];
  const rows=[];
  if(added.length)rows.push(`<div class="variant-delta-row"><b>加：</b>${added.map(x=>`<span class="badge add">${esc(x)}</span>`).join('')}</div>`);
  if(removed.length)rows.push(`<div class="variant-delta-row"><b>去：</b>${removed.map(x=>`<span class="badge remove">${esc(x)}</span>`).join('')}</div>`);
  if(changed.length)rows.push(`<div class="variant-delta-row"><b>劑量／炮製調整：</b>${changed.map(x=>`<span class="chip dose">${esc(changeText(x))}</span>`).join('')}</div>`);
  return rows.length?`<div class="variant-delta"><div class="variant-delta-title">加減材料</div>${rows.join('')}</div>`:`<div class="muted">尚未能從結構化組成判定明確加減，請看原文依據。</div>`;
}
function herbButton(c){
  const label=`${c.herb_name||''}${c.dose_text?' '+c.dose_text:''}`;
  return c.herb_id?`<button class="btn" data-open-entity="${esc(c.herb_id)}">${esc(label)}</button>`:`<span class="chip muted" title="此藥物尚未建立節點，僅顯示文字">${esc(label)}（未建節點）</span>`;
}

function renderFormulaIndicationBoxApp(ind){
  if(!ind) return '';
  const chip=(x,cls='chip')=>`<span class="${cls}">${esc(x)}</span>`;
  const clauses=(arr,title)=>Array.isArray(arr)&&arr.length?`<details open class="formula-clause-group"><summary>${esc(title)}（${arr.length}）</summary>${arr.slice(0,12).map(c=>`<article class="formula-clause-card"><div><b>${esc(c.clause_name||('條文 '+(c.clause_no||'')))}</b><span class="badge">${esc(c.source_trust_level||'A')}</span><span class="chip">${esc(c.source_book||'')}</span></div><p>${esc(c.text||'')}</p>${(c.symptom_terms||[]).length?`<div class="chip-list">${c.symptom_terms.slice(0,12).map(t=>chip(t)).join('')}</div>`:''}</article>`).join('')}</details>`:'';
  const patterns=(ind.target_patterns_or_diseases||[]).slice(0,10).map(x=>x.name?`<button class="btn" data-open-entity="${esc(x.entity_id||'')}">${esc(x.name)} <span class="muted">${esc(x.source_trust_level||'')}</span></button>`:`<span class="chip">${esc(x.text||'')}</span>`).join('');
  const symptoms=(ind.symptom_hints||[]).slice(0,18).map(x=>`<span class="chip ${String(x.source_trust_level||'').startsWith('C')?'soft':''}">${esc(x.name||x)}${x.official_cooccurrence_count!=null?` ${esc(x.official_cooccurrence_count)}`:''}</span>`).join('');
  return `<section class="card formula-indication-card entity-section"><h3>方證要點／適用症狀／對應條文</h3><p class="muted">${esc(ind.display_policy||'A/B 級條文與明確整理進主卡；正式題共現只作考場提示。')}</p>${(ind.summary||[]).length?`<ul class="formula-summary-list">${ind.summary.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${patterns?`<h4>相關證候／病證</h4><div class="chip-list action-chips">${patterns}</div>`:''}${symptoms?`<h4>症狀與考場線索</h4><div class="chip-list">${symptoms}</div>`:''}${clauses(ind.classic_clauses_primary,'對應條文／主治條文')}${clauses(ind.classic_clauses_caution,'禁例／非適用條文')}${clauses(ind.classic_clauses_related,'相關條文／加減條文')}${ind.source_trust_note?`<p class="muted">${esc(ind.source_trust_note)}</p>`:''}</section>`;
}
function renderFormulaBlock(fb){const cvs=fb.composition_versions||[], vars=fb.variants_as_base||[], bases=fb.base_formulas_if_variant||[]; return `<div class="card entity-section"><h3>方劑本體與組成</h3><div><span class="badge">${esc(zh('status',fb.formula_type_inferred||''))}</span><span class="chip">方族 ${esc(fb.formula_family_id||'')}</span></div>${renderFormulaIndicationBoxApp(fb.indications_v5_6)}${cvs.slice(0,3).map(cv=>`<div class="component-row"><b>${esc(zh('source',cv.source_book||cv.source_origin))}</b> <span class="muted">${esc(zh('status',cv.composition_status))}｜頁 ${esc(cv.source_pdf_pages||'')}</span><div>${(cv.components||[]).map(herbButton).join(' ')}</div></div>`).join('')||'<p class="muted">無組成版本。</p>'}${cvs.length>3?`<details class="component-drawer"><summary>展開全部組成版本（${cvs.length} 筆）</summary>${cvs.slice(3).map(cv=>`<div class="component-row"><b>${esc(zh('source',cv.source_book||cv.source_origin))}</b> <span class="muted">${esc(zh('status',cv.composition_status))}｜頁 ${esc(cv.source_pdf_pages||'')}</span><div>${(cv.components||[]).map(herbButton).join(' ')}</div></div>`).join('')}</details>`:''}${vars.length?`<h4>加減／變方</h4><div class="variant-grid">${vars.slice(0,20).map(v=>{const tid=v.variant_formula_id||v.target_formula_id; return `<div class="variant-card ${esc((v.relation_type||v.relation_type_normalized||'variant').replace(/_/g,'-'))}"><span class="chip">${esc(zh('relation_type',v.relation_type||v.relation_type_normalized))}</span><b>${esc(v.variant_formula_name||v.target_formula_name||'未命名變方')}</b> ${tid?`<button class="btn" data-open-entity="${esc(tid)}">開節點</button>`:`<button class="btn" disabled title="此變方尚未建立獨立節點">尚未建節點</button>`}${variantDeltaHtml(v)}<div class="muted">${esc(v.evidence_text||v.evidence||'')}</div></div>`}).join('')}</div>`:''}${bases.length?`<h4>本方來源母方</h4>${bases.map(v=>`<div class="edge"><span class="chip">${esc(zh('relation_type',v.relation_type||v.relation_type_normalized))}</span>${esc(v.base_formula_name)} ${v.base_formula_id?`<button class="btn" data-open-entity="${esc(v.base_formula_id)}">開節點</button>`:`<button class="btn" disabled title="此母方尚未建立獨立節點">尚未建節點</button>`}${variantDeltaHtml(v)}</div>`).join('')}`:''}</div>`;}

function renderExtensionRefs(ext,ft={}){let html=''; const zRows=(ft.zhengzhi_rows||[]), wRows=(ft.wenbing_rows||[]); if(ext.zhengzhi_row_ids?.length){ const cards=ext.zhengzhi_row_ids.slice(0,24).map(id=>{const r=zRows.find(x=>x.structured_row_id===id||x.row_id===id)||{}; const title=[r.system_chapter,r.disease_section,r.pattern_name].filter(Boolean).join('｜')||id; const body=[r.symptoms_text,r.treatment_method,r.formulas].filter(Boolean).join('；'); const q=[r.disease_section,r.pattern_name,r.formulas].filter(Boolean).join(' '); return `<div class="link-card"><div class="title">${esc(title)}</div><div class="muted">${esc(short(body,120))}</div><div class="actions"><button class="btn primary" data-zrow-query="${esc(q||title)}">到證治學頁</button><button class="btn" data-run-search="${esc(q||title)}">搜尋此列</button></div></div>`;}).join(''); html+=`<div class="card entity-section"><h3>證治學結構列</h3><div class="link-card-grid">${cards}</div></div>`;} if(ext.wenbing_state_row_ids?.length){ const cards=ext.wenbing_state_row_ids.slice(0,24).map(id=>{const r=wRows.find(x=>x.state_row_id===id||x.row_id===id)||{}; const title=[r.topic_or_disease,r.stage,r.state_name].filter(Boolean).join('｜')||id; const body=[r.symptoms_text,r.treatment_method,r.formulas].filter(Boolean).join('；'); const q=[r.topic_or_disease,r.state_name,r.formulas].filter(Boolean).join(' '); return `<div class="link-card"><div class="title">${esc(title)}</div><div class="muted">${esc(short(body,120))}</div><div class="actions"><button class="btn primary" data-wrow-query="${esc(q||title)}">到溫病學頁</button><button class="btn" data-run-search="${esc(q||title)}">搜尋此列</button></div></div>`;}).join(''); html+=`<div class="card entity-section"><h3>溫病分期／證型列</h3><div class="link-card-grid">${cards}</div></div>`;} return html;}

function renderQuestionFromEvent(e){const q=e.question||{};return `<div class="qrow"><span class="chip">${esc(e.location_standard||e.location)}</span> ${esc(q.period||e.period)} ${esc(q.subject_clean||e.subject_clean)} ${esc(q.question_no||'')}｜答案 ${esc(q.answer_label||'')} ${esc(q.answer_text||'')}<div class="muted">${esc(q.stem_preview||'')}</div><button class="btn" data-open-question="${esc(q.question_id||e.question_id)}">開題目</button></div>`}
function renderRel(r){const sid=r.target_canonical_id||r.source_canonical_id||r.target_id||r.source_id||''; const name=r.target_canonical_name||r.source_canonical_name||r.target_name||r.source_name||'';return `<div class="edge"><span class="chip">${esc(zh('relation_type',r.relation_type))}</span> ${esc(name)} ${sid?`<button class="btn" data-open-entity="${esc(sid)}">開節點</button>`:''}<div class="muted">${esc(zh('confidence',r.confidence||r.confidence_label||''))}｜${esc(r.evidence_text||r.evidence_preview||'')}</div></div>`;}
async function openQuestion(qid, record=true){if(record)commitSnapshot(makeSnapshot('question',{id:qid})); switchTab('quiz'); const root=$('#quizRoot'); root.innerHTML='<div class="card">載入題目…</div>'; let q=null; if(state.quiz){q=state.quiz.questions.find(x=>x.id===qid||x.canonical_question_id===qid);} else if(window.Clinical1LazyData?.loadQuestionById){q=await window.Clinical1LazyData.loadQuestionById(qid);} if(!q){ if(!state.quiz) await initQuiz(); q=state.quiz?.questions?.find(x=>x.id===qid||x.canonical_question_id===qid); } if(!q){root.innerHTML=`<div class="card"><button class="btn" id="backQuizHome">回考題系統</button><h3>找不到題目</h3><p class="muted">題目 id：${esc(qid)}</p><p>這代表按鈕事件已觸發，但題庫索引未找到此題；可用搜尋檢查是否為舊 id 或外部題號。</p><button class="btn primary" data-run-search="${esc(qid)}">搜尋此題號</button></div>`;$('#backQuizHome').onclick=()=>state.quiz?renderQuizHome(state.currentScope||{}):initQuiz();return;} renderQuestionDetail(q);} 
function renderQuestionDetail(q){const root=$('#quizRoot');root.innerHTML=`<div class="card"><button class="btn" id="backQuizHome">回考題系統</button><h2>${esc(q.period)} ${esc(q.subject)} ${esc(q.question_no||'')}</h2><p>${esc(q.stem)}</p><div class="question-options">${(q.options||[]).map(o=>`<div class="opt ${o.is_correct?'correct':''}"><b>${esc(o.label)}</b> ${esc(o.text)}</div>`).join('')}</div><p><b>正解：</b>${esc(q.answer_label)} ${esc(q.answer_text)}</p><div>${(q.entity_ids||[]).slice(0,20).map(id=>`<button class="btn" data-open-entity="${esc(id)}">${esc(entityNameL11(id))}</button>`).join('')}</div><details><summary>來源</summary><pre class="source-code">${esc(JSON.stringify(q.source||{},null,2))}</pre></details></div>`;$('#backQuizHome').onclick=()=>state.quiz?renderQuizHome(state.currentScope||{}):initQuiz();}

async function initQuiz(){if(state.quiz)return; try{state.quiz=await loadJSON('data/quiz/quiz_question_bank_payload.json'); state.wrongBook=JSON.parse(localStorage.getItem('clinical1_wrongbook_v3')||'[]'); state.stats=JSON.parse(localStorage.getItem('clinical1_quiz_stats_v3')||'{}'); renderQuizHome(state.currentScope||{});}catch(e){$('#quizRoot').innerHTML=`<div class="card"><h3>考題系統載入失敗</h3><pre>${esc(e.stack||e.message||e)}</pre></div>`;}}
function renderQuizHome(scope={}){
  state.currentScope=scope||{};
  const root=$('#quizRoot');
  const books=Object.keys(state.quiz.indices.by_book||{}).sort();
  const years=Object.keys(state.quiz.indices.by_year||{}).sort();
  const periods=Object.keys(state.quiz.indices.by_period||{}).sort();
  const sections=Object.entries(state.quiz.sections||{}).slice(0,1200);
  const slabel=scopeLabel(state.currentScope);
  const isScoped=!!slabel;
  root.innerHTML=`<div class="card"><h2>全庫考題系統</h2>
  <p class="muted">預設使用全題庫、上限 200 題。從知識樹綱目聯動進來時會直接套用該綱目與下層題目 ID；按「出題」即可，不必再切換設定。</p>
  ${slabel?`<div class="scope-banner"><b>目前套用出題範圍：</b>${esc(slabel)}<button class="btn danger" id="clearScope">取消此範圍</button></div>`:`<div class="scope-banner neutral"><b>目前套用出題範圍：</b>全題庫。可用下方「進階設定」縮小範圍。</div>`}
  <div class="quick-quiz-bar">
    <label>題源<select id="quizLayer"><option value="all">全題庫可練題</option><option value="official_exam">只練歷屆官方考題</option><option value="bula_note">Bula 筆記題</option><option value="seed_drill">方劑原文對應／輔助題</option><option value="wrongbook">錯題本</option></select></label>
    <label>年份<select id="quizYear"><option value="">全部年份</option>${years.map(y=>`<option value="${esc(y)}">${esc(y)} 年</option>`).join('')}</select></label>
    <label>期別<select id="quizPeriod"><option value="">全部期別</option>${periods.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('')}</select></label>
    <label>本次最多題數<input id="quizLimit" type="number" min="1" max="1000" value="200"></label>
    <label>排序<select id="quizOrder"><option value="random">隨機</option><option value="source">依書本／章節</option><option value="period_desc">年份新到舊</option><option value="period_asc">年份舊到新</option></select></label>
    <button class="btn primary big-action" id="makePaper">出題</button>
    <button class="btn" id="continueUnseen">續考此範圍未作答題</button>
    <button class="btn" id="previewScope">預覽題數</button>
  </div>
  <details class="advanced-quiz-box"><summary>進階設定：章節、病類、題型、方劑關鍵字</summary>
    <div class="quiz-settings-grid">
      <label>書本<select id="quizBook"><option value="">全部書本</option>${books.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('')}</select></label>
      <label>章節<select id="quizSection"><option value="">全部章節</option>${sections.map(([id,s])=>`<option value="${esc(id)}">${esc(s.book_id||'')}｜${esc(short(s.title||s.section_title||id,42))}</option>`).join('')}</select></label>
      <label>病類／主題<input id="quizTopic" placeholder="例：痙病、咳嗽、伏暑"></label>
      <label>題型<select id="quizQType"><option value="all">全部題型</option><option value="single">單選／一般選擇</option><option value="multi_or_all_credit">多答案／均給分</option><option value="low_confidence">需抽審／低信心</option></select></label>
      <label>方劑關鍵字<input id="quizFormulaKw" placeholder="例：葛根湯、桂枝、救逆"></label>
      <label>題幹／選項關鍵字<input id="quizKeyword" placeholder="例：口噤、無汗、小便不利"></label>
    </div>
    <div class="toolbar"><label class="checkline"><input id="quizUseAll" type="checkbox"> 使用全部符合題目</label><label class="checkline"><input id="quizShuffleOptions" type="checkbox"> 打亂選項</label><label class="checkline"><input id="quizIncludeLow" type="checkbox"> 包含需抽審／低信心題</label><label class="checkline"><input id="quizUnseenOnly" type="checkbox"> 只出本機未作答題</label></div>
  </details>
  <div class="wrongbook-actions"><button class="btn" id="showWrongBook">查看錯題本</button><button class="btn" id="exportWrongBook">匯出錯題本 JSON</button><button class="btn danger" id="clearWrongBook">清空錯題本</button></div>
  <div class="muted">本機統計：作答 ${state.stats.done||0} 題｜正確 ${state.stats.correct||0} 題｜錯題本 ${state.wrongBook.length} 題</div>
  </div><div id="quizPreview"></div><div id="quizPaper"></div>`;
  if(scope.layer) $('#quizLayer').value=scope.layer; else $('#quizLayer').value='all';
  if(hasPinnedQuestionScope(scope)) $('#quizLayer').value='all';
  if(scope.book_id && !hasPinnedQuestionScope(scope)) $('#quizBook').value=scope.book_id;
  if(scope.year) $('#quizYear').value=scope.year;
  if(scope.period) $('#quizPeriod').value=scope.period;
  if(scope.section_id && !hasPinnedQuestionScope(scope)) $('#quizSection').value=scope.section_id;
  if(scope.keyword) $('#quizKeyword').value=scope.keyword;
  $('#quizUseAll').onchange=()=>{$('#quizLimit').disabled=$('#quizUseAll').checked};
  $('#clearScope')?.addEventListener('click',()=>{state.currentScope={};renderQuizHome({})});
  $('#previewScope').onclick=()=>{const all=filterQuestions(true);const strict=state.currentScope?.tree_scope&&state.currentScope?.strict_question_ids;$('#quizPreview').innerHTML=`<div class="card"><b>符合目前範圍題數：</b>${all.length} 題<div class="muted">題源：${hasPinnedQuestionScope(state.currentScope)?'知識樹指定題組':esc(zh('layer',$('#quizLayer').value))}｜年份：${esc($('#quizYear').value||'全部')}｜期別：${esc($('#quizPeriod').value||'全部')}｜書本：${esc($('#quizBook').value||'全部')}｜章節：${esc(($('#quizSection option:checked')?.textContent||'')||'全部')}｜關鍵字：${esc($('#quizKeyword').value||'未限制')}</div>${all.length===0?(strict?'<div class="warn-box">此 PDF 綱目範圍沒有可對應的題目 ID；為避免錯誤出題，系統不會改用關鍵字或全題庫 fallback。</div>':'<div class="warn-box">目前範圍沒有題目。請放寬題源／取消只出未作答，或按「取消此範圍」回全題庫。</div>'):''}</div>`};
  $('#makePaper').onclick=()=>makeQuizPaper();
  $('#continueUnseen').onclick=()=>{ $('#quizUnseenOnly').checked=true; makeQuizPaper(); };
  $('#showWrongBook').onclick=()=>renderWrongBookPanel();
  $('#exportWrongBook').onclick=()=>{const blob=new Blob([JSON.stringify({wrongBook:state.wrongBook,stats:state.stats},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='clinical1_wrongbook.json'; a.click();};
  $('#clearWrongBook').onclick=()=>{if(confirm('確定清空錯題本？')){state.wrongBook=[];localStorage.setItem('clinical1_wrongbook_v3','[]');renderQuizHome(state.currentScope||{});}};
  $('#previewScope').click();
  if(isScoped){ setTimeout(()=>makeQuizPaper(),120); }
}
function renderWrongBookPanel(){
  const panel=$('#quizPreview');
  const ids=state.wrongBook||[];
  if(!ids.length){panel.innerHTML='<div class="card"><h3>錯題本</h3><p class="muted">目前沒有錯題。交卷後答錯的題目會自動加入。</p></div>';return;}
  const rows=ids.map(id=>state.quiz.questions.find(q=>q.id===id)).filter(Boolean);
  panel.innerHTML=`<div class="card"><h3>錯題本</h3><p class="muted">共 ${rows.length} 題。可單題移除、用錯題本直接出卷，或清空錯題本。</p><div class="wrongbook-actions"><button class="btn primary" data-wrong-make-exam="1">用錯題本產生考卷</button><button class="btn danger" id="clearWrongBookInline">清空錯題本</button></div>${rows.map(q=>`<div class="qrow wrongbook-item"><b>${esc(q.period)} ${esc(q.subject)} ${esc(q.question_no||'')}</b><p>${esc(short(q.stem,180))}</p><div class="muted">正解：${esc(q.answer_label)} ${esc(q.answer_text||'')}</div><button class="btn" data-open-question="${esc(q.id)}">開題目</button><button class="btn danger" data-remove-wrong="${esc(q.id)}">移出錯題本</button></div>`).join('')}</div>`;
  $('#clearWrongBookInline')?.addEventListener('click',()=>{if(confirm('確定清空錯題本？')){state.wrongBook=[];localStorage.setItem('clinical1_wrongbook_v3','[]');renderQuizHome(state.currentScope||{});}});
}

function getAnsweredSet(){return new Set(Object.keys(JSON.parse(localStorage.getItem('clinical1_answered_questions_v3')||'{}')))}
function getSectionDescendants(sectionId){
  const out=new Set(); if(!sectionId||!state.quiz?.sections)return out;
  const stack=[sectionId];
  while(stack.length){const cur=stack.pop(); if(out.has(cur))continue; out.add(cur); Object.entries(state.quiz.sections||{}).forEach(([id,s])=>{if(String(s.parent_section_id||'')===String(cur))stack.push(id);});}
  return out;
}
function buildScopeKeywords(scope){
  const kws=[]; scope=scope||{};
  const stop=new Set(['脈浮','身重','自汗出','小便不利']);
  const add=x=>{String(x||'').split(/[\/|；;，,、\n]+/).forEach(y=>{y=y.replace(/^\s*[一二三四五六七八九十百〇零0-9]+[、.．。]?\s*/,'').replace(/[：:()（）【】「」『』]/g,' ').trim(); if(y.length>=2&&!stop.has(y))kws.push(y);});};
  add(scope.tree_label); add(scope.tree_path); add(scope.keyword); (scope.keywords||[]).forEach(add);
  const addSec=id=>{const s=state.quiz.sections?.[id]; if(s){add(s.title||s.section_title||''); let p=s.parent_section_id; let guard=0; while(p&&state.quiz.sections?.[p]&&guard++<4){const ps=state.quiz.sections[p]; add(ps.title||ps.section_title||''); p=ps.parent_section_id;}}};
  if(scope.section_id)addSec(scope.section_id); (scope.section_ids||[]).forEach(addSec);
  if(scope.entity_id)add(state.quiz.entities?.[scope.entity_id]?.name||'');
  if(scope.entity_ids?.length)scope.entity_ids.forEach(id=>add(state.quiz.entities?.[id]?.name||id));
  return uniqueList(kws).filter(x=>x.length>=2).slice(0,80);
}
function questionRank(q){
  const lp={official_exam:0,bula_note:1,seed_drill:2,fragment_or_excluded:9};
  return [lp[q?.layer]??5, q?.include_in_official_statistics?0:1, ['primary','canonical',''].includes(String(q?.dedup_role||''))?0:2, String(q?.id||'').length].join('|');
}
function questionLogicalKey(q){
  const nums=String(q?.question_no||'').match(/\d+/g);
  const no=nums&&nums.length?String(Number(nums[nums.length-1])):String(q?.question_no||'');
  if(q?.period && q?.question_no) return ['period_no',q.period,q.subject||'',no].join('::');
  return q?.canonical_question_id||q?.id;
}
function dedupeQuestionsByCanonical(rows){
  const m=new Map();
  (rows||[]).forEach(q=>{const k=questionLogicalKey(q); if(!k)return; const old=m.get(k); if(!old || questionRank(q)<questionRank(old))m.set(k,q);});
  return [...m.values()];
}
function scopeFilterQuestions(arr,scope){
  scope=scope||{}; let out=arr;
  const qids=uniqueList([...asList(scope.question_ids),...asList(scope.questions)]);
  if(qids.length){const set=new Set(qids); return out.filter(q=>set.has(q.id)||set.has(q.canonical_question_id));}
  if(scope.tree_scope && scope.strict_question_ids) return [];
  if(scope.book_id) out=out.filter(q=>q.book_id===scope.book_id||q.book_scope===scope.book_id);
  const applySections=(ids)=>{
    ids=uniqueList(ids); if(!ids.length)return null;
    const desc=new Set(); ids.forEach(id=>getSectionDescendants(id).forEach(x=>desc.add(x)));
    const indexed=new Set(); desc.forEach(id=>(state.quiz.indices.by_section?.[id]||[]).forEach(qid=>indexed.add(qid)));
    return out.filter(q=>desc.has(q.section_id)||indexed.has(q.id));
  };
  const secIds=uniqueList([scope.section_id,...asList(scope.section_ids)]);
  if(secIds.length){let bySec=applySections(secIds)||[]; if(!bySec.length){const kws=buildScopeKeywords(scope); bySec=out.filter(q=>kws.some(k=>qText(q).includes(k)));} out=bySec;}
  const entIds=uniqueList([scope.entity_id,...asList(scope.entity_ids)]);
  if(entIds.length){let byEnt=out.filter(q=>entIds.some(id=>(q.entity_ids||[]).includes(id)||(state.quiz.indices.by_entity?.[id]||[]).includes(q.id))); if(!byEnt.length){const names=entIds.map(id=>state.quiz.entities?.[id]?.name||id).filter(Boolean); byEnt=out.filter(q=>names.some(n=>qText(q).includes(n)));} out=byEnt;}
  if(scope.formula_family_id) out=out.filter(q=>(q.formula_family_ids||[]).includes(scope.formula_family_id)||(state.quiz.indices.by_formula_family?.[scope.formula_family_id]||[]).includes(q.id));
  const kws=buildScopeKeywords(scope);
  if(kws.length && !entIds.length && !secIds.length && !scope.formula_family_id){
    let byKw=out.filter(q=>kws.some(k=>qText(q).includes(k)));
    if(!byKw.length && scope.tree_scope){byKw=[];}
    if(byKw.length || scope.tree_scope) out=byKw;
  }
  return out;
}
function filterQuestions(returnAll=false){
  const layer=$('#quizLayer').value, year=$('#quizYear')?.value||'', period=$('#quizPeriod')?.value||'', book=$('#quizBook').value, section=$('#quizSection').value, kw=$('#quizKeyword').value.trim(), formulaKw=$('#quizFormulaKw').value.trim(), topic=$('#quizTopic').value.trim(), qtype=$('#quizQType').value, order=$('#quizOrder').value, useAll=$('#quizUseAll')?.checked, limit=Number($('#quizLimit').value||200), includeLow=$('#quizIncludeLow')?.checked, unseenOnly=$('#quizUnseenOnly')?.checked, scope=state.currentScope||{};
  let arr=state.quiz.questions||[];
  const pinnedScope=hasPinnedQuestionScope(scope);
  if(pinnedScope){
    // Knowledge-tree PDF TOC scopes carry exact question_ids. Apply them before UI layer/book filters
    // so a chapter such as「溫病的病因與發病」or「太陽病分類」will not collapse to 0 because the
    // dropdown is still on official_exam or a book_id that does not match duplicate Bula/PDF IDs.
    arr=dedupeQuestionsByCanonical(scopeFilterQuestions(arr,scope));
  } else {
    if(layer==='wrongbook') arr=arr.filter(q=>state.wrongBook.includes(q.id)); else if(layer!=='all') arr=arr.filter(q=>q.layer===layer);
    if(book) arr=arr.filter(q=>q.book_id===book||q.book_scope===book);
    if(section) arr=scopeFilterQuestions(arr,{section_id:section});
    const beforeScope=arr; arr=scopeFilterQuestions(arr,scope);
    if(!arr.length && scope && Object.keys(scope).length && scope.book_id && !scope.tree_scope && !(scope.question_ids||[]).length){ arr=scopeFilterQuestions(beforeScope,{book_id:scope.book_id}); }
  }
  if(year) arr=arr.filter(q=>String(q.period||'').startsWith(year+'-'));
  if(period) arr=arr.filter(q=>String(q.period||'')===period);
  const txt=q=>[q.stem,q.answer_text,(q.options||[]).map(o=>o.text).join(' '),q.book_scope,q.period,q.subject].join(' ');
  if(kw) arr=arr.filter(q=>txt(q).includes(kw));
  if(formulaKw) arr=arr.filter(q=>txt(q).includes(formulaKw)||(q.entities&&JSON.stringify(q.entities).includes(formulaKw))||(q.formula_ids||[]).some(id=>String(state.quiz.entities?.[id]?.name||id).includes(formulaKw)));
  if(topic) arr=arr.filter(q=>txt(q).includes(topic)||(q.section_id&&String(q.section_id).includes(topic)));
  if(qtype==='multi_or_all_credit') arr=arr.filter(q=>String(q.answer_label||'').length>1||String(q.answer_text||'').includes('均給分')||String(q.answer_text||'').includes('皆可'));
  if(qtype==='low_confidence') arr=arr.filter(q=>String(q.source?.confidence||'').includes('low')||String(q.tags?.fragment_reason||'').includes('review'));
  if(qtype==='single') arr=arr.filter(q=>String(q.answer_label||'').length===1);
  if(!includeLow) arr=arr.filter(q=>q.layer!=='fragment_or_excluded');
  if(unseenOnly){const answered=getAnsweredSet(); arr=arr.filter(q=>!answered.has(q.id));}
  if(order==='random') arr=[...arr].sort(()=>Math.random()-0.5);
  if(order==='period_desc') arr=[...arr].sort((a,b)=>String(b.period||'').localeCompare(String(a.period||'')));
  if(order==='period_asc') arr=[...arr].sort((a,b)=>String(a.period||'').localeCompare(String(b.period||'')));
  if(order==='source') arr=[...arr].sort((a,b)=>String(a.book_scope||a.book_id||'').localeCompare(String(b.book_scope||b.book_id||''))||String(a.section_id||'').localeCompare(String(b.section_id||'')));
  if(returnAll||useAll)return arr;
  return arr.slice(0,Math.max(1,limit));
}
function shuffleArray(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function makeQuizPaper(){
  const all=filterQuestions(true); let qs=filterQuestions(false); const shuffle=$('#quizShuffleOptions')?.checked;
  if(!qs.length){ const strict=state.currentScope?.tree_scope&&state.currentScope?.strict_question_ids; $('#quizPreview').innerHTML=`<div class="card"><b>符合題目：</b>${all.length} 題｜<b>本次出題：</b>0 題<div class="warn-box">${strict?'此 PDF 綱目範圍沒有可對應的題目 ID；已停止出題，避免誤抓全題庫或關鍵字題。':'這個範圍暫時沒有可出題目。可按「取消此範圍」回全題庫，或放寬題源／取消只出未作答。'}</div></div>`; $('#quizPaper').innerHTML=''; return; }
  state.currentExam=qs.map(q=>shuffle?Object.assign({},q,{options:shuffleArray(q.options||[])}):q);
  const slabel=scopeLabel(state.currentScope);
  $('#quizPreview').innerHTML=`<div class="card"><b>符合題目：</b>${all.length} 題｜<b>本次出題：</b>${state.currentExam.length} 題${slabel?`<div class="scope-banner compact"><b>本考卷套用範圍：</b>${esc(slabel)}</div>`:''}${state.currentScope?.scope_note?`<div class="muted">${esc(state.currentScope.scope_note)}</div>`:''}<div class="muted">若要續考，按「續考此範圍未作答題」會排除本機已作答題。</div></div>`;
  $('#quizPaper').innerHTML=`<div class="quiz-paper">${state.currentExam.map((q,i)=>`<div class="qrow"><h3>${i+1}. ${esc(q.period)} ${esc(q.subject)} ${esc(q.question_no||'')}</h3><p>${esc(q.stem)}</p><div class="question-options">${(q.options||[]).map(o=>`<label class="opt"><input type="radio" name="q_${i}" value="${esc(o.label)}"> <b>${esc(o.label)}</b> ${esc(o.text)}</label>`).join('')}</div><div class="muted">題源：${esc(zh('layer',q.layer))}｜書本：${esc(q.book_scope||q.book_id)}｜題號：${esc(q.id)}</div></div>`).join('')}<div class="quiz-actions"><button class="btn primary" id="gradePaper">交卷並批改</button></div></div>`;
  $('#gradePaper').onclick=gradePaper;
}

function correctLabelsFor(q){
  const labs=[];
  if(Array.isArray(q.answer_labels)) q.answer_labels.forEach(x=>{String(x||'').split(/[\/、,， ]+/).forEach(y=>{y=y.trim(); if(/^[ABCD]$/.test(y)&&!labs.includes(y))labs.push(y);});});
  String(q.answer_label||'').split(/[\/、,， ]+/).forEach(y=>{y=y.trim(); if(/^[ABCD]$/.test(y)&&!labs.includes(y))labs.push(y);});
  (q.options||[]).filter(o=>o.is_correct).forEach(o=>{const y=String(o.label||'').trim(); if(/^[ABCD]$/.test(y)&&!labs.includes(y))labs.push(y);});
  return labs;
}
function gradePaper(){
  let correct=0;
  const rows=$$('.quiz-paper .qrow');
  const answered=JSON.parse(localStorage.getItem('clinical1_answered_questions_v3')||'{}');
  state.currentExam.forEach((q,i)=>{
    const val=$(`input[name="q_${i}"]:checked`)?.value||'';
    const correctLabels=correctLabelsFor(q);
    const ok=!!val && correctLabels.includes(val);
    if(ok) correct++; else if(!state.wrongBook.includes(q.id)) state.wrongBook.push(q.id);
    answered[q.id]={last_answer:val,correct:ok,at:new Date().toISOString()};
    const row=rows[i];
    row.classList.add(ok?'question-correct':'question-wrong');
    $$('.opt',row).forEach(opt=>{
      const input=opt.querySelector('input');
      const label=input?.value||'';
      if(correctLabels.includes(label)) opt.classList.add('correct-answer');
      if(label===val && !ok) opt.classList.add('selected-wrong');
      if(label===val && ok) opt.classList.add('selected-correct');
    });
    row.insertAdjacentHTML('beforeend',`<div class="grade-card ${ok?'ok':'bad'}"><b>${ok?'正確':'錯誤'}</b><span>作答：${esc(val||'未作答')}</span><span>正解：${esc(correctLabels.join('/') || q.answer_label || '待補')} ${esc(q.answer_text)}</span><div class="grade-links">${(q.entity_ids||[]).slice(0,10).map(id=>`<button class="btn" data-open-entity="${esc(id)}">${esc(entityNameL11(id))}</button>`).join('')}</div></div>`);
  });
  state.stats.done=(state.stats.done||0)+state.currentExam.length;
  state.stats.correct=(state.stats.correct||0)+correct;
  localStorage.setItem('clinical1_wrongbook_v3',JSON.stringify(state.wrongBook));
  localStorage.setItem('clinical1_quiz_stats_v3',JSON.stringify(state.stats));
  localStorage.setItem('clinical1_answered_questions_v3',JSON.stringify(answered));
  $('.quiz-actions').innerHTML=`<b>批改完成：</b>${correct}/${state.currentExam.length}<button class="btn" id="showWrongAfterGrade">查看錯題本</button>`;
  $('#showWrongAfterGrade')?.addEventListener('click',renderWrongBookPanel);
}

window.startQuizByScope=async function(scope, record=true){if(record)commitSnapshot(makeSnapshot('quiz_scope',{scope:scope||{}})); switchTab('quiz'); await initQuiz(); renderQuizHome(scope||{});};

let learningLoaded=false; async function initLearning(){if(learningLoaded&&window.Clinical1LearningInstance)return window.Clinical1LearningInstance; learningLoaded=true; $('#learningRoot').innerHTML='<div class="spinner">載入學習頁題型分析…</div>'; try{window.Clinical1LearningInstance=await Clinical1LearningPage.mount('#learningRoot',{payloadUrl:'data/learning_exam_pattern_payload_v5_0a.json'}); return window.Clinical1LearningInstance;}catch(e){$('#learningRoot').innerHTML=`<div class="card"><h3>學習頁載入失敗</h3><p class="muted">請重新整理頁面，或確認網站資料檔可正常存取。</p><pre>${esc(e.stack||e.message||e)}</pre></div>`;}}
let treeLoaded=false; async function initTree(){if(treeLoaded&&window.Clinical1KnowledgeTreeInstance)return window.Clinical1KnowledgeTreeInstance; treeLoaded=true; $('#knowledgeTreeRoot').innerHTML='<div class="spinner">載入知識樹…</div>'; try{window.Clinical1KnowledgeTreeInstance=await Clinical1KnowledgeTree.mount('#knowledgeTreeRoot',{payloadUrl:'data/knowledge_tree_payload_v3.json',disableCenterView:true}); return window.Clinical1KnowledgeTreeInstance;}catch(e){treeLoaded=false;$('#knowledgeTreeRoot').innerHTML=`<div class="card"><h3>知識樹載入失敗</h3><pre>${esc(e.stack||e.message||e)}</pre></div>`;}}
let relationGraphLoaded=false; async function initRelationGraph(){
  const ensureRendered = (kt)=>{
    if(!kt) return kt;
    kt.state.view='entity_center';
    kt.state.centerDepth=Number(kt.state.centerDepth)||1;
    kt.state.centerLimit=Number(kt.state.centerLimit)||160;
    kt.state.centerDirection=kt.state.centerDirection||'both';
    const target = state.lastEntityId || window.__clinical1CurrentRelationEntity || kt.state.selectedEntity || kt.getDefaultCenterEntity?.() || null;
    if(target) kt.state.selectedEntity=target;
    if(typeof kt.setGraphOnly==='function') kt.setGraphOnly(true);
    // Re-render every time the left tab is opened; never leave the relation tab
    // in a normal knowledge-tree view.
    kt.renderTreeView('entity_center');
    return kt;
  };
  if(relationGraphLoaded&&state.relationGraph)return ensureRendered(state.relationGraph);
  relationGraphLoaded=true;
  $('#relationGraphRoot').innerHTML='<div class="spinner">載入關係圖…</div>';
  state.relationGraph=await Clinical1KnowledgeTree.mount('#relationGraphRoot',{payloadUrl:'data/knowledge_tree_payload_v3.json',relationMode:true});
  return ensureRendered(state.relationGraph);
} 
let pivotLoaded=false; async function initPivot(){if(pivotLoaded)return; pivotLoaded=true; $('#pivotRoot').innerHTML='<div class="spinner">載入樞紐分析…</div>'; try{await Clinical1PivotAnalysis.mount('#pivotRoot','data/pivot_analysis_payload.json');}catch(e){$('#pivotRoot').innerHTML=`<div class="card"><h3>樞紐分析載入失敗</h3><pre>${esc(e.stack||e.message||e)}</pre></div>`;}}
let qhLoaded=false; async function initQuestionHotspot(){if(qhLoaded&&window.Clinical1QuestionHotspotInstance)return window.Clinical1QuestionHotspotInstance; qhLoaded=true; try{window.Clinical1QuestionHotspotInstance=await Clinical1QuestionHotspotModule.mount($('#questionHotspotRoot'),{payloadUrl:'data/question_hotspot_payload_v3_1.json'}); return window.Clinical1QuestionHotspotInstance;}catch(e){qhLoaded=false;$('#questionHotspotRoot').innerHTML=`<div class="card"><h3>考題熱點載入失敗</h3><pre>${esc(e.stack||e.message||e)}</pre></div>`;}} 
let ftLoaded=false; async function initFormulaTools(){if(ftLoaded)return; ftLoaded=true; try{await Clinical1FormulaToolsModule.mount($('#formulaToolsRoot'),{payloadUrl:'data/formula_tools_payload_v3_1.json'});}catch(e){ftLoaded=false;$('#formulaToolsRoot').innerHTML=`<div class="card"><h3>方劑工具載入失敗</h3><pre>${esc(e.stack||e.message||e)}</pre></div>`;}} 
const spLoaded={}; async function initSourcePage(book){if(spLoaded[book])return; spLoaded[book]=true; try{await Clinical1SourcePagesModule.mount($('#'+book+'Root'),{payloadUrl:'data/source_pages_payload_v3_1.json',book});}catch(e){spLoaded[book]=false;$('#'+book+'Root').innerHTML=`<div class="card"><h3>${esc(book)} 載入失敗</h3><pre>${esc(e.stack||e.message||e)}</pre></div>`;}}
let zzLoaded=false; async function initZhengzhi(){if(zzLoaded)return; zzLoaded=true; try{await Clinical1SourcePagesModule.mount($('#zhengzhiRoot'),{payloadUrl:'data/source_pages_payload_v3_1.json',book:'zhengzhi'});}catch(e){zzLoaded=false;$('#zhengzhiRoot').innerHTML=`<div class="card"><h3>證治學資料頁載入失敗</h3><pre>${esc(e.stack||e.message||e)}</pre></div>`;}} 
let diagLoaded=false; async function initDiagnosis(){if(diagLoaded)return; diagLoaded=true; try{await Clinical1SourcePagesModule.mount($('#diagnosisRoot'),{payloadUrl:'data/source_pages_payload_v3_1.json',book:'diagnosis'});}catch(e){diagLoaded=false;$('#diagnosisRoot').innerHTML=`<div class="card"><h3>診斷學資料頁載入失敗</h3><pre>${esc(e.stack||e.message||e)}</pre></div>`;}} 

async function renderHealth(){const root=$('#healthRoot'); const manifest=await loadJSON('data/frontend_fused_manifest_v3.json').catch(()=>({})); const sum=await loadJSON('data/fused_database_v3_summary_metrics.json').catch(()=>({})); const quiz=await loadJSON('data/quiz/quiz_question_bank_payload.json').catch(()=>({metadata:{}})); const src=await loadJSON('data/source_pages_payload_v3_1.json').catch(()=>({wenbing_states:[],clauses:{},sections:{}})); const formula=await loadJSON('data/formula_tools_payload_v3_1.json').catch(()=>({meta:{},formulas:[]})); const pivot=await loadJSON('data/pivot_analysis_payload.json').catch(()=>({metadata:{}})); const official=quiz.metadata?.official_exam_count||sum.official_questions||3625; const stats=[{n:official,label:'歷屆考題',desc:'官方題與筆記題分層，保留答案疑義'}, {n:(src.wenbing_states||[]).length,label:'溫病辨證狀態',desc:'病類／分層／三焦／方劑／症狀'}, {n:Object.values(src.sections||{}).flat().length,label:'綱目節點',desc:'五本 PDF 章節骨架'}, {n:(sum.fused_entities||7083)+(sum.fused_questions||7713),label:'可查資料項',desc:'節點／章節／題目／條文／表格列'}, {n:5,label:'主書模組',desc:'傷寒、金匱、溫病、證治、診斷'}, {n:(sum.fused_relations||34282),label:'縱橫關聯',desc:'跨書圖譜層 links'}, {n:(formula.meta?.formula_count||formula.formulas?.length||845),label:'方劑資料卡',desc:'含組成、來源版本、變方與方族'}, {n:(pivot.metadata?.hotspot_rows||0),label:'分析資料列',desc:'熱點、共現、趨勢、覆蓋率'}]; root.innerHTML=`<div class="grid stat-grid big">${stats.map(s=>`<div class="stat-card"><b>${esc(s.n)}</b><div class="label">${esc(s.label)}</div><div class="desc">${esc(s.desc)}</div></div>`).join('')}</div><div class="grid health-section"><div class="card"><h3>資料說明</h3><p>本系統整合五本臨床一資料、歷屆考題、章節綱目、方劑與相關節點。統計結果供讀書參考，正式判讀仍應回到原始題目與教材內容確認。</p></div><div class="card"><h3>功能範圍</h3><ul><li>搜尋：查找方劑、病證、證型、章節與考題</li><li>知識樹：依章節綱目讀書與出題</li><li>考題：指定範圍練題、交卷與詳解檢視</li><li>分析：查看高頻考點、選項分布與章節趨勢</li><li>方劑：查組成、類方、變方與方族</li></ul></div><div class="card"><h3>快速入口</h3><button class="btn" data-run-search="桂枝湯">測：桂枝湯</button><button class="btn" data-run-search="氣分兼表">測：氣分兼表</button><button class="btn" data-run-search="咳嗽 痰熱鬱肺">測：咳嗽 痰熱鬱肺</button><button class="btn" data-run-search="舌紅少苔">測：舌紅少苔</button></div></div>`;}

document.addEventListener('click',async e=>{const prev=e.target.closest('#globalPrevTab');if(prev){await moveHistory(-1);return} const next=e.target.closest('#globalNextTab');if(next){await moveHistory(1);return} const tab=e.target.closest('#navTabs button');if(tab){navigateTab(tab.dataset.tab);return} const jump=e.target.closest('[data-jump-tab]');if(jump){navigateTab(jump.dataset.jumpTab);return} const ent=e.target.closest('[data-open-entity],[data-entity-id]');if(ent){const id=ent.dataset.openEntity||ent.dataset.entityId;if(id){await openEntity(id);return}} const q=e.target.closest('[data-open-question],[data-question-id]');if(q){const id=q.dataset.openQuestion||q.dataset.questionId;if(id){await openQuestion(id);return}} const qs=e.target.closest('[data-quiz-scope]');if(qs){const parsed=parseQuizScope(qs.dataset.quizScope); if(parsed) window.startQuizByScope(parsed); return} const zr=e.target.closest('[data-zrow-query]');if(zr){switchTab('zhengzhi');await initZhengzhi();const input=$('#zz-search'); if(input){input.value=zr.dataset.zrowQuery; input.dispatchEvent(new Event('input')); input.scrollIntoView({behavior:'smooth',block:'center'});}return} const wr=e.target.closest('[data-wrow-query]');if(wr){switchTab('wenbing');await initSourcePage('wenbing');const input=$('#sp-search'); if(input){input.value=wr.dataset.wrowQuery; $('#sp-run')?.click(); input.scrollIntoView({behavior:'smooth',block:'center'});}return} const fa=e.target.closest('[data-formula-action]');if(fa){switchTab('formulaTools');await initFormulaTools();if(window.Clinical1FormulaToolsInstance){window.Clinical1FormulaToolsInstance.open(fa.dataset.formulaAction,fa.dataset.formulaQuery||'');}return} const rm=e.target.closest('[data-remove-wrong]');if(rm){state.wrongBook=(state.wrongBook||[]).filter(id=>id!==rm.dataset.removeWrong);localStorage.setItem('clinical1_wrongbook_v3',JSON.stringify(state.wrongBook));renderWrongBookPanel();return} const wmake=e.target.closest('[data-wrong-make-exam]');if(wmake){$('#quizLayer').value='wrongbook';makeQuizPaper();return} const run=e.target.closest('[data-run-search]');if(run){commitSnapshot(makeSnapshot('search',{query:run.dataset.runSearch||''})); switchTab('search');$('#searchInput').value=run.dataset.runSearch;$('#searchBtn').click();return} const tree=e.target.closest('[data-tree-entity]');if(tree){const id=tree.dataset.treeEntity; commitSnapshot(makeSnapshot('relation_entity',{id})); switchTab('relationGraph');const kt=await initRelationGraph(); if(kt&&id){kt.focusEntity(id);} else {window.dispatchEvent(new CustomEvent('clinical1:tree-entity-focus',{detail:{entity_id:id}}));} return} const ht=e.target.closest('[data-hotspot-test]');if(ht){const id=ht.dataset.hotspotTest; commitSnapshot(makeSnapshot('hotspot_test',{id})); switchTab('qhotspot');const qh=await initQuestionHotspot(); if(qh&&id){await qh.openTest(id); const box=document.querySelector('#qh-test-result'); if(box)box.scrollIntoView({behavior:'smooth',block:'start'});} return}});
function bindGlobal(target){target.addEventListener('clinical1:entity-selected',e=>{if(e.detail?.entity_id)openEntity(e.detail.entity_id)});target.addEventListener('clinical1:question-selected',e=>{if(e.detail?.question_id)openQuestion(e.detail.question_id)});target.addEventListener('clinical1:quiz-scope-requested',e=>{window.startQuizByScope(e.detail||{})});target.addEventListener('clinical1:pivot-row-selected',e=>{const d=e.detail||{};if(d.entity_id)openEntity(d.entity_id);else if(d.canonical_id)openEntity(d.canonical_id);else if(d.answer_formula_id)openEntity(d.answer_formula_id)});} bindGlobal(window);bindGlobal(document);
$('#themeSelect').onchange=e=>document.documentElement.dataset.theme=e.target.value; $$('#navTabs button').forEach(b=>b.onclick=(ev)=>{ev.preventDefault(); ev.stopPropagation(); navigateTab(b.dataset.tab);}); renderGuidePage(); initSearch().catch(e=>{
  const root=document.querySelector('#searchRoot');
  if(root){root.innerHTML=`<div class="card"><h3>首頁載入失敗</h3><p>通常是網址或資料路徑不正確。</p><pre>${esc(e.stack||e.message||e)}</pre><p class="muted">請重新整理頁面，或確認網址指向網站根目錄。</p></div>`;}
  console.error(e);
});
})();
