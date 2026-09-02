(() => {
  const L = window.OwnWordsLexicon = window.OwnWordsLexicon || {};
  L.PATTERNS = L.PATTERNS || [];

  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const lowerLead = s => {
    if (!s) return s;
    const m = s.match(/^([A-Z][A-Za-z'’]*)(.*)$/s);
    if (!m) return s;
    const common = new Set([
      'The','This','That','These','Those','It','They','We','You','A','An','He','She',
      'In','On','At','For','From','With','Without','During','After','Before','Because',
      'When','If','While','As','Although','However','Nevertheless'
    ]);
    if (!common.has(m[1])) return s;
    return m[1].toLowerCase() + m[2];
  };
  const trimClause = s => (s || '').trim().replace(/[,:;\s]+$/u, '');
  const sameLeadCase = (original, replacement) =>
    original && /^[A-Z]/.test(original) ? cap(replacement) : replacement;
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function rule(q, re, build, family, transformClass) {
    L.PATTERNS.push({ q, re, build, family, transformClass });
  }

  // Causal framing compression: remove low-semantic-load framing tokens while
  // keeping the proposition and explicit causal relation.
  rule(3,
    /\bthe reason (?:why )?([^.!?\n]{3,140}?) is that ([^.!?\n]{3,180})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))} because ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'causation', 'syntax-recast');

  rule(3,
    /\bone reason (?:why )?([^.!?\n]{3,140}?) is that ([^.!?\n]{3,180})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))} partly because ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'causation', 'syntax-recast');

  rule(2,
    /\b(?:a major|a key) reason (?:why )?([^.!?\n]{3,140}?) is that ([^.!?\n]{3,180})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))} largely because ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'causation', 'syntax-recast');

  rule(2,
    /\bthe main reason (?:why )?([^.!?\n]{3,140}?) is that ([^.!?\n]{3,180})([.!?])/gi,
    m => [`${cap(trimClause(m[1]))} mainly because ${lowerLead(trimClause(m[2]))}${m[3]}`],
    'causation', 'syntax-recast');

  // Sentence-level logical recasts are kept out of Light unless the relation is
  // unusually explicit. These can change more local sequence while preserving
  // the stated logical relation, but they deserve more conservative exposure.
  rule(3,
    /(^|[.!?]\s+)([^.!?\n]{3,240})\.\s+This is because\s+([^.!?\n]{3,220})([.!?])/g,
    m => [`${m[1]}${cap(trimClause(m[2]))} because ${lowerLead(trimClause(m[3]))}${m[4]}`],
    'causation', 'sentence-merge');

  rule(2,
    /(^|[.!?]\s+)([^.!?\n]{3,240})\.\s+(?:As a result|Consequently|For this reason),\s+([^.!?\n]{3,220})([.!?])/g,
    m => [`${m[1]}Because ${lowerLead(trimClause(m[2]))}, ${lowerLead(trimClause(m[3]))}${m[4]}`],
    'causation', 'sentence-merge');

  rule(2,
    /(^|[.!?]\s+)([^.!?\n]{3,240})\.\s+This means that\s+([^.!?\n]{3,220})([.!?])/g,
    m => [`${m[1]}${cap(trimClause(m[2]))}, so ${lowerLead(trimClause(m[3]))}${m[4]}`],
    'causation', 'sentence-merge');

  rule(2,
    /(^|[.!?]\s+)([^.!?\n]{3,240})\.\s+However,\s+([^.!?\n]{3,220})([.!?])/g,
    m => [`${m[1]}Although ${lowerLead(trimClause(m[2]))}, ${lowerLead(trimClause(m[3]))}${m[4]}`],
    'contrast', 'sentence-merge');

  rule(1,
    /(^|[.!?]\s+)([^.!?\n]{3,240})\.\s+Nevertheless,\s+([^.!?\n]{3,220})([.!?])/g,
    m => [`${m[1]}Although ${lowerLead(trimClause(m[2]))}, ${lowerLead(trimClause(m[3]))}${m[4]}`],
    'contrast', 'sentence-merge');

  rule(1,
    /(^|[.!?]\s+)([^.!?\n]{3,240})\.\s+(?:In contrast|By contrast),\s+([^.!?\n]{3,220})([.!?])/g,
    m => [`${m[1]}${cap(trimClause(m[2]))}, whereas ${lowerLead(trimClause(m[3]))}${m[4]}`],
    'contrast', 'sentence-merge');

  // Local connective recasts are unusually attractive: they change function
  // words and punctuation at very low semantic risk.
  rule(3,
    /,\s+which means that\s+/gi,
    () => [', so '],
    'transition', 'connective-recast');

  rule(3,
    /,\s+but\s+/gi,
    () => ['; however, '],
    'contrast', 'connective-recast');

  rule(3,
    /;\s+however,\s+/gi,
    () => [', but '],
    'contrast', 'connective-recast');

  rule(2,
    /,\s+so\s+/gi,
    () => ['; therefore, '],
    'causation', 'connective-recast');

  // Nominalization -> direct verb. Matching only the framing phrase avoids
  // reparsing or regenerating the surrounding subject/object.
  const nominal = [
    ['makes a decision to', 'decides to', 3],
    ['make a decision to', 'decide to', 3],
    ['made a decision to', 'decided to', 3],
    ['reaches a conclusion that', 'concludes that', 3],
    ['reach a conclusion that', 'conclude that', 3],
    ['reached a conclusion that', 'concluded that', 3],
    ['conducts an analysis of', 'analyzes', 3],
    ['conduct an analysis of', 'analyze', 3],
    ['conducted an analysis of', 'analyzed', 3],
    ['performs an evaluation of', 'evaluates', 3],
    ['perform an evaluation of', 'evaluate', 3],
    ['performed an evaluation of', 'evaluated', 3],
    ['provides an explanation for', 'explains', 3],
    ['provide an explanation for', 'explain', 3],
    ['provided an explanation for', 'explained', 3],
    ['has an effect on', 'affects', 3],
    ['have an effect on', 'affect', 3],
    ['had an effect on', 'affected', 3],
    ['has an impact on', 'affects', 2],
    ['have an impact on', 'affect', 2],
    ['had an impact on', 'affected', 2],
    ['has an influence on', 'influences', 3],
    ['have an influence on', 'influence', 3],
    ['had an influence on', 'influenced', 3],
    ['has a tendency to', 'tends to', 3],
    ['have a tendency to', 'tend to', 3],
    ['had a tendency to', 'tended to', 3]
  ];

  for (const [source, replacement, q] of nominal) {
    rule(q,
      new RegExp(`\\b${reEsc(source)}\\b`, 'gi'),
      m => [sameLeadCase(m[0], replacement)],
      'definition', 'nominalization-recast');
  }

  // Parallelism compression.
  rule(3,
    /\bis not only\s+([^,;.!?\n]{2,100})\s+but also\s+([^,;.!?\n]{2,100})/gi,
    m => [`is both ${trimClause(m[1])} and ${trimClause(m[2])}`],
    'contrast', 'syntax-recast');
})();
