(() => {
  const LIMITS = Object.freeze({
    maxWords: 2500,
    warnWords: 2000,
    maxChars: 20000,
    warnChars: 16000
  });

  const WORD_RE = /\b[\p{L}\p{N}'’_-]+\b/gu;

  function countWordsCapped(text, stopAfter = LIMITS.maxWords + 1) {
    if (typeof text !== 'string' || !text) return 0;
    if (text.length > LIMITS.maxChars) return stopAfter;
    let count = 0;
    WORD_RE.lastIndex = 0;
    while (WORD_RE.exec(text)) {
      count++;
      if (count >= stopAfter) break;
    }
    WORD_RE.lastIndex = 0;
    return count;
  }

  function inspect(text) {
    const value = typeof text === 'string' ? text : String(text ?? '');
    const chars = value.length;
    if (chars > LIMITS.maxChars) {
      return { ok: false, reason: 'chars', chars, words: null, warn: false };
    }
    const words = countWordsCapped(value);
    if (words > LIMITS.maxWords) {
      return { ok: false, reason: 'words', chars, words, warn: false };
    }
    return {
      ok: true,
      reason: null,
      chars,
      words,
      warn: words >= LIMITS.warnWords || chars >= LIMITS.warnChars
    };
  }

  function message(status) {
    if (!status || status.ok) return '';
    if (status.reason === 'chars') {
      return `Passage is over the ${LIMITS.maxChars.toLocaleString()}-character safety limit. Split it into sections.`;
    }
    return `Passage is over the ${LIMITS.maxWords.toLocaleString()}-word limit. Split it into sections.`;
  }

  function prospectiveValue(element, inserted) {
    const value = element.value || '';
    const start = Number.isInteger(element.selectionStart) ? element.selectionStart : value.length;
    const end = Number.isInteger(element.selectionEnd) ? element.selectionEnd : start;
    return value.slice(0, start) + inserted + value.slice(end);
  }

  window.OwnWordsLimits = { LIMITS, inspect, countWordsCapped, message, prospectiveValue };
})();
