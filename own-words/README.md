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

Thorough mode also loads a separate lower-confidence lexical layer from `words-thorough.js`. These q1 alternatives cover common analytical verbs, adjectives, adverbs, and nouns so long passages have enough candidate density for a visibly deeper pass. Light and Balanced ignore this layer because their quality thresholds remain q3 and q2. Existing higher-confidence word entries are never downgraded or overwritten.

## Rhetorical grammar

The observed prose corpus is also organized into a small model-neutral rhetorical grammar. `grammar.js` currently defines 21 discourse families, including correction/reversal, priority/ranking, constraints, causal explanation, mechanism/evidence, counterargument, qualification, contrast/tradeoff, case splits, practical implications, summaries, deciding questions, failure modes, overlooked points, personal observations, old-to-new shifts, definition/reframing, distinctions, enumeration, uncertainty, and discourse transitions.

Candidates can carry an explicit family tag, and older corpus rules are conservatively classified from their matched wording. Word-level substitutions are left unclassified. The rewrite selector rewards both document dispersion and rhetorical-family diversity, so a passage is less likely to receive several near-duplicate edits that all perform the same discourse move when equally strong alternatives from other families are available.

The family system is about writing structure, not authorship attribution. It does not identify a model and is not a detector.
