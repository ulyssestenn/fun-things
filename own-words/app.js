(() => {
  const $ = id => document.getElementById(id);
  const source=$('source'), output=$('output'), manual=$('manual'), offer=$('offer'), another=$('another'), restore=$('restore'), copy=$('copy'), manualBtn=$('manualBtn'), sample=$('sample'), clear=$('clear');
  const sourceCount=$('sourceCount'), changeCount=$('changeCount'), words=$('words'), changes=$('changes'), touched=$('touched'), toast=$('toast');
  const {findCandidates,countWords,esc,hash}=window.OwnWordsEngine;
  let level='balanced', snapshot='', candidates=[], manualMode=false, pass=0;
  const SAMPLE=`Artificial intelligence has the ability to transform a wide range of everyday tasks. However, it is important to note that the technology is most valuable when individuals use it to enhance their own judgment rather than replace it. In order to get better results, users should provide sufficient context, evaluate the response carefully, and maintain control over the final product. This approach enables people to utilize AI efficiently while ensuring that their own perspective remains central.`;

  function prepare(){
    const text=source.value;if(!text.trim()){say('Add some text first.');source.focus();return}
    leaveManual(false);snapshot=text;pass=0;candidates=findCandidates(text,level);
    candidates.forEach((c,i)=>{c.id=i;c.choice=hash(`${c.original}|${c.start}|${pass}`)%c.alts.length;c.reverted=false});
    render();enable(true);
    if(!candidates.length){changeCount.textContent='No strong local edits found';say(level==='thorough'?'No strong alternatives found in this passage.':'No edits at this level. Try Thorough.')} else say(`${candidates.length} edit${candidates.length===1?'':'s'} offered.`)
  }
  function render(){
    if(!snapshot){output.className='output empty';output.textContent='Your working copy will appear here.';stats();return}
    let html='',cursor=0;for(const c of candidates){html+=esc(snapshot.slice(cursor,c.start));const val=c.reverted?c.original:c.alts[c.choice];html+=`<button class="edit${c.reverted?' reverted':''}" data-id="${c.id}" title="Click for another choice. Shift-click to restore.">${esc(val)}</button>`;cursor=c.end}html+=esc(snapshot.slice(cursor));output.innerHTML=html;output.className='output';stats()
  }
  function flat(){if(manualMode)return manual.value;if(!snapshot)return '';let out='',cursor=0;for(const c of candidates){out+=snapshot.slice(cursor,c.start)+(c.reverted?c.original:c.alts[c.choice]);cursor=c.end}return out+snapshot.slice(cursor)}
  function stats(){const text=flat(),n=countWords(text),active=candidates.filter(c=>!c.reverted),tw=active.reduce((sum,c)=>sum+Math.max(1,countWords(c.original)),0);words.textContent=n.toLocaleString();changes.textContent=active.length.toLocaleString();touched.textContent=n?`${Math.min(100,Math.round(tw/n*100))}%`:'0%';if(snapshot&&!manualMode)changeCount.textContent=active.length?`${active.length} suggested edit${active.length===1?'':'s'}`:'No active edits'}
  function sourceStats(){const n=countWords(source.value);sourceCount.textContent=`${n.toLocaleString()} word${n===1?'':'s'}`}
  function enable(on){another.disabled=!on;restore.disabled=!on;copy.disabled=!on;manualBtn.disabled=!on}
  function anotherPass(){if(!snapshot)return;if(manualMode)leaveManual(true);pass++;candidates.forEach(c=>{if(!c.reverted&&c.alts.length>1)c.choice=(c.choice+1)%c.alts.length});render();say('New alternatives shown.')}
  function restoreAll(){if(manualMode)leaveManual(true);candidates.forEach(c=>c.reverted=true);render()}
  function enterManual(){if(!snapshot||manualMode)return;manual.value=flat();output.style.display='none';manual.style.display='block';manualMode=true;manualBtn.textContent='Done editing';manual.focus();stats()}
  function leaveManual(commit){if(!manualMode)return;if(commit){snapshot=manual.value;candidates=[]}manual.style.display='none';output.style.display='block';manualMode=false;manualBtn.textContent='Edit directly';if(commit){render();changeCount.textContent='Manual working copy'}}
  async function copyText(){const text=flat();if(!text)return;try{await navigator.clipboard.writeText(text)}catch{const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}say('Copied.')}
  function say(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(say.t);say.t=setTimeout(()=>toast.classList.remove('show'),1700)}

  document.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-level]').forEach(x=>x.classList.remove('active'));b.classList.add('active');level=b.dataset.level;if(snapshot&&source.value===snapshot)prepare()}));
  output.addEventListener('click',e=>{const b=e.target.closest('.edit');if(!b)return;const c=candidates[Number(b.dataset.id)];if(!c)return;if(e.shiftKey)c.reverted=true;else if(c.reverted)c.reverted=false;else if(c.alts.length>1)c.choice=(c.choice+1)%c.alts.length;else c.reverted=true;render()});
  source.addEventListener('input',()=>{sourceStats();if(snapshot&&source.value!==snapshot){snapshot='';candidates=[];manualMode=false;output.style.display='block';manual.style.display='none';output.className='output empty';output.textContent='Text changed. Offer edits when you are ready.';enable(false);stats();changeCount.textContent='No edits yet'}});
  manual.addEventListener('input',stats);offer.addEventListener('click',prepare);another.addEventListener('click',anotherPass);restore.addEventListener('click',restoreAll);copy.addEventListener('click',copyText);manualBtn.addEventListener('click',()=>manualMode?leaveManual(true):enterManual());
  sample.addEventListener('click',()=>{source.value=SAMPLE;sourceStats();source.focus();say('Example loaded. Tap Offer edits.')});
  clear.addEventListener('click',()=>{source.value='';snapshot='';candidates=[];manualMode=false;output.style.display='block';manual.style.display='none';output.className='output empty';output.textContent='Your working copy will appear here.';enable(false);sourceStats();stats();changeCount.textContent='No edits yet';source.focus()});
  source.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter')prepare()});
})();
