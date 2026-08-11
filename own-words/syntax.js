(() => {
  const L = window.OwnWordsLexicon = window.OwnWordsLexicon || {};
  L.PATTERNS = L.PATTERNS || [];

  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const lowerLead = s => {
    if (!s) return s;
    const m = s.match(/^([A-Z][A-Za-z'’]*)(.*)$/s);
    if (!m) return s;
    const common = new Set(['The','This','That','These','Those','It','They','We','You','A','An','He','She']);
    if (!common.has(m[1])) return s;
    return m[1].toLowerCase() + m[2];
  };
  const trimClause = s => (s || '').trim().replace(/[,:;\s]+$/u, '');
  const punct = s => /[!?]$/.test(s || '') ? s : '.';

  function rule(q, re, build, family, transformClass) {
    L.PATTERNS.push({ q, re, build, family, transformClass });
  }

  // High-confidence causal recasts. These replace several low-semantic-load
  // framing tokens while preserving the underlying proposition.
  rule(3,
    /\bthe reason (?:why )?([^.!?\n]{3,140}?) is that ([^.!?\n]{3,180})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))} because ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'causal-recast', 'syntax-recast');

  rule(3,
    /\bone reason (?:why )?([^.!?\n]{3,140}?) is that ([^.!?\n]{3,180})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))} partly because ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'causal-recast', 'syntax-recast');

  rule(2,
    /\b(?:a major|a key) reason (?:why )?([^.!?\n]{3,140}?) is that ([^.!?\n]{3,180})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))} largely because ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'causal-recast', 'syntax-recast');

  rule(2,
    /\bthe main reason (?:why )?([^.!?\n]{3,140}?) is that ([^.!?\n]{3,180})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))} mainly because ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'causal-recast', 'syntax-recast');

  rule(3,
    /([^.!?\n]{3,160})\.\s+This is because\s+([^.!?\n]{3,180})([.!?])/g,
    m => [`${cap(trimClause(m[1]))} because ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'causal-merge', 'sentence-merge');

  rule(2,
    /([^.!?\n]{3,160})\.\s+(?:As a result|Consequently|For this reason),\s+([^.!?\n]{3,180})([.!?])/g,
    m => [`Because ${lowerLead(trimClause(m[1]))}, ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'causal-merge', 'sentence-merge');

  rule(2,
    /([^.!?\n]{3,160})\.\s+This means that\s+([^.!?\n]{3,180})([.!?])/g,
    m => [`${cap(trimClause(m[1]))}, so ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'consequence-recast', 'sentence-merge');

  rule(2,
    /([^.!?\n]{3,160}?),\s+which means that\s+([^.!?\n]{3,180})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))}, so ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'consequence-recast', 'syntax-recast');

  // Contrast recasts. Merging or changing the connective alters function words
  // and punctuation while keeping the contrast explicit.
  rule(3,
    /([^.!?\n]{3,160})\.\s+However,\s+([^.!?\n]{3,180})([.!?])/g,
    m => [`Although ${lowerLead(trimClause(m[1]))}, ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'contrast-recast', 'sentence-merge');

  rule(2,
    /([^.!?\n]{3,160})\.\s+Nevertheless,\s+([^.!?\n]{3,180})([.!?])/g,
    m => [`Although ${lowerLead(trimClause(m[1]))}, ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'contrast-recast', 'sentence-merge');

  rule(3,
    /([^,;.!?\n]{3,130}),\s+but\s+([^,;.!?\n]{3,150})([.!?])/gi,
    m => [`Although ${lowerLead(trimClause(m[1]))}, ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'contrast-recast', 'syntax-recast');

  rule(3,
    /\bAlthough\s+([^,;.!?\n]{3,130}),\s+([^,;.!?\n]{3,150})([.!?])/g,
    m => [`${cap(trimClause(m[1]))}, but ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'contrast-recast', 'clause-reorder');

  rule(2,
    /([^.!?\n]{3,160})\.\s+(?:In contrast|By contrast),\s+([^.!?\n]{3,180})([.!?])/g,
    m => [`${cap(trimClause(m[1]))}, whereas ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'contrast-recast', 'sentence-merge');

  // Low-risk dependent-clause movement. These are useful chiefly when they are
  // selected alongside lexical changes; intact internal n-grams otherwise survive.
  rule(3,
    /\bBecause\s+([^,;.!?\n]{3,130}),\s+([^,;.!?\n]{3,150})([.!?])/g,
    m => [`${cap(trimClause(m[2]))} because ${lowerLead(trimClause(m[1]))}${m[3]}`],
    'clause-order', 'clause-reorder');

  rule(3,
    /\bIf\s+([^,;.!?\n]{3,130}),\s+([^,;.!?\n]{3,150})([.!?])/g,
    m => [`${cap(trimClause(m[2]))} if ${lowerLead(trimClause(m[1]))}${m[3]}`],
    'clause-order', 'clause-reorder');

  rule(3,
    /\bWhen\s+([^,;.!?\n]{3,130}),\s+([^,;.!?\n]{3,150})([.!?])/g,
    m => [`${cap(trimClause(m[2]))} when ${lowerLead(trimClause(m[1]))}${m[3]}`],
    'clause-order', 'clause-reorder');

  rule(3,
    /\bAfter\s+([^,;.!?\n]{3,130}),\s+([^,;.!?\n]{3,150})([.!?])/g,
    m => [`${cap(trimClause(m[2]))} after ${lowerLead(trimClause(m[1]))}${m[3]}`],
    'clause-order', 'clause-reorder');

  rule(3,
    /\bBefore\s+([^,;.!?\n]{3,130}),\s+([^,;.!?\n]{3,150})([.!?])/g,
    m => [`${cap(trimClause(m[2]))} before ${lowerLead(trimClause(m[1]))}${m[3]}`],
    'clause-order', 'clause-reorder');

  // Nominalization -> verb recasts. These tend to be unusually efficient:
  // several surface tokens disappear while the proposition remains the same.
  const nominal = [
    ['makes', 'a decision to', 'decides to', 3],
    ['make', 'a decision to', 'decide to', 3],
    ['made', 'a decision to', 'decided to', 3],
    ['reaches', 'a conclusion that', 'concludes that', 3],
    ['reach', 'a conclusion that', 'conclude that', 3],
    ['reached', 'a conclusion that', 'concluded that', 3],
    ['conducts', 'an analysis of', 'analyzes', 3],
    ['conduct', 'an analysis of', 'analyze', 3],
    ['conducted', 'an analysis of', 'analyzed', 3],
    ['performs', 'an evaluation of', 'evaluates', 3],
    ['perform', 'an evaluation of', 'evaluate', 3],
    ['performed', 'an evaluation of', 'evaluated', 3],
    ['provides', 'an explanation for', 'explains', 3],
    ['provide', 'an explanation for', 'explain', 3],
    ['provided', 'an explanation for', 'explained', 3],
    ['has', 'an effect on', 'affects', 3],
    ['have', 'an effect on', 'affect', 3],
    ['had', 'an effect on', 'affected', 3],
    ['has', 'an impact on', 'affects', 2],
    ['have', 'an impact on', 'affect', 2],
    ['had', 'an impact on', 'affected', 2],
    ['has', 'an influence on', 'influences', 3],
    ['have', 'an influence on', 'influence', 3],
    ['had', 'an influence on', 'influenced', 3],
    ['has', 'a tendency to', 'tends to', 3],
    ['have', 'a tendency to', 'tend to', 3],
    ['had', 'a tendency to', 'tended to', 3]
  ];

  for (const [verb, phrase, replacement, q] of nominal) {
    const re = new RegExp(`([^,;.!?\\n]{2,100})\\s+${verb}\\s+${phrase}\\s+([^,;.!?\\n]{2,150})([.!?])`, 'gi');
    rule(q, re,
      m => [`${cap(trimClause(m[1]))} ${replacement} ${lowerLead(trimClause(m[2]))}${m[3]}`],
      'nominalization-recast', 'syntax-recast');
  }

  rule(3,
    /([^,;.!?\n]{2,100})\s+is (?:the|a) cause of\s+([^,;.!?\n]{2,150})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))} causes ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'copular-recast', 'syntax-recast');

  rule(3,
    /([^,;.!?\n]{2,100})\s+is (?:the|a) result of\s+([^,;.!?\n]{2,150})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))} results from ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'copular-recast', 'syntax-recast');

  rule(2,
    /([^,;.!?\n]{2,100})\s+is (?:an|a) (?:indication|sign) that\s+([^,;.!?\n]{2,150})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))} suggests that ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'copular-recast', 'syntax-recast');

  rule(3,
    /([^,;.!?\n]{2,100})\s+is one of the (?:main )?reasons why\s+([^,;.!?\n]{2,150})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))} helps explain why ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'causal-recast', 'syntax-recast');

  rule(3,
    /([^,;.!?\n]{2,100})\s+is not only\s+([^,;.!?\n]{2,100})\s+but also\s+([^,;.!?\n]{2,100})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))} is both ${trimClause(m[2])} and ${trimClause(m[3])}${m[4]}`],
    'parallel-recast', 'syntax-recast');
})();
