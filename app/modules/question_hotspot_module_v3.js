(function(global){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label={formula:'方劑',pattern:'證型',disease:'病證',diagnostic_feature:'症狀／診斷線索',herb:'藥物',knowledge_item:'知識點',answer:'正解',distractor:'干擾',stem:'題幹',all:'全部位置'};
  const pct=x=>Number.isFinite(x)?(x*100).toFixed(x<0.01?2:1)+'%':'—';
  const num=x=>Number.isFinite(x)?(Math.round(x*1000)/1000).toString():'—';

  function median(arr){arr=[...arr].sort((a,b)=>a-b); if(!arr.length)return 0; const m=Math.floor(arr.length/2); return arr.length%2?arr[m]:(arr[m-1]+arr[m])/2;}
  function quantile(arr,q){arr=[...arr].sort((a,b)=>a-b); if(!arr.length)return 0; const pos=(arr.length-1)*q; const lo=Math.floor(pos), hi=Math.ceil(pos); if(lo===hi)return arr[lo]; return arr[lo]+(arr[hi]-arr[lo])*(pos-lo);}
  function mean(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;}
  function bhAdjust(items){
    const xs=items.map((it,i)=>({i,p:Math.max(0,Math.min(1,Number(it.p)||1))})).sort((a,b)=>a.p-b.p);
    let prev=1; const out=Array(items.length).fill(1); const m=xs.length||1;
    for(let k=xs.length-1;k>=0;k--){ const q=Math.min(prev, xs[k].p*m/(k+1)); prev=q; out[xs[k].i]=q; }
    return out;
  }
  function resultClass(status){status=String(status||''); return status.includes('高')?'sig-high':status.includes('低')?'sig-low':'sig-flat';}
  function statusLabel(s){return s||'平盤／未達顯著';}
  function normText(s){return String(s??'').trim().toLowerCase();}

  class QuestionHotspot{
    constructor(root,p){
      this.root=typeof root==='string'?document.querySelector(root):root;
      this.p=p||{};
      this.type='formula';
      this.pos='answer';
      this.metric='questions';
      this.peerMode='observed';
      this.alpha=0.05;
      this.displayLimit=30;
      this.sortDir='desc';
      this.sortBy='weighted_score';
      this.quiz=null;
      this.qById=new Map();
      this.officialQuestions=[];
      this.rows=[];
      this.filtered=[];
      this.lastBatch=null;
      this._controlsBound=false;
    }

    async ensureQuiz(){
      if(this.quiz)return this.quiz;
      const status=this.root?.querySelector?.('#qh-status');
      if(status)status.textContent='載入正式題庫索引…';
      const r=await fetch('data/quiz/quiz_question_bank_payload.json');
      if(!r.ok)throw new Error('無法載入 quiz_question_bank_payload.json：HTTP '+r.status);
      this.quiz=await r.json();
      this.qById=new Map((this.quiz.questions||[]).map(q=>[q.id,q]));
      this.officialQuestions=this._getOfficialQuestions();
      if(status)status.textContent=`已載入正式大考題：${this.officialQuestions.length.toLocaleString()} 題（已排除 Bula 筆記題、seed drill 與重複題；此數字是唯一正式題數，不是熱點標註次數）。`;
      return this.quiz;
    }

    _getOfficialQuestions(){
      const qs=this.quiz.questions||[]; const byId=new Map(qs.map(q=>[q.id,q]));
      const ok=q=>q && q.layer==='official_exam' && q.include_in_official_statistics!==false && q.dedup_role!=='duplicate';
      const ids=this.quiz.indices?.official_primary||[];
      if(ids.length){
        const arr=ids.map(id=>byId.get(id)).filter(ok);
        if(arr.length)return arr;
      }
      return qs.filter(ok);
    }

    render(){
      if(!this.root)return;
      this.root.innerHTML=`<div class="module-panel qh-panel">
        <div class="source-head"><h2>考題熱點與節點考頻檢定</h2><p>先用熱點表找節點，再以「同類節點隨機抽樣」檢定該節點是否比同類資料更常／更少出現在正式大考。預設只用 official primary 題，不把 Bula 筆記題或 seed drill 當大考。</p><div id="qh-status" class="muted">列表已載入完整熱點資料；按「檢定」時才載入正式題索引。</div></div>
        <div class="toolbar qh-toolbar">
          <label>節點類型<select id="qh-type">${['formula','pattern','disease','diagnostic_feature','herb'].map(t=>`<option value="${t}">${label[t]}</option>`).join('')}</select></label>
          <label>考題位置<select id="qh-pos">${['answer','distractor','stem','all'].map(p=>`<option value="${p}">${label[p]}</option>`).join('')}</select></label>
          <label>排序依據<select id="qh-sort-by"><option value="weighted_score">加權分數</option><option value="question_count">題數</option><option value="canonical_name">名稱</option></select></label>
          <label>排序方向<select id="qh-sort-dir"><option value="desc">高頻 → 低頻</option><option value="asc">低頻 → 高頻</option></select></label>
          <label>顯示筆數<select id="qh-limit"><option value="30" selected>30</option><option value="60">60</option><option value="100">100</option><option value="160">160</option><option value="300">300</option><option value="500">500</option><option value="all">全部</option></select></label>
          <label>列表搜尋<input id="qh-filter" placeholder="搜尋熱點名稱，例如 桂枝湯、小柴胡湯、痰熱" /></label>
          <button class="btn primary" id="qh-run">更新列表</button>
        </div>
        <div class="card qh-test-card"><h3>節點考頻檢定</h3>
          <div class="qh-method-note"><b>檢定定義：</b>從同類節點中隨機抽一個，觀察其在正式大考的出題次數／考期出現數。若本節點落在同類分布的極端高端，判為「顯著高頻」；落在極端低端，判為「顯著低頻」；其餘為平盤。<details><summary>免責聲明與公式</summary><p>本檢定只描述「目前題庫標註下的相對考頻」，不能保證未來命題，也不能替代醫理重要性判斷。p 值不是答對率或押題率。</p><p><b>加權熱點分數：</b>正解 × 3 + 干擾 × 1.5 + 題幹 × 1。此分數用於列表排序，不作為顯著性檢定值。</p><p><b>考頻檢定：</b>令同類節點母群大小 M，本節點觀察值為 x。p高 = #{同類節點值 ≥ x} / M；p低 = #{同類節點值 ≤ x} / M。批量檢定時對目前列表使用 Benjamini–Hochberg FDR q 值。</p></details></div>
          <div class="toolbar qh-test-toolbar">
            <label>比較指標<select id="qh-metric"><option value="questions">題數</option><option value="exam_units">考期出現數</option></select></label>
            <label>同類母群<select id="qh-peer"><option value="observed">考題曾標註之同類節點</option><option value="all">資料庫全部同類節點（含 0 次）</option></select></label>
            <label>顯著水準<select id="qh-alpha"><option value="0.05">0.05</option><option value="0.01">0.01</option><option value="0.10">0.10</option></select></label>
            <label>指定節點<input id="qh-node-query" placeholder="輸入方劑／節點名或 canonical_id" /></label>
            <button class="btn primary" id="qh-calc">計算</button>
            <button class="btn" id="qh-batch">批量檢定目前列表</button>
          </div>
        </div>
        <div id="qh-chart"></div>
        <div id="qh-test-result" class="qh-test-result"><p class="muted">檢定結果會顯示在長條圖下方。可從下方列表按「檢定」，或在此輸入節點名稱後計算。</p></div>
        <div id="qh-table"></div>
      </div>`;
      this.syncControlsFromState();
      this.bindControls();
      this.update();
    }

    bindControls(){
      if(this._controlsBound)return;
      this._controlsBound=true;
      const root=this.root;
      root.addEventListener('change',e=>{
        const id=e.target?.id;
        if(['qh-type','qh-pos','qh-sort-by','qh-sort-dir','qh-limit'].includes(id)){
          this.readControls();
          this.lastBatch=null;
          this.update();
        }
        if(['qh-metric','qh-peer','qh-alpha'].includes(id)){
          this.readControls();
          this.lastBatch=null;
        }
      });
      root.addEventListener('input',e=>{
        if(e.target?.id==='qh-filter'){
          this.lastBatch=null;
          this.renderOutputs();
        }
      });
      root.addEventListener('keydown',e=>{
        if(e.target?.id==='qh-node-query' && e.key==='Enter'){
          e.preventDefault();
          this.calculateFromInput();
        }
      });
      root.addEventListener('click',e=>{
        const btn=e.target.closest('button');
        if(!btn || !root.contains(btn))return;
        const id=btn.id;
        const action=btn.dataset.qhAction;
        if(id==='qh-run'){
          e.preventDefault(); e.stopPropagation();
          this.readControls(); this.lastBatch=null; this.update(); return;
        }
        if(id==='qh-calc'){
          e.preventDefault(); e.stopPropagation();
          this.calculateFromInput(); return;
        }
        if(id==='qh-batch'){
          e.preventDefault(); e.stopPropagation();
          this.batchTestVisible(); return;
        }
        if(action){
          e.preventDefault(); e.stopPropagation();
          this.handleAction(action,btn); return;
        }
      }, true);
    }

    syncControlsFromState(){
      const set=(sel,val)=>{const el=this.root.querySelector(sel); if(el)el.value=String(val);};
      set('#qh-type',this.type); set('#qh-pos',this.pos); set('#qh-metric',this.metric); set('#qh-peer',this.peerMode); set('#qh-alpha',this.alpha); set('#qh-sort-by',this.sortBy); set('#qh-sort-dir',this.sortDir); set('#qh-limit',Number.isFinite(this.displayLimit)?this.displayLimit:'all');
    }

    readControls(){
      const get=(sel,fb)=>this.root.querySelector(sel)?.value??fb;
      this.type=get('#qh-type',this.type);
      this.pos=get('#qh-pos',this.pos);
      this.metric=get('#qh-metric',this.metric);
      this.peerMode=get('#qh-peer',this.peerMode);
      this.alpha=Number(get('#qh-alpha',this.alpha))||0.05;
      this.sortBy=get('#qh-sort-by',this.sortBy);
      this.sortDir=get('#qh-sort-dir',this.sortDir);
      const limVal=get('#qh-limit',Number.isFinite(this.displayLimit)?String(this.displayLimit):'all');
      this.displayLimit=limVal==='all'?Infinity:(Number(limVal)||30);
    }

    update(){
      this.readControls();
      if(this.pos==='all'){
        const full=this.p.groups?.[`${this.type}_all`];
        this.rows=Array.isArray(full)?full:this.mergeAllPositions(this.type);
      }else{
        this.rows=this.p.groups?.[`${this.type}_${this.pos}`]||[];
      }
      if((!this.rows||!this.rows.length) && (this.type==='symptom'||this.type==='diagnostic')){
        const aliasType='diagnostic_feature';
        this.rows = this.pos==='all' ? (this.p.groups?.[`${aliasType}_all`]||[]) : (this.p.groups?.[`${aliasType}_${this.pos}`]||[]);
      }
      this.renderOutputs();
    }

    mergeAllPositions(type){
      const explicit=this.p.groups?.[`${type}_all`];
      if(Array.isArray(explicit))return explicit;
      const merged=[]; const seen=new Map();
      ['answer','distractor','stem'].forEach(pos=>{
        (this.p.groups?.[`${type}_${pos}`]||[]).forEach(r=>{
          const id=r.canonical_id; if(!id)return;
          if(!seen.has(id)){
            const x={...r,weighted_score:0,question_count:0,event_count:0,positions:new Set()};
            seen.set(id,x); merged.push(x);
          }
          const x=seen.get(id);
          x.weighted_score+=Number(r.weighted_score||0);
          x.question_count+=Number(r.question_count||0);
          x.event_count+=Number(r.event_count||0);
          x.positions.add(pos);
        });
      });
      return merged.map(r=>({...r,positions:[...r.positions].map(p=>label[p]||p).join('、')}));
    }

    filteredRows(){
      const q=(this.root.querySelector('#qh-filter')?.value||'').trim();
      let rows=[...(this.rows||[])];
      if(q){
        const nq=normText(q);
        rows=rows.filter(r=>normText(r.canonical_name).includes(nq)||normText(r.canonical_id).includes(nq));
      }
      const sortBy=this.sortBy||'weighted_score'; const dir=this.sortDir==='asc'?1:-1;
      rows.sort((a,b)=>{
        if(sortBy==='canonical_name'){
          const c=String(a.canonical_name||'').localeCompare(String(b.canonical_name||''),'zh-Hant');
          return c*dir;
        }
        const av=Number(a[sortBy]||0), bv=Number(b[sortBy]||0);
        if(av!==bv)return (av-bv)*dir;
        return String(a.canonical_name||'').localeCompare(String(b.canonical_name||''),'zh-Hant');
      });
      this.filtered=rows;
      return rows;
    }

    visibleRows(){
      const rows=this.filteredRows();
      return Number.isFinite(this.displayLimit)?rows.slice(0,this.displayLimit):rows;
    }

    renderOutputs(){
      const rows=this.visibleRows();
      const titleDir=this.sortDir==='asc'?'低頻→高頻':'高頻→低頻';
      const chartValueKey=this.sortBy==='question_count'?'question_count':'weighted_score';
      const chartRows=this.sortBy==='canonical_name'?[...rows].sort((a,b)=>Number(b.weighted_score||0)-Number(a.weighted_score||0)):rows;
      if(global.Clinical1BarChart){
        Clinical1BarChart.render(this.root.querySelector('#qh-chart'),chartRows,{labelKey:'canonical_name',valueKey:chartValueKey,limit:Math.min(chartRows.length,30),title:`${label[this.type]}｜${label[this.pos]}｜${titleDir}`,onRowClick:r=>this.openEntity(r.canonical_id)});
      }
      this.renderTable(rows);
    }

    renderTable(rowsArg){
      const rows=rowsArg||this.visibleRows();
      const total=(this.filtered||this.filteredRows()).length;
      const limitText=Number.isFinite(this.displayLimit)?`顯示 ${rows.length} / ${total} 筆`:`顯示全部 ${rows.length} 筆`;
      const sortText=`${this.sortBy==='question_count'?'題數':this.sortBy==='canonical_name'?'名稱':'加權分數'}｜${this.sortDir==='asc'?'低頻→高頻':'高頻→低頻'}`;
      const batch=this.lastBatch||{};
      const body=rows.map(r=>{
        const st=batch[r.canonical_id];
        const badge=st?`<span class="sig-badge ${resultClass(st.status)}">${esc(st.status)}</span><div class="muted">p高=${num(st.p_high)}｜p低=${num(st.p_low)}｜q=${st.q_value!=null?num(st.q_value):'—'}</div>`:'<span class="muted">尚未檢定</span>';
        const scope=esc(JSON.stringify({entity_id:r.canonical_id,layer:'official_exam'}));
        return `<tr><td><b>${esc(r.canonical_name)}</b><div class="muted mono">${esc(r.canonical_id)}</div>${r.positions?`<div class="muted">位置：${esc(r.positions)}</div>`:''}</td><td>${esc(r.weighted_score)}</td><td>${esc(r.question_count)}</td><td>${badge}</td><td class="qh-actions"><button class="btn" data-qh-action="open-entity" data-node-id="${esc(r.canonical_id)}">節點</button><button class="btn" data-qh-action="test" data-node-id="${esc(r.canonical_id)}">檢定</button><button class="btn" data-qh-action="quiz" data-scope="${scope}">出題</button></td></tr>`;
      }).join('');
      this.root.querySelector('#qh-table').innerHTML=`<div class="qh-list-head"><b>熱點列表</b><span class="muted">目前 ${esc(limitText)}；排序：${esc(sortText)}。列表搜尋不會改變統計母群，只改變可見清單。</span></div><table class="pivot-table qh-table"><thead><tr><th>名稱</th><th>加權</th><th>題數</th><th>檢定摘要</th><th>操作</th></tr></thead><tbody>${body||'<tr><td colspan="5" class="muted">目前沒有符合條件的熱點；若為藥物類型，v5.4 會以方劑組成展開後重建熱點。</td></tr>'}</tbody></table>`;
    }

    async handleAction(action,btn){
      const nodeId=btn.dataset.nodeId;
      if(action==='open-entity')return this.openEntity(nodeId);
      if(action==='test')return this.openTest(nodeId,true);
      if(action==='quiz'){
        let scope=null;
        try{scope=JSON.parse(btn.dataset.scope||'{}');}catch(e){scope={entity_id:nodeId,layer:'official_exam'};}
        return this.startQuiz(scope);
      }
      if(action==='open-question')return this.openQuestion(btn.dataset.questionId);
    }

    openEntity(entityId){
      if(!entityId)return;
      global.dispatchEvent(new CustomEvent('clinical1:entity-selected',{detail:{entity_id:entityId}}));
    }

    openQuestion(questionId){
      if(!questionId)return;
      global.dispatchEvent(new CustomEvent('clinical1:question-selected',{detail:{question_id:questionId}}));
    }

    startQuiz(scope){
      if(typeof global.startQuizByScope==='function')global.startQuizByScope(scope||{});
      else global.dispatchEvent(new CustomEvent('clinical1:quiz-scope-requested',{detail:scope||{}}));
    }

    findEntity(query){
      query=String(query||'').trim(); if(!query)return null;
      const rows=[...(this.rows||[]),...(this.filtered||[])];
      const rowExact=rows.find(r=>r.canonical_id===query || r.canonical_name===query);
      if(rowExact)return {id:rowExact.canonical_id,name:rowExact.canonical_name,type:this.type};
      const rowIncl=rows.find(r=>String(r.canonical_name||'').includes(query)||String(r.canonical_id||'').includes(query));
      if(rowIncl)return {id:rowIncl.canonical_id,name:rowIncl.canonical_name,type:this.type};
      const ents=this.quiz?.entities||{};
      if(ents[query])return ents[query];
      const exact=Object.values(ents).find(e=>e.type===this.type && e.name===query);
      if(exact)return exact;
      const incl=Object.values(ents).find(e=>e.type===this.type && (String(e.name||'').includes(query)||(e.aliases||[]).some(a=>String(a).includes(query))));
      return incl||Object.values(ents).find(e=>String(e.name||'').includes(query)||(e.aliases||[]).some(a=>String(a).includes(query)))||null;
    }

    async calculateFromInput(){
      const result=this.root.querySelector('#qh-test-result');
      try{
        await this.ensureQuiz();
        const q=this.root.querySelector('#qh-node-query').value.trim();
        const ent=this.findEntity(q);
        if(!ent){result.innerHTML=`<div class="warn-box">找不到節點：${esc(q)}。請改用精確名稱或 canonical_id。</div>`;return;}
        if(ent.type){this.type=ent.type; this.syncControlsFromState(); this.update();}
        await this.openTest(ent.id,true);
      }catch(e){
        result.innerHTML=`<div class="warn-box"><b>計算失敗</b><pre>${esc(e.stack||e.message||e)}</pre></div>`;
      }
    }

    entityIdsFromQuestion(question,pos,type){
      const ids=new Set(); const ents=this.quiz.entities||{};
      if(type==='herb' && question.herb_ids_by_position_v5_4){
        const hmap=question.herb_ids_by_position_v5_4||{};
        const arr=pos==='all' ? (hmap.all||[]) : (hmap[pos]||[]);
        (arr||[]).forEach(id=>{if(ents[id]?.type==='herb')ids.add(id);});
        return [...ids];
      }
      const add=x=>{if(!x)return; const id=String(x.entity_id||x.id||x); const et=x.type||ents[id]?.type; if(id && (!type || et===type))ids.add(id);};
      const entities=question.entities||{};
      if(pos==='all'){
        Object.values(entities).forEach(v=>Array.isArray(v)?v.forEach(add):add(v));
        (question.entity_ids||[]).forEach(id=>{if(!type||ents[id]?.type===type)ids.add(id);});
        if(type==='formula')(question.formula_ids||[]).forEach(id=>ids.add(id));
      }else{
        const v=entities[pos]||[]; (Array.isArray(v)?v:[v]).forEach(add);
        if(pos==='answer' && type==='formula'){
          const ans=String(question.answer_text||'');
          (question.formula_ids||[]).forEach(id=>{if(ans && ans.includes(ents[id]?.name||''))ids.add(id);});
        }
      }
      return [...ids];
    }

    buildDistribution(type,pos,metric,peerMode,nodeId){
      const ents=this.quiz.entities||{}; const peersAll=Object.values(ents).filter(e=>e.type===type).map(e=>e.id);
      const qSets=new Map(), uSets=new Map(), examples=new Map();
      const ensure=id=>{if(!qSets.has(id)){qSets.set(id,new Set());uSets.set(id,new Set());examples.set(id,[]);} };
      peersAll.forEach(ensure);
      for(const q of this.officialQuestions){
        const unit=`${q.period||''}|${q.subject||''}`;
        const ids=this.entityIdsFromQuestion(q,pos,type);
        ids.forEach(id=>{if(!ents[id] || ents[id].type!==type)return; ensure(id); qSets.get(id).add(q.id); uSets.get(id).add(unit); const ex=examples.get(id); if(ex && ex.length<12)ex.push(q);});
      }
      const val=id=>metric==='exam_units'?(uSets.get(id)?.size||0):(qSets.get(id)?.size||0);
      let peers=peersAll;
      if(peerMode==='observed')peers=peersAll.filter(id=>val(id)>0 || id===nodeId);
      if(!peers.includes(nodeId))peers=[nodeId,...peers];
      const values=peers.map(id=>val(id));
      return {peers,values,val,examples,qSets,uSets};
    }

    async testNode(nodeId){
      await this.ensureQuiz();
      const ent=this.quiz.entities?.[nodeId]; if(!ent)throw new Error('找不到節點 '+nodeId);
      this.readControls();
      const type=ent.type||this.type; const pos=this.pos; const metric=this.metric; const peerMode=this.peerMode; const alpha=this.alpha;
      const dist=this.buildDistribution(type,pos,metric,peerMode,nodeId);
      const obs=dist.val(nodeId); const values=dist.values; const M=values.length||1;
      const ge=values.filter(v=>v>=obs).length, le=values.filter(v=>v<=obs).length, gt=values.filter(v=>v>obs).length, lt=values.filter(v=>v<obs).length;
      const pHigh=ge/M, pLow=le/M; const pTwo=Math.min(1,2*Math.min(pHigh,pLow)); const med=median(values); const avg=mean(values); const q1=quantile(values,0.25), q3=quantile(values,0.75); const maxv=Math.max(...values,0);
      let status='平盤／未達顯著'; if(obs>med && pHigh<=alpha)status='顯著高頻'; else if(obs<med && pLow<=alpha)status='顯著低頻';
      const rankHigh=gt+1; const percentile=(lt/M); const dirP=obs>=med?pHigh:pLow;
      const ex=dist.examples.get(nodeId)||[];
      return {node_id:nodeId,name:ent.name,type,position:pos,metric,peerMode,alpha,observed:obs,peer_count:M,median:med,mean:avg,q1,q3,max:maxv,p_high:pHigh,p_low:pLow,p_two:pTwo,dir_p:dirP,status,rank_high:rankHigh,percentile,examples:ex};
    }

    renderTestResult(st){
      const metricName=st.metric==='exam_units'?'考期出現數':'題數';
      const peerName=st.peerMode==='observed'?'考題曾標註之同類節點':'資料庫全部同類節點（含 0 次）';
      const input=this.root.querySelector('#qh-node-query'); if(input)input.value=st.name;
      const result=this.root.querySelector('#qh-test-result');
      result.innerHTML=`<div class="exam-test-result ${resultClass(st.status)}"><div class="test-title"><h3>${esc(st.name)}：${esc(statusLabel(st.status))}</h3><span class="sig-badge ${resultClass(st.status)}">${esc(st.status)}</span></div><div class="grid stat-grid test-stats"><div class="stat-card"><b>${esc(st.observed)}</b><div class="label">本節點${esc(metricName)}</div></div><div class="stat-card"><b>${esc(num(st.median))}</b><div class="label">同類中位數</div></div><div class="stat-card"><b>${esc(num(st.p_high))}</b><div class="label">高頻尾端 p</div></div><div class="stat-card"><b>${esc(num(st.p_low))}</b><div class="label">低頻尾端 p</div></div></div><div class="test-explain"><p><b>解讀：</b>${this.interpret(st)}</p><p class="muted">母群：${esc(peerName)}，同類節點數 ${esc(st.peer_count)}。分布 Q1=${esc(num(st.q1))}，Q3=${esc(num(st.q3))}，平均=${esc(num(st.mean))}，最大=${esc(st.max)}。排名約第 ${esc(st.rank_high)} / ${esc(st.peer_count)}；百分位約 ${esc(pct(st.percentile))}。</p><p class="muted">p高 = #{同類節點值 ≥ 本節點值}/M；p低 = #{同類節點值 ≤ 本節點值}/M。熱點加權分數＝正解×3＋干擾×1.5＋題幹×1，只用於排序；顯著性依題數或考期出現數計算。若同時查看很多節點，請以批量檢定 q 值輔助判讀。</p></div>${st.examples?.length?`<details open><summary>本節點命中的正式考題樣本（最多 12 題）</summary>${st.examples.map(q=>`<div class="qrow"><b>${esc(q.period)} ${esc(q.subject)} ${esc(q.question_no||'')}</b><p>${esc(String(q.stem||'').slice(0,220))}</p><div class="muted">正解：${esc(q.answer_label||'')} ${esc(q.answer_text||'')}</div><button class="btn" data-qh-action="open-question" data-question-id="${esc(q.id)}">開題目</button></div>`).join('')}</details>`:'<p class="muted">本設定下沒有命中正式考題。</p>'}</div>`;
    }

    interpret(st){
      const metric=st.metric==='exam_units'?'考期出現數':'題數';
      if(st.status.includes('高'))return `以「${label[st.type]||st.type}」同類節點作為母群，${st.name} 的${metric}落在高端尾部，p高=${num(st.p_high)} ≤ ${st.alpha}；可說它在此資料口徑下顯著更容易出現在大考。`;
      if(st.status.includes('低'))return `以「${label[st.type]||st.type}」同類節點作為母群，${st.name} 的${metric}落在低端尾部，p低=${num(st.p_low)} ≤ ${st.alpha}；可說它在此資料口徑下顯著較少出現在大考。`;
      return `本節點的${metric}沒有落入同類分布的極端尾端；目前只能視為平盤或證據不足，不應宣稱特別容易或特別不容易出現。`;
    }

    async openTest(nodeId,scroll=false){
      const result=this.root.querySelector('#qh-test-result');
      try{
        result.innerHTML='<div class="spinner">計算檢定中…</div>';
        const st=await this.testNode(nodeId);
        this.renderTestResult(st);
        if(scroll){const box=this.root.querySelector('#qh-test-result'); if(box)box.scrollIntoView({behavior:'smooth',block:'start'});}
        return st;
      }catch(e){
        result.innerHTML=`<div class="warn-box"><b>檢定失敗</b><pre>${esc(e.stack||e.message||e)}</pre></div>`;
        return null;
      }
    }

    async batchTestVisible(){
      const result=this.root.querySelector('#qh-test-result');
      try{
        await this.ensureQuiz();
        const rows=this.visibleRows();
        if(!rows.length){result.innerHTML='<div class="warn-box">目前列表沒有可檢定資料。</div>';return;}
        result.innerHTML='<div class="spinner">批量檢定中…</div>';
        const stats=[];
        for(const r of rows){try{const st=await this.testNode(r.canonical_id); if(st)stats.push(st);}catch(e){}}
        const qs=bhAdjust(stats.map(st=>({p:st.dir_p}))); stats.forEach((st,i)=>{st.q_value=qs[i]; if(st.q_value<=st.alpha && st.status==='顯著高頻')st.status='FDR顯著高頻'; else if(st.q_value<=st.alpha && st.status==='顯著低頻')st.status='FDR顯著低頻';});
        this.lastBatch=Object.fromEntries(stats.map(st=>[st.node_id,st]));
        this.renderTable();
        const high=stats.filter(s=>s.status.includes('高')).length, low=stats.filter(s=>s.status.includes('低')).length;
        result.innerHTML=`<div class="card"><h3>批量檢定完成</h3><p>目前顯示的 ${stats.length} 筆已計算，並以 Benjamini–Hochberg 對目前列表做 FDR q 值校正。顯著高頻 ${high} 筆；顯著低頻 ${low} 筆；其餘為平盤／未達顯著。</p><p class="muted">注意：q 值只對「目前搜尋後列表」這批節點成立；改變搜尋條件後需重新批量檢定。</p></div>`;
      }catch(e){
        result.innerHTML=`<div class="warn-box"><b>批量檢定失敗</b><pre>${esc(e.stack||e.message||e)}</pre></div>`;
      }
    }

    static async mount(root,opts={}){
      const el=typeof root==='string'?document.querySelector(root):root;
      if(!el)throw new Error('QuestionHotspot root not found');
      const r=await fetch(opts.payloadUrl||'data/question_hotspot_payload_v3_1.json');
      if(!r.ok)throw new Error('無法載入 question_hotspot_payload_v3_1.json：HTTP '+r.status);
      const p=await r.json();
      const m=new QuestionHotspot(el,p); m.render(); global.Clinical1QuestionHotspotInstance=m; return m;
    }
  }
  global.Clinical1QuestionHotspotModule=QuestionHotspot;
})(window);
