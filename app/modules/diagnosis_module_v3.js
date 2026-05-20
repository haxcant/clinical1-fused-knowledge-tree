
(function(){
  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function emit(name, detail){ window.dispatchEvent(new CustomEvent(name,{detail})); }
  function card(e){
    const rels=(e.relations_sample||[]).slice(0,6).map(r=>`<li>${esc(r.direction==='out'?r.relation_type:'← '+r.relation_type)}：<button class="entity-link" data-entity-id="${esc(r.target_id||r.source_id)}" data-entity-name="${esc(r.target_name||r.source_name)}">${esc(r.target_name||r.source_name)}</button><span class="muted"> ${esc(r.evidence_class||'')}</span></li>`).join('');
    const qs=(e.related_questions||[]).slice(0,3).map(q=>`<li><button class="question-link" data-question-id="${esc(q.question_id)}">${esc(q.period)} ${esc(q.subject)} ${esc(q.question_no)}｜${esc(q.stem||'').slice(0,70)}</button></li>`).join('');
    return `<article class="diag-card"><h3><button class="entity-title" data-entity-id="${esc(e.entity_id)}" data-entity-name="${esc(e.name)}">${esc(e.name)}</button></h3><div class="muted">${esc(e.type)}｜${(e.categories||[]).map(esc).join(' / ')}</div><details><summary>支持關係與相關題目</summary><ul>${rels}</ul><ul>${qs}</ul></details><button data-start-quiz-entity="${esc(e.entity_id)}">以此診斷詞出題</button></article>`;
  }
  window.Clinical1DiagnosisModule = {
    async mount(el, opts={}){
      const url=opts.payloadUrl||'../data/diagnosis_pages_payload.json';
      const payload=await fetch(url).then(r=>r.json());
      const ents=payload.entities||[]; const cats=Object.keys(payload.groups||{}).sort();
      el.innerHTML=`<div class="module-panel"><div class="toolbar"><input id="diag-search" placeholder="搜尋舌紅少苔、苔黃膩、脈浮、面青、八綱"><select id="diag-cat"><option value="">全部分類</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div id="diag-results"></div></div>`;
      const input=el.querySelector('#diag-search'), sel=el.querySelector('#diag-cat'), res=el.querySelector('#diag-results');
      function render(){
        const q=input.value.trim(); const terms=q.split(/\s+/).filter(Boolean); const cat=sel.value;
        const filtered=ents.filter(e=>(!cat||(e.categories||[]).includes(cat)) && terms.every(t=>(e.name+' '+(e.aliases||[]).join(' ')+' '+(e.categories||[]).join(' ')).includes(t))).slice(0,250);
        res.innerHTML=`<div class="result-count">${filtered.length} 筆</div>`+filtered.map(card).join('');
      }
      input.addEventListener('input', render); sel.addEventListener('change', render); render();
      el.addEventListener('click', ev=>{
        const eb=ev.target.closest('[data-entity-id]'); if(eb) emit('clinical1:entity-selected',{entity_id:eb.dataset.entityId, entity_name:eb.dataset.entityName, source:'diagnosis_module'});
        const qb=ev.target.closest('[data-question-id]'); if(qb) emit('clinical1:question-selected',{question_id:qb.dataset.questionId, source:'diagnosis_module'});
        const sb=ev.target.closest('[data-start-quiz-entity]'); if(sb){ const scope={source:'diagnosis_entity',entity_id:sb.dataset.startQuizEntity,layer:'official_exam'}; if(window.startQuizByScope) window.startQuizByScope(scope); else emit('clinical1:quiz-scope-requested',scope); }
      });
    }
  };
})();
