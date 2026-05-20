/* clinical1 knowledge tree data adapter v5.0a8 */
(function(global){
  'use strict';
  function norm(s){return String(s||'').toLowerCase().replace(/\s+/g,'');}
  const EDGE_SCHEMA = ['source_kind','source_id','source_name','source_type','relation_type','target_kind','target_id','target_name','target_type','source_book','evidence_class','confidence_label','source_ref_id','scope','evidence_preview'];
  const sourceId = e => e.source_id || e.source || '';
  const targetId = e => e.target_id || e.target || '';
  const edgeKey = e => [sourceId(e), e.relation_type||e.relation||'', targetId(e), e.evidence_class||''].join('::');
  const relBucket = rel => {
    rel=String(rel||'').toLowerCase();
    if(/hierarchy|chapter|section|outline|contains/.test(rel)) return 'core';
    if(/formula|variant|component|herb|composition|方/.test(rel)) return 'formula';
    if(/symptom|feature|clue|support|diagnostic|evidence|pattern/.test(rel)) return 'clue';
    if(/question|exam|stem|option|answer|tested|考/.test(rel)) return 'exam';
    if(/cooc|same|alias|family|variant/.test(rel)) return 'association';
    return 'other';
  };
  const bucketWeight = b => ({core:1.7,formula:1.45,clue:1.25,exam:1.18,association:1.05,other:.8}[b]||.8);
  class Clinical1KnowledgeTreeAdapter{
    constructor(payload){
      this.payload = payload || {};
      this.entities = this.payload.entity_by_id || Object.fromEntries((this.payload.entities||[]).map(e=>[e.id,e]));
      this.edges = (this.payload.graph_edges||[]).map(arr => Array.isArray(arr) ? Object.fromEntries(EDGE_SCHEMA.map((k,i)=>[k,arr[i]])) : arr);
      this.edgesByEntity = new Map();
      this.edgesBySection = new Map();
      this.edges.forEach(e=>{
        if(e.source_kind==='entity') this._push(this.edgesByEntity,e.source_id,e);
        if(e.target_kind==='entity') this._push(this.edgesByEntity,e.target_id,e);
        if(e.source_kind==='section') this._push(this.edgesBySection,e.source_id,e);
        if(e.target_kind==='section') this._push(this.edgesBySection,e.target_id,e);
      });
      this.questionById = this.payload.question_by_id || {};
      this.questionsByEntity = this.payload.questions_by_entity || {};
    }
    _push(map,k,v){ if(!k) return; if(!map.has(k)) map.set(k,[]); map.get(k).push(v); }
    static async load(url='data/knowledge_tree_payload_v3.json'){
      const res = await fetch(url);
      if(!res.ok) throw new Error('Cannot load knowledge tree payload: '+url+' '+res.status);
      const payload = await res.json();
      return new Clinical1KnowledgeTreeAdapter(payload);
    }
    getTreeView(viewId){ return (this.payload.tree_views||{})[viewId] || null; }
    listViews(){ return Object.entries(this.payload.tree_views||{}).map(([id,v])=>({id,label:v.label,kind:v.kind,meta:v.meta||{}})); }
    getEntity(id){ return this.entities[id] || null; }
    searchEntities(query, limit=30){
      const q = norm(query); if(!q) return [];
      const rows = (this.payload.name_index || []).filter(r=>!r.search_suppressed_v4_1 && !/【(傷寒|金匱)$/.test(String(r.name||'')) && String(r.name||'')!=='即是桂枝湯' && !/宜.*湯\d+$/.test(String(r.name||''))); 
      const scored=[];
      for(const r of rows){
        const name = norm(r.name); const aliases=(r.aliases||[]).map(norm);
        let score=0;
        if(name===q) score+=100;
        else if(name.includes(q)) score+=50;
        for(const a of aliases){ if(a===q) score+=80; else if(a.includes(q)) score+=30; }
        if(score){ const ent=this.getEntity(r.id||r.entity_id||r.canonical_id); if(ent?.search_suppressed_v4_1) continue; if(ent?.type==='diagnostic_feature' && /宜.*湯/.test(ent.name||'')) score-=45; scored.push({...r,score}); }
      }
      return scored.sort((a,b)=>b.score-a.score || String(a.name||'').length-String(b.name||'').length).slice(0,limit);
    }
    getEntityGraph(entityId, opts={}){
      const dir=opts.direction||'both'; const classes=new Set(opts.evidence_classes||[]); const limit=opts.limit||80;
      const edges=(this.edgesByEntity.get(entityId)||[]).filter(e=>{
        if(classes.size && !classes.has(e.evidence_class)) return false;
        if(dir==='out') return e.source_id===entityId;
        if(dir==='in') return e.target_id===entityId;
        return true;
      });
      const sorted = edges.sort((a,b)=>(Number(b.confidence_label)||0)-(Number(a.confidence_label)||0)).slice(0,limit);
      return {entity:this.getEntity(entityId), edges:sorted, questions:this.getQuestionsByEntity(entityId, 30), formula:this.getFormulaBlock(entityId)};
    }
    getQuestionsByEntity(entityId, limit=30){
      const refs=(this.questionsByEntity||{})[entityId]||[];
      return refs.slice(0,limit).map(r=>({...r, question:this.questionById[r.question_id]||null}));
    }
    getFormulaBlock(entityId){
      const f=(this.payload.formula_index||{})[entityId]; if(!f) return null;
      const family=f.family_id ? (this.payload.formula_family_index||{})[f.family_id] : null;
      const variants=(this.payload.formula_variant_index||{})[entityId]||[];
      return {formula:f, family, variants};
    }
    edgeScore(e, depth=0){
      const b=relBucket(e.relation_type||e.relation||'');
      let w=bucketWeight(b)*100;
      const c=Number(e.confidence_label); if(Number.isFinite(c)) w += c*10;
      if(e.source_kind==='entity' && e.target_kind==='entity') w+=12;
      if(e.source_book && e.source_book!=='exam098_115') w+=4;
      return w-depth*8;
    }
    getNeighborEdges(id, direction='both'){
      const rows=(this.edgesByEntity.get(id)||[]);
      return rows.filter(e=>{
        if(direction==='out') return e.source_id===id;
        if(direction==='in') return e.target_id===id;
        return true;
      });
    }
    getNeighborhood(entityId, opts={}){
      const depth=Math.max(1,Math.min(4,Number(opts.depth)||2));
      const limit=Math.max(20,Math.min(1200,Number(opts.limit)||260));
      const direction=opts.direction||'both';
      const seed=this.getEntity(entityId);
      if(!seed) return {center_id:entityId,nodes:[],edges:[]};
      const ids=new Set([entityId]);
      const depthMap=new Map([[entityId,0]]);
      const edgeMap=new Map();
      let frontier=[entityId];
      for(let d=0; d<depth && ids.size<limit; d++){
        const candidates=[];
        for(const id of frontier){
          const edges=this.getNeighborEdges(id,direction);
          for(const e of edges){
            const s=sourceId(e), t=targetId(e);
            if(!this.getEntity(s) || !this.getEntity(t)) continue;
            const other=s===id?t:s;
            if(direction==='out' && s!==id) continue;
            if(direction==='in' && t!==id) continue;
            const k=edgeKey(e); if(!edgeMap.has(k)) edgeMap.set(k,e);
            if(!ids.has(other)) candidates.push({id:other, score:this.edgeScore(e,d)+(Number(this.getEntity(other)?.question_count)||0)*.05});
          }
        }
        candidates.sort((a,b)=>b.score-a.score || String(this.getEntity(a.id)?.name||a.id).localeCompare(String(this.getEntity(b.id)?.name||b.id),'zh-Hant'));
        const next=[];
        for(const c of candidates){
          if(ids.size>=limit) break;
          if(ids.has(c.id)) continue;
          ids.add(c.id); depthMap.set(c.id,d+1); next.push(c.id);
        }
        frontier=next;
        if(!frontier.length) break;
      }
      // Cross-links inside the selected subgraph are useful, but scanning all global edges
      // on every redraw is costly for the student-facing relation graph. Enable only on demand.
      if(opts.includeCrossLinks){
        for(const e of this.edges){
          const s=sourceId(e), t=targetId(e);
          if(ids.has(s) && ids.has(t)){
            const k=edgeKey(e); if(!edgeMap.has(k)) edgeMap.set(k,e);
          }
        }
      }
      const nodes=[...ids].map(id=>({...this.getEntity(id), _depth:depthMap.get(id)||0, _isCenter:id===entityId})).filter(n=>n&&n.id);
      const edges=[...edgeMap.values()].filter(e=>ids.has(sourceId(e))&&ids.has(targetId(e)));
      return {center_id:entityId,nodes,edges,depth,limit,direction};
    }
    questionsForNodes(ids){
      const seen=new Set(), out=[];
      for(const id of ids||[]){
        for(const ref of (this.questionsByEntity[id]||[])){
          const qid=ref.question_id; if(!qid || seen.has(qid)) continue;
          seen.add(qid);
          out.push({...ref, question:this.questionById[qid]||{}});
        }
      }
      return out;
    }
    periodCountRows(questionRows){
      const c=new Map();
      for(const r of questionRows||[]){
        const q=r.question||{}; const p=q.period || r.period || '未知';
        c.set(p,(c.get(p)||0)+1);
      }
      return [...c.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'zh-Hant')).map(([label,value])=>({label,value}));
    }
    answerDistributionRows(questionRows){
      const c=new Map();
      for(const r of questionRows||[]){
        const q=r.question||{}; let a=q.answer_label || q.answer || '待補';
        if(Array.isArray(a)) a=a.join('/');
        a=String(a).replace(/^\['?/, '').replace(/'?\]$/, '').replace(/^\[\"?/, '').replace(/\"?\]$/, '').trim() || '待補';
        c.set(a,(c.get(a)||0)+1);
      }
      return [...c.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'zh-Hant')).map(([label,value])=>({label,value}));
    }
    computeHighDimStats(data){
      const nodes=data.nodes||[], edges=data.edges||data.links||[];
      const nodeMap=new Map(nodes.map(n=>[n.id,n]));
      const typeOrder=['outline','disease','pattern','diagnostic_feature','formula','herb','question','formula_authority_record','official_source','source_doc'];
      const seenTypes=new Set(nodes.map(n=>n.type||'unknown'));
      const labels=typeOrder.filter(t=>seenTypes.has(t)).concat([...seenTypes].filter(t=>!typeOrder.includes(t)).sort());
      const idx=new Map(labels.map((t,i)=>[t,i]));
      const matrix=labels.map(()=>labels.map(()=>0));
      const bucketCount=new Map();
      const metric=new Map();
      for(const n of nodes){
        metric.set(n.id,{id:n.id,name:n.name,type:n.type,degree:0,weighted:0,typeSet:new Set(),relSet:new Set(),examLinks:0,questionCount:Number(n.question_count)||0});
      }
      for(const e of edges){
        const s=sourceId(e), t=targetId(e), sn=nodeMap.get(s)||this.getEntity(s), tn=nodeMap.get(t)||this.getEntity(t);
        if(!sn||!tn) continue;
        const si=idx.get(sn.type||'unknown'), ti=idx.get(tn.type||'unknown');
        if(si!=null&&ti!=null) matrix[si][ti]++;
        const b=relBucket(e.relation_type||e.relation||''); bucketCount.set(b,(bucketCount.get(b)||0)+1);
        const w=bucketWeight(b);
        for(const [a,bn] of [[s,tn],[t,sn]]){
          const o=metric.get(a); if(!o) continue;
          o.degree++; o.weighted+=w; if(bn?.type) o.typeSet.add(bn.type); o.relSet.add(relBucket(e.relation_type||e.relation||'')); if(relBucket(e.relation_type||e.relation||'')==='exam') o.examLinks++;
        }
      }
      const metrics=[...metric.values()].map(o=>({
        id:o.id,name:o.name,type:o.type,degree:o.degree,weighted:o.weighted,typeDiversity:o.typeSet.size,relDiversity:o.relSet.size,examLinks:o.examLinks,questionCount:o.questionCount,
        bridgeScore:o.weighted + o.typeSet.size*1.8 + o.relSet.size*1.2 + o.examLinks*.7 + Math.log1p(o.questionCount)*.8
      })).sort((a,b)=>b.bridgeScore-a.bridgeScore || b.degree-a.degree);
      const bucketRows=[...bucketCount.entries()].sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value}));
      const typeRows=[...seenTypes].map(t=>({label:t,value:nodes.filter(n=>(n.type||'unknown')===t).length})).sort((a,b)=>b.value-a.value);
      return {matrixLabels:labels,matrix,metrics,bucketRows,typeRows};
    }
    computeGlobalOverview(limit=80){
      const typeCount=new Map(), bucketCount=new Map();
      Object.values(this.entities).forEach(e=>typeCount.set(e.type||'unknown',(typeCount.get(e.type||'unknown')||0)+1));
      for(const e of this.edges){ const b=relBucket(e.relation_type||e.relation||''); bucketCount.set(b,(bucketCount.get(b)||0)+1); }
      const typeRows=[...typeCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([label,value])=>({label,value}));
      const bucketRows=[...bucketCount.entries()].sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value}));
      return {typeRows,bucketRows};
    }
    makeQuizScope(scope){ const s=Object.assign({}, scope||{}); if(!s.layer) s.layer=(s.tree_scope || (Array.isArray(s.question_ids)&&s.question_ids.length))?'all':'official_exam'; return s; }
    requestQuiz(scope){
      const s=this.makeQuizScope(scope);
      if(typeof global.startQuizByScope === 'function') global.startQuizByScope(s);
      global.dispatchEvent(new CustomEvent('clinical1:quiz-scope-requested',{detail:s}));
      return s;
    }
  }
  global.Clinical1KnowledgeTreeAdapter = Clinical1KnowledgeTreeAdapter;
})(window);
