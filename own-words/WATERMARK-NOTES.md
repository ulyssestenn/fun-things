# Watermark-informed rewrite notes

Own Words is not a watermark detector and does not have access to production watermark keys or model tokenizers. These notes record what the open SynthID-Text design implies for a model-neutral rewriting tool.

## What SynthID-Text actually marks

SynthID-Text does not insert hidden characters or metadata. During generation, it changes token sampling so selected tokens correlate with keyed pseudorandom `g` values derived from recent token context. During detection, the same key and tokenizer are used to reconstruct those values from the finished text and test whether the observed sequence correlates with the watermark more strongly than chance.

The Nature paper uses a sliding context window of four preceding tokens (`H = 4`), so a scored decision is associated with a five-token sequence: four context tokens plus the current token. The Google DeepMind reference implementation exposes `ngram_len`, `keys`, a sampling-table configuration, and repeated-context masking; its static example configuration uses `ngram_len = 5`. It includes mean, weighted-mean, and Bayesian detector implementations.

Primary references:

- Nature: https://www.nature.com/articles/s41586-024-08025-4
- Google DeepMind reference implementation: https://github.com/google-deepmind/synthid-text
- Hugging Face `SynthIDTextWatermarkLogitsProcessor`: https://huggingface.co/docs/transformers/internal/generation_utils

## Product implication

A rewrite should not be optimized around a supposed list of "watermarked words." A token is not intrinsically marked; its contribution depends on its context and the secret watermark configuration.

The useful model-neutral proxy is **context disruption**:

- lexical edits alter the local token sequence
- phrase and structural edits can alter more consecutive contexts
- two nearby edits often disturb many of the same source windows, so their marginal sequence disruption overlaps
- edits spread through the passage generally disturb more distinct source windows than the same number of edits clustered together

For a length-preserving one-token substitution and a five-token window, one changed source token can participate in as many as five overlapping source windows. This does **not** mean it removes five watermark bits; the real detector recomputes keyed values on the revised tokenization. It only motivates tracking how much of the original local token sequence remains intact.

## Selector rule

The rewrite selector therefore tracks the original proxy-token five-grams intersected by each candidate span. Candidate ranking still prioritizes semantic confidence, structural value, document dispersion, and rhetorical-family diversity, but now also rewards **marginal five-token window coverage** and mildly penalizes redundant overlap with windows already touched by selected edits.

This is deliberately a selection heuristic, not a new detector or a new public confidence claim. The existing Rewrite Depth score remains model-neutral and continues to report token turnover, 3-token disruption, 5-token disruption, and broad change coverage.

## Claims Own Words should not make

Do not claim that:

- a particular word is watermarked or clean
- a given Rewrite Depth guarantees watermark removal
- a negative result would establish human authorship
- the public reference keys are Gemini production keys
- proxy-token five-gram disruption equals SynthID detector confidence

A production detector needs the corresponding secure configuration and tokenizer. Google describes the open repository as a reference/research implementation rather than its production detector configuration.

## Reference benchmark results

The research harness in `research/` runs the public 30-key SynthID configuration through Hugging Face's `SynthIDTextWatermarkLogitsProcessor`, generates paired watermarked and unwatermarked continuations from `HuggingFaceTB/SmolLM2-135M-Instruct`, applies Own Words, and then recomputes the reference detector score with the same tokenizer and key configuration. Semantic preservation is checked separately with `sentence-transformers/all-MiniLM-L6-v2`.

In the expanded 16-prompt benchmark:

- watermarked originals averaged **0.6139** on the weighted-mean detector
- matched unwatermarked originals averaged **0.5026**
- pairwise AUROC for the original texts was **1.000**, confirming that the reference detector had a strong signal in this sample
- Light averaged **4.8%** five-token disruption and reduced the detector score by **0.0060**
- Balanced averaged **16.9%** five-token disruption and reduced the detector score by **0.0188**
- Thorough averaged **34.9%** five-token disruption and reduced the detector score by **0.0403**
- Thorough retained **0.979** mean semantic cosine
- none of the watermarked rewrites fell to or below the highest unwatermarked-original score in this pilot
- the raw correlation between five-token disruption and detector-score reduction was **0.924**

The raw correlation is confounded by edit count: more edits both disrupt more n-grams and lower the reference score. The benchmark therefore includes a stricter fixed-edit placement control.

### Fixed-edit placement control

For each of 16 watermarked passages, the control selects exactly four eligible edits and compares a tightly clustered set with a widely distributed set. It also evaluates 20 deterministic random four-edit subsets per passage, for 320 random variants total.

Results:

- clustered four-edit sets averaged **10.2%** five-token disruption and **0.0114** detector-score reduction
- spread four-edit sets averaged **13.1%** five-token disruption and **0.0136** detector-score reduction
- spread placement produced the larger detector reduction in **69%** of paired passages
- semantic cosine was effectively unchanged: **0.994 clustered vs. 0.995 spread**
- across the 320 random fixed-size subsets, the within-source correlation between five-token disruption and detector reduction was **0.222**
- after controlling token turnover, that correlation was **0.233**
- a source-fixed-effects regression estimated **0.00063 ± 0.00015** detector-score reduction per additional percentage point of five-token disruption, controlling token turnover

This supports context-aware dispersion as a real but modest optimization. It does **not** justify treating five-token disruption as a detector surrogate.

## Current bottleneck and next engineering target

The context-aware selector and the older selector produced identical full-pass rewrites in the benchmark. This is not evidence that ranking is useless. Every benchmark passage exhausted its eligible candidate set before reaching the requested Rewrite Depth target, so both selectors eventually chose the same edits regardless of ranking order.

Candidate availability is therefore the immediate bottleneck. In the 16 watermarked passages, average available/selected edits were approximately:

- Light: **1.4**
- Balanced: **5.4**
- Thorough: **12.8**

All 16 passages in every mode ended with `reason: exhausted`, `selected == available`, and `reachedTarget: false`.

The next engineering work should expand **safe phrase-level and structural rewrite coverage** rather than simply increasing the context bonus or lowering semantic-confidence thresholds indiscriminately. Context-aware ranking should remain in place so that, once the candidate pool is rich enough for selection to matter, equally safe edits are preferentially distributed across independent source contexts.

Full benchmark reports, CSV rows, plots, generated examples, and placement-control results are emitted as GitHub Actions artifacts by `.github/workflows/own-words-synthid-benchmark.yml`.
