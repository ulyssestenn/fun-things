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
  const NGRAM_SEPARATOR = '\u241f';

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

  function proxyTokens(text){
    const tokens=[];let m;
    TOKEN_RE.lastIndex=0;
    while((m=TOKEN_RE.exec(text))){
      tokens.push({start:m.index,end:m.index+m[0].length,value:m[0].toLocaleLowerCase()});
      if(tokens.length>9000)break;
    }
    TOKEN_RE.lastIndex=0;
    return tokens;
  }

  function proxyValues(text){
    return proxyTokens(text).map(token=>token.value);
  }

  function ngramKey(values,start,n){
    return values.slice(start,start+n).join(NGRAM_SEPARATOR);
  }

  function ngramCounts(values,n){
    const counts=new Map();
    for(let i=0;i<=values.length-n;i++){
      const key=ngramKey(values,i,n);
      counts.set(key,(counts.get(key)||0)+1);
    }
    return counts;
  }

  function candidateTokenRange(tokens,c,tokenCursor=0){
    let cursor=tokenCursor;
    while(cursor<tokens.length&&tokens[cursor].end<=c.start)cursor++;
    let first=-1,last=-1,j=cursor;
    while(j<tokens.length&&tokens[j].start<c.end){
      if(tokens[j].end>c.start){if(first<0)first=j;last=j}
      j++;
    }
    return {first,last,cursor};
  }

  function destroyedWindowsForAlt(tokens,values,first,last,alt,n=5){
    const total=Math.max(0,tokens.length-n+1);
    if(first<0||last<0||!total)return [];
    const from=Math.max(0,first-n+1);
    const to=Math.min(last,total-1);
    const localEnd=Math.min(tokens.length,to+n);
    const prefix=values.slice(from,first);
    const suffix=values.slice(last+1,localEnd);
    const revised=prefix.concat(proxyValues(alt),suffix);
    const revisedCounts=ngramCounts(revised,n);
    const destroyed=[];

    for(let start=from;start<=to;start++){
      const key=ngramKey(values,start,n);
      const remaining=revisedCounts.get(key)||0;
      if(remaining>0)revisedCounts.set(key,remaining-1);
      else destroyed.push(start);
    }
    return destroyed;
  }

  function annotateDisruptionWindows(text,candidates,n=5){
    const tokens=proxyTokens(text);
    const values=tokens.map(token=>token.value);
    if(tokens.length<n){
      for(const c of candidates){c.contextWindows=[];c.altContextWindows=[]}
      return candidates;
    }

    let tokenCursor=0;
    for(const c of candidates){
      const range=candidateTokenRange(tokens,c,tokenCursor);
      tokenCursor=range.cursor;
      if(range.first<0){c.contextWindows=[];c.altContextWindows=[];continue}

      const scored=c.alts.map((alt,index)=>({
        alt,index,
        windows:destroyedWindowsForAlt(tokens,values,range.first,range.last,alt,n)
      }));
      scored.sort((a,b)=>b.windows.length-a.windows.length||a.index-b.index);
      c.alts=scored.map(item=>item.alt);
      c.altContextWindows=scored.map(item=>item.windows);
      c.contextWindows=scored.length?scored[0].windows:[];
      c.sourceWindowCapacity=Math.max(0,Math.min(range.last,tokens.length-n)-Math.max(0,range.first-n+1)+1);
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
    const qualityBonus=c.q*1200;
    const contextBonus=Math.min(3600,newWindows*600);
    const contextOverlapPenalty=Math.min(600,Math.max(0,windows.length-newWindows)*100);
    const coverageBonus=!usedBands.has(band)?450:0;
    return qualityBonus+coverageBonus+familyBonus+contextBonus-contextOverlapPenalty;
  }

  function takeBest(remaining,text,usedBands,familyCounts,coveredWindows){
    let bestIndex=0,bestScore=-Infinity;
    for(let i=0;i<remaining.length;i++){
      const score=candidateScore(remaining[i],text,usedBands,familyCounts,coveredWindows);
      if(score>bestScore||(score===bestScore&&remaining[i].q>remaining[bestIndex].q)||(score===bestScore&&remaining[i].q===remaining[bestIndex].q&&remaining[i].start<remaining[bestIndex].start)){
        bestScore=score;bestIndex=i;
      }
    }
    return remaining.splice(bestIndex,1)[0];
  }

  function discardOverlaps(remaining,candidate){
    for(let i=remaining.length-1;i>=0;i--)if(overlap(remaining[i],candidate))remaining.splice(i,1);
  }

  function recordSelection(candidate,text,usedBands,familyCounts,coveredWindows){
    usedBands.add(bandFor(candidate,text));
    if(candidate.family)familyCounts.set(candidate.family,(familyCounts.get(candidate.family)||0)+1);
    if(Array.isArray(candidate.contextWindows))for(const start of candidate.contextWindows)coveredWindows.add(start);
  }

  function chooseStandard(text,options,level){
    const metrics=window.OwnWordsMetrics;
    if(!metrics)return withMeta(options.slice(0,MAX_SELECTION_TRIALS),{reason:options.length>MAX_SELECTION_TRIALS?'safety-cap':'exhausted',available:options.length});
    const target=(metrics.TARGETS[level]||metrics.TARGETS.balanced);
    const selected=[],remaining=[...options],usedBands=new Set(),familyCounts=new Map(),coveredWindows=new Set();
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
      discardOverlaps(remaining,candidate);
      currentDepth=trialDepth;
      recordSelection(candidate,text,usedBands,familyCounts,coveredWindows);
      if(currentDepth>=target.ideal){reason='target';break}
    }

    if(reason!=='target')reason=remaining.length?'safety-cap':'exhausted';
    const finalText=preview(text,selected);
    const finalDepth=(metrics.scoreRewriteSelection||metrics.scoreRewrite)(text,finalText,{candidates:selected,level}).depth;
    return withMeta(selected,{reason,available:options.length,selected:selected.length,estimatedDepth:currentDepth,finalDepth,reachedTarget:finalDepth>=target.min,coveredWindows:coveredWindows.size});
  }

  function chooseThorough(text,options,level){
    const metrics=window.OwnWordsMetrics;
    if(!metrics)return withMeta(options.slice(0,Math.min(options.length,THOROUGH_MAX_SELECTED)),{reason:options.length>THOROUGH_MAX_SELECTED?'safety-cap':'exhausted',available:options.length});
    const target=(metrics.TARGETS[level]||metrics.TARGETS.thorough);
    const selected=[],remaining=[...options],usedBands=new Set(),familyCounts=new Map(),coveredWindows=new Set();
    let estimatedDepth=0,reason='exhausted';

    while(remaining.length&&selected.length<THOROUGH_MAX_SELECTED){
      const candidate=takeBest(remaining,text,usedBands,familyCounts,coveredWindows);
      selected.push(candidate);
      discardOverlaps(remaining,candidate);
      recordSelection(candidate,text,usedBands,familyCounts,coveredWindows);

      const shouldMeasure=selected.length%THOROUGH_SCORE_EVERY===0||!remaining.length;
      if(!shouldMeasure)continue;
      const trialText=preview(text,selected);
      estimatedDepth=(metrics.scoreRewriteFast||metrics.scoreRewrite)(text,trialText,{candidates:selected,level}).depth;
      if(estimatedDepth>=target.ideal){reason='target';break}
    }

    if(reason!=='target')reason=remaining.length?'safety-cap':'exhausted';
    let revised=preview(text,selected);
    let finalDepth=(metrics.scoreRewriteSelection||metrics.scoreRewrite)(text,revised,{candidates:selected,level}).depth;

    if(reason==='target'&&finalDepth<target.min&&remaining.length){
      while(remaining.length&&selected.length<THOROUGH_MAX_SELECTED&&finalDepth<target.min){
        const batch=[];
        for(let i=0;i<THOROUGH_SCORE_EVERY&&remaining.length&&selected.length<THOROUGH_MAX_SELECTED;i++){
          const candidate=takeBest(remaining,text,usedBands,familyCounts,coveredWindows);
          selected.push(candidate);batch.push(candidate);discardOverlaps(remaining,candidate);recordSelection(candidate,text,usedBands,familyCounts,coveredWindows);
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

    revised=preview(text,selected);
    finalDepth=(metrics.scoreRewriteSelection||metrics.scoreRewrite)(text,revised,{candidates:selected,level}).depth;
    if(finalDepth<target.min&&reason==='target'&&!remaining.length)reason='exhausted';
    return withMeta(selected,{reason,available:options.length,selected:selected.length,estimatedDepth,finalDepth,reachedTarget:finalDepth>=target.min,coveredWindows:coveredWindows.size});
  }

  function chooseToTarget(text,options,level){
    if(!options.length)return withMeta([],{reason:'exhausted',available:0,selected:0,estimatedDepth:0,finalDepth:0,reachedTarget:false,coveredWindows:0});
    return level==='thorough'?chooseThorough(text,options,level):chooseStandard(text,options,level);
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
        if(alts.length&&!add({start:m.index,end:m.index+m[0].length,original:m[0],alts,q:pattern.q,type:'structure',family,transformClass:pattern.transformClass||'legacy-structure'}))break;
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
        if(choices.length&&!add({start:m.index,end:m.index+m[0].length,original:m[0],alts:choices,q,type:'phrase',family,transformClass:'phrase'}))break;
      }
    }
    const wr=/\b[\p{L}]+\b/gu;let m;
    while(pool.length<MAX_POOL&&(m=wr.exec(text))){
      const entry=WORDS[m[0].toLowerCase()];if(!entry||entry[1]<minQ)continue;
      const choices=entry[0].map(a=>sameCase(m[0],a)).filter(a=>a.toLowerCase()!==m[0].toLowerCase());
      if(choices.length)add({start:m.index,end:m.index+m[0].length,original:m[0],alts:choices,q:entry[1],type:'word',family:null,transformClass:'lexical'});
    }

    annotateDisruptionWindows(text,pool,5);
    pool.sort((a,b)=>b.q-a.q||b.contextWindows.length-a.contextWindows.length||a.start-b.start);
    return chooseToTarget(text,pool,level);
  }

  window.OwnWordsEngine={findCandidates,countWords,esc,hash,preview};
})();
