# Watermark-informed rewrite notes

Own Words is not a watermark detector and does not have access to production watermark keys or model tokenizers. These notes record what the open SynthID-Text design implies for a model-neutral rewriting tool.

## What SynthID-Text actually marks

SynthID-Text does not insert hidden characters or metadata. During generation, it changes token sampling so selected tokens correlate with keyed pseudorandom `g` values derived from recent token context. During detection, the same key and tokenizer reconstruct those values from the finished text and test whether the observed sequence correlates with the watermark more strongly than chance.

The Nature paper uses a sliding context window of four preceding tokens (`H = 4`), so a scored decision is associated with a five-token sequence: four context tokens plus the current token. The public Google DeepMind reference configuration uses `ngram_len = 5` and 30 static reference keys. It includes mean, weighted-mean, and Bayesian detector implementations.

Primary references:

- Nature: https://www.nature.com/articles/s41586-024-08025-4
- Google DeepMind reference implementation: https://github.com/google-deepmind/synthid-text
- Hugging Face `SynthIDTextWatermarkLogitsProcessor`: https://huggingface.co/docs/transformers/internal/generation_utils

## Product implication

A rewrite should not be optimized around a supposed list of "watermarked words." A token is not intrinsically marked; its contribution depends on its context and the secret watermark configuration.

The useful model-neutral proxy is **local sequence disruption**:

- a length-preserving one-token substitution can affect as many as five source five-grams away from passage edges
- `k` well-spaced one-token edits can ideally touch about `5k` source windows, while `k` contiguous changes touch only about `k + 4`
- a contiguous `s`-token replacement can intersect roughly `s + 4` source five-grams
- edits near each other waste marginal coverage because their affected windows overlap
- pure block movement is less valuable than its visible size suggests because five-grams wholly inside the moved block remain intact
- semantic compression and connective recasting are attractive because several surface tokens can change for one semantic decision

This does **not** mean one edit "removes five watermark bits." The real detector recomputes keyed values on the revised model-token sequence. It motivates measuring how much of the original local sequence remains intact.

## A simple dilution model

For the public weighted-mean detector, unwatermarked text is centered near `0.5`. Let:

- `S` be the original watermarked detector score
- `f` be the fraction of watermark-bearing local contexts that become approximately decorrelated after rewriting
- `S'` be the revised detector score

A useful first-order model is:

```text
S' ≈ 0.5 + (1 - f)(S - 0.5)
ΔS ≈ f(S - 0.5)
```

The 16-prompt reference benchmark had `S = 0.6139`. The original Thorough rewrite produced about `34.9%` proxy five-token disruption. The equation predicts a detector-score reduction of about `0.0398`; the observed reduction was `0.0403`. Subsequent Light, Balanced, and Thorough runs have remained similarly close to this first-order prediction.

The agreement is descriptive, not a proof. Real detection includes tokenizer differences, repeated-context masking, weighted layers, and dependence between neighboring observations. But it strongly supports **unique local-context invalidation** as the primary model-neutral optimization target.

## Current selector

The engine now scores the **actual replacement text**, not merely the character span occupied by a candidate. For each vetted alternative it estimates which original proxy five-grams disappear, orders equally vetted alternatives by local sequence disruption, and greedily chooses candidates by marginal new context coverage while respecting quality and source-span overlap.

Overlapping candidates are retained until selection time instead of automatically favoring the longest span. A structural edit receives no large bonus merely for being structural; it must actually destroy local source sequence to earn context value.

This is approximately a constrained maximum-coverage problem:

```text
maximize |union of destroyed source windows|
subject to semantic quality and incompatible-overlap constraints
```

With per-window weights it becomes weighted maximum coverage. Marginal-gain greedy selection is therefore a natural approximation.

## Reference benchmark

The reproducible research harness uses:

- `HuggingFaceTB/SmolLM2-135M-Instruct`
- 16 paired prompts, roughly 140–160 generated tokens each
- Hugging Face's SynthID implementation with the published 30-key reference configuration
- a matched unwatermarked generation for every prompt
- `sentence-transformers/all-MiniLM-L6-v2` as an independent broad semantic-preservation check

Detector sanity check:

- watermarked originals: **0.6139** mean weighted score
- unwatermarked originals: **0.5026**
- pairwise AUROC: **1.000**
- highest unwatermarked-original score in this pilot: **0.5125**

The latest full model-free rewrite benchmark, including conservative syntax, connective, and compression layers, produced:

| mode | mean edits | five-token disruption | detector-score reduction | semantic cosine |
|---|---:|---:|---:|---:|
| Light | 1.8 | 6.0% | 0.0078 | 0.999 |
| Balanced | 5.8 | 18.2% | 0.0215 | 0.991 |
| Thorough | 13.1 | 35.6% | 0.0422 | 0.980 |

No watermarked rewrite fell into the unwatermarked-original score range. Candidate availability remains the dominant limitation.

## Fixed-edit placement control

The benchmark holds the edit budget at exactly four and compares clustered with widely distributed choices. In the latest run:

- clustered: **10.2%** five-token disruption and **0.0118** detector reduction
- spread: **13.4%** disruption and **0.0153** reduction
- spread produced the larger detector reduction in **81%** of passages
- spread produced greater five-token disruption in **94%**
- semantic cosine: **0.994 clustered vs. 0.996 spread**
- across 320 random four-edit subsets, the within-source disruption/reduction correlation was **0.323**
- after additionally controlling token turnover it was **0.295**
- source-fixed-effects OLS estimated **0.00089 ± 0.00017** detector reduction per additional percentage point of proxy five-token disruption, controlling turnover

This is much stronger evidence for dispersion than the raw full-pass correlation because edit count and source passage are held fixed.

## Transformation efficiency

Single-edit experiments on naturally occurring candidates show that rewrite type matters:

| class | n | mean detector reduction | positive | five-token disruption | semantic cosine |
|---|---:|---:|---:|---:|---:|
| connective recast | 5 | **0.0073** | 100% | 4.00% | 0.999 |
| sentence merge | 2 | **0.0065** | 100% | 6.00% | 0.998 |
| phrase | 19 | **0.0041** | 100% | 3.74% | 0.998 |
| lexical | 183 | **0.0040** | 95% | 3.09% | 0.999 |

The sample sizes for structural classes are small, but the ranking supports spending engineering effort on low-semantic-load connective and syntax recasts before indiscriminately adding ordinary synonyms.

The connective and semantic-compression inventories improved the full-pass score slightly but did **not** materially solve density: Thorough remains around 13 edits per 150–160-token passage. Static exact-match rules are beginning to show a natural coverage ceiling on diverse subject matter.

## Entropy / surprisal targeting

Tournament-watermark theory predicts stronger watermark evidence at positions where the generator has more uncertainty. The benchmark tested that idea at the level of individual Own Words edits.

After controlling proxy five-token disruption, token turnover, and source-passage fixed effects, **affected-window surprisal** predicted additional detector reduction:

- same SmolLM2 generator used as scorer: partial `r = 0.441`
- unrelated `distilgpt2` surrogate: partial `r = 0.422`
- unrelated `EleutherAI/pythia-14m` surrogate: partial `r = 0.422`

Affected-window confidence had the expected negative relationship. This is evidence that a small unrelated LM can identify regions that tend to carry more public-reference watermark evidence.

However, correlation did not translate into a sufficiently strong selector improvement. A direct fixed-four A/B using Pythia-14M compared:

- pure marginal five-token coverage: **0.0161** mean detector reduction, **13.62%** disruption, **0.995** semantic cosine
- coverage × Pythia surprisal: **0.0172** reduction, **13.50%** disruption, **0.994** semantic cosine

The surprisal selector beat coverage in only **44%** of passages and its median advantage was **0.0000**. The small mean improvement is too unstable to justify adding a local LM dependency to the product today.

**Decision:** keep entropy targeting as a research lead, not a runtime dependency. The model-free coverage selector remains the product core.

## Mathematical target and candidate-density ceiling

With an original reference score of `0.6139`, the first-order dilution model implies approximately:

- `0.55` score: ~56% decorrelation
- `0.54`: ~65%
- `0.53`: ~74%
- `0.52`: ~82%
- pilot control maximum `0.5125`: ~89%

For roughly 160 proxy tokens, ideal well-spaced one-token substitutions suggest that on the order of 28 high-quality changes could touch about 90% of five-token windows before edge effects and imperfect placement. Real rewrites are less ideal, so a practical automated inventory target would be roughly **30–35 high-quality opportunities per 150–160 tokens** if the goal were very deep sequence re-expression.

The current static rule inventory is only around 13 Thorough edits on this benchmark. Merely adding more rare exact phrases will not close that gap.

## Next product strategy: human coverage coaching

The cleanest model-neutral way past the static-rule ceiling is to use Own Words' human-in-the-loop design deliberately.

After automated suggestions are exhausted, the engine can compute which original five-token neighborhoods remain intact and identify the centers of the largest untouched runs. It can then surface a small set of **manual rewrite targets** distributed through those gaps. The user supplies the actual wording.

This has several advantages:

- domain vocabulary no longer limits candidate supply
- the machine does not invent semantic substitutions
- targets can be selected by the same maximum-coverage mathematics
- one user rewrite in a well-spaced untouched neighborhood can buy up to roughly five fresh local windows
- it reinforces the product's actual premise: the final wording should be the user's own

A coverage coach should report descriptive goals such as remaining intact local sequence or Rewrite Depth, not promise watermark removal.

## Additional next steps

1. Prototype the manual coverage-target algorithm and measure how many strategically placed human edits would be required to reach 50%, 75%, and 90% proxy five-token disruption after the current Thorough automated pass.
2. Continue expanding high-frequency, high-confidence connective and semantic-compression rules where benchmark corpora show they actually occur.
3. Build inflection-aware lexical families so one vetted lemma family covers grammatical variants without repetitive hand enumeration.
4. Mine paraphrase corpora / offline LLM rewrites for recurring safe transformation templates, then ship only reviewed static rules.
5. Test robust context scoring across several unrelated tokenizers. Production tokenization is unknown, so rules that disrupt local sequence under multiple tokenization families are preferable to BPE-specific tricks.
6. Revisit tiny-LM uncertainty weighting only if a better fixed-budget selector demonstrates a stable practical gain.

## Claims Own Words should not make

Do not claim that:

- a particular word is watermarked or clean
- a given Rewrite Depth guarantees watermark removal
- a negative result establishes human authorship
- the public reference keys are Gemini production keys
- proxy five-token disruption equals SynthID detector confidence
- the reference benchmark proves performance against Gemini production watermarking

A production detector needs the corresponding secure configuration and tokenizer. Google describes the open repository as a reference/research implementation rather than its production detector configuration.

Full reports, generated examples, raw detector rows, semantic checks, placement controls, transformation-efficiency tables, and uncertainty experiments are emitted as GitHub Actions artifacts by the research workflows in `.github/workflows/`.
