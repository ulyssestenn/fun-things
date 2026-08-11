(() => {
  const $ = id => document.getElementById(id);
  const source=$('source'), output=$('output'), manual=$('manual'), offer=$('offer'), another=$('another'), restore=$('restore'), copy=$('copy'), manualBtn=$('manualBtn'), sample=$('sample'), clear=$('clear');
  const sourceCount=$('sourceCount'), limitState=$('limitState'), changeCount=$('changeCount'), words=$('words'), changes=$('changes'), touched=$('touched'), toast=$('toast');
  const depth=$('depth'), depthLabel=$('depthLabel'), targetNote=$('targetNote'), targetState=$('targetState');
  const calcOriginalTokens=$('calcOriginalTokens'), calcRevisedTokens=$('calcRevisedTokens'), calcTurnover=$('calcTurnover'), calc3=$('calc3'), calc5=$('calc5'), calcCoverage=$('calcCoverage'), calcStructures=$('calcStructures'), calcMethod=$('calcMethod'), calcFormula=$('calcFormula');
  const calcSurface=$('calcSurface'), calcFunction=$('calcFunction'), calcSentence=$('calcSentence'), calcPunctuation=$('calcPunctuation'), calcPronoun=$('calcPronoun'), calcShort=$('calcShort'), calcDash=$('calcDash'), calcColon=$('calcColon'), calcSurfaceFormula=$('calcSurfaceFormula');
  const calcFamilies=$('calcFamilies'), calcFamilyList=$('calcFamilyList');
  const {findCandidates,countWords,esc}=window.OwnWordsEngine;
  const metrics=window.OwnWordsMetrics;
  const limits=window.OwnWordsLimits;
  const grammar=window.OwnWordsGrammar;
  const L=limits.LIMITS;
  let level='balanced', snapshot='', baseline='', candidates=[], manualMode=false, pass=0;
  const SAMPLE=`Artificial intelligence has the ability to transform a wide range of everyday tasks. However, it is important to note that the technology is most valuable when individuals use it to enhance their own judgment rather than replace it. In order to get better results, users should provide sufficient context, evaluate the response carefully, and maintain control over the final product. This approach enables people to utilize AI efficiently while ensuring that their own perspective remains central.`;

  function prepare(){
    const text=source.value;
    if(!text.trim()){say('Add some text first.');source.focus();return}
    const status=limits.inspect(text);
    if(!status.ok){say(limits.message(status));source.focus();return}
    leaveManual(false);baseline=text;snapshot=text;pass=0;candidates=findCandidates(text,level);
    // The engine orders each already-vetted alternative by model-neutral local
    // sequence disruption. Show that preferred alternative first; clicking still
    // cycles through every alternative and shift-click still restores the source.
    candidates.forEach((c,i)=>{c.id=i;c.choice=0;c.reverted=false});
    render();enable(true);
    if(!candidates.length){changeCount.textContent='No strong local edits found';say(level==='thorough'?'No safe alternatives found in this passage.':'No edits at this level. Try Thorough.')} else say(`${candidates.length} edit${candidates.length===1?'':'s'} offered.`)
  }

  function render(){
    if(!snapshot){output.className='output empty';output.textContent='Your working copy will appear here.';stats();return}
    let html='',cursor=0;
    for(const c of candidates){
      html+=esc(snapshot.slice(cursor,c.start));
      const val=c.reverted?c.original:c.alts[c.choice];
      html+=`<button class="edit${c.reverted?' reverted':''}" data-id="${c.id}" title="Click for another choice. Shift-click to restore.">${esc(val)}</button>`;
      cursor=c.end;
    }
    html+=esc(snapshot.slice(cursor));output.innerHTML=html;output.className='output';stats();
  }

  function flat(){if(manualMode)return manual.value;if(!snapshot)return '';let out='',cursor=0;for(const c of candidates){out+=snapshot.slice(cursor,c.start)+(c.reverted?c.original:c.alts[c.choice]);cursor=c.end}return out+snapshot.slice(cursor)}
  function pct(value){return `${Math.round(value)}%`}
  function rate(value){return Number.isFinite(value)?value.toFixed(1):'0.0'}

  function stats(){
    const text=flat();
    const status=limits.inspect(text);
    if(!status.ok){
      words.textContent='—';changes.textContent='—';touched.textContent='—';
      if(snapshot)changeCount.textContent='Working copy is over the text limit';
      updateDepth(text);return;
    }
    const n=countWords(text),active=candidates.filter(c=>!c.reverted),tw=active.reduce((sum,c)=>sum+Math.max(1,countWords(c.original)),0);
    words.textContent=n.toLocaleString();changes.textContent=active.length.toLocaleString();touched.textContent=n?`${Math.min(100,Math.round(tw/n*100))}%`:'0%';
    if(snapshot&&!manualMode)changeCount.textContent=active.length?`${active.length} suggested edit${active.length===1?'':'s'}`:'No active edits';
    updateDepth(text);
  }

  function clearSurface(){
    calcSurface.textContent='0';calcFunction.textContent='0%';calcSentence.textContent='0%';calcPunctuation.textContent='0%';calcPronoun.textContent='0%';calcShort.textContent='0% → 0%';calcDash.textContent='0.0 → 0.0';calcColon.textContent='0.0 → 0.0';calcSurfaceFormula.textContent='—';calcFamilies.textContent='0';calcFamilyList.textContent='—';
  }

  function clearDepth(message='No working copy'){
    depth.textContent='0';depthLabel.textContent='Rewrite depth';targetState.textContent=message;
    calcOriginalTokens.textContent='0';calcRevisedTokens.textContent='0';calcTurnover.textContent='0%';calc3.textContent='0%';calc5.textContent='0%';calcCoverage.textContent='0/10';calcStructures.textContent='0';calcMethod.textContent='—';calcFormula.textContent='—';
    clearSurface();
  }

  function updateSelectionState(result){
    const meta=!manualMode&&candidates&&candidates.selectionMeta;
    if(result.targetStatus==='below target'&&meta&&meta.reason==='exhausted'){
      targetState.textContent=`maximum available · target ${result.target.min}–${result.target.max}`;return;
    }
    if(result.targetStatus==='below target'&&meta&&meta.reason==='safety-cap'){
      targetState.textContent=`selection safety cap · target ${result.target.min}–${result.target.max}`;return;
    }
    targetState.textContent=`${result.targetStatus} (${result.target.min}–${result.target.max})`;
  }

  function updateSurface(result){
    const s=result.surface;
    if(!s){clearSurface();return}
    calcSurface.textContent=s.divergence.toString();
    calcFunction.textContent=pct(s.functionWords);calcSentence.textContent=pct(s.sentenceShape);calcPunctuation.textContent=pct(s.punctuation);calcPronoun.textContent=pct(s.pronounRegister);
    calcShort.textContent=`${s.shortSentenceOriginal}% → ${s.shortSentenceRevised}%`;
    calcDash.textContent=`${rate(s.emDashOriginal)} → ${rate(s.emDashRevised)}`;
    calcColon.textContent=`${rate(s.colonOriginal)} → ${rate(s.colonRevised)}`;
    calcSurfaceFormula.textContent=s.formula;
    const summary=grammar?grammar.summarize(manualMode?[]:candidates):{count:0,labels:[]};
    calcFamilies.textContent=summary.count.toLocaleString();calcFamilyList.textContent=summary.labels.length?summary.labels.join(' · '):'No classified automated moves';
  }

  function updateDepth(text){
    const target=metrics.TARGETS[level]||metrics.TARGETS.balanced;
    targetNote.textContent=`${level[0].toUpperCase()+level.slice(1)} target: ${target.min}–${target.max}`;
    if(!baseline||!text){clearDepth();return}
    const baseStatus=limits.inspect(baseline),workStatus=limits.inspect(text);
    if(!baseStatus.ok||!workStatus.ok){clearDepth('Over text limit · not calculated');calcMethod.textContent='input guard';return}
    const result=metrics.scoreRewrite(baseline,text,{candidates:manualMode?[]:candidates,level});
    if(result.limited){clearDepth('Safety limit · not calculated');calcMethod.textContent=result.turnoverMethod;calcFormula.textContent=result.formula;return}
    depth.textContent=result.depth.toString();depthLabel.textContent=`Rewrite depth · ${result.label}`;updateSelectionState(result);
    calcOriginalTokens.textContent=result.originalTokens.toLocaleString();calcRevisedTokens.textContent=result.revisedTokens.toLocaleString();calcTurnover.textContent=pct(result.tokenTurnover);calc3.textContent=pct(result.trigramDisruption);calc5.textContent=pct(result.fivegramDisruption);calcCoverage.textContent=`${result.coverageBands}/10`;calcStructures.textContent=result.structuralEdits.toLocaleString();calcMethod.textContent=result.turnoverMethod;calcFormula.textContent=result.formula;
    updateSurface(result);
  }

  function sourceStats(){
    const status=limits.inspect(source.value);
    sourceCount.classList.toggle('limit-warning',status.ok&&status.warn);
    sourceCount.classList.toggle('limit-error',!status.ok);
    limitState.classList.toggle('limit-warning',status.ok&&status.warn);
    limitState.classList.toggle('limit-error',!status.ok);
    if(!status.ok){
      if(status.reason==='chars')sourceCount.textContent=`${status.chars.toLocaleString()} / ${L.maxChars.toLocaleString()} characters`;
      else sourceCount.textContent=`${L.maxWords.toLocaleString()}+ / ${L.maxWords.toLocaleString()} words`;
      limitState.textContent=limits.message(status);offer.disabled=true;return status;
    }
    sourceCount.textContent=`${status.words.toLocaleString()} / ${L.maxWords.toLocaleString()} words`;
    if(status.warn)limitState.textContent='Long passage · calculations may take slightly longer.';
    else limitState.textContent=`${L.maxWords.toLocaleString()}-word / ${L.maxChars.toLocaleString()}-character max`;
    offer.disabled=false;return status;
  }

  function enable(on){another.disabled=!on;restore.disabled=!on;copy.disabled=!on;manualBtn.disabled=!on}
  function anotherPass(){if(!snapshot)return;if(manualMode&&!leaveManual(true))return;pass++;candidates.forEach(c=>{if(!c.reverted&&c.alts.length>1)c.choice=(c.choice+1)%c.alts.length});render();say('New alternatives shown.')}
  function restoreAll(){if(manualMode&&!leaveManual(true))return;candidates.forEach(c=>c.reverted=true);render()}
  function enterManual(){if(!snapshot||manualMode)return;manual.value=flat();output.style.display='none';manual.style.display='block';manualMode=true;manualBtn.textContent='Done editing';manual.focus();stats()}

  function leaveManual(commit){
    if(!manualMode)return true;
    if(commit){
      const status=limits.inspect(manual.value);
      if(!status.ok){say(limits.message(status));manual.focus();return false}
      snapshot=manual.value;candidates=[];
    }
    manual.style.display='none';output.style.display='block';manualMode=false;manualBtn.textContent='Edit directly';
    if(commit){render();changeCount.textContent='Manual working copy';another.disabled=true;restore.disabled=true;copy.disabled=false;manualBtn.disabled=false}
    return true;
  }

  async function copyText(){const text=flat();if(!text)return;try{await navigator.clipboard.writeText(text)}catch{const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}say('Copied.')}
  function say(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(say.t);say.t=setTimeout(()=>toast.classList.remove('show'),2200)}

  function guardedInsertion(element,inserted,event){
    const next=limits.prospectiveValue(element,inserted);
    const status=limits.inspect(next);
    if(status.ok)return true;
    event.preventDefault();say(limits.message(status));return false;
  }

  function installInputGuards(element){
    element.addEventListener('paste',e=>{
      const inserted=e.clipboardData&&e.clipboardData.getData('text/plain');
      if(typeof inserted==='string')guardedInsertion(element,inserted,e);
    });
    element.addEventListener('drop',e=>{
      const inserted=e.dataTransfer&&e.dataTransfer.getData('text/plain');
      if(typeof inserted==='string'&&inserted)guardedInsertion(element,inserted,e);
    });
    element.addEventListener('beforeinput',e=>{
      if(!e.inputType||!e.inputType.startsWith('insert')||e.inputType==='insertFromPaste'||e.inputType==='insertFromDrop')return;
      let inserted=e.data;
      if(inserted===null&&(e.inputType==='insertLineBreak'||e.inputType==='insertParagraph'))inserted='\n';
      if(typeof inserted==='string')guardedInsertion(element,inserted,e);
    });
  }

  function resetWorking(message='Your working copy will appear here.'){
    baseline='';snapshot='';candidates=[];manualMode=false;output.style.display='block';manual.style.display='none';output.className='output empty';output.textContent=message;enable(false);stats();changeCount.textContent='No edits yet';
  }

  document.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-level]').forEach(x=>x.classList.remove('active'));b.classList.add('active');level=b.dataset.level;if(baseline&&source.value===baseline)prepare();else updateDepth(flat())}));
  output.addEventListener('click',e=>{const b=e.target.closest('.edit');if(!b)return;const c=candidates[Number(b.dataset.id)];if(!c)return;if(e.shiftKey)c.reverted=true;else if(c.reverted)c.reverted=false;else if(c.alts.length>1)c.choice=(c.choice+1)%c.alts.length;else c.reverted=true;render()});

  source.addEventListener('input',()=>{
    const status=sourceStats();
    if(baseline&&source.value!==baseline)resetWorking(status.ok?'Text changed. Offer edits when you are ready.':'Passage is over the text limit. Remove some text to continue.');
  });
  manual.addEventListener('input',stats);
  offer.addEventListener('click',prepare);another.addEventListener('click',anotherPass);restore.addEventListener('click',restoreAll);copy.addEventListener('click',copyText);manualBtn.addEventListener('click',()=>manualMode?leaveManual(true):enterManual());
  sample.addEventListener('click',()=>{source.value=SAMPLE;resetWorking('Example loaded. Offer edits when you are ready.');sourceStats();source.focus();say('Example loaded. Tap Offer edits.')});
  clear.addEventListener('click',()=>{source.value='';resetWorking();sourceStats();source.focus()});
  source.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter')prepare()});

  installInputGuards(source);installInputGuards(manual);sourceStats();updateDepth('');
})();
