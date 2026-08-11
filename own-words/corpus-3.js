(() => {
  const L = window.OwnWordsLexicon;
  if (!L || !L.PHRASES || !L.PATTERNS) return;

  L.PHRASES.push(
    ['the short version',['in brief','the concise version'],3],
    ['where the mistakes start',['where the problems begin','where people start getting into trouble'],2],
    ['this is the big one',['this is the biggest issue','this one matters most'],3],
    ['same problem, but for you',['the same issue applies to you','the same problem applies here'],2],
    ['roughly in order of',['approximately in order of','more or less in order of'],2],
    ['for what it\'s worth',['for context','as a practical matter'],2],
    ['the cleanest distinguishing clue',['the clearest distinguishing clue','the most useful clue for telling them apart'],3],
    ['less common but worth ruling out',['less common possibilities worth excluding','less likely causes still worth considering'],2],
    ['the strongest case',['the strongest argument','the best case'],3],
    ['the weakest thing about',['the least convincing part of','the weakest part of'],2],
    ['the narrator is the achievement',['the narrator is the central achievement','the narration is the main technical achievement'],2],
    ['solved a hard problem',['handled a difficult problem','solved a difficult technical problem'],2],
    ['the honest counterarguments',['the strongest counterarguments','the serious objections'],3],
    ['holds up under scrutiny',['survives close examination','stands up to scrutiny'],3],
    ['which is more than can be said for',['unlike','which is not true of'],2],
    ['aged into relevance rather than out of it',['become more relevant with time rather than less','grown more relevant rather than dated'],2],
    ['in conventional clothes',['in a conventional form','within conventional-looking prose'],1],
    ['the style is famously beautiful',['the prose is famously beautiful','the style is celebrated for its beauty'],2],
    ['does structural work',['serves a structural purpose','helps organize the work'],3],
    ['more precise than that',['more specific than that','more exact than that'],2]
  );

  L.PATTERNS.push(
    {
      q:3,
      re:/([^.!?;]{3,180}?) isn['’]?t ([^;.!?]+);\s*it['’]?s ([^.!?]+)/gi,
      build:m=>[
        `${m[1]} is ${m[3]}, not ${m[2]}`,
        `${m[1]} is not ${m[2]}; rather, it is ${m[3]}`
      ]
    },
    {
      q:3,
      re:/the short version:\s*([^.!?]+)/gi,
      build:m=>[
        `In brief, ${m[1]}`,
        `The concise answer is that ${m[1]}`
      ]
    },
    {
      q:2,
      re:/([^.!?]+?) doesn['’]?t rest on ([^.!?]+?)\.\s*([^.!?]+?) survives for ([^.!?]+)/gi,
      build:m=>[
        `${m[1]} does not depend on ${m[2]}. ${m[3]} endures for ${m[4]}`
      ]
    },
    {
      q:2,
      re:/([^.!?]+?) isn['’]?t ([^.!?]+?)\.\s*it['’]?s more precise than that:\s*([^.!?]+)/gi,
      build:m=>[
        `${m[1]} is more specific than ${m[2]}: ${m[3]}`
      ]
    },
    {
      q:2,
      re:/whether ([^.!?]+?) or ([^.!?]+?) is a fair question\.\s*but ([^.!?]+)/gi,
      build:m=>[
        `It is fair to ask whether ${m[1]} or ${m[2]}, but ${m[3]}`
      ]
    }
  );
})();
