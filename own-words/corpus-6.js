(() => {
  const L = window.OwnWordsLexicon;
  if (!L || !L.PHRASES || !L.PATTERNS) return;
  const cap6 = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  L.PHRASES.push(
    ['the structural change that matters most',['the most consequential structural change','the structural change that matters most'],3],
    ["that's the root of the escalation",['that is where the escalation begins','that is the source of the escalation'],3],
    ['the institutional problems were plain and never fixed',['the institutional problems were obvious and remained unresolved','the institutional flaws were clear but never corrected'],3],
    ['what matters is that',['the important point is that','what matters here is that'],2],
    ["why it wasn't recoverable",['why recovery became unlikely','why the system could not recover'],3],
    ['the best counterargument',['the strongest counterargument','the best case against this'],3],
    ["it's a real challenge to",['it is a serious challenge to','it directly challenges'],2],
    ['the middle position is probably right',['the most plausible position is somewhere between','the middle position is likely closest'],2],
    ['the real idea is',['the central idea is','the key idea is'],3],
    ["here's the key",['the key point is','the important point is'],3],
    ["that's it",['that is the whole idea','nothing more is required'],2],
    ['useful way to think about',['one useful way to think about','a useful way to understand'],2],
    ['the two objections people raise',['two common objections','the two usual objections'],3],
    ['the strange part',['the surprising part','the unusual part'],3],
    ['genuinely unresolved',['still unresolved','an open question'],2],
    ['the mistake nearly everyone makes',['a common mistake','the mistake many people make'],3],
    ['the only genuinely time-sensitive item',['the only truly time-sensitive item','the one item that cannot wait'],3],
    ['frame it as what it is',['frame it directly','describe it for what it is'],2],
    ['preserve the distinction between',['keep the distinction between','maintain the difference between'],3],
    ["identify what's actually driving",['identify what is really driving','determine what is causing'],3],
    ['buy help before you become it',['pay for help before taking the work on yourself','bring in help before becoming the default help'],3],
    ['the highest-leverage spending available',['one of the highest-value uses of money here','the spending with the greatest practical leverage'],2],
    ['specific assignments, in writing',['specific written assignments','clear responsibilities in writing'],3],
    ['two things worth knowing about how this goes',['two things are worth knowing about how this usually unfolds','two points help set expectations'],3],
    ['the one people skip',['the part people often skip','one step people often miss'],3]
  );

  L.PATTERNS.push(
    {
      q:3,
      re:/two things ([^.!?]{1,80})\.\s*first, ([^.!?]{1,180})\.\s*second, ([^.!?]{1,180})/gi,
      build:m=>[
        `Two factors ${m[1]}: first, ${m[2]}; second, ${m[3]}`,
        `${cap6(m[1])} for two reasons. First, ${m[2]}. Second, ${m[3]}`
      ]
    },
    {
      q:3,
      re:/not parties,\s*and not really ideologies\s*—\s*these were ([^.!?]{1,160})/gi,
      build:m=>[
        `These were ${m[1]}, not parties or, strictly speaking, ideologies`,
        `They were best understood as ${m[1]} rather than parties or ideologies`
      ]
    },
    {
      q:3,
      re:/the real idea is ([^.!?]{1,160})/gi,
      build:m=>[
        `The central idea is ${m[1]}`,
        `At bottom, this is about ${m[1]}`
      ]
    },
    {
      q:3,
      re:/useful way to think about ([^:]{1,100}):\s*([^.!?]{1,180})/gi,
      build:m=>[
        `One useful way to think about ${m[1]} is this: ${m[2]}`,
        `${cap6(m[2])} is a useful way to understand ${m[1]}`
      ]
    },
    {
      q:3,
      re:/the mistake nearly everyone makes ([^.!?]{0,80}?) is treating it as ([^—.!?]{1,180}?)\s*—\s*([^—.!?]{1,180}?)\s*—\s*rather than ([^.!?]{1,180})/gi,
      build:m=>[
        `A common mistake ${m[1]} is to treat it as ${m[2]} (${m[3]}) instead of ${m[4]}`,
        `People often treat it as ${m[2]} rather than ${m[4]}; ${m[3]} then becomes the focus`
      ]
    },
    {
      q:3,
      re:/preserve the distinction between ([^.!?]{1,100}) and ([^.!?]{1,100})/gi,
      build:m=>[
        `Keep ${m[1]} distinct from ${m[2]}`,
        `Maintain a clear separation between ${m[1]} and ${m[2]}`
      ]
    },
    {
      q:3,
      re:/identify what['’]?s actually driving ([^.!?]{1,120}) before assuming ([^.!?]{1,120})/gi,
      build:m=>[
        `Before assuming ${m[2]}, determine what is actually driving ${m[1]}`,
        `First identify the cause of ${m[1]}; do not assume ${m[2]}`
      ]
    },
    {
      q:3,
      re:/two things worth knowing about how this goes\.\s*first, ([^.!?]{1,180})\.\s*second, ([^.!?]{1,180})/gi,
      build:m=>[
        `Two points help set expectations. First, ${m[1]}. Second, ${m[2]}`,
        `There are two useful things to know: ${m[1]}; and ${m[2]}`
      ]
    },
    {
      q:2,
      re:/([^.!?]{1,120}) produces nothing\.\s*([^.!?]{1,120}) produces something/gi,
      build:m=>[
        `${m[1]} is ineffective; ${m[2]} is concrete enough to act on`,
        `The first approach, ${m[1]}, gets little done. The second, ${m[2]}, creates a clear action`
      ]
    }
  );
})();
