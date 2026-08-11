(() => {
  const CASES = [
    {
      name:'Finance framing', set:'known',
      text:`This is a leveraged decision with a rigid obligation on one side and an uncertain asset on the other. The arithmetic looks attractive at first because the expected return on equities is higher than the borrowing cost. But the real risk is not volatility by itself. It is the mismatch between a payment that arrives every month and an investment that can be deeply underwater at exactly the wrong time. The case gets stronger when income is stable, reserves are large, and the borrowing is small relative to total net worth. It gets weaker near retirement or when the house represents most of the household balance sheet. The deciding question is whether the investor would continue holding after a severe drawdown.`
    },
    {
      name:'Entropy correction', set:'known',
      text:`Forget disorder for a moment. The word is memorable, but it hides the core idea. Entropy is fundamentally about counting how many microscopic arrangements correspond to the same macroscopic state. Systems do not want to become disordered. They move through available states, and the macrostates with overwhelmingly more compatible microstates are overwhelmingly more likely to be observed. That is why a gas spreads through a room and does not spontaneously collect in one corner. The second law is statistical rather than a preference built into matter. The useful way to think about temperature is as part of the bookkeeping for how energy can be distributed among those states.`
    },
    {
      name:'Caregiving transition', set:'known',
      text:`The mistake nearly everyone makes is solving one small problem after another instead of recognizing a transition. The unpaid bill, the missed appointment, and the overgrown yard look separate until a crisis makes the pattern obvious. Do the legal paperwork while capacity is not in question. Preserve the distinction between helping and taking over. Identify what is actually driving a decline before assuming it is simply age. Hearing loss, vision problems, medication interactions, pain, and dehydration can all change how independent someone appears. The one people skip is deciding their own limit before they reach it.`
    },
    {
      name:'Library digitization', set:'unseen',
      text:`A library deciding whether to digitize a local newspaper archive has several practical choices. Scanning everything at the highest possible resolution sounds safest, but storage cost, processing time, and staff review all increase with file size. A more useful plan is to separate preservation masters from access copies. The preservation files can remain large and minimally processed, while smaller derivatives support search and ordinary viewing. Metadata quality matters just as much as image quality because a perfectly scanned page that cannot be located is only partially useful. The project should therefore define naming, dates, issue boundaries, and OCR review rules before the scanning queue becomes large.`
    },
    {
      name:'Urban tree planning', set:'unseen',
      text:`Cities often treat tree planting as a countable annual achievement: plant ten thousand trees and report the total. Survival is the harder measure. Young trees fail when watering plans end after the installation contract, when species are poorly matched to the site, or when roots have too little soil volume. A smaller planting program with three years of maintenance can produce a larger mature canopy than a much bigger one with weak follow-through. Shade, stormwater control, and cooling depend on trees that remain alive long enough to grow. The planning question is therefore not only how many trees can be purchased this year, but how many can be supported through establishment.`
    },
    {
      name:'Battery storage', set:'unseen',
      text:`Grid batteries are sometimes described as if they were miniature power plants, but their role is different. A battery does not create energy; it changes when existing energy is available. That makes duration, charging opportunity, and cycling requirements central to the economics. A four-hour system can be valuable for shifting solar production into the evening, yet poorly suited to a multi-day shortage caused by weather. Longer duration technologies address a different problem and often trade efficiency or capital cost for endurance. Comparing storage systems only by cost per unit of power therefore misses the constraint that determines whether a project can do the job it was purchased to do.`
    }
  ];
  const LEVELS=['light','balanced','thorough'];
  const runButton=document.getElementById('run'), status=document.getElementById('status'), tbody=document.getElementById('results'), summary=document.getElementById('summary');
  const engine=window.OwnWordsEngine, metrics=window.OwnWordsMetrics, grammar=window.OwnWordsGrammar;

  const yieldFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  const cls=value=>value.replace(/\s+/g,'-');

  function measure(testCase,level){
    const started=performance.now();
    const candidates=engine.findCandidates(testCase.text,level);
    const revised=engine.preview(testCase.text,candidates);
    const result=metrics.scoreRewrite(testCase.text,revised,{candidates,level});
    const families=grammar?grammar.summarize(candidates):{count:0};
    const elapsed=performance.now()-started;
    const meta=candidates.selectionMeta||{};
    return {testCase,level,candidates,result,families,elapsed,stop:meta.reason||'unknown'};
  }

  function addRow(row){
    const tr=document.createElement('tr');
    const values=[
      row.testCase.name,
      row.testCase.set,
      row.level,
      row.candidates.length,
      row.result.structuralEdits,
      row.families.count,
      row.result.depth,
      row.result.targetStatus,
      row.result.surface?row.result.surface.divergence:'—',
      row.stop,
      row.elapsed.toFixed(1)
    ];
    values.forEach((value,index)=>{
      const td=document.createElement('td');td.textContent=value;
      if(index===1)td.className=row.testCase.set;
      if(index===7)td.className=cls(row.result.targetStatus);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }

  function showSummary(rows){
    const hits=rows.filter(row=>row.result.targetStatus==='in target').length;
    const exhausted=rows.filter(row=>row.stop==='exhausted'&&row.result.targetStatus==='below target').length;
    const avg=rows.reduce((sum,row)=>sum+row.elapsed,0)/Math.max(1,rows.length);
    const unseen=rows.filter(row=>row.testCase.set==='unseen');
    const unseenDepth=unseen.reduce((sum,row)=>sum+row.result.depth,0)/Math.max(1,unseen.length);
    summary.innerHTML=`<div class="pill"><b>${hits}/${rows.length}</b>in target</div><div class="pill"><b>${exhausted}</b>maximum available below target</div><div class="pill"><b>${avg.toFixed(1)}</b>average ms</div><div class="pill"><b>${unseenDepth.toFixed(1)}</b>mean unseen depth</div>`;
  }

  async function run(){
    runButton.disabled=true;tbody.textContent='';summary.textContent='';status.textContent='Running…';
    const rows=[];
    try{
      for(const testCase of CASES){
        for(const level of LEVELS){
          await yieldFrame();
          const row=measure(testCase,level);rows.push(row);addRow(row);
          status.textContent=`${rows.length} / ${CASES.length*LEVELS.length} cases`;
        }
      }
      showSummary(rows);status.textContent='Complete.';
      window.OwnWordsBenchmarkLastRun=rows;
    }catch(error){
      console.error(error);status.textContent=`Benchmark failed: ${error.message}`;
    }finally{runButton.disabled=false}
  }

  runButton.addEventListener('click',run);
})();
