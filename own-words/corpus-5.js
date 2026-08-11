(() => {
  const L = window.OwnWordsLexicon;
  if (!L || !L.PHRASES || !L.PATTERNS) return;
  const cap5 = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  L.PHRASES.push(
    ['the single biggest structural decision',['the main planning decision','the most important structural choice'],3],
    ['this is the underrated one',['this one is often overlooked','this is easy to underrate'],3],
    ['the essential one',['the one not to miss','the essential stop'],2],
    ['depending on energy',['depending on how much energy you have','if you still have the energy'],2],
    ['the thing that makes',['what makes'],3],
    ['the walking between sites',['the walks between sites'],2],
    ['almost everything else is optional',['most of the rest is optional','everything else matters much less'],3],
    ['this single step does more than',['this step matters more than','this one step does more than'],3],
    ['the real skill is',['the key skill is','what matters most is'],3],
    ['the entire problem with',['the central problem with','the main difficulty with'],3],
    ['the failure modes, ranked',['the main failure modes, in order','the common failure modes, ranked'],3],
    ['the empirical anomaly',['the empirical puzzle','the key empirical puzzle'],2],
    ['the explanation with the most force',['the strongest explanation','the most compelling explanation'],3],
    ['the sharpest recent case',['the clearest recent example','the strongest recent example'],3],
    ['the strongest objection',['the strongest counterargument','the main objection'],3],
    ["that's the flaw",['that is the weakness','that is the problem'],3],
    ['take the whole record',['look at the full historical record','consider the whole record'],3],
    ['there is also a selection problem',['there is also a selection effect','there is another selection problem'],2],
    ['the revealed preference point',['the revealed-preference argument','the revealed-preference point'],3],
    ['blunt but hard to answer',['blunt, but difficult to answer','direct and hard to dismiss'],2],
    ['where this leaves it',['the conclusion','where the argument lands'],3],
    ['the narrower claim does',['the narrower claim survives','the narrower version does'],3],
    ['a real asymmetry',['a genuine asymmetry','an important asymmetry'],2]
  );

  L.PATTERNS.push(
    {
      q:3,
      re:/three things separate ([^:]+?) from ([^:]+?):\s*([^,.!?]+),\s*([^,.!?]+),\s*and ([^.!?]+)\.\s*almost everything else is optional/gi,
      build:m=>[
        `Excellent ${m[1]} comes down to three things: ${m[3]}, ${m[4]}, and ${m[5]}. Most of the rest is optional`,
        `Three factors matter most for ${m[1]}: ${m[3]}, ${m[4]}, and ${m[5]}. Everything else matters less`
      ]
    },
    {
      q:3,
      re:/the real skill is ([^,.!?]+),\s*not ([^.!?]+)/gi,
      build:m=>[
        `${cap5(m[1])} matters more than ${m[2]}`,
        `The key skill is ${m[1]} rather than ${m[2]}`
      ]
    },
    {
      q:3,
      re:/the thing that makes ([^.!?]+?) different from ([^.!?]+?) is that ([^.!?]+)/gi,
      build:m=>[
        `What distinguishes ${m[1]} from ${m[2]} is that ${m[3]}`,
        `${cap5(m[1])} differs from ${m[2]} because ${m[3]}`
      ]
    },
    {
      q:3,
      re:/this is the day that separates ([^.!?]+?) from ([^.!?]+)/gi,
      build:m=>[
        `This is what distinguishes ${m[1]} from ${m[2]}`,
        `This day is the difference between ${m[1]} and ${m[2]}`
      ]
    },
    {
      q:3,
      re:/the explanation with the most force is ([^.!?]+)/gi,
      build:m=>[
        `The strongest explanation is ${m[1]}`,
        `The most compelling explanation is ${m[1]}`
      ]
    },
    {
      q:3,
      re:/the ([^.!?]+?) is the sharpest recent case/gi,
      build:m=>[
        `The clearest recent example is the ${m[1]}`,
        `The ${m[1]} provides the strongest recent example`
      ]
    },
    {
      q:3,
      re:/the strong claim\s*—\s*that ([^—.!?]+)\s*—\s*doesn['’]?t survive\.\s*the narrower claim does:\s*([^.!?]+)/gi,
      build:m=>[
        `The broader claim that ${m[1]} does not hold up. A narrower claim does: ${m[2]}`,
        `The evidence does not support the broad claim that ${m[1]}. It does support this narrower one: ${m[2]}`
      ]
    },
    {
      q:3,
      re:/([^.!?]+?) removes ([^.!?]+?) better than it ([^.!?]+)/gi,
      build:m=>[
        `${m[1]} is better at removing ${m[2]} than at ${m[3]}`,
        `${cap5(m[1])} handles ${m[2]} more reliably than it ${m[3]}`
      ]
    },
    {
      q:2,
      re:/([^.!?]+?) are not obviously improvements to ([^,]+),\s*however clearly they['’]?re improvements on ([^.!?]+)/gi,
      build:m=>[
        `${m[1]} may improve ${m[3]} without clearly improving ${m[2]}`
      ]
    }
  );
})();
