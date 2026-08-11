(() => {
  const TOKEN_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s]/gu;
  const WORD_RE = /^[\p{L}]+(?:['’][\p{L}]+)*$/u;
  const N = 5;
  const FUNCTION_WORDS = new Set([
    'a','an','the','and','or','but','if','then','than','that','this','these','those',
    'as','at','by','for','from','in','into','of','on','onto','to','up','with','without',
    'about','after','before','between','through','during','over','under','again','further',
    'here','there','when','where','why','how','all','any','both','each','few','more','most',
    'other','some','such','no','nor','not','only','own','same','so','too','very','can','could',
    'may','might','must','shall','should','will','would','do','does','did','have','has','had',
    'is','are','was','were','be','been','being','it','its','they','them','their','we','us','our',
    'you','your','i','me','my','he','him','his','she','her','who','whom','whose','which','what'
  ]);

  function tokenize(text) {
    const tokens = [];
    let match;
    TOKEN_RE.lastIndex = 0;
    while ((match = TOKEN_RE.exec(text || ''))) {
      tokens.push({
        index: tokens.length,
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        value: match[0].toLocaleLowerCase(),
      });
      if (tokens.length > 9000) break;
    }
    TOKEN_RE.lastIndex = 0;
    return tokens;
  }

  function windowStartsForToken(tokenIndex, tokenCount) {
    const total = Math.max(0, tokenCount - N + 1);
    const starts = [];
    const from = Math.max(0, tokenIndex - N + 1);
    const to = Math.min(tokenIndex, total - 1);
    for (let start = from; start <= to; start++) starts.push(start);
    return starts;
  }

  function overlapsCandidate(token, candidates) {
    for (const candidate of candidates || []) {
      if (candidate.reverted) continue;
      if (token.start < candidate.end && candidate.start < token.end) return true;
    }
    return false;
  }

  function eligibleToken(token, candidates) {
    if (!WORD_RE.test(token.text)) return false;
    if (token.text.length < 2) return false;
    if (FUNCTION_WORDS.has(token.value)) return false;
    if (overlapsCandidate(token, candidates)) return false;
    return true;
  }

  function contextSpan(tokens, index, radius = 2) {
    let first = Math.max(0, index - radius);
    let last = Math.min(tokens.length - 1, index + radius);
    while (first < index && !WORD_RE.test(tokens[first].text)) first++;
    while (last > index && !WORD_RE.test(tokens[last].text)) last--;
    return {
      start: tokens[first].start,
      end: tokens[last].end,
    };
  }

  function selectTargets(text, candidates, options = {}) {
    const goal = Math.max(0, Math.min(1, Number(options.goal ?? 0.75)));
    const maxTargets = Math.max(0, Math.min(100, Number(options.maxTargets ?? 20)));
    const tokens = tokenize(text);
    const totalWindows = Math.max(0, tokens.length - N + 1);
    if (!totalWindows) {
      return {
        totalWindows,
        initiallyCovered: 0,
        startingCoverage: 0,
        goal,
        projectedCoverage: 0,
        reachedGoal: goal === 0,
        targets: [],
      };
    }

    const covered = new Set();
    for (const candidate of candidates || []) {
      if (candidate.reverted || !Array.isArray(candidate.contextWindows)) continue;
      for (const start of candidate.contextWindows) {
        if (Number.isInteger(start) && start >= 0 && start < totalWindows) covered.add(start);
      }
    }
    const initiallyCovered = covered.size;

    const remaining = tokens
      .filter(token => eligibleToken(token, candidates))
      .map(token => ({
        token,
        windows: windowStartsForToken(token.index, tokens.length),
      }));

    const targets = [];
    while (remaining.length && targets.length < maxTargets && covered.size / totalWindows < goal) {
      let bestIndex = -1;
      let bestFresh = -1;
      let bestDistance = -1;

      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        let fresh = 0;
        for (const start of item.windows) if (!covered.has(start)) fresh++;
        if (!fresh) continue;

        let nearest = Infinity;
        if (targets.length) {
          for (const selected of targets) {
            nearest = Math.min(nearest, Math.abs(item.token.index - selected.tokenIndex));
          }
        } else {
          nearest = tokens.length;
        }

        if (
          fresh > bestFresh ||
          (fresh === bestFresh && nearest > bestDistance) ||
          (fresh === bestFresh && nearest === bestDistance && item.token.index < remaining[bestIndex]?.token.index)
        ) {
          bestIndex = i;
          bestFresh = fresh;
          bestDistance = nearest;
        }
      }

      if (bestIndex < 0) break;
      const item = remaining.splice(bestIndex, 1)[0];
      const freshWindows = item.windows.filter(start => !covered.has(start));
      for (const start of freshWindows) covered.add(start);

      const context = contextSpan(tokens, item.token.index, 2);
      targets.push({
        tokenIndex: item.token.index,
        start: item.token.start,
        end: item.token.end,
        text: item.token.text,
        contextStart: context.start,
        contextEnd: context.end,
        contextText: text.slice(context.start, context.end),
        freshWindows,
        freshWindowCount: freshWindows.length,
        projectedCoverage: covered.size / totalWindows,
      });

      // A target chosen nearby later is rarely useful and can make the guidance
      // feel fussy. Marginal window coverage already discourages clustering; this
      // additional guard removes immediate neighbors without forcing a fixed grid.
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (Math.abs(remaining[i].token.index - item.token.index) < N) remaining.splice(i, 1);
      }
    }

    return {
      totalWindows,
      initiallyCovered,
      startingCoverage: initiallyCovered / totalWindows,
      goal,
      projectedCovered: covered.size,
      projectedCoverage: covered.size / totalWindows,
      reachedGoal: covered.size / totalWindows >= goal,
      targets,
    };
  }

  window.OwnWordsCoverageCoach = Object.freeze({
    selectTargets,
    tokenize,
  });
})();
