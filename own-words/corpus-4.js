(() => {
  const L = window.OwnWordsLexicon;
  if (!L || !L.PHRASES || !L.PATTERNS) return;
  const cap4 = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  L.PHRASES.push(
    ['the core arithmetic',['the basic arithmetic','the basic math'],3],
    ['the real spread is narrower than it looks',['the actual spread is narrower than it appears'],3],
    ['what actually makes this dangerous',['what makes this risky','where the real risk comes from'],3],
    ['where the case gets stronger',['factors that strengthen the case','when the case is stronger'],3],
    ['where it gets weaker',['factors that weaken the case','when the case is weaker'],3],
    ['alternatives worth weighing against it',['alternatives to compare','other options worth comparing'],3],
    ['the honest summary',['in summary','the bottom line'],3],
    ['a useful test',['one practical test','a practical way to test this'],3],
    ['a strong signal',['a useful clue','a strong indication'],2],
    ['the first job is figuring out which',['the first step is determining which','first determine which one'],3],
    ["what you're looking for",['what to look for'],3],
    ['in rough order of frequency',['roughly from most to least common','in approximate order of frequency'],3],
    ['not everything is a leak',['not every slowdown is a leak','some slowdowns are not leaks'],2],
    ['the efficient path is usually',['the quickest path is usually','the most efficient route is usually'],3],
    ['the constraint that decides it',['the deciding constraint','the constraint that matters most'],3],
    ['that ceiling is the thing',['that ceiling is decisive','the ceiling is what matters'],3],
    ['the pivotal comparison',['the key comparison','the decisive comparison'],3],
    ["and it's not close",['by a wide margin','and the difference is substantial'],2],
    ['the remote-access argument',['the case for remote access','the remote-access case'],3],
    ['this is what makes the split setup work',['this is what makes the split setup practical','this is why the split setup works'],3],
    ['the failure mode is obvious',['the obvious failure mode is','the main failure mode is clear'],3],
    ['other differences worth weighing',['other differences to consider','other factors worth comparing'],3],
    ["where i'd land",['my conclusion','where this leaves me'],3],
    ['the question that resolves it',['the deciding question','the question that settles it'],3],
    ['the whole category',['that entire category'],2],
    ['the variable might be',['the cause may instead be','the relevant variable may be'],2]
  );

  L.PATTERNS.push(
    {
      q:3,
      re:/not ([^.!?]+?) per se\.\s*it['’]?s ([^.!?]+)/gi,
      build:m=>[
        `The issue is ${m[2]}, not ${m[1]} itself`,
        `${cap4(m[2])} matters more than ${m[1]} itself`
      ]
    },
    {
      q:3,
      re:/the ([^.!?]+?) is the constraint that decides it/gi,
      build:m=>[
        `The deciding constraint is ${m[1]}`,
        `${cap4(m[1])} is the constraint that matters most`
      ]
    },
    {
      q:3,
      re:/the question that resolves it:\s*([^?]+\?)/gi,
      build:m=>[
        `The deciding question is: ${m[1]}`,
        `This comes down to one question: ${m[1]}`
      ]
    },
    {
      q:3,
      re:/the failure mode is obvious:\s*([^.!?]+)/gi,
      build:m=>[
        `The obvious failure mode is ${m[1]}`,
        `The main way this fails is ${m[1]}`
      ]
    },
    {
      q:2,
      re:/([^.!?]{3,100}?) has ([^;.!?]+);\s*it also has ([^.!?]+)/gi,
      build:m=>[
        `${m[1]} has both ${m[2]} and ${m[3]}`
      ]
    },
    {
      q:3,
      re:/three things can ([^—.!?]+?)\s*—\s*([^,]+),\s*([^,]+),\s*and ([^—.!?]+?)\s*—\s*and ([^.!?]+)/gi,
      build:m=>[
        `Three things can ${m[1]}: ${m[2]}, ${m[3]}, and ${m[4]}. ${cap4(m[5])}`
      ]
    }
  );
})();
