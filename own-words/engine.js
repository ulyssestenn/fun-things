(() => {
  const LEVEL = {light:{quality:3,ratio:.38},balanced:{quality:2,ratio:.72},thorough:{quality:1,ratio:1}};
  const countWords=t=>(t.trim().match(/\b[\p{L}\p{N}'’_-]+\b/gu)||[]).length;
  const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const overlap=(a,b)=>a.start<b.end&&b.start<a.end;
  function sameCase(original,replacement){if(!original||!replacement)return replacement;if(original.toUpperCase()===original&&/[A-Z]/.test(original))return replacement.toUpperCase();if(original[0]===original[0].toUpperCase())return replacement[0].toUpperCase()+replacement.slice(1);return replacement}
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}

  function findCandidates(text, level){
    const {PHRASES, WORDS, PATTERNS}=window.OwnWordsLexicon;
    const minQ=LEVEL[level].quality, pool=[];
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
    clean.sort((a,b)=>a.start-b.start); if(!clean.length)return [];
    const target=Math.max(1,Math.ceil(clean.length*LEVEL[level].ratio)); if(target>=clean.length)return clean;
    const strong=clean.filter(c=>c.type==='structure'||c.q===3);
    const rest=clean.filter(c=>!strong.includes(c)).map(c=>({c,h:hash(`${c.original}|${c.start}|${level}`)})).sort((a,b)=>b.c.q-a.c.q||a.h-b.h).map(x=>x.c);
    const selected=[...strong]; for(const c of rest){if(selected.length>=target)break;selected.push(c)}
    return selected.sort((a,b)=>a.start-b.start);
  }

  window.OwnWordsEngine={findCandidates,countWords,esc,hash};
})();
