(() => {
  const L = window.OwnWordsLexicon;
  if (!L || !L.PHRASES || !L.PATTERNS) return;
  const cap2 = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  L.PHRASES.push(
    ['the thing that actually',['what actually'],3],
    ['the question that actually determines the answer',['the question that determines the answer'],3],
    ['transaction costs are the whole story',['transaction costs drive the result','transaction costs matter most'],3],
    ['turns those costs into a rounding error',['makes those costs comparatively minor','reduces the importance of those costs'],2],
    ['the honest version of the question',['the more useful version of the question','the better question'],2],
    ['buying is a bet on staying',["buying means betting that you'll stay",'buying assumes you will stay'],3],
    ['price it that way',['factor that into the decision','treat it accordingly'],2],
    ["there's no moment when it starts",['there is no clear starting point','it does not begin at one obvious moment'],3],
    ['a slow accumulation of small things',['a gradual buildup of small things','small responsibilities accumulating over time'],3],
    ['and then one day you notice',['eventually you realize','at some point you notice'],3],
    ['the thing i wish someone had said out loud',['what i wish someone had said plainly','what i wish i had heard earlier'],3],
    ['name it earlier',['call it what it is sooner','recognize it earlier'],2],
    ['quietly becomes yours by default',['becomes your responsibility almost unnoticed','gradually falls to you by default'],2],
    ['running on empty',['exhausted','running out of energy'],3],
    ['the role reversal is real',['the role reversal does happen','the roles really do shift'],2],
    ['what happened was messier',['the reality was more complicated','what followed was less tidy'],3],
    ['which was the point',['which was intentional','which was precisely the purpose'],3],
    ['the real crisis came',['the more serious crisis came','the deeper crisis emerged'],2],
    ['genuine but uneven results',['real but uneven results','meaningful but inconsistent results'],2],
    ["here's the case as its strongest advocates make it",['the strongest case for it goes like this','its strongest advocates make this case'],3],
    ["this is the part that's hard to defend",['this is the hardest part to defend','this is where the defense gets difficult'],3],
    ['mostly an accounting trick',['largely an accounting device','mostly an accounting maneuver'],2],
    ['the core objection',['the central objection','the main objection'],3],
    ['the other side has real answers',['there are serious arguments on the other side','the other side has substantive answers'],3],
    ['survives all of this best',['remains strongest after these objections','holds up best against these objections'],2],
    ["somebody asked, so here's the whole thing",["since someone asked, here's the full process","someone asked, so here's the full version"],3],
    ["here's the whole thing",["here's the full process","here's the full version"],3],
    ['two mistakes that get people',['two mistakes are especially common','two mistakes cause most problems'],3],
    ['hard to mess up',['difficult to get wrong','fairly forgiving'],3],
    ['at its core',['fundamentally','in essence'],3],
    ["that's the modern definition and the one that actually generalizes",["that's the modern, general definition","that's the modern definition that applies broadly"],3],
    ['turned out to be a special case',['proved to be a special case','was eventually recognized as a special case'],3],
    ['trips people up constantly',['often causes confusion','is easy to mix up'],3],
    ['the same process shows up everywhere under different names',['the same process appears in many forms','the same process turns up in many contexts'],3],
    ['under different names',['in different forms','in different contexts'],2],
    ['with different scenery',['in different forms','in different settings'],3],
    ['the part nobody prepares you for',['what nobody prepares you for'],3],
    ['the old story of',['the traditional account of','the older narrative of'],2],
    ["what's often missed",['what is often overlooked','what summaries often miss'],2],
    ['the state markets it',['the state actively markets it','the government promotes it'],3],
    ['political cover',['political justification','political cover'],1],
    ['the fastest-growing segment',['the segment growing fastest','the fastest-growing category'],2],
    ['the real function is',['its main function is','what it really does is'],2],
    ['the dishonesty is the core objection',['the central objection is the dishonesty','the main objection is the dishonesty'],3],
    ['at the margins',['in degree','on the details'],1],
    ['the advertising critique',['the criticism of the advertising','the advertising objection'],3],
    ['the one that survives all of this best',['the one that holds up best against these objections'],2],
    ['the modern definition',['the current definition'],2],
    ['a bookkeeping device',['an accounting convention','a bookkeeping convention'],3],
    ['the same net reaction as',['the same overall reaction as'],3],
    ['instead of releasing all the energy at once',['rather than releasing all the energy at once'],2]
  );

  L.PATTERNS.push(
    {
      q:3,
      re:/([^.!?]{3,140}?) isn['’]?t ([^.!?]+)\.\s*it['’]?s ([^.!?]+)/gi,
      build:m=>[
        `${m[1]} is ${m[3]}, not ${m[2]}`
      ]
    },
    {
      q:3,
      re:/there['’]?s no ([^,.!?]+),\s*no ([^,.!?]+),\s*no ([^.!?]+)\.\s*just ([^.!?]+)/gi,
      build:m=>[
        `There is no ${m[1]}, ${m[2]}, or ${m[3]}; only ${m[4]}`,
        `No ${m[1]}, ${m[2]}, or ${m[3]}. Instead, ${m[4]}`
      ]
    },
    {
      q:3,
      re:/not to ([^.!?—]+?)\s*—\s*to ([^.!?]+)/gi,
      build:m=>[
        `The point is not to ${m[1]}, but to ${m[2]}`,
        `This is about ${m[2]}, not ${m[1]}`
      ]
    },
    {
      q:2,
      re:/([^.!?]+?) is real,\s*but it['’]?s not ([^.!?]+)/gi,
      build:m=>[
        `${m[1]} is real without being ${m[2]}`,
        `${m[1]} is real, though not ${m[2]}`
      ]
    },
    {
      q:3,
      re:/a lot of the ([^.!?]+?) comes from ([^.!?]+?),\s*and a lot of it comes from ([^.!?]+)/gi,
      build:m=>[
        `Much of the ${m[1]} comes from both ${m[2]} and ${m[3]}`,
        `Two things drive much of the ${m[1]}: ${m[2]} and ${m[3]}`
      ]
    },
    {
      q:3,
      re:/what separated ([^.!?]+?) from ([^.!?]+?) was ([^:]+):/gi,
      build:m=>[
        `${cap2(m[1])} differed from ${m[2]} because of ${m[3]}:`,
        `The key difference between ${m[1]} and ${m[2]} was ${m[3]}:`
      ]
    },
    {
      q:3,
      re:/the old story of ([^.!?]+?) has mostly been abandoned by ([^.!?]+)/gi,
      build:m=>[
        `${cap2(m[2])} have largely abandoned the old story of ${m[1]}`,
        `The old account of ${m[1]} is no longer widely accepted by ${m[2]}`
      ]
    },
    {
      q:3,
      re:/what['’]?s often missed in (the [^.!?]+?) is ([^.!?]+)/gi,
      build:m=>[
        `${cap2(m[1])} often misses ${m[2]}`,
        `One thing ${m[1]} often leaves out is ${m[2]}`
      ]
    },
    {
      q:3,
      re:/not through ([^.!?—]+?) but through the opposite\s*—\s*([^.!?]+)/gi,
      build:m=>[
        `through ${m[2]} rather than ${m[1]}`,
        `not through ${m[1]}, but through ${m[2]}`
      ]
    },
    {
      q:3,
      re:/the reason ([^.!?]+?) is that ([^.!?]+)/gi,
      build:m=>[
        `${cap2(m[1])} because ${m[2]}`
      ]
    },
    {
      q:3,
      re:/([^.!?]+),\s*which trips people up (?:constantly|often)\s*—\s*([^.!?]+)/gi,
      build:m=>[
        `${m[1]}. This is easy to mix up: ${m[2]}`,
        `${m[1]}. The confusing part is that ${m[2]}`
      ]
    },
    {
      q:3,
      re:/all the same ([^.!?]+?) with different scenery/gi,
      build:m=>[
        `different versions of the same ${m[1]}`,
        `the same ${m[1]} in different forms`
      ]
    },
    {
      q:3,
      re:/the part nobody ([^.!?]+?) is that ([^.!?]+)/gi,
      build:m=>[
        `What nobody ${m[1]} is that ${m[2]}`
      ]
    },
    {
      q:3,
      re:/the thing i wish someone had said out loud:\s*([^.!?]+)/gi,
      build:m=>[
        `I wish someone had said this plainly: ${m[1]}`,
        `What I wish I had heard earlier is this: ${m[1]}`
      ]
    },
    {
      q:3,
      re:/calling it ([^.!?]+?) doesn['’]?t change ([^.!?]+)/gi,
      build:m=>[
        `Calling it ${m[1]} does not alter ${m[2]}`,
        `The label ${m[1]} does not change ${m[2]}`
      ]
    },
    {
      q:3,
      re:/the old story of ([^.!?]+?) has mostly been abandoned/gi,
      build:m=>[
        `The traditional account of ${m[1]} is now largely rejected`,
        `The older narrative of ${m[1]} has fallen out of favor`
      ]
    },
    {
      q:3,
      re:/the same process shows up everywhere under different names/gi,
      build:m=>[
        `The same process appears in many different contexts`,
        `This process turns up in many forms`
      ]
    }
  );
})();