window.OwnWordsLexicon = window.OwnWordsLexicon || {};
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
window.OwnWordsLexicon.PATTERNS = [
    {
      q:2,
      re:/almost everything about ([^,.!?;]+?) is shaped by ([^,.!?;]+)/gi,
      build:m=>[
        `${cap(m[2])} shapes almost everything about ${m[1]}`,
        `${cap(m[2])} influences nearly every aspect of ${m[1]}`
      ]
    },
    {
      q:3,
      re:/the payoff is ([^.;!?]+);\s*the cost is ([^.!?]+)/gi,
      build:m=>[
        `The benefit is ${m[1]}. The tradeoff is ${m[2]}`,
        `${m[1][0].toUpperCase()+m[1].slice(1)} is the benefit, but ${m[2]} is the tradeoff`
      ]
    },
    {
      q:2,
      re:/hit ([^,.!?;]+) hard enough that/gi,
      build:m=>[
        `affected ${m[1]} so severely that`,
        `reduced ${m[1]} enough that`
      ]
    },
    {
      q:2,
      re:/sounds far too ([^,.!?;]+) for/gi,
      build:m=>[
        `sounds surprisingly ${m[1]} for`
      ]
    },
    {
      q:3,
      re:/not whether ([^.!?]+)\.\s*whether ([^.!?]+)/gi,
      build:m=>[
        `The question is not whether ${m[1]}, but whether ${m[2]}`,
        `What matters is not whether ${m[1]}; it is whether ${m[2]}`
      ]
    },
    {
      q:2,
      re:/what i['’]?ve found more useful than ([^:]+):\s*([^.!?]+)/gi,
      build:m=>[
        `I have found ${m[2]} more useful than ${m[1]}`,
        `${cap(m[2])} has been more useful to me than ${m[1]}`
      ]
    },
    {
      q:2,
      re:/([^.!?]+?) failed because ([^.!?]+)\.\s*it failed because ([^.!?]+)/gi,
      build:m=>[
        `${m[1]} did not fail because ${m[2]}; it failed because ${m[3]}`,
        `The problem with ${m[1]} was not ${m[2]}. It was ${m[3]}`
      ]
    },
    {
      q:2,
      re:/([^.!?]+?) feel(?:s)? like ([^.!?]+)\.\s*they['’]?re not\.\s*they['’]?re ([^.!?]+)/gi,
      build:m=>[
        `${m[1]} may feel like ${m[2]}, but they are ${m[3]}`
      ]
    },
    {
      q:2,
      re:/([^.!?;]+?) don['’]?t ([^;]+?) on a schedule;\s*they ([^.!?]+)/gi,
      build:m=>[
        `${m[1]} rarely ${m[2]} on command. They ${m[3]}`
      ]
    },
    {
      q:2,
      re:/([^.!?]+?) used to ([^.!?]+)\.\s*now it ([^.!?]+)/gi,
      build:m=>[
        `${m[1]} once ${m[2]}; now it ${m[3]}`
      ]
    },
    {
      q:3,
      re:/not ([^.!?—]+?)\s*—\s*([^.!?]+)/gi,
      build:m=>[
        `It is not ${m[1]}; it is ${m[2]}`,
        `${cap(m[2])}, rather than ${m[1]}`
      ]
    },
    {
      q:3,
      re:/not ([^.!?]+)\.\s*but ([^.!?]+)/gi,
      build:m=>[
        `Not ${m[1]}, but ${m[2]}`,
        `It is not ${m[1]}; ${m[2]}`
      ]
    },
    {
      q:2,
      re:/not ([^.!?]+),\s*not ([^.!?]+),\s*not ([^.!?]+)\.\s*it['’]?s ([^.!?]+)/gi,
      build:m=>[
        `The problem is not ${m[1]}, ${m[2]}, or ${m[3]}. It is ${m[4]}`
      ]
    },
    {
      q:2,
      re:/none of ([^.!?]+) are ([^.!?]+)\.\s*they['’]?re only ([^.!?]+) because ([^.!?]+)/gi,
      build:m=>[
        `None of ${m[1]} is ${m[2]} on its own; they become ${m[3]} because ${m[4]}`
      ]
    },
    {
      q:3,
      re:/treat ([^.!?]+?) as ([^,.!?]+),\s*not ([^.!?]+)/gi,
      build:m=>[
        `Treat ${m[1]} as ${m[2]} rather than ${m[3]}`
      ]
    },
    {
      q:2,
      re:/the bottleneck in ([^.!?]+?) isn['’]?t ([^,.;!?]+),\s*it['’]?s ([^.!?]+)/gi,
      build:m=>[
        `The main constraint in ${m[1]} is ${m[3]}, not ${m[2]}`,
        `In ${m[1]}, ${m[3]} is the bottleneck rather than ${m[2]}`
      ]
    },
    {
      q:2,
      re:/not because ([^,.;!?]+),\s*but because ([^.!?]+)/gi,
      build:m=>[
        `The reason is not ${m[1]}; it is ${m[2]}`
      ]
    },
    {
      q:2,
      re:/the old argument for ([^.!?]+?) was ([^.!?]+)\.\s*the new argument is (?:that )?([^.!?]+)/gi,
      build:m=>[
        `The traditional case for ${m[1]} was ${m[2]}. Now the argument is ${m[3]}`
      ]
    },
    {
      q:2,
      re:/([^.!?]+?) has gone up,\s*not down/gi,
      build:m=>[
        `${m[1]} has increased rather than decreased`
      ]
    },
    {
      q:2,
      re:/what limits ([^.!?]+?) now is ([^.!?]+)/gi,
      build:m=>[
        `Now, ${m[2]} is what limits ${m[1]}`,
        `The current constraint on ${m[1]} is ${m[2]}`
      ]
    }
  ];
