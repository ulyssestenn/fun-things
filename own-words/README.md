# Own Words

Local-first rewriting workspace. The browser proposes reversible lexical, phrase-level, and structural edits; no text is sent to a server.

## Rewrite depth

Own Words computes a model-neutral **Rewrite depth** score entirely in the browser. Technical users can expand the calculations to inspect:

- proxy-token counts for the original and working copy
- token turnover (sequence LCS when practical)
- 3-token and 5-token sequence disruption
- change coverage across ten text bands
- active structure-level edits

The composite score remains:

`30% token turnover + 25% 3-token disruption + 30% 5-token disruption + 15% change coverage`

The tokenizer is deliberately transparent and model-neutral: words, numbers, contractions, and punctuation. These are **proxy tokens**, not any model's private tokenizer. Rewrite depth is a descriptive measure of re-expression, not a watermark detector and not proof that any provenance signal has been removed.

The Light, Balanced, and Thorough modes use target rewrite-depth bands of approximately 20–35, 40–60, and 65–82 respectively. If the requested target cannot be reached from the available conservative edits, the UI reports **maximum available** instead of implying that the selected mode reached its target.

Thorough mode also loads a separate lower-confidence lexical layer from `words-thorough.js`. These q1 alternatives cover common analytical verbs, adjectives, adverbs, and nouns so long passages have enough candidate density for a visibly deeper pass. Light and Balanced ignore this layer because their quality thresholds remain q3 and q2. Existing higher-confidence word entries are never downgraded or overwritten.

### Thorough selection

Light and Balanced still evaluate candidate additions one at a time. Thorough uses a bounded two-stage selector so it can consider a much larger q1 lexical pool without repeatedly running the expensive exact token-sequence calculation hundreds of times:

1. candidates are greedily ranked by structural value, confidence, document dispersion, and rhetorical-family diversity
2. every 20 selections the browser runs a cheaper token-overlap/n-gram estimate
3. exact Rewrite depth is measured at the end (and before target metadata is reported)

The candidate pool, individual-rule matches, selected edits, and text size all remain hard-capped.

## Surface profile

The technical panel also reports **Surface divergence** as an experimental diagnostic. It is deliberately **not included in Rewrite depth yet**. The current diagnostic combines:

`35% function-word distribution + 30% sentence-length shape + 20% punctuation profile + 15% pronoun/register`

Function-word and pronoun distributions use Jensen–Shannon divergence. Sentence shape compares coarse sentence-length bins. The punctuation profile compares em-dash, colon, semicolon, question-mark, and exclamation-mark rates. The panel also exposes the original → revised rates for very short sentences, em dashes, and colons.

These measurements are useful for studying whether a revision changes low-level writing texture, but they are not authorship evidence and are not detector scores. They remain outside the master Rewrite-depth formula until benchmark results justify a weighting.

## Rhetorical grammar

The observed prose corpus is organized into a small model-neutral rhetorical grammar. `grammar.js` currently defines 21 discourse families, including correction/reversal, priority/ranking, constraints, causal explanation, mechanism/evidence, counterargument, qualification, contrast/tradeoff, case splits, practical implications, summaries, deciding questions, failure modes, overlooked points, personal observations, old-to-new shifts, definition/reframing, distinctions, enumeration, uncertainty, and discourse transitions.

Candidates can carry an explicit family tag, and older corpus rules are conservatively classified from their matched wording. Word-level substitutions are left unclassified. The rewrite selector rewards both document dispersion and rhetorical-family diversity. Technical calculations report which classified families are represented in the current automated suggestions.

The family system is about writing structure, not authorship attribution. It does not identify a model and is not a detector.

## Benchmark harness

`benchmark.html` is a noindex development harness. It runs Light, Balanced, and Thorough against a small set of known-corpus excerpts plus deliberately unseen analytical prose, then records edit count, structural edits, rhetorical families, Rewrite depth, target status, Surface divergence, selection stop reason, and elapsed browser time.

The harness is for regression/generalization testing. It is not an authorship-attribution benchmark.
