(() => {
  const QUALITY = { light: 3, balanced: 2, thorough: 1 };
  const countWords=t=>(t.trim().match(/\b[\p{L}\p{N}'’_-]+\b/gu)||[]).length;
  const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const overlap=(a,b)=>a.start<b.end&&b.start<a.end;
  function sameCase(original,replacement){if(!original||!replacement)return replacement;if(original.toUpperCase()===original&&/[A-Z]/.test(original))return replacement.toUpperCase();if(original[0]===original[0].toUpperCase())return replacement[0].toUpperCase()+replacement.slice(1);return replacement}
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}

  function preview(text, selected){
    const ordered=[...selected].sort((a,b)=>a.start-b.start);let out='',cursor=0;
    for(const c of ordered){out+=text.slice(cursor,c.start)+(c.alts[0]||c.original);cursor=c.end}
    return out+text.slice(cursor);
  }

  function chooseToTarget(text, clean, level){
    if(!clean.length)return [];
    const metrics=window.OwnWordsMetrics;
    if(!metrics)return clean;
    const target=(metrics.TARGETS[level]||metrics.TARGETS.balanced);
    const selected=[], remaining=[...clean], usedBands=new Set();
    let currentDepth=0;

    while(remaining.length){
      remaining.sort((a,b)=>{
        const bandA=Math.min(9,Math.floor((a.start/Math.max(1,text.length))*10));
        const bandB=Math.min(9,Math.floor((b.start/Math.max(1,text.length))*10));
        const scoreA=(a.type==='structure'?5000:0)+a.q*1000+(!usedBands.has(bandA)?450:0)+Math.min(300,a.end-a.start);
        const scoreB=(b.type==='structure'?5000:0)+b.q*1000+(!usedBands.has(bandB)?450:0)+Math.min(300,b.end-b.start);
        return scoreB-scoreA||a.start-b.start;
      });
      const candidate=remaining.shift();
      const trial=[...selected,candidate];
      const trialText=preview(text,trial);
      const trialDepth=metrics.scoreRewrite(text,trialText,{candidates:trial,level}).depth;

      if(selected.length && currentDepth>=target.min){
        const currentDistance=Math.abs(target.ideal-currentDepth);
        const trialDistance=Math.abs(target.ideal-trialDepth);
        if(trialDepth>target.max && trialDistance>=currentDistance)break;
        if(currentDepth>=target.ideal)break;
      }

      selected.push(candidate);
      currentDepth=trialDepth;
      usedBands.add(Math.min(9,Math.floor((candidate.start/Math.max(1,text.length))*10)));
      if(currentDepth>=target.ideal)break;
    }

    return selected.sort((a,b)=>a.start-b.start);
  }

  function findCandidates(text, level){
    const {PHRASES, WORDS, PATTERNS}=window.OwnWordsLexicon;
    const minQ=QUALITY[level]||QUALITY.balanced, pool=[];
    for(const pattern of PATTERNS){
      if(pattern.q<minQ)continue; pattern.re.lastIndex=0; let m;
      while((m=pattern.re.exec(text))){
        const alts=pattern.build(m).filter(a=>a&&a!==m[0]);
        if(alts.length)pool.push({start:m.index,end:m.index+m[0].length,original:m[0],alts,q:pattern.q,type:'structure'});
        if(m[0].length===0)pattern.re.lastIndex++;
      }
    }
    for(const [phrase,alts,q] of PHRASES){
      if(q<minQ)continue; const re=new RegExp(`\\b${reEsc(phrase)}\\b`,'gi'); let m;
      while((m=re.exec(text))){
        const choices=alts.map(a=>sameCase(m[0],a)).filter(a=>a.toLowerCase()!==m[0].toLowerCase());
        if(choices.length)pool.push({start:m.index,end:m.index+m[0].length,original:m[0],alts:choices,q,type:'phrase'});
      }
    }
    const wr=/\b[\p{L}]+\b/gu; let m;
    while((m=wr.exec(text))){
      const entry=WORDS[m[0].toLowerCase()]; if(!entry||entry[1]<minQ)continue;
      const choices=entry[0].map(a=>sameCase(m[0],a)).filter(a=>a.toLowerCase()!==m[0].toLowerCase());
      if(choices.length)pool.push({start:m.index,end:m.index+m[0].length,original:m[0],alts:choices,q:entry[1],type:'word'});
    }
    pool.sort((a,b)=>b.q-a.q||(b.end-b.start)-(a.end-a.start)||a.start-b.start);
    const clean=[]; for(const c of pool){if(!clean.some(x=>overlap(c,x)))clean.push(c)}
    clean.sort((a,b)=>a.start-b.start);
    return chooseToTarget(text,clean,level);
  }

  window.OwnWordsEngine={findCandidates,countWords,esc,hash};
})();
