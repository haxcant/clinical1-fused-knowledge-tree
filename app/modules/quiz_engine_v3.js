
/* 臨床一全庫考題系統 Quiz Engine v3
 * Data source: quiz_question_bank_payload.json generated from fused master v3.
 * Browser-only; no server database required. Progress is stored in localStorage.
 */
class ClinicalQuizEngineV3 {
  constructor(payload, options = {}) {
    this.payload = payload || { questions: [], indices: {}, entities: {}, sections: {}, formula_ontology: {} };
    this.questionsById = new Map((this.payload.questions || []).map(q => [q.id, q]));
    this.indices = this.payload.indices || {};
    this.entities = this.payload.entities || {};
    this.sections = this.payload.sections || {};
    this.formulaOntology = this.payload.formula_ontology || { formula_blocks: {}, formula_families: {} };
    this.storageKey = options.storageKey || 'clinical1_quiz_v3_progress';
    this.session = { questionIds: [], cursor: 0, mode: null, filter: {}, shuffle: true };
    this.progress = this._loadProgress();
  }

  _loadProgress() {
    try { return JSON.parse(localStorage.getItem(this.storageKey) || '{}'); }
    catch (e) { return {}; }
  }
  _saveProgress() { localStorage.setItem(this.storageKey, JSON.stringify(this.progress)); }
  _ensureQuestionProgress(qid) {
    if (!this.progress[qid]) {
      this.progress[qid] = { seen: 0, correct: 0, wrong: 0, lastAnswer: null, lastCorrect: null, inWrongBook: false, history: [] };
    }
    return this.progress[qid];
  }
  resetProgress() { this.progress = {}; this._saveProgress(); }
  getProgressSummary() {
    let seen=0, correct=0, wrong=0, wrongBook=0;
    for (const p of Object.values(this.progress)) { seen += p.seen || 0; correct += p.correct || 0; wrong += p.wrong || 0; if (p.inWrongBook) wrongBook++; }
    return { seen, correct, wrong, wrongBook };
  }

  _unique(arr) { return Array.from(new Set(arr || [])); }
  _intersect(a, b) { const sb = new Set(b || []); return (a || []).filter(x => sb.has(x)); }
  _shuffle(arr) {
    const a = arr.slice();
    for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }

  resolveFilter(filter = {}) {
    let ids = null;
    const take = (list) => { ids = ids === null ? this._unique(list) : this._intersect(ids, list); };
    if (filter.layer) take((this.indices.by_layer || {})[filter.layer] || []);
    if (filter.book_id) take((this.indices.by_book || {})[filter.book_id] || []);
    if (filter.section_id) take((this.indices.by_section || {})[filter.section_id] || []);
    if (filter.entity_id) take((this.indices.by_entity || {})[filter.entity_id] || []);
    if (filter.formula_family_id) take((this.indices.by_formula_family || {})[filter.formula_family_id] || []);
    if (filter.period) take((this.indices.by_period || {})[filter.period] || []);
    if (filter.subject) take((this.indices.by_subject || {})[filter.subject] || []);
    if (filter.official_primary) take(this.indices.official_primary || []);
    if (filter.all_practiceable) take(this.indices.all_practiceable || []);
    if (filter.wrong_only) {
      const wrongIds = Object.entries(this.progress).filter(([qid,p]) => p && p.inWrongBook).map(([qid]) => qid);
      take(wrongIds);
    }
    if (ids === null) ids = this.indices.all_practiceable || this.payload.questions.map(q => q.id);
    if (filter.exclude_layer) {
      const ex = new Set((this.indices.by_layer || {})[filter.exclude_layer] || []);
      ids = ids.filter(id => !ex.has(id));
    }
    ids = ids.filter(id => this.questionsById.has(id));
    return this._unique(ids);
  }

  createSession({ mode = 'custom', filter = {}, shuffle = true } = {}) {
    let ids = this.resolveFilter(filter);
    if (shuffle) ids = this._shuffle(ids);
    this.session = { questionIds: ids, cursor: 0, mode, filter, shuffle };
    return { mode, total: ids.length, filter };
  }
  currentQuestion() { return this.questionsById.get(this.session.questionIds[this.session.cursor]); }
  nextQuestion() {
    if (!this.session.questionIds.length) return null;
    if (this.session.cursor < this.session.questionIds.length - 1) this.session.cursor++;
    return this.currentQuestion();
  }
  previousQuestion() {
    if (!this.session.questionIds.length) return null;
    if (this.session.cursor > 0) this.session.cursor--;
    return this.currentQuestion();
  }

  submitAnswer(questionId, selectedLabel) {
    const q = this.questionsById.get(questionId);
    if (!q) throw new Error('Question not found: ' + questionId);
    const correctLabels = (q.options || []).filter(o => o.is_correct).map(o => o.label);
    const isCorrect = correctLabels.includes(selectedLabel);
    const p = this._ensureQuestionProgress(questionId);
    p.seen += 1;
    p.lastAnswer = selectedLabel;
    p.lastCorrect = isCorrect;
    p.history.push({ t: new Date().toISOString(), selectedLabel, isCorrect });
    if (p.history.length > 20) p.history = p.history.slice(-20);
    if (isCorrect) { p.correct += 1; if ((p.wrong || 0) === 0) p.inWrongBook = false; }
    else { p.wrong += 1; p.inWrongBook = true; }
    this._saveProgress();
    return { isCorrect, correctLabels, progress: p };
  }
  toggleWrongBook(questionId, force) {
    const p = this._ensureQuestionProgress(questionId);
    p.inWrongBook = typeof force === 'boolean' ? force : !p.inWrongBook;
    this._saveProgress();
    return p.inWrongBook;
  }

  getQuestionKnowledge(questionId) {
    const q = this.questionsById.get(questionId);
    if (!q) return null;
    const formulaBlocks = {};
    for (const fid of (q.formula_ids || [])) {
      if (this.formulaOntology.formula_blocks && this.formulaOntology.formula_blocks[fid]) {
        formulaBlocks[fid] = this.formulaOntology.formula_blocks[fid];
      }
    }
    const families = {};
    for (const ffid of (q.formula_family_ids || [])) {
      if (this.formulaOntology.formula_families && this.formulaOntology.formula_families[ffid]) {
        families[ffid] = this.formulaOntology.formula_families[ffid];
      }
    }
    return { entities: q.entities || {}, formulaBlocks, formulaFamilies: families, section: this.sections[q.section_id] || null };
  }


  getScopeRows(scopeType = 'entity', keyword = '', limit = 500) {
    const kw = (keyword || '').trim();
    const match = (txt) => !kw || String(txt || '').includes(kw);
    const rows = [];
    if (scopeType === 'layer') {
      for (const [id, list] of Object.entries(this.indices.by_layer || {})) {
        if (!match(id)) continue;
        rows.push({ scope_type:'layer', id, label:id, sublabel:'題庫層級', question_count:(list || []).filter(qid => this.questionsById.has(qid)).length, filter:{ layer:id } });
      }
    } else if (scopeType === 'book') {
      for (const [id, list] of Object.entries(this.indices.by_book || {})) {
        if (!match(id)) continue;
        rows.push({ scope_type:'book', id, label:id, sublabel:'書本／來源範圍', question_count:(list || []).filter(qid => this.questionsById.has(qid)).length, filter:{ book_id:id } });
      }
    } else if (scopeType === 'section') {
      for (const [id, list] of Object.entries(this.indices.by_section || {})) {
        const s = this.sections[id] || {};
        const label = s.title || id;
        const sublabel = [s.book_id, s.level ? ('level ' + s.level) : ''].filter(Boolean).join('｜');
        if (!match(label) && !match(s.book_id) && !match(id)) continue;
        rows.push({ scope_type:'section', id, label, sublabel, question_count:(list || []).filter(qid => this.questionsById.has(qid)).length, filter:{ section_id:id } });
      }
    } else if (scopeType === 'entity') {
      for (const [id, e] of Object.entries(this.entities || {})) {
        const label = e.name || id;
        const aliases = (e.aliases || []).join('、');
        if (!match(label) && !match(aliases) && !match(e.type) && !match(id)) continue;
        const list = (this.indices.by_entity || {})[id] || [];
        rows.push({ scope_type:'entity', id, label, sublabel:e.type || 'entity', question_count:(list || []).filter(qid => this.questionsById.has(qid)).length, filter:{ entity_id:id } });
      }
    } else if (scopeType === 'formula_family') {
      for (const [id, fam] of Object.entries((this.formulaOntology || {}).formula_families || {})) {
        const label = fam.display_name || fam.root_formula_name || id;
        const members = (fam.member_formula_names || []).join('、');
        if (!match(label) && !match(members) && !match(id)) continue;
        const list = (this.indices.by_formula_family || {})[id] || [];
        rows.push({ scope_type:'formula_family', id, label, sublabel:`方族｜${fam.member_count || 0} 方：${(fam.member_formula_names || []).slice(0,5).join('、')}`, question_count:(list || []).filter(qid => this.questionsById.has(qid)).length, filter:{ formula_family_id:id } });
      }
    }
    rows.sort((a,b)=>(b.question_count||0)-(a.question_count||0) || String(a.label).localeCompare(String(b.label),'zh-Hant'));
    return rows.slice(0, limit);
  }

  createSessionFromScope(scopeRow, options = {}) {
    const filter = Object.assign({}, scopeRow && scopeRow.filter ? scopeRow.filter : {}, options.filter || {});
    const mode = options.mode || ('report_' + (scopeRow ? scopeRow.scope_type : 'custom'));
    return this.createSession({ mode, filter, shuffle: options.shuffle !== false });
  }

  getSessionReport(limit = 200) {
    const ids = this.session.questionIds || [];
    return ids.slice(0, limit).map((qid, idx) => {
      const q = this.questionsById.get(qid) || {};
      const p = this.progress[qid] || {};
      return {
        order: idx + 1,
        id: qid,
        layer: q.layer || '',
        book_scope: q.book_scope || q.book_id || '',
        period: q.period || '',
        subject: q.subject || '',
        question_no: q.question_no || '',
        stem: q.stem || '',
        seen: p.seen || 0,
        correct: p.correct || 0,
        wrong: p.wrong || 0,
        inWrongBook: !!p.inWrongBook
      };
    });
  }

  getQuestionById(questionId) { return this.questionsById.get(questionId) || null; }

  createSessionFromUrlParams(params) {
    const filter = {};
    if (params.layer) filter.layer = params.layer;
    if (params.book_id) filter.book_id = params.book_id;
    if (params.section_id) filter.section_id = params.section_id;
    if (params.entity_id) filter.entity_id = params.entity_id;
    if (params.formula_family_id) filter.formula_family_id = params.formula_family_id;
    if (params.period) filter.period = params.period;
    if (params.subject) filter.subject = params.subject;
    if (params.official_primary === '1' || params.official_primary === 'true') filter.official_primary = true;
    if (params.wrong_only === '1' || params.wrong_only === 'true') filter.wrong_only = true;
    if (Object.keys(filter).length === 0) return null;
    return this.createSession({ mode:'linked_scope', filter, shuffle:true });
  }


  searchScopes(keyword, limit = 30) {
    const kw = (keyword || '').trim();
    if (!kw) return [];
    const out = [];
    for (const [id,e] of Object.entries(this.entities)) {
      const hay = [e.name, ...(e.aliases || [])].join('|');
      if (hay.includes(kw)) out.push({ type:'entity', id, label:e.name, entity_type:e.type, question_count:e.question_count || 0 });
    }
    out.sort((a,b)=>(b.question_count||0)-(a.question_count||0));
    return out.slice(0, limit);
  }
}

if (typeof window !== 'undefined') window.ClinicalQuizEngineV3 = ClinicalQuizEngineV3;
if (typeof module !== 'undefined') module.exports = ClinicalQuizEngineV3;
