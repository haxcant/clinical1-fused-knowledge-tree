(function(global){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const zh=v=>({usable:'可用',needs_sample_review:'需抽樣確認',candidate:'候選',high:'高可信',medium:'中可信',low:'低可信',structured_table_support:'結構表支持',explicit_clause:'條文連結',pdf_toc:'PDF 綱目'}[String(v)]||String(v||'').replace(/_/g,' '));
  function splitIds(s){return Array.isArray(s)?s:String(s||'').split(/[；;|,，]/).map(x=>x.trim()).filter(Boolean)}
  function btnEntity(id,label){return id?`<button class="btn" data-open-entity="${esc(id)}">${esc(label||id)}</button>`:''}
  function uniq(arr){return [...new Set((arr||[]).filter(Boolean))]}
  function short(s,n=120){s=String(s||'');return s.length>n?s.slice(0,n)+'…':s}
  function bookScope(module){
    const ids=uniq((module.sections||[]).flatMap(s=>s.question_ids||[]));
    const obj={layer:'official_exam',book_id:module.book,source_page_book_scope:true,section_label:(module.bookInfo.label||module.book)};
    if(ids.length) obj.question_ids=ids;
    return obj;
  }
  function scopeFor(sec, book){
    const ids=uniq(sec.question_ids||[]);
    const obj={layer:'official_exam',book_id:book,source_page_scope:true,section_id:sec.section_id,section_label:sec.section_title,keywords:[sec.section_title].concat(sec.scope_keywords||[])};
    if(ids.length) obj.question_ids=ids;
    return obj;
  }
  function markerChips(sec){
    const xs=(sec.question_markers||[]).slice(0,18);
    if(!xs.length)return '<span class="muted">此綱目未在 PDF 中直接標出歷屆題；可用書本或關鍵字出題。</span>';
    return xs.map(x=>`<span class="chip">${esc(x)}</span>`).join('')+(sec.question_markers.length>18?` <span class="muted">另 ${sec.question_markers.length-18} 題</span>`:'');
  }
  class SourcePagesModule{
    constructor(root,payload,book){this.root=typeof root==='string'?document.querySelector(root):root;this.p=payload;this.book=book||'shanghan';this.q='';this.selectedId=null;this.expanded=new Set();}
    get sections(){return this.p.sections?.[this.book]||[]}
    get bookInfo(){return this.p.books?.[this.book]||{label:this.book}}
    render(){
      const b=this.bookInfo; const stat=this.p.stats?.[this.book]||{};
      this.root.innerHTML=`<div class="module-panel source-pages pdf-source-pages"><div class="source-head"><h2>${esc(b.label||this.book)}專屬資料頁</h2><p>依你提供的 PDF 綱目重建資料頁；出題按鈕優先使用 PDF 題號對應到題庫 question_ids，避免章節 id 不一致造成空卷。</p><div class="source-summary-row"><span class="badge">PDF 綱目 ${esc(stat.sections||this.sections.length)} 個</span><span class="badge">PDF 題號 ${esc(stat.markers||0)} 個</span><span class="badge">已對題庫 ${esc(stat.matched_markers||0)} 個</span></div></div><div class="toolbar compact-toolbar"><input id="sp-search" placeholder="搜尋章節、病名、方劑、題號，例如：太陽病分類、痙病、桂枝湯、108-1"><button class="btn primary" id="sp-run">搜尋</button><button class="btn" id="sp-clear">清除</button><button class="btn" data-quiz-scope='${esc(JSON.stringify(bookScope(this)))}'>以此書出題</button>${this.book==='wenbing'?'<button class="btn" id="wb-sim-btn">病程模擬</button>':''}</div><div id="sp-body"></div></div>`;
      this.root.querySelector('#sp-run').onclick=()=>{this.q=this.root.querySelector('#sp-search').value.trim();this.selectedId=null;this.renderBody()};
      this.root.querySelector('#sp-clear').onclick=()=>{this.q='';this.selectedId=null;this.root.querySelector('#sp-search').value='';this.renderBody()};
      this.root.querySelector('#sp-search').onkeydown=e=>{if(e.key==='Enter')this.root.querySelector('#sp-run').click()};
      const simBtn=this.root.querySelector('#wb-sim-btn'); if(simBtn) simBtn.onclick=()=>this.renderWenbingOnly();
      this.renderBody();
    }
    okText(o){return Object.values(o||{}).join(' ').includes(this.q)}
    childrenMap(){const map={};this.sections.forEach(s=>{const p=s.parent_section_id||'';(map[p]=map[p]||[]).push(s)});Object.values(map).forEach(a=>a.sort((x,y)=>(+x.order_index||0)-(+y.order_index||0)));return map}
    filteredSectionIds(){if(!this.q)return null; const ids=new Set(); const byId=Object.fromEntries(this.sections.map(s=>[s.section_id,s])); for(const s of this.sections){if(this.okText(s)||String((s.question_markers||[]).join(' ')).includes(this.q)){let cur=s; while(cur){ids.add(cur.section_id); cur=byId[cur.parent_section_id];}}} return ids;}
    renderTreeNode(s,map,filterIds){
      if(filterIds && !filterIds.has(s.section_id))return '';
      const children=(map[s.section_id]||[]).map(ch=>this.renderTreeNode(ch,map,filterIds)).join('');
      const hasChild=!!children;
      const indent=Math.max(0,Number(s.level||1)-1);
      const selected=this.selectedId===s.section_id?' selected':'';
      const count=Number(s.question_count||0);
      const disabled=count?'' :' disabled title="此綱目目前沒有可直接對應的題號"';
      return `<div class="sp-node level-${esc(s.level)}${selected}" style="--indent:${indent}"><div class="sp-node-main"><button class="btn tiny" data-sp-section="${esc(s.section_id)}">查看</button><button class="sp-title" data-sp-section="${esc(s.section_id)}">${esc(s.section_title)}</button><span class="muted">p.${esc(s.page_start||'')}</span><span class="chip">含題 ${esc(count)}</span><button class="btn tiny primary" data-quiz-scope='${esc(JSON.stringify(scopeFor(s,this.book)))}'${disabled}>本範圍出題</button></div>${hasChild?`<div class="sp-children">${children}</div>`:''}</div>`;
    }
    renderSectionDetail(sec){
      if(!sec)return `<div class="card"><h3>使用方式</h3><p>左側選 PDF 綱目，右側會顯示該綱目對應題號與出題入口。章節按鈕會把本層與下層題目一併納入。</p></div>`;
      const clauses=(this.p.clauses?.[this.book]||[]).filter(c=>String(c.chapter_title+' '+c.topic_name+' '+c.section_title+' '+c.original_text).includes(sec.section_title)).slice(0,20);
      const isWenbing=this.book==='wenbing';
      const wbRows=isWenbing?(this.p.wenbing_states||[]).filter(r=>String(Object.values(r).join(' ')).includes(sec.section_title)).slice(0,20):[];
      const scope=scopeFor(sec,this.book);
      return `<div class="card sp-detail"><h3>${esc(sec.section_title)}</h3><div class="source-summary-row"><span class="badge">PDF p.${esc(sec.page_start||'')}–${esc(sec.page_end||sec.page_start||'')}</span><span class="badge">層級 ${esc(sec.level)}</span><span class="badge">含下層題 ${esc(sec.question_count||0)}</span><span class="badge">直接題 ${esc((sec.question_ids_direct||[]).length)}</span></div><div class="sp-actions"><button class="btn primary" data-quiz-scope='${esc(JSON.stringify(scope))}' ${(sec.question_count||0)?'':'disabled'}>以此綱目與下層出題</button><button class="btn" data-run-search="${esc(sec.section_title)}">全庫搜尋</button></div><h4>PDF 對應題號</h4><div class="chip-list">${markerChips(sec)}</div>${clauses.length?`<h4>條文／方證候選</h4>${clauses.map(c=>`<div class="source-row"><b>${esc(c.chapter_title)}｜${esc(c.title||c.topic_name||'')}</b><p>${esc(c.original_text||'')}</p><div>${splitIds(c.linked_formula_ids).map((id,i)=>btnEntity(id,splitIds(c.linked_formulas)[i]||id)).join(' ')}</div><div class="muted">p.${esc(c.source_pdf_pages||'')}｜${esc(zh(c.review_status||''))}</div></div>`).join('')}`:''}${wbRows.length?`<h4>溫病分期／方劑資料</h4>${wbRows.map(r=>`<div class="source-row"><b>${esc(r.topic_or_disease)}｜${esc(r.stage)}｜${esc(r.state_name)}</b><p>${esc(r.symptoms_text)}</p><p><b>治法：</b>${esc(r.treatment_method||'')}</p><p>${splitIds(r.formula_canonical_ids).map((id,i)=>btnEntity(id,splitIds(r.formulas)[i]||id)).join(' ')}</p></div>`).join('')}`:''}</div>`;
    }
    renderBody(){
      const body=this.root.querySelector('#sp-body'); const map=this.childrenMap(); const filterIds=this.filteredSectionIds();
      let roots=map['']||[]; if(filterIds) roots=roots.filter(r=>filterIds.has(r.section_id));
      if(!this.selectedId){const firstWithQ=this.sections.find(s=>s.question_count>0); this.selectedId=(roots[0]?.section_id)||(firstWithQ?.section_id)||null;}
      const sec=this.sections.find(s=>s.section_id===this.selectedId);
      const tree=roots.map(r=>this.renderTreeNode(r,map,filterIds)).join('')||'<p class="muted">沒有符合搜尋的 PDF 綱目。</p>';
      body.innerHTML=`<div class="source-layout"><div class="card source-tree-card"><h3>PDF 綱目</h3><p class="muted">綱目與頁碼來自 PDF 目錄；出題範圍會自動包含下層。</p><div class="sp-tree">${tree}</div></div><div class="source-detail-card">${this.renderSectionDetail(sec)}</div></div>`;
      body.querySelectorAll('[data-sp-section]').forEach(btn=>btn.addEventListener('click',()=>{this.selectedId=btn.dataset.spSection;this.renderBody();}));
    }
    renderWenbingOnly(){
      const rows=this.p.wenbing_states||[];
      const order=['衛分','衛氣','氣分','營分','血分','上焦','中焦','下焦','初起','極期','後期'];
      const groups={}; rows.forEach(r=>{const key=r.topic_or_disease||'溫病'; (groups[key]=groups[key]||[]).push(r)});
      const blocks=Object.entries(groups).slice(0,12).map(([topic,rs])=>{rs=[...rs].sort((a,b)=>(order.indexOf(a.stage)-order.indexOf(b.stage)));return `<details open><summary>${esc(topic)}病程模擬</summary><div class="simulation-flow">${rs.slice(0,12).map((r,i)=>`<div class="sim-step"><h4>${esc(r.stage||'階段')}｜${esc(r.state_name||'')}</h4><p>${esc(r.symptoms_text||'')}</p><p>${splitIds(r.formula_canonical_ids).map((id,j)=>btnEntity(id,splitIds(r.formulas)[j]||id)).join(' ')}</p></div>${i<rs.length-1?'<div class="sim-arrow">→</div>':''}`).join('')}</div></details>`}).join('');
      this.root.querySelector('#sp-body').innerHTML=`<div class="card soft"><button class="btn" id="sp-back-tree">回 PDF 綱目</button><h3>溫病病程模擬</h3><p class="muted">依溫病分期／病種資料串接，作為讀書導覽；不是臨床自動診斷。</p>${blocks}</div>`;
      this.root.querySelector('#sp-back-tree').onclick=()=>this.renderBody();
    }
    static async mount(root,opts={}){const r=typeof root==='string'?document.querySelector(root):root;const payload=await fetch(opts.payloadUrl||'data/source_pages_payload_v3_1.json').then(x=>x.json());const m=new SourcePagesModule(r,payload,opts.book||'shanghan');m.render();return m;}
  }
  global.Clinical1SourcePagesModule=SourcePagesModule;
})(window);
