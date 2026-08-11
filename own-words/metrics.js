(() => {
  const TARGETS = {
    light: { min: 20, ideal: 28, max: 35 },
    balanced: { min: 40, ideal: 50, max: 60 },
    thorough: { min: 65, ideal: 72, max: 82 }
  };
  const HARD_CHAR_CAP = 20000;
  const TOKEN_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s]/gu;
  const WORD_TOKEN_RE = /[\p{L}]+(?:['’][\p{L}]+)*/gu;
  const FUNCTION_WORDS = Object.freeze([
    'a','an','the','and','or','but','if','then','than','that','this','these','those','as','at','by','for','from','in','into','of','on','onto','to','up','with','without','about','after','before','between','through','during','over','under','again','further','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','too','very','can','could','may','might','must','shall','should','will','would','do','does','did','have','has','had','is','are','was','were','be','been','being','it','its','they','them','their','we','us','our','you','your','i','me','my'
  ]);
  const FUNCTION_SET = new Set(FUNCTION_WORDS);
  const PRONOUN_GROUPS = Object.freeze({
    firstSingular: new Set(['i','me','my','mine','myself']),
    firstPlural: new Set(['we','us','our','ours','ourselves']),
    second: new Set(['you','your','yours','yourself','yourselves'])
  });
  const SENTENCE_BINS = Object.freeze([5,10,15,20,30,Infinity]);

  function safeText(text) {
    if (typeof text !== 'string' || text.length > HARD_CHAR_CAP) return false;
    if (window.OwnWordsLimits) return window.OwnWordsLimits.inspect(text).ok;
    return true;
  }

  function tokenize(text) {
    if (!safeText(text || '')) return [];
    return ((text || '').match(TOKEN_RE) || []).map(token => token.toLocaleLowerCase());
  }

  function wordTokens(text) {
    if (!safeText(text || '')) return [];
    return ((text || '').match(WORD_TOKEN_RE) || []).map(token => token.toLocaleLowerCase());
  }

  function ngramCounts(tokens, n) {
    const counts = new Map();
    if (!Number.isInteger(n) || n < 1 || tokens.length < n) return counts;
    for (let i = 0; i <= tokens.length - n; i++) {
      const key = tokens.slice(i, i + n).join('\u241f');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }

  function overlapCount(a, b) {
    let overlap = 0;
    for (const [key, count] of a) overlap += Math.min(count, b.get(key) || 0);
    return overlap;
  }

  function ngramDisruption(originalTokens, revisedTokens, n) {
    const a = ngramCounts(originalTokens, n);
    const b = ngramCounts(revisedTokens, n);
    const total = [...a.values()].reduce((sum, count) => sum + count, 0);
    if (!total) return originalTokens.join('\u241f') === revisedTokens.join('\u241f') ? 0 : 1;
    return 1 - overlapCount(a, b) / total;
  }

  function multisetOverlapRatio(a, b) {
    const ca = new Map(), cb = new Map();
    for (const token of a) ca.set(token, (ca.get(token) || 0) + 1);
    for (const token of b) cb.set(token, (cb.get(token) || 0) + 1);
    const overlap = overlapCount(ca, cb);
    return Math.max(a.length, b.length) ? overlap / Math.max(a.length, b.length) : 1;
  }

  function lcsLengthMyers(a, b, budget = 3000000) {
    const n = a.length, m = b.length;
    if (!n || !m) return { length: 0, exact: true };
    if (n + m > 9000) return { length: null, exact: false };

    let operations = 0;
    let v = new Map([[1, 0]]);
    const max = n + m;
    for (let d = 0; d <= max; d++) {
      const next = new Map();
      for (let k = -d; k <= d; k += 2) {
        if (++operations > budget) return { length: null, exact: false };
        const down = v.has(k + 1) ? v.get(k + 1) : -Infinity;
        const right = v.has(k - 1) ? v.get(k - 1) : -Infinity;
        let x = (k === -d || (k !== d && right < down)) ? down : right + 1;
        if (!Number.isFinite(x)) x = 0;
        let y = x - k;
        while (x < n && y < m && x >= 0 && y >= 0 && a[x] === b[y]) {
          x++; y++;
          if (++operations > budget) return { length: null, exact: false };
        }
        next.set(k, x);
        if (x >= n && y >= m) return { length: (n + m - d) / 2, exact: true };
      }
      v = next;
    }
    return { length: null, exact: false };
  }

  function tokenTurnover(originalTokens, revisedTokens, exact = true) {
    const denom = Math.max(originalTokens.length, revisedTokens.length);
    if (!denom) return { value: 0, method: exact ? 'exact sequence LCS' : 'token-overlap estimate' };
    if (!exact) return { value: 1 - multisetOverlapRatio(originalTokens, revisedTokens), method: 'token-overlap estimate' };
    const result = lcsLengthMyers(originalTokens, revisedTokens);
    if (result.length !== null) {
      return { value: 1 - result.length / denom, method: 'exact sequence LCS' };
    }
    return { value: 1 - multisetOverlapRatio(originalTokens, revisedTokens), method: 'token-overlap fallback' };
  }

  function bandCoverageFromCandidates(text, candidates, bands = 10) {
    if (!text || !candidates || !candidates.length) return null;
    const active = candidates.slice(0, 800).filter(c => !c.reverted);
    if (!active.length) return 0;
    const hit = new Set();
    for (const c of active) {
      if (!Number.isFinite(c.start) || !Number.isFinite(c.end)) continue;
      const startBand = Math.min(bands - 1, Math.max(0, Math.floor((c.start / Math.max(1, text.length)) * bands)));
      const endBand = Math.min(bands - 1, Math.max(0, Math.floor(((Math.max(c.start, c.end - 1)) / Math.max(1, text.length)) * bands)));
      for (let band = startBand; band <= endBand; band++) hit.add(band);
    }
    return hit.size / bands;
  }

  function bandCoverageFromText(originalTokens, revisedTokens, bands = 10) {
    if (!originalTokens.length) return revisedTokens.length ? 1 : 0;
    const actualBands = Math.min(bands, Math.max(1, originalTokens.length));
    let changed = 0;
    for (let band = 0; band < actualBands; band++) {
      const a0 = Math.floor((band / actualBands) * originalTokens.length);
      const a1 = Math.floor(((band + 1) / actualBands) * originalTokens.length);
      const b0 = Math.floor((band / actualBands) * revisedTokens.length);
      const b1 = Math.floor(((band + 1) / actualBands) * revisedTokens.length);
      const a = originalTokens.slice(a0, a1), b = revisedTokens.slice(b0, b1);
      const turnover = 1 - multisetOverlapRatio(a, b);
      const tri = ngramDisruption(a, b, Math.min(3, Math.max(1, a.length)));
      if (turnover > 0.12 || tri > 0.30) changed++;
    }
    return changed / actualBands;
  }

  function normalizedDistribution(values, keys, smoothing = 0.25) {
    const counts = new Map(keys.map(key => [key, smoothing]));
    for (const value of values) if (counts.has(value)) counts.set(value, counts.get(value) + 1);
    const total = [...counts.values()].reduce((sum, value) => sum + value, 0) || 1;
    return keys.map(key => counts.get(key) / total);
  }

  function jsDivergence(a, b) {
    if (!a.length || a.length !== b.length) return 0;
    const midpoint = a.map((value, index) => (value + b[index]) / 2);
    const kl = (p, q) => p.reduce((sum, value, index) => value > 0 && q[index] > 0 ? sum + value * Math.log(value / q[index]) : sum, 0);
    return Math.min(1, Math.max(0, (0.5 * kl(a, midpoint) + 0.5 * kl(b, midpoint)) / Math.LN2));
  }

  function functionWordDivergence(originalWords, revisedWords) {
    const a = normalizedDistribution(originalWords.filter(word => FUNCTION_SET.has(word)), FUNCTION_WORDS);
    const b = normalizedDistribution(revisedWords.filter(word => FUNCTION_SET.has(word)), FUNCTION_WORDS);
    return jsDivergence(a, b);
  }

  function sentenceChunks(text) {
    if (!text) return [];
    const chunks = text.match(/[^.!?\n]+(?:[.!?]+["'”’)]*)?|[^\n]+$/gu) || [];
    return chunks.map(value => value.trim()).filter(Boolean).slice(0, 500);
  }

  function sentenceLengths(text) {
    return sentenceChunks(text).map(sentence => ((sentence.match(WORD_TOKEN_RE) || []).length)).filter(Boolean);
  }

  function binnedDistribution(lengths) {
    const counts = new Array(SENTENCE_BINS.length).fill(0.25);
    for (const length of lengths) {
      const index = SENTENCE_BINS.findIndex(limit => length <= limit);
      counts[index < 0 ? counts.length - 1 : index]++;
    }
    const total = counts.reduce((sum, value) => sum + value, 0) || 1;
    return counts.map(value => value / total);
  }

  function sentenceShapeDivergence(originalLengths, revisedLengths) {
    return jsDivergence(binnedDistribution(originalLengths), binnedDistribution(revisedLengths));
  }

  function markerCount(text, re) {
    const matches = text.match(re);
    return matches ? matches.length : 0;
  }

  function punctuationProfile(text, words) {
    const denom = Math.max(1, words.length) / 1000;
    return {
      dash: markerCount(text, /—/g) / denom,
      colon: markerCount(text, /:/g) / denom,
      semicolon: markerCount(text, /;/g) / denom,
      question: markerCount(text, /\?/g) / denom,
      exclamation: markerCount(text, /!/g) / denom
    };
  }

  function punctuationDivergence(a, b) {
    const scales = { dash: 10, colon: 8, semicolon: 5, question: 6, exclamation: 4 };
    let total = 0;
    for (const key of Object.keys(scales)) total += Math.min(1, Math.abs(a[key] - b[key]) / scales[key]);
    return total / Object.keys(scales).length;
  }

  function pronounDistribution(words) {
    const keys = Object.keys(PRONOUN_GROUPS);
    const counts = new Array(keys.length).fill(0.25);
    for (const word of words) {
      keys.forEach((key, index) => { if (PRONOUN_GROUPS[key].has(word)) counts[index]++; });
    }
    const total = counts.reduce((sum, value) => sum + value, 0) || 1;
    return counts.map(value => value / total);
  }

  function surfaceDivergence(original, revised) {
    if (!safeText(original || '') || !safeText(revised || '')) return null;
    const originalWords = wordTokens(original || '');
    const revisedWords = wordTokens(revised || '');
    const originalLengths = sentenceLengths(original || '');
    const revisedLengths = sentenceLengths(revised || '');
    const originalPunctuation = punctuationProfile(original || '', originalWords);
    const revisedPunctuation = punctuationProfile(revised || '', revisedWords);
    const functionWords = functionWordDivergence(originalWords, revisedWords);
    const sentenceShape = sentenceShapeDivergence(originalLengths, revisedLengths);
    const punctuation = punctuationDivergence(originalPunctuation, revisedPunctuation);
    const pronounRegister = jsDivergence(pronounDistribution(originalWords), pronounDistribution(revisedWords));
    const shortOriginal = originalLengths.length ? originalLengths.filter(length => length <= 5).length / originalLengths.length : 0;
    const shortRevised = revisedLengths.length ? revisedLengths.filter(length => length <= 5).length / revisedLengths.length : 0;
    const divergence = 0.35 * functionWords + 0.30 * sentenceShape + 0.20 * punctuation + 0.15 * pronounRegister;

    return {
      divergence: Math.round(divergence * 100),
      functionWords: Math.round(functionWords * 100),
      sentenceShape: Math.round(sentenceShape * 100),
      punctuation: Math.round(punctuation * 100),
      pronounRegister: Math.round(pronounRegister * 100),
      shortSentenceOriginal: Math.round(shortOriginal * 100),
      shortSentenceRevised: Math.round(shortRevised * 100),
      emDashOriginal: Math.round(originalPunctuation.dash * 10) / 10,
      emDashRevised: Math.round(revisedPunctuation.dash * 10) / 10,
      colonOriginal: Math.round(originalPunctuation.colon * 10) / 10,
      colonRevised: Math.round(revisedPunctuation.colon * 10) / 10,
      sentenceCountOriginal: originalLengths.length,
      sentenceCountRevised: revisedLengths.length,
      formula: '35% function-word distribution + 30% sentence-length shape + 20% punctuation profile + 15% pronoun/register'
    };
  }

  function labelForDepth(depth) {
    if (depth < 15) return 'Minimal';
    if (depth < 35) return 'Light';
    if (depth < 60) return 'Moderate';
    if (depth < 80) return 'Substantial';
    return 'Extensive';
  }

  function targetStatus(depth, level) {
    const target = TARGETS[level] || TARGETS.balanced;
    if (depth < target.min) return 'below target';
    if (depth > target.max) return 'above target';
    return 'in target';
  }

  function limitedResult(level, reason = 'input limit') {
    const target = TARGETS[level] || TARGETS.balanced;
    return {
      limited: true,
      reason,
      depth: 0,
      label: 'Unavailable',
      target,
      targetStatus: 'not calculated',
      originalTokens: 0,
      revisedTokens: 0,
      tokenTurnover: 0,
      turnoverMethod: 'not calculated',
      trigramDisruption: 0,
      fivegramDisruption: 0,
      coverage: 0,
      coverageBands: 0,
      structuralEdits: 0,
      surface: null,
      formula: '30% token turnover + 25% 3-token disruption + 30% 5-token disruption + 15% change coverage'
    };
  }

  function scoreCore(original, revised, options = {}, exactTurnover = true, includeSurface = true) {
    const level = options.level || 'balanced';
    if (!safeText(original || '') || !safeText(revised || '')) return limitedResult(level);

    const originalTokens = tokenize(original || '');
    const revisedTokens = tokenize(revised || '');
    const turnover = tokenTurnover(originalTokens, revisedTokens, exactTurnover);
    const d3 = ngramDisruption(originalTokens, revisedTokens, 3);
    const d5 = ngramDisruption(originalTokens, revisedTokens, 5);
    const candidateCoverage = bandCoverageFromCandidates(original || '', options.candidates);
    const coverage = candidateCoverage === null
      ? bandCoverageFromText(originalTokens, revisedTokens)
      : candidateCoverage;

    const depth = Math.round(100 * (
      0.30 * turnover.value +
      0.25 * d3 +
      0.30 * d5 +
      0.15 * coverage
    ));

    const active = (options.candidates || []).slice(0, 800).filter(c => !c.reverted);
    const structuralEdits = active.filter(c => c.type === 'structure').length;
    const target = TARGETS[level] || TARGETS.balanced;

    return {
      limited: false,
      depth: Math.max(0, Math.min(100, depth)),
      label: labelForDepth(depth),
      target,
      targetStatus: targetStatus(depth, level),
      originalTokens: originalTokens.length,
      revisedTokens: revisedTokens.length,
      tokenTurnover: Math.round(turnover.value * 100),
      turnoverMethod: turnover.method,
      trigramDisruption: Math.round(d3 * 100),
      fivegramDisruption: Math.round(d5 * 100),
      coverage: Math.round(coverage * 100),
      coverageBands: Math.round(coverage * 10),
      structuralEdits,
      surface: includeSurface ? surfaceDivergence(original || '', revised || '') : null,
      formula: '30% token turnover + 25% 3-token disruption + 30% 5-token disruption + 15% change coverage'
    };
  }

  function scoreRewrite(original, revised, options = {}) {
    return scoreCore(original, revised, options, true, true);
  }

  function scoreRewriteSelection(original, revised, options = {}) {
    return scoreCore(original, revised, options, true, false);
  }

  function scoreRewriteFast(original, revised, options = {}) {
    return scoreCore(original, revised, options, false, false);
  }

  window.OwnWordsMetrics = { TARGETS, tokenize, scoreRewrite, scoreRewriteSelection, scoreRewriteFast, surfaceDivergence };
})();
