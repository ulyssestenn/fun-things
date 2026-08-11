# Own Words

Local-first rewriting workspace. The browser proposes reversible lexical, phrase-level, and structural edits; no text is sent to a server.

## Rewrite depth

Own Words also computes a model-neutral **Rewrite depth** score entirely in the browser. Technical users can expand the calculations to inspect:

- proxy-token counts for the original and working copy
- token turnover (sequence LCS when practical)
- 3-token and 5-token sequence disruption
- change coverage across ten text bands
- active structure-level edits

The composite score is currently:

`30% token turnover + 25% 3-token disruption + 30% 5-token disruption + 15% change coverage`

The tokenizer is deliberately transparent and model-neutral: words, numbers, contractions, and punctuation. These are **proxy tokens**, not Claude's private tokenizer. Rewrite depth is a descriptive measure of re-expression, not a watermark detector and not proof that any provenance signal has been removed.

The Light, Balanced, and Thorough modes use target rewrite-depth bands of approximately 20–35, 40–60, and 65–82 respectively. The engine stops adding available suggestions when it reaches the target neighborhood or exhausts appropriate candidates.
