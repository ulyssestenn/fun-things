(() => {
  const QUALITY = { light: 3, balanced: 2, thorough: 1 };
  const HARD_CHAR_CAP = 20000;
  const HARD_WORD_CAP = 2500;
  const MAX_POOL = 1200;
  const MAX_RULE_MATCHES = 96;
  const MAX_SELECTION_TRIALS = 120;
  const THOROUGH_MAX_SELECTED = 600;
  const THOROUGH_SCORE_EVERY = 20;
  const WORD_RE = /\b[\p{L}\p{N}'’_-]+\b/gu;
  const TOKEN_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s]/gu;

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
  const bandFor=(c,text)=>Math.min(9,Math.floor((c.start/Math.max(1,text.length))*10));
  function sameCase(original,replacement){if(!original||!replacement)return replacement;if(original.toUpperCase()===original&&/[A-Z]/.test(original))return replacement.toUpperCase();if(original[0]===original[0].toUpperCase())return replacement[0].toUpperCase()+replacement.slice(1);return replacement}
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function explicitFamily(meta){return typeof meta==='string'?meta:(meta&&typeof meta==='object'?meta.family:null)}

  function proxyTokenSpans(text){
    const spans=[];let m;
    TOKEN_RE.lastIndex=0;
    while((m=TOKEN_RE.exec(text))){
      spans.push({start:m.index,end:m.index+m[0].length});
      if(spans.length>9000)break;
    }
    TOKEN_RE.lastIndex=0;
    return spans;
  }

  function annotateContextWindows(text,candidates,n=5){
    const tokens=proxyTokenSpans(text);
    const total=Math.max(0,tokens.length-n+1);
    if(!total){for(const c of candidates)c.contextWindows=[];return candidates}
    let tokenCursor=0;
    for(const c of candidates){
      while(tokenCursor<tokens.length&&tokens[tokenCursor].end<=c.start)tokenCursor++;
      let first=-1,last=-1,j=tokenCursor;
      while(j<tokens.length&&tokens[j].start<c.end){
        if(tokens[j].end>c.start){if(first<0)first=j;last=j}
        j++;
      }
      if(first<0){c.contextWindows=[];continue}
      const starts=[];
      const from=Math.max(0,first-n+1),to=Math.min(last,total-1);
      for(let start=from;start<=to;start++)starts.push(start);
      c.contextWindows=starts;
    }
    return candidates;
  }

  function preview(text, selected){
    const ordered=[...selected].sort((a,b)=>a.start-b.start);let out='',cursor=0;
    for(const c of ordered){out+=text.slice(cursor,c.start)+(c.alts[0]||c.original);cursor=c.end}
    return out+text.slice(cursor);
  }

  function withMeta(selected, meta){
    Object.defineProperty(selected,'selectionMeta',{value:Object.freeze({...meta}),enumerable:false,configurable:true});
    return selected.sort((a,b)=>a.start-b.start);
  }

  function candidateScore(c,text,usedBands,familyCounts,coveredWindows){
    const band=bandFor(c,text);
    const familyCount=c.family?(familyCounts.get(c.family)||0):0;
    const familyBonus=c.family?(familyCount===0?650:-Math.min(450,familyCount*150)):0;
    const windows=Array.isArray(c.contextWindows)?c.contextWindows:[];
    let newWindows=0;
    for(const start of windows)if(!coveredWindows.has(start))newWindows++;
    const contextBonus=Math.min(1600,newWindows*700);
    const contextOverlapPenalty=Math.min(500,Math.max(0,windows.length-newWindows)*80);
    return (c.type==='structure'?5000:0)+c.q*1000+(!usedBands.has(band)?450:0)+familyBonus+contextBonus-contextOverlapPenalty+Math.min(300,c.end-c.start);
  }

  function takeBest(remaining,text,usedBands,familyCounts,coveredWindows){
    let bestIndex=0,bestScore=-Infinity;
    for(let i=0;i<remaining.length;i++){
      const score=candidateScore(remaining[i],text,usedBands,familyCounts,coveredWindows);
      if(score>bestScore||(score===bestScore&&remaining[i].start<remaining[bestIndex].start)){bestScore=score;bestIndex=i}
    }
    return remaining.splice(bestIndex,1)[0];
  }

  function recordSelection(candidate,text,usedBands,familyCounts,coveredWindows){
    usedBands.add(bandFor(candidate,text));
    if(candidate.family)familyCounts.set(candidate.family,(familyCounts.get(candidate.family)||0)+1);
    if(Array.isArray(candidate.contextWindows))for(const start of candidate.contextWindows)coveredWindows.add(start);
  }

  function chooseStandard(text,clean,level){
    const metrics=window.OwnWordsMetrics;
    if(!metrics)return withMeta(clean.slice(0,MAX_SELECTION_TRIALS),{reason:clean.length>MAX_SELECTION_TRIALS?'safety-cap':'exhausted',available:clean.length});
    const target=(metrics.TARGETS[level]||metrics.TARGETS.balanced);
    const selected=[],remaining=[...clean],usedBands=new Set(),familyCounts=new Map(),coveredWindows=new Set();
    let currentDepth=0,trials=0,reason='exhausted';

    while(remaining.length&&trials<MAX_SELECTION_TRIALS){
      trials++;
      const candidate=takeBest(remaining,text,usedBands,familyCounts,coveredWindows);
      const trial=[...selected,candidate];
      const trialText=preview(text,trial);
      const trialDepth=(metrics.scoreRewriteSelection||metrics.scoreRewrite)(text,trialText,{candidates:trial,level}).depth;

      if(selected.length&&currentDepth>=target.min){
        const currentDistance=Math.abs(target.ideal-currentDepth);
        const trialDistance=Math.abs(target.ideal-trialDepth);
        if(trialDepth>target.max&&trialDistance>=currentDistance){reason='target';break}
        if(currentDepth>=target.ideal){reason='target';break}
      }

      selected.push(candidate);
      currentDepth=trialDepth;
      recordSelection(candidate,text,usedBands,familyCounts,coveredWindows);
      if(currentDepth>=target.ideal){reason='target';break}
    }

    if(reason!=='target')reason=remaining.length?'safety-cap':'exhausted';
    const finalText=preview(text,selected);
    const finalDepth=(metrics.scoreRewriteSelection||metrics.scoreRewrite)(text,finalText,{candidates:selected,level}).depth;
    return withMeta(selected,{reason,available:clean.length,selected:selected.length,estimatedDepth:currentDepth,finalDepth,reachedTarget:finalDepth>=target.min});
  }

  function chooseThorough(text,clean,level){
    const metrics=window.OwnWordsMetrics;
    if(!metrics)return withMeta(clean.slice(0,Math.min(clean.length,THOROUGH_MAX_SELECTED)),{reason:clean.length>THOROUGH_MAX_SELECTED?'safety-cap':'exhausted',available:clean.length});
    const target=(metrics.TARGETS[level]||metrics.TARGETS.thorough);
    const selected=[],remaining=[...clean],usedBands=new Set(),familyCounts=new Map(),coveredWindows=new Set();
    let estimatedDepth=0,reason='exhausted';

    while(remaining.length&&selected.length<THOROUGH_MAX_SELECTED){
      const candidate=takeBest(remaining,text,usedBands,familyCounts,coveredWindows);
      selected.push(candidate);
      recordSelection(candidate,text,usedBands,familyCounts,coveredWindows);

      const shouldMeasure=selected.length%THOROUGH_SCORE_EVERY===0||!remaining.length;
      if(!shouldMeasure)continue;
      const trialText=preview(text,selected);
      estimatedDepth=(metrics.scoreRewriteFast||metrics.scoreRewrite)(text,trialText,{candidates:selected,level}).depth;
      if(estimatedDepth>=target.ideal){reason='target';break}
    }

    if(reason!=='target')reason=remaining.length?'safety-cap':'exhausted';
    const finalText=preview(text,selected);
    const finalDepth=(metrics.scoreRewriteSelection||metrics.scoreRewrite)(text,finalText,{candidates:selected,level}).depth;

    if(reason==='target'&&finalDepth<target.min&&remaining.length){
      while(remaining.length&&selected.length<THOROUGH_MAX_SELECTED&&finalDepth<target.min){
        const batch=[];
        for(let i=0;i<THOROUGH_SCORE_EVERY&&remaining.length&&selected.length<THOROUGH_MAX_SELECTED;i++){
          const candidate=takeBest(remaining,text,usedBands,familyCounts,coveredWindows);
          selected.push(candidate);batch.push(candidate);recordSelection(candidate,text,usedBands,familyCounts,coveredWindows);
        }
        if(!batch.length)break;
        const fast=(metrics.scoreRewriteFast||metrics.scoreRewrite)(text,preview(text,selected),{candidates:selected,level}).depth;
        estimatedDepth=fast;
        if(fast>=target.ideal)break;
      }
      if(!remaining.length) reason='exhausted';
      else if(selected.length>=THOROUGH_MAX_SELECTED&&estimatedDepth<target.ideal) reason='safety-cap';
      else reason='target';
    }

    const revised=preview(text,selected);
    const measured=(metrics.scoreRewriteSelection||metrics.scoreRewrite)(text,revised,{candidates:selected,level}).depth;
    if(measured<target.min&&reason==='target'&&!remaining.length)reason='exhausted';
    return withMeta(selected,{reason,available:clean.length,selected:selected.length,estimatedDepth,finalDepth:measured,reachedTarget:measured>=target.min});
  }

  function chooseToTarget(text,clean,level){
    if(!clean.length)return withMeta([],{reason:'exhausted',available:0,selected:0,estimatedDepth:0,finalDepth:0,reachedTarget:false});
    return level==='thorough'?chooseThorough(text,clean,level):chooseStandard(text,clean,level);
  }

  function findCandidates(text, level){
    if(!safeInput(text))return withMeta([],{reason:'input-limit',available:0,selected:0,reachedTarget:false});
    const lexicon=window.OwnWordsLexicon;
    if(!lexicon||!Array.isArray(lexicon.PHRASES)||!lexicon.WORDS||!Array.isArray(lexicon.PATTERNS))return withMeta([],{reason:'lexicon-unavailable',available:0,selected:0,reachedTarget:false});
    const {PHRASES, WORDS, PATTERNS}=lexicon;
    const grammar=window.OwnWordsGrammar;
    const minQ=QUALITY[level]||QUALITY.balanced,pool=[];
    const add=c=>{if(pool.length>=MAX_POOL)return false;pool.push(c);return true};

    for(const pattern of PATTERNS){
      if(pool.length>=MAX_POOL)break;
      if(pattern.q<minQ)continue;pattern.re.lastIndex=0;let m,matches=0;
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
      if(q<minQ)continue;const re=new RegExp(`\\b${reEsc(phrase)}\\b`,'gi');let m,matches=0;
      const family=grammar?grammar.classify(phrase,'phrase',explicitFamily(meta)):null;
      while(matches<MAX_RULE_MATCHES&&(m=re.exec(text))){
        matches++;
        const choices=alts.map(a=>sameCase(m[0],a)).filter(a=>a.toLowerCase()!==m[0].toLowerCase());
        if(choices.length&&!add({start:m.index,end:m.index+m[0].length,original:m[0],alts:choices,q,type:'phrase',family}))break;
      }
    }
    const wr=/\b[\p{L}]+\b/gu;let m;
    while(pool.length<MAX_POOL&&(m=wr.exec(text))){
      const entry=WORDS[m[0].toLowerCase()];if(!entry||entry[1]<minQ)continue;
      const choices=entry[0].map(a=>sameCase(m[0],a)).filter(a=>a.toLowerCase()!==m[0].toLowerCase());
      if(choices.length)add({start:m.index,end:m.index+m[0].length,original:m[0],alts:choices,q:entry[1],type:'word',family:null});
    }
    pool.sort((a,b)=>b.q-a.q||(b.end-b.start)-(a.end-a.start)||a.start-b.start);
    const clean=[];for(const c of pool){if(!clean.some(x=>overlap(c,x)))clean.push(c)}
    clean.sort((a,b)=>a.start-b.start);
    annotateContextWindows(text,clean,5);
    return chooseToTarget(text,clean,level);
  }

  window.OwnWordsEngine={findCandidates,countWords,esc,hash,preview};
})();
