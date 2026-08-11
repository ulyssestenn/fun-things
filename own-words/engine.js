(() => {
  const QUALITY = { light: 3, balanced: 2, thorough: 1 };
  const HARD_CHAR_CAP = 20000;
  const HARD_WORD_CAP = 2500;
  const MAX_POOL = 1200;
  const MAX_RULE_MATCHES = 96;
  const MAX_SELECTION_TRIALS = 120;
  const WORD_RE = /\b[\p{L}\p{N}'’_-]+\b/gu;

  function countWords(t) {
    if (typeof t !== 'string' || !t) return 0;
    if (t.length > HARD_CHAR_CAP) return HARD_WORD_CAP + 1;
    if (window.OwnWordsLimits) return window.OwnWordsLimits.countWordsCapped(t, HARD_WORD_CAP + 1);
    let count = 0;
    WORD_RE.lastIndex = 0;
    while (WORD_RE.exec(t)) {
      count++;
      if (count > HARD_WORD_CAP) break;
    }
    WORD_RE.lastIndex = 0;
    return count;
  }

  function safeInput(text) {
    if (typeof text !== 'string' || text.length > HARD_CHAR_CAP) return false;
    if (window.OwnWordsLimits) return window.OwnWordsLimits.inspect(text).ok;
    return countWords(text) <= HARD_WORD_CAP;
  }

  const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const overlap=(a,b)=>a.start<b.end&&b.start<a.end;
  function sameCase(original,replacement){if(!original||!replacement)return replacement;if(original.toUpperCase()===original&&/[A-Z]/.test(original))return replacement.toUpperCase();if(original[0]===original[0].toUpperCase())return replacement[0].toUpperCase()+replacement.slice(1);return replacement}
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function explicitFamily(meta){return typeof meta==='string'?meta:(meta&&typeof meta==='object'?meta.family:null)}

  function preview(text, selected){
    const ordered=[...selected].sort((a,b)=>a.start-b.start);let out='',cursor=0;
    for(const c of ordered){out+=text.slice(cursor,c.start)+(c.alts[0]||c.original);cursor=c.end}
    return out+text.slice(cursor);
  }

  function chooseToTarget(text, clean, level){
    if(!clean.length)return [];
    const metrics=window.OwnWordsMetrics;
    if(!metrics)return clean.slice(0,MAX_SELECTION_TRIALS);
    const target=(metrics.TARGETS[level]||metrics.TARGETS.balanced);
    const selected=[], remaining=[...clean], usedBands=new Set(), familyCounts=new Map();
    let currentDepth=0,trials=0;

    const selectionScore=c=>{
      const band=Math.min(9,Math.floor((c.start/Math.max(1,text.length))*10));
      const familyCount=c.family?(familyCounts.get(c.family)||0):0;
      const familyBonus=c.family?(familyCount===0?650:-Math.min(450,familyCount*150)):0;
      return (c.type==='structure'?5000:0)+c.q*1000+(!usedBands.has(band)?450:0)+familyBonus+Math.min(300,c.end-c.start);
    };

    while(remaining.length&&trials<MAX_SELECTION_TRIALS){
      trials++;
      remaining.sort((a,b)=>selectionScore(b)-selectionScore(a)||a.start-b.start);
      const candidate=remaining.shift();
      const trial=[...selected,candidate];
      const trialText=preview(text,trial);
      const trialDepth=metrics.scoreRewrite(text,trialText,{candidates:trial,level}).depth;

      if(selected.length&&currentDepth>=target.min){
        const currentDistance=Math.abs(target.ideal-currentDepth);
        const trialDistance=Math.abs(target.ideal-trialDepth);
        if(trialDepth>target.max&&trialDistance>=currentDistance)break;
        if(currentDepth>=target.ideal)break;
      }

      selected.push(candidate);
      currentDepth=trialDepth;
      usedBands.add(Math.min(9,Math.floor((candidate.start/Math.max(1,text.length))*10)));
      if(candidate.family)familyCounts.set(candidate.family,(familyCounts.get(candidate.family)||0)+1);
      if(currentDepth>=target.ideal)break;
    }

    return selected.sort((a,b)=>a.start-b.start);
  }

  function findCandidates(text, level){
    if(!safeInput(text))return [];
    const lexicon=window.OwnWordsLexicon;
    if(!lexicon||!Array.isArray(lexicon.PHRASES)||!lexicon.WORDS||!Array.isArray(lexicon.PATTERNS))return [];
    const {PHRASES, WORDS, PATTERNS}=lexicon;
    const grammar=window.OwnWordsGrammar;
    const minQ=QUALITY[level]||QUALITY.balanced, pool=[];
    const add=c=>{if(pool.length>=MAX_POOL)return false;pool.push(c);return true};

    for(const pattern of PATTERNS){
      if(pool.length>=MAX_POOL)break;
      if(pattern.q<minQ)continue; pattern.re.lastIndex=0; let m,matches=0;
      while(matches<MAX_RULE_MATCHES&&(m=pattern.re.exec(text))){
        matches++;
        const alts=pattern.build(m).filter(a=>a&&a!==m[0]);
        const family=grammar?grammar.classify(m[0],'structure',pattern.family):null;
        if(alts.length&&!add({start:m.index,end:m.index+m[0].length,original:m[0],alts,q:pattern.q,type:'structure',family}))break;
        if(m[0].length===0)pattern.re.lastIndex++;
      }
    }
    for(const entry of PHRASES){
      if(pool.length>=MAX_POOL)break;
      const [phrase,alts,q,meta]=entry;
      if(q<minQ)continue; const re=new RegExp(`\\b${reEsc(phrase)}\\b`,'gi'); let m,matches=0;
      const family=grammar?grammar.classify(phrase,'phrase',explicitFamily(meta)):null;
      while(matches<MAX_RULE_MATCHES&&(m=re.exec(text))){
        matches++;
        const choices=alts.map(a=>sameCase(m[0],a)).filter(a=>a.toLowerCase()!==m[0].toLowerCase());
        if(choices.length&&!add({start:m.index,end:m.index+m[0].length,original:m[0],alts:choices,q,type:'phrase',family}))break;
      }
    }
    const wr=/\b[\p{L}]+\b/gu; let m;
    while(pool.length<MAX_POOL&&(m=wr.exec(text))){
      const entry=WORDS[m[0].toLowerCase()]; if(!entry||entry[1]<minQ)continue;
      const choices=entry[0].map(a=>sameCase(m[0],a)).filter(a=>a.toLowerCase()!==m[0].toLowerCase());
      if(choices.length)add({start:m.index,end:m.index+m[0].length,original:m[0],alts:choices,q:entry[1],type:'word',family:null});
    }
    pool.sort((a,b)=>b.q-a.q||(b.end-b.start)-(a.end-a.start)||a.start-b.start);
    const clean=[]; for(const c of pool){if(!clean.some(x=>overlap(c,x)))clean.push(c)}
    clean.sort((a,b)=>a.start-b.start);
    return chooseToTarget(text,clean,level);
  }

  window.OwnWordsEngine={findCandidates,countWords,esc,hash};
})();
