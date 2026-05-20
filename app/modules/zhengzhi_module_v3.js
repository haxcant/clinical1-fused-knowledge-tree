
(function(){
  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function emit(name, detail){ window.dispatchEvent(new CustomEvent(name,{detail})); }
  function linkEntity(e){ if(!e||!e.entity_id) return ''; return `<button class="entity-link" data-entity-id="${esc(e.entity_id)}" data-entity-name="${esc(e.name)}">${esc(e.name||e.entity_id)}</button>`; }
  function makeRow(row){
    const formulas=(row.formulas||[]).map(linkEntity).join(' ');
    const qs=(row.related_questions||[]).slice(0,3).map(q=>`<li><button class="question-link" data-question-id="${esc(q.question_id)}">${esc(q.period)} ${esc(q.subject)} ${esc(q.question_no)}｜${esc(q.stem||'').slice(0,80)}</button></li>`).join('');
    return `<article class="zz-card" data-row-id="${esc(row.row_id)}">
      <div class="zz-head"><span class="badge">${esc(row.system_chapter)}</span><b>${esc(row.disease_section||'未分類')}</b>${row.pattern_name?`<span class="pattern">${esc(row.pattern_name)}</span>`:''}</div>
      <div class="zz-grid"><div><b>症狀</b><p>${esc(row.symptoms_text||'')}</p></div><div><b>病機</b><p>${esc(row.pathogenesis_text||'')}</p></div><div><b>治法</b><p>${esc(row.treatment_method||'')}</p></div><div><b>主方</b><p>${formulas || esc((row.formula_names||[]).join('、'))}</p></div></div>
      <details><summary>來源與相關題目</summary><p class="muted">PDF p.${esc(row.pdf_page)}｜${esc(row.source_pdf)}｜${esc(row.review_status)}</p><p>${esc(row.evidence_text||'')}</p><ul>${qs}</ul></details>
      <div class="actions"><button data-start-quiz-row="${esc(row.row_id)}">以此列出題</button></div>
    </article>`;
  }
  window.Clinical1ZhengzhiModule = {
    async mount(el, opts={}){
      const url=opts.payloadUrl||'../data/zhengzhi_pages_payload.json';
      const payload=await fetch(url).then(r=>r.json());
      let rows=payload.rows||[];
      el.innerHTML=`<div class="module-panel"><div class="toolbar"><input id="zz-search" placeholder="搜尋病證、證型、症狀、治法、方劑，例如：咳嗽 痰熱鬱肺"><select id="zz-disease"><option value="">全部病證</option>${Object.keys(payload.disease_index||{}).sort().map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div id="zz-results"></div></div>`;
      const input=el.querySelector('#zz-search'), sel=el.querySelector('#zz-disease'), res=el.querySelector('#zz-results');
      function render(){
        const q=input.value.trim(); const dis=sel.value;
        const terms=q.split(/\s+/).filter(Boolean);
        const filtered=rows.filter(r=>(!dis||r.disease_section===dis) && terms.every(t=>(r.search_text||'').includes(t))).slice(0,200);
        res.innerHTML=`<div class="result-count">${filtered.length} 筆</div>`+filtered.map(makeRow).join('');
      }
      input.addEventListener('input',render); sel.addEventListener('change',render); render();
      el.addEventListener('click', ev=>{
        const eb=ev.target.closest('[data-entity-id]');
        if(eb) emit('clinical1:entity-selected',{entity_id:eb.dataset.entityId, entity_name:eb.dataset.entityName, source:'zhengzhi_module'});
        const qb=ev.target.closest('[data-question-id]');
        if(qb) emit('clinical1:question-selected',{question_id:qb.dataset.questionId, source:'zhengzhi_module'});
        const rb=ev.target.closest('[data-start-quiz-row]');
        if(rb) {
          const row=rows.find(x=>x.row_id===rb.dataset.startQuizRow);
          const ids=[]; if(row?.pattern?.entity_id) ids.push(row.pattern.entity_id); (row?.formulas||[]).forEach(f=>f.entity_id&&ids.push(f.entity_id));
          const scope={source:'zhengzhi_row', row_id:rb.dataset.startQuizRow, entity_ids:ids, layer:'official_exam'};
          if(window.startQuizByScope) window.startQuizByScope(scope); else emit('clinical1:quiz-scope-requested', scope);
        }
      });
    }
  };
})();
