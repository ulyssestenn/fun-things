# Own Words: sequence-disruption optimization notes

This note is about the **public SynthID-Text reference scheme** and the model-neutral rewrite proxy used by Own Words. It is not a claim about Gemini's private production configuration and it does not define a production watermark detector.

## 1. The basic dilution model

For the weighted-mean reference detector, unwatermarked text is centered near 0.5. Let:

- `S` = detector score of the original watermarked text
- `f` = fraction of watermark-bearing local contexts whose token sequence is changed enough that its keyed evidence becomes approximately uncorrelated with the original watermark
- `S'` = expected detector score after rewriting

A first-order model is:

```text
S' ≈ 0.5 + (1 - f)(S - 0.5)
```

so the expected reduction is:

```text
ΔS ≈ f(S - 0.5)
```

In the 16-prompt reference benchmark, `S = 0.6139` and Thorough produced `f ≈ 0.349` five-token disruption. The model predicts a score reduction of about `0.0398`; the observed mean reduction was `0.0403`.

This close agreement is descriptive, not a proof. Real detection includes weighted layers, tokenizer effects, repeated-context masking, and dependence between neighboring observations. But it strongly motivates optimizing **unique local sequence disruption** rather than raw edit count.

## 2. Five-token window arithmetic

For SynthID's published `ngram_len = 5`, a changed source token can participate in at most five source five-grams when it is away from the passage edges.

If `k` one-token substitutions are at least five tokens apart, their theoretical maximum source-window coverage is approximately:

```text
5k
```

before passage-length saturation.

If the same `k` changed tokens are contiguous, the union of affected source windows is only:

```text
k + 4
```

For four edits this idealized comparison is 20 windows versus 8. The benchmark's real candidates are multi-token and irregular, so the observed gap is smaller, but the fixed-four-edit experiment still found spread placement superior to clustered placement in 69% of passages.

More generally, replacing a contiguous source span containing `s` proxy tokens can intersect at most roughly:

```text
s + 4
```

source five-grams away from passage edges. If several changed spans overlap in their surrounding five-token neighborhoods, marginal coverage is lost.

## 3. Why moving an intact clause is not automatically high-value

A pure block move changes the contexts at the block's old and new boundaries, but five-grams lying wholly inside the moved block remain the same token sequences. Because SynthID's g-values are functions of local token sequences and keys, those internally preserved five-grams retain the same keyed values.

Therefore clause movement is useful primarily when the transformation also changes connective words, punctuation, internal wording, or sentence structure. **Recasting beats mere relocation.**

## 4. High-efficiency transformation families

The most attractive transformations have a high ratio of local-sequence disruption to semantic change.

### Dispersed one-token substitutions

A single changed token can invalidate up to five local five-grams. For a fixed number of directly changed tokens, widely spaced substitutions are the theoretical coverage optimum.

### Short idiom and connective replacements

Changing one or two low-semantic-load words can invalidate several windows with almost no change in proposition. Examples include discourse connectives, contractions, and exact phrase alternations. These are especially attractive when the replacement changes token count, although tokenization effects are model-dependent.

### Semantic compression

Replacing a multi-token nominalization or framing construction with a direct verb can destroy many source windows while preserving one semantic unit. Examples:

```text
has an effect on  -> affects
conducts an analysis of -> analyzes
makes a decision to -> decides to
the reason X is that Y -> X because Y
```

These are mathematically attractive because several surface tokens change for very little semantic movement.

### Sentence merge / connective recast

Transformations such as:

```text
X. However, Y. -> Although X, Y.
X. This is because Y. -> X because Y.
X. As a result, Y. -> Because X, Y.
```

remove or replace function-word sequences and punctuation while retaining the explicit logical relation.

### Pure clause reorder

Useful, but lower priority than the above because intact internal five-grams survive. It should be treated as a secondary source of coverage rather than receiving a large structural bonus solely for moving a long character span.

## 5. The optimization problem

Each candidate edit `c` can be viewed as having:

- a set `W_c` of original five-token windows it disrupts
- a semantic-risk cost `d_c`
- a quality/confidence level
- an incompatibility relation with overlapping edits

The selector is approximately a **weighted maximum-coverage problem with semantic constraints**:

```text
maximize |union(W_c)|
subject to semantic-risk, quality, overlap, and rewrite-depth constraints
```

A practical greedy approximation should prefer the candidate with the largest *marginal* set of untouched windows, adjusted by semantic risk. This is why context-aware dispersion is more principled than a synonym-count target.

## 6. What to measure next

For every new rewrite family, benchmark:

- candidates found per 100 source tokens
- unique five-token windows reachable
- five-token disruption per accepted edit
- detector-score reduction per accepted edit
- detector-score reduction per percentage point of five-token disruption
- semantic cosine
- fraction of passages reaching each Rewrite Depth target

The main engineering goal is to expand the **Pareto frontier**: more detector-signal dilution / sequence disruption without meaning loss or noticeably worse prose.

## 7. Avoid overfitting one tokenizer

Production tokenizer details are not available. Development should therefore favor transformations that change actual words and syntax, not tricks relying only on whitespace or a particular BPE segmentation.

A useful future robustness benchmark is a minimax-style comparison across several open tokenizers: measure which transformation families produce consistently high n-gram disruption under GPT-2-style BPE, SentencePiece-family tokenizers, and other common tokenizers. Static rules that perform well across tokenizer families are better candidates for a model-neutral tool.
