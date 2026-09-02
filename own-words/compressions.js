(() => {
  const L = window.OwnWordsLexicon = window.OwnWordsLexicon || {};
  if (!Array.isArray(L.PHRASES)) return;

  // Conservative semantic compressions: represent the same relation with fewer
  // or substantially different surface tokens. These are valuable for local
  // sequence disruption because one human-meaningful edit can replace several
  // low-information framing tokens.
  const additions = [
    ['in the absence of', ['without'], 3, 'qualification'],
    ['in place of', ['instead of'], 3, 'contrast'],
    ['with the exception of', ['except for'], 3, 'qualification'],
    ['during the course of', ['during'], 3, 'temporal_shift'],
    ['over the course of', ['throughout'], 2, 'temporal_shift'],
    ['at the present time', ['now'], 3, 'temporal_shift'],
    ['at the current time', ['now'], 3, 'temporal_shift'],
    ['at this time', ['now'], 2, 'temporal_shift'],
    ['in the near future', ['soon'], 2, 'temporal_shift'],
    ['in the recent past', ['recently'], 2, 'temporal_shift'],
    ['a period of time', ['a period'], 3, 'compression'],
    ['a short period of time', ['a short period'], 3, 'compression'],
    ['a long period of time', ['a long period'], 3, 'compression'],
    ['a small number of', ['few'], 3, 'quantity'],
    ['a large amount of', ['much'], 3, 'quantity'],
    ['a small amount of', ['little'], 3, 'quantity'],
    ['a greater number of', ['more'], 3, 'quantity'],
    ['a smaller number of', ['fewer'], 3, 'quantity'],
    ['the majority of', ['most'], 3, 'quantity'],
    ['a majority of', ['most'], 3, 'quantity'],
    ['in excess of', ['more than'], 3, 'quantity'],
    ['in comparison with', ['compared with'], 3, 'comparison'],
    ['in comparison to', ['compared with'], 3, 'comparison'],
    ['on the basis of', ['based on'], 2, 'causation'],
    ['by means of', ['using', 'through'], 2, 'method'],
    ['through the use of', ['by using'], 3, 'method'],
    ['with the use of', ['using'], 3, 'method'],
    ['makes use of', ['uses'], 3, 'method'],
    ['make use of', ['use'], 3, 'method'],
    ['made use of', ['used'], 3, 'method'],
    ['making use of', ['using'], 3, 'method'],
    ['makes reference to', ['refers to'], 3, 'reference'],
    ['make reference to', ['refer to'], 3, 'reference'],
    ['made reference to', ['referred to'], 3, 'reference'],
    ['making reference to', ['referring to'], 3, 'reference'],
    ['with reference to', ['regarding'], 3, 'reference'],
    ['in reference to', ['regarding'], 2, 'reference'],
    ['is capable of', ['can'], 3, 'capability'],
    ['are capable of', ['can'], 3, 'capability'],
    ['was capable of', ['could'], 2, 'capability'],
    ['were capable of', ['could'], 2, 'capability'],
    ['is required to', ['must'], 3, 'requirement'],
    ['are required to', ['must'], 3, 'requirement'],
    ['was required to', ['had to'], 3, 'requirement'],
    ['were required to', ['had to'], 3, 'requirement'],
    ['has a need for', ['needs'], 3, 'requirement'],
    ['have a need for', ['need'], 3, 'requirement'],
    ['had a need for', ['needed'], 3, 'requirement'],
    ['in conjunction with', ['together with'], 2, 'addition'],
    ['for the reason that', ['because'], 3, 'causation'],
    ['as a consequence of', ['because of'], 3, 'causation'],
    ['as a consequence', ['therefore'], 3, 'causation'],
    ['owing to the fact that', ['because'], 3, 'causation'],
    ['given the fact that', ['given that'], 3, 'qualification'],
    ['considering the fact that', ['given that'], 2, 'qualification'],
    ['is indicative of', ['indicates'], 3, 'evidence'],
    ['are indicative of', ['indicate'], 3, 'evidence'],
    ['was indicative of', ['indicated'], 3, 'evidence'],
    ['were indicative of', ['indicated'], 3, 'evidence'],
    ['is suggestive of', ['suggests'], 2, 'evidence'],
    ['are suggestive of', ['suggest'], 2, 'evidence'],
    ['is representative of', ['represents'], 2, 'definition'],
    ['are representative of', ['represent'], 2, 'definition'],
    ['serves as an example of', ['exemplifies'], 3, 'example'],
    ['serve as examples of', ['exemplify'], 3, 'example'],
    ['gives an indication of', ['indicates'], 3, 'evidence'],
    ['give an indication of', ['indicate'], 3, 'evidence'],
    ['gave an indication of', ['indicated'], 3, 'evidence'],
    ['takes into consideration', ['considers'], 3, 'method'],
    ['take into consideration', ['consider'], 3, 'method'],
    ['took into consideration', ['considered'], 3, 'method'],
    ['taking into consideration', ['considering'], 3, 'method']
  ];

  const byPhrase = new Map(
    L.PHRASES.map(entry => [String(entry[0]).toLocaleLowerCase(), entry])
  );

  for (const [phrase, alternatives, quality, family] of additions) {
    const key = phrase.toLocaleLowerCase();
    const existing = byPhrase.get(key);
    if (!existing) {
      const entry = [phrase, [...alternatives], quality, family];
      L.PHRASES.push(entry);
      byPhrase.set(key, entry);
      continue;
    }

    const seen = new Set((existing[1] || []).map(value => String(value).toLocaleLowerCase()));
    for (const alternative of alternatives) {
      if (!seen.has(alternative.toLocaleLowerCase())) {
        existing[1].push(alternative);
        seen.add(alternative.toLocaleLowerCase());
      }
    }
    existing[2] = Math.max(Number(existing[2]) || 1, quality);
    if (!existing[3] && family) existing[3] = family;
  }
})();
