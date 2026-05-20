(function(){
  const nativeFetch = window.fetch.bind(window);
  const cache = new Map();
  function canon(input){
    try{
      const u = new URL(typeof input==='string'?input:input.url, location.href);
      let p = u.pathname.replace(/\\/g,'/');
      const i = p.lastIndexOf('/app/');
      if(i>=0) p = p.slice(i+5); else p = p.replace(/^\/+/, '');
      return decodeURIComponent(p);
    }catch(e){ return String(input||''); }
  }
  async function getJSON(path){
    if(cache.has(path)) return cache.get(path);
    const res = await nativeFetch(path, {cache:'force-cache'});
    if(!res.ok) throw new Error(path+' '+res.status);
    const j = await res.json(); cache.set(path,j); return j;
  }
  const routes = {
    'data/clinical1_fused_entity_pages_v3.json':'clinical1_fused_entity_pages_v3',
    'data/quiz/quiz_question_bank_payload.json':'quiz_question_bank_payload',
    'data/knowledge_tree_payload_v3.json':'knowledge_tree_payload',
    'data/learning_exam_pattern_payload_v5_0a.json':'learning_exam_pattern_payload'
  };
  async function reconstruct(name){
    const key='__reconstruct__:'+name;
    if(cache.has(key)) return cache.get(key);
    const baseDir='data/l11/reconstruct/'+name+'/';
    const manifest=await getJSON(baseDir+'manifest.json');
    let obj=await getJSON(baseDir+(manifest.base||'base.json'));
    obj=Array.isArray(obj)?obj.slice():Object.assign({},obj||{});
    for(const m of (manifest.merge||[])){
      if(m.mode==='list_extend'){
        const arr=[]; for(const f of m.files){ arr.push(...await getJSON(baseDir+f)); } obj[m.key]=arr;
      } else if(m.mode==='dict_update'){
        const d={}; for(const f of m.files){ Object.assign(d, await getJSON(baseDir+f)); } obj[m.key]=d;
      } else if(m.mode==='root_dict_update'){
        const d={}; for(const f of m.files){ Object.assign(d, await getJSON(baseDir+f)); } obj=d;
      }
    }
    cache.set(key,obj); return obj;
  }
  async function loadEntityIndex(){ return await getJSON('data/l11/entity_pages/index.json'); }
  async function loadEntityPage(id){
    const idx=await loadEntityIndex();
    const fn=idx.entity_to_file[id];
    if(!fn) return null;
    const shard=await getJSON('data/l11/entity_pages/'+fn);
    return shard[id]||null;
  }
  function entityName(id){
    const idx=cache.get('data/l11/entity_pages/index.json');
    return idx && idx.entity_names && idx.entity_names[id] ? idx.entity_names[id].name : null;
  }
  async function loadQuestionIndex(){ return await getJSON('data/l11/questions/index.json'); }
  async function loadQuestionById(id){
    const idx=await loadQuestionIndex();
    const fn=idx.question_to_file[id] || idx.canonical_to_file[id];
    if(!fn) return null;
    const arr=await getJSON('data/l11/reconstruct/quiz_question_bank_payload/'+fn);
    return (arr||[]).find(q=>q.id===id || q.canonical_question_id===id) || null;
  }
  window.Clinical1LazyData={version:'v5.6.8-L11-complete',nativeFetch,getJSON,reconstruct,loadEntityPage,entityName,loadQuestionById,loadQuestionIndex,cache,routes};
  window.fetch = async function(input, init){
    const p=canon(input);
    if(routes[p]){
      const obj=await reconstruct(routes[p]);
      return new Response(JSON.stringify(obj),{status:200,headers:{'Content-Type':'application/json; charset=utf-8','X-Clinical1-Lazy':'reconstruct','X-Clinical1-Lazy-Name':routes[p]}});
    }
    return nativeFetch(input, init);
  };
})();