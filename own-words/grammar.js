(() => {
  const FAMILIES = Object.freeze({
    correction: { label: 'Correction / reversal', description: 'Replaces an expected, familiar, or rejected framing with a preferred one.' },
    ranking: { label: 'Priority / ranking', description: 'Declares which factor, mechanism, comparison, or point matters most.' },
    constraint: { label: 'Constraint / bottleneck', description: 'Identifies the limiting factor, ceiling, bottleneck, or deciding constraint.' },
    causation: { label: 'Causal explanation', description: 'Explains why something happens or what drives an outcome.' },
    mechanism: { label: 'Mechanism / evidence', description: 'Ranks mechanisms or evidence and privileges one explanation.' },
    counterargument: { label: 'Counterargument', description: 'Introduces the strongest objection, alternative account, or opposing case.' },
    qualification: { label: 'Qualification / narrowing', description: 'Retreats from a broad claim to a narrower, more defensible one.' },
    contrast: { label: 'Contrast / tradeoff', description: 'Sets benefits, costs, alternatives, or opposing features against each other.' },
    case_split: { label: 'Case split', description: 'Separates conditions under which a claim gets stronger, weaker, or changes.' },
    practical: { label: 'Practical implication', description: 'Moves from explanation or mechanism to what follows in practice.' },
    summary: { label: 'Summary / bottom line', description: 'Compresses preceding analysis into a conclusion or bottom line.' },
    deciding_question: { label: 'Deciding question / test', description: 'Frames a question or test intended to settle a decision.' },
    failure_mode: { label: 'Failure mode / mistake', description: 'Names common mistakes, breakdowns, or ways an approach fails.' },
    overlooked: { label: 'Overlooked point', description: 'Surfaces something underrated, missed, unnamed, or commonly skipped.' },
    observation: { label: 'Personal observation', description: 'Frames a claim as something noticed, found, suspected, or surprising.' },
    temporal_shift: { label: 'Old-to-new shift', description: 'Contrasts an earlier account, state, or argument with a newer one.' },
    definition: { label: 'Definition / reframing', description: 'Supplies a short version, core idea, or more useful conceptual frame.' },
    distinction: { label: 'Distinction / comparison', description: 'Clarifies a difference between two categories, interpretations, or cases.' },
    enumeration: { label: 'Enumeration / decomposition', description: 'Breaks a problem into a small numbered or ranked set of components.' },
    uncertainty: { label: 'Uncertainty / open question', description: 'Marks unresolved questions, possibility, ambiguity, or incomplete confidence.' },
    transition: { label: 'Discourse transition', description: 'Signals movement between explanatory stages without materially changing the claim.' }
  });

  const RULES = [
    ['counterargument', /\b(?:strongest|best|main|serious) (?:objection|counterargument|challenge)|\bother side\b|\brevisionist position\b|\bcounterarguments?\b/i],
    ['deciding_question', /\b(?:question that (?:resolves|settles|determines)|deciding question|useful test|practical test|comes down to one question)\b/i],
    ['failure_mode', /\b(?:failure mode|failure modes|mistakes? that|mistake nearly everyone|what goes wrong|hard to mess up|culprits?|ways? this fails?)\b/i],
    ['summary', /\b(?:honest summary|bottom line|in summary|short version|where (?:this|the argument) (?:leaves|lands)|the conclusion)\b/i],
    ['practical', /\b(?:practical implication|what does this mean practically|in practical terms|what follows in practice|practical reality)\b/i],
    ['mechanism', /\b(?:mechanism with the most evidence|best-supported mechanism|strongest evidentiary support|mechanisms? below|mechanism may account|evidence behind it)\b/i],
    ['constraint', /\b(?:bottleneck|limiting factor|deciding constraint|constraint that|what limits|ceiling is|constraint on)\b/i],
    ['qualification', /\b(?:strong claim|broader claim|narrower claim|narrower version|at the margins|not total|doesn['’]?t survive|does not hold up)\b/i],
    ['case_split', /\b(?:where (?:the case|it) gets (?:stronger|weaker)|factors that (?:strengthen|weaken)|depending on|unless one of these is true)\b/i],
    ['overlooked', /\b(?:underrated|underappreciated|often missed|what['’]?s often missed|nobody prepares|nobody warned|one people skip|thing people underestimate|easy to underrate)\b/i],
    ['observation', /\b(?:i keep (?:noticing|seeing)|what i(?:['’]?ve| have) found|what['’]?s helped me|i['’]?m convinced|i suspect|surprised me most|interesting finding|pattern i keep)\b/i],
    ['temporal_shift', /\b(?:old argument|new argument|old story|traditional account|used to .* now|once .* now|no longer widely|fallen out of favor)\b/i],
    ['definition', /\b(?:at its core|core insight|real idea|short version|honest version of the question|better answer starts|whole trick|core idea|framing .* clarifies)\b/i],
    ['enumeration', /\b(?:three things|two things|first,|second,|ranked|in rough order|roughly from most to least|step [1-9])\b/i],
    ['distinction', /\b(?:difference between|distinguish|what separated|what distinguishes|separates .* from|preserve the distinction|not parties|rival methods)\b/i],
    ['correction', /\b(?:story is (?:largely|mostly) wrong|usual explanation|popular story|not well supported|the problem is not|the reason is not|they['’]?re not\.)\b|\bisn['’]?t [^.;!?]{1,90}[.;]\s*it['’]?s\b/i],
    ['contrast', /\b(?:payoff|tradeoff|downside|on the other hand|by contrast|in contrast|rather than|not .* but|not .* it['’]?s|real skill is .* not)\b/i],
    ['causation', /\b(?:because|the reason|what drives|driving the|accounts? for|explains? why|cause|causal|as a result)\b/i],
    ['ranking', /\b(?:strongest|most important|matters most|real skill|key skill|key point|main point|essential one|single biggest|sharpest|pivotal|decisive|the real .* is|what actually makes)\b/i],
    ['uncertainty', /\b(?:open question|unresolved|possible that|chance that|perhaps|possibly|might|i wonder whether|curious whether)\b/i],
    ['transition', /\b(?:for example|for instance|in other words|more interestingly|meanwhile|at the same time|concretely|in general|in particular)\b/i]
  ];

  function classify(text, type = 'phrase', explicitFamily = null) {
    if (explicitFamily && FAMILIES[explicitFamily]) return explicitFamily;
    if (type === 'word') return null;
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    if (!value) return null;
    for (const [family, re] of RULES) {
      if (re.test(value)) return family;
    }
    return null;
  }

  function getLabel(family) {
    return family && FAMILIES[family] ? FAMILIES[family].label : '';
  }

  function summarize(candidates) {
    const counts = new Map();
    for (const candidate of candidates || []) {
      if (!candidate || candidate.reverted || !candidate.family || !FAMILIES[candidate.family]) continue;
      counts.set(candidate.family, (counts.get(candidate.family) || 0) + 1);
    }
    const entries = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || getLabel(a[0]).localeCompare(getLabel(b[0])))
      .map(([id, count]) => ({ id, count, label: getLabel(id) }));
    return { count: entries.length, entries, labels: entries.map(entry => entry.label) };
  }

  window.OwnWordsGrammar = { FAMILIES, classify, getLabel, summarize };
})();
