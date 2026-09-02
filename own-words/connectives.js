(() => {
  const L = window.OwnWordsLexicon = window.OwnWordsLexicon || {};
  if (!Array.isArray(L.PHRASES)) return;

  // High-frequency discourse/connective alternations. These are kept separate
  // from the general phrase file because the reference benchmark shows this
  // class has unusually high sequence disruption per semantic change.
  const additions = [
    ['moreover', ['furthermore', 'in addition'], 3, 'addition'],
    ['furthermore', ['moreover', 'in addition'], 3, 'addition'],
    ['additionally', ['also', 'in addition'], 3, 'addition'],
    ['therefore', ['thus', 'as a result'], 3, 'causation'],
    ['thus', ['therefore'], 3, 'causation'],
    ['consequently', ['therefore', 'as a result'], 3, 'causation'],
    ['hence', ['therefore', 'thus'], 2, 'causation'],
    ['accordingly', ['therefore', 'as a result'], 2, 'causation'],
    ['because of this', ['for this reason', 'therefore'], 3, 'causation'],
    ['because of that', ['for that reason', 'therefore'], 3, 'causation'],
    ['for that reason', ['therefore', 'because of that'], 3, 'causation'],
    ['nevertheless', ['even so', 'nonetheless'], 3, 'contrast'],
    ['nonetheless', ['nevertheless', 'even so'], 3, 'contrast'],
    ['even so', ['nevertheless', 'nonetheless'], 3, 'contrast'],
    ['despite this', ['nevertheless', 'even so'], 3, 'contrast'],
    ['despite that', ['nevertheless', 'even so'], 3, 'contrast'],
    ['similarly', ['likewise'], 3, 'comparison'],
    ['likewise', ['similarly'], 3, 'comparison'],
    ['in comparison', ['by comparison'], 3, 'comparison'],
    ['by comparison', ['in comparison'], 3, 'comparison'],
    ['specifically', ['more specifically', 'in particular'], 2, 'clarification'],
    ['in essence', ['essentially'], 3, 'restatement'],
    ['essentially', ['in essence'], 2, 'restatement'],
    ['generally speaking', ['in general', 'broadly'], 3, 'qualification'],
    ['at least in part', ['partly'], 3, 'qualification'],
    ['in large part', ['largely'], 3, 'qualification'],
    ['to some extent', ['somewhat'], 2, 'qualification'],
    ['to a great extent', ['largely'], 2, 'qualification'],
    ['in the meantime', ['meanwhile'], 3, 'temporal_shift'],
    ['after that', ['afterward'], 3, 'temporal_shift'],
    ['before that', ['beforehand'], 3, 'temporal_shift']
  ];

  const byPhrase = new Map(
    L.PHRASES.map((entry, index) => [String(entry[0]).toLocaleLowerCase(), { entry, index }])
  );

  for (const [phrase, alternatives, quality, family] of additions) {
    const key = phrase.toLocaleLowerCase();
    const found = byPhrase.get(key);
    if (!found) {
      const entry = [phrase, [...alternatives], quality, family];
      L.PHRASES.push(entry);
      byPhrase.set(key, { entry, index: L.PHRASES.length - 1 });
      continue;
    }

    const entry = found.entry;
    const seen = new Set((entry[1] || []).map(value => String(value).toLocaleLowerCase()));
    for (const alternative of alternatives) {
      if (!seen.has(alternative.toLocaleLowerCase())) {
        entry[1].push(alternative);
        seen.add(alternative.toLocaleLowerCase());
      }
    }
    // Never downgrade an existing phrase. If the new curated connective entry is
    // safer, allow it to raise the quality classification.
    entry[2] = Math.max(Number(entry[2]) || 1, quality);
    if (!entry[3] && family) entry[3] = family;
  }
})();
