(() => {
  const L = window.OwnWordsLexicon;
  if (!L || !L.PHRASES || !L.PATTERNS) return;
  const cap7 = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  // Controlled-style corpus: the same subject rendered terse, conversational,
  // and academic. These rules target recurring discourse moves rather than
  // technical content.
  L.PHRASES.push(
    ['the mechanism with the most evidence behind it',['the best-supported mechanism','the mechanism with the strongest evidence'],3],
    ['there are non-biological mechanisms too',['non-biological mechanisms matter too','there are psychological mechanisms as well'],2],
    ['the practical implication that follows from',['the practical implication of','what follows in practice from'],3],
    ["here's the thing that surprised me most",['what surprised me most','the most surprising part'],3],
    ['the better answer starts with',['a better explanation starts with','the stronger explanation begins with'],3],
    ["and here's the interesting part",['more interestingly','the interesting part is'],3],
    ['turns out to matter more than anyone expected',['matters more than expected','has proved more important than expected'],2],
    ['what does this mean practically',['in practical terms','what follows in practice'],3],
    ['the honest, uncomfortable part',['the difficult practical reality','the uncomfortable part'],3],
    ['best understood as complementary rather than competing',['better understood as complementary, not competing','best treated as complementary mechanisms'],3],
    ['this mechanism may account for',['this mechanism may explain','this could account for'],2],
    ['dose-response and causal considerations',['dose-response and causality','dose and causal interpretation'],2],
    ['causality runs both directions',['causality is bidirectional','the causal relationship runs both ways'],3],
    ['the relationship is bidirectional',['the relationship runs both ways','the relationship works in both directions'],3]
  );

  L.PATTERNS.push(
    {
      q:3,
      re:/the ([^.!?]{1,90}) story is (?:largely|mostly) wrong(?:,\s*or at least ([^.!?]{1,90}))?/gi,
      build:m=>[
        `The usual explanation involving ${m[1]} is ${m[2] ? `at best ${m[2]}` : 'not well supported'}`,
        `${cap7(m[1])} is probably not the main explanation${m[2] ? `; it is better treated as ${m[2]}` : ''}`
      ]
    },
    {
      q:3,
      re:/the mechanism with the most evidence behind it is ([^.!?]{1,140})/gi,
      build:m=>[
        `${cap7(m[1])} has the strongest evidentiary support`,
        `The best-supported mechanism is ${m[1]}`
      ]
    },
    {
      q:3,
      re:/there are ([^.!?]{1,100}) mechanisms too,\s*and dismissing them would be a mistake/gi,
      build:m=>[
        `${cap7(m[1])} mechanisms also matter and should not be dismissed`,
        `It would be a mistake to ignore the ${m[1]} mechanisms`
      ]
    },
    {
      q:3,
      re:/the practical implication that follows from ([^:]{1,120}) rather than ([^:]{1,100}):\s*([^.!?]{1,180})/gi,
      build:m=>[
        `Following ${m[1]} rather than ${m[2]}, the practical implication is ${m[3]}`,
        `In practical terms, ${m[3]}; that follows from ${m[1]}, not ${m[2]}`
      ]
    },
    {
      q:3,
      re:/here['’]?s the thing that surprised me most(?: when i looked into this)?:\s*([^.!?]{1,180})/gi,
      build:m=>[
        `What surprised me most was this: ${m[1]}`,
        `The most surprising part was ${m[1]}`
      ]
    },
    {
      q:3,
      re:/and here['’]?s the interesting part:\s*([^.!?]{1,180})/gi,
      build:m=>[
        `More interestingly, ${m[1]}`,
        `The interesting part is that ${m[1]}`
      ]
    },
    {
      q:3,
      re:/what does this mean practically\?\s*([^.!?]{1,180})/gi,
      build:m=>[
        `In practical terms, ${m[1]}`,
        `Practically, this means ${m[1]}`
      ]
    },
    {
      q:3,
      re:/and the honest, uncomfortable part:\s*([^.!?]{1,200})/gi,
      build:m=>[
        `The difficult practical reality is ${m[1]}`,
        `The uncomfortable part is that ${m[1]}`
      ]
    },
    {
      q:3,
      re:/([^.!?]{1,100}) are best understood as complementary rather than competing/gi,
      build:m=>[
        `${cap7(m[1])} are complementary, not competing`,
        `It is more useful to treat ${m[1]} as complementary mechanisms`
      ]
    },
    {
      q:3,
      re:/the ([^.!?]{1,120}) relationship is bidirectional/gi,
      build:m=>[
        `The relationship between ${m[1]} runs in both directions`,
        `${cap7(m[1])} influences outcomes in both directions`
      ]
    }
  );
})();
