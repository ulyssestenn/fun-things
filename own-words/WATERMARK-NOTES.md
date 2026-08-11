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

## Benchmark direction

The strongest empirical test for Own Words is against the **open reference watermark**, where the configuration is known. A future benchmark can:

1. generate paired watermarked and unwatermarked passages with the reference implementation
2. record the reference detector score before rewriting
3. run the same passages through Light, Balanced, and Thorough
4. record detector score after accepted edits along with Rewrite Depth, token turnover, 5-token disruption, and context-window coverage
5. compare random/local lexical selection against context-aware selection

That benchmark would tell us whether the model-neutral proxy correlates with lower reference-watermark evidence without pretending to measure Google's private production detector.
