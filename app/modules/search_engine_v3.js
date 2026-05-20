
(function(){
function splitQ(q){return String(q||'').split(/\s+|、|，|；|\/|\|/).filter(Boolean)}
class Clinical1SearchEngineV3{constructor(payload){this.p=payload;this.docs=payload.docs||[];this.docIndex=new Map(this.docs.map((d,i)=>[d.doc_id,i]));}
 search(q,opts={}){q=String(q||'').trim();if(!q)return[];const cand=new Set(),score=new Map(),reasons=new Map();const add=(i,s,why)=>{cand.add(i);score.set(i,(score.get(i)||0)+s);if(why){const r=reasons.get(i)||[];r.push(why);reasons.set(i,r)}};
 for(const [term,ents] of Object.entries(this.p.entity_term_index||{})) if(term&&q.includes(term)) for(const e of ents){const i=this.docIndex.get('entity_'+e.entity_id);if(i!==undefined)add(i,120+term.length*2,'entity:'+term)}
 for(const [term,ents] of Object.entries(this.p.alias_index||{})) if(term&&q.includes(term)) for(const e of ents){const i=this.docIndex.get('entity_'+e.entity_id);if(i!==undefined)add(i,75+term.length,'alias:'+term)}
 for(const [term,ents] of Object.entries(this.p.fine_link_index||{})) if(term&&q.includes(term)) for(const e of ents){const i=this.docIndex.get(e.doc_id);if(i!==undefined)add(i,(e.weight||5)*8,'fine:'+term)}
 const terms=splitQ(q); this.docs.forEach((d,i)=>{let hit=0;const text=[d.title,d.subtitle,d.text].join(' ');for(const t of terms){if(t.length>=2&&text.includes(t))hit++}if(hit)add(i,hit*Number(d.boost||1),'text')});
 let arr=[...cand].map(i=>({...this.docs[i],score:score.get(i)||0,reasons:reasons.get(i)||[]})); if(opts.doc_type)arr=arr.filter(x=>x.doc_type===opts.doc_type); arr.sort((a,b)=>b.score-a.score);return arr.slice(0,opts.limit||20)} }
window.Clinical1SearchEngineV3=Clinical1SearchEngineV3;})();
