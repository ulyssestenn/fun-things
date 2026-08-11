#!/usr/bin/env python3
"""Reference SynthID benchmark for Own Words.

This is a research harness, not a production watermark detector. It uses the
published SynthID Text configuration and the Hugging Face implementation to
measure how model-neutral rewrites affect the reference signal.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from collections import defaultdict
from pathlib import Path
from statistics import mean, median

import numpy as np
import torch
from transformers import (
    AutoModel,
    AutoModelForCausalLM,
    AutoTokenizer,
    SynthIDTextWatermarkLogitsProcessor,
    SynthIDTextWatermarkingConfig,
)

KEYS = [
    654, 400, 836, 123, 340, 443, 597, 160, 57, 29,
    590, 639, 13, 715, 468, 990, 966, 226, 324, 585,
    118, 504, 421, 521, 129, 669, 732, 225, 90, 960,
]
NGRAM_LEN = 5
SAMPLING_TABLE_SIZE = 2**16
SAMPLING_TABLE_SEED = 0
CONTEXT_HISTORY_SIZE = 1024
DEFAULT_MODEL = "HuggingFaceTB/SmolLM2-360M-Instruct"
SEMANTIC_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

PROMPTS = [
    "Explain why constitutional democracies divide government power among institutions, including the strongest argument against doing so.",
    "Explain why regular exercise can improve mental health, distinguishing plausible mechanisms from common oversimplifications.",
    "Compare a compiler and an interpreter for a beginner who already understands functions, loops, lists, and dictionaries.",
    "Explain how recommendation systems can create feedback loops, and describe the practical tradeoffs of reducing those loops.",
    "Explain why the institutions of the Roman Republic became less stable in its final century without reducing the explanation to one cause.",
    "Explain entropy to an intelligent non-specialist, including what people usually get wrong about the phrase 'disorder increases.'",
    "Explain the tradeoffs of building a local-first application instead of a cloud-first application for personal information management.",
    "Explain why invasive species can destabilize an ecosystem even when the introduced species is not an especially efficient predator.",
    "Explain how public-key cryptography allows two people to communicate securely without first sharing a secret key.",
    "Explain why supply-chain bottlenecks can cause large price changes even when the initial shortage appears small.",
    "Explain why historians distinguish primary sources from secondary sources, and why neither category is automatically more reliable.",
    "Explain why caching can make software dramatically faster, along with the main ways a cache can create incorrect or stale behavior.",
    "Explain the strongest case for scientific models even though every model simplifies or distorts some features of reality.",
    "Explain economic externalities and why disagreement often remains even after everyone agrees that an externality exists.",
    "Explain why translation can change the interpretation of a literary work even when both translations are defensible and accurate.",
    "Explain why a sorted collection permits binary search and why the same algorithm does not work on an unsorted collection.",
]


def watermark_config() -> SynthIDTextWatermarkingConfig:
    return SynthIDTextWatermarkingConfig(
        keys=KEYS,
        ngram_len=NGRAM_LEN,
        context_history_size=CONTEXT_HISTORY_SIZE,
        sampling_table_seed=SAMPLING_TABLE_SEED,
        sampling_table_size=SAMPLING_TABLE_SIZE,
    )


def detector_processor() -> SynthIDTextWatermarkLogitsProcessor:
    return SynthIDTextWatermarkLogitsProcessor(
        ngram_len=NGRAM_LEN,
        keys=KEYS,
        sampling_table_size=SAMPLING_TABLE_SIZE,
        sampling_table_seed=SAMPLING_TABLE_SEED,
        context_history_size=CONTEXT_HISTORY_SIZE,
        device=torch.device("cpu"),
    )


def format_prompt(tokenizer, prompt: str) -> str:
    if hasattr(tokenizer, "apply_chat_template") and tokenizer.chat_template:
        return tokenizer.apply_chat_template(
            [{"role": "user", "content": prompt}],
            tokenize=False,
            add_generation_prompt=True,
        )
    return prompt + "\n\nAnswer:"


def generate(args: argparse.Namespace) -> None:
    torch.set_num_threads(max(1, min(4, torch.get_num_threads())))
    tokenizer = AutoTokenizer.from_pretrained(args.model)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token_id = tokenizer.eos_token_id
    tokenizer.padding_side = "left"

    model = AutoModelForCausalLM.from_pretrained(args.model)
    model.eval()
    model.generation_config.pad_token_id = tokenizer.pad_token_id

    config = watermark_config()
    records = []
    prompts = PROMPTS[: args.limit]

    for index, prompt in enumerate(prompts):
        rendered = format_prompt(tokenizer, prompt)
        inputs = tokenizer(rendered, return_tensors="pt")
        prompt_len = inputs["input_ids"].shape[1]
        seed = args.seed + index

        for source_type, use_watermark in (
            ("unwatermarked", False),
            ("watermarked", True),
        ):
            torch.manual_seed(seed)
            generation_kwargs = dict(
                **inputs,
                do_sample=True,
                temperature=0.8,
                top_k=50,
                top_p=0.95,
                repetition_penalty=1.04,
                min_new_tokens=args.min_new_tokens,
                max_new_tokens=args.max_new_tokens,
                pad_token_id=tokenizer.pad_token_id,
            )
            if use_watermark:
                generation_kwargs["watermarking_config"] = config

            with torch.inference_mode():
                output = model.generate(**generation_kwargs)
            generated_ids = output[0, prompt_len:]
            text = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
            records.append({
                "id": f"p{index + 1:02d}",
                "prompt": prompt,
                "source_type": source_type,
                "seed": seed,
                "model": args.model,
                "text": text,
                "model_tokens": int(generated_ids.shape[0]),
            })
            print(
                f"generated {index + 1}/{len(prompts)} {source_type}: "
                f"{generated_ids.shape[0]} tokens",
                flush=True,
            )

    payload = {
        "configuration": {
            "model": args.model,
            "keys": KEYS,
            "ngram_len": NGRAM_LEN,
            "sampling_table_size": SAMPLING_TABLE_SIZE,
            "sampling_table_seed": SAMPLING_TABLE_SEED,
            "context_history_size": CONTEXT_HISTORY_SIZE,
            "temperature": 0.8,
            "top_k": 50,
            "top_p": 0.95,
            "min_new_tokens": args.min_new_tokens,
            "max_new_tokens": args.max_new_tokens,
        },
        "records": records,
    }
    Path(args.output).write_text(json.dumps(payload, indent=2), encoding="utf-8")


def score_text(tokenizer, processor, text: str) -> dict[str, float | int]:
    encoded = tokenizer(
        text,
        return_tensors="pt",
        add_special_tokens=False,
        truncation=False,
    )
    ids = encoded["input_ids"]
    token_count = int(ids.shape[1])
    if token_count < NGRAM_LEN:
        return {
            "detector_tokens": token_count,
            "valid_contexts": 0,
            "mean_score": float("nan"),
            "weighted_score": float("nan"),
            "weighted_z": float("nan"),
        }

    with torch.inference_mode():
        g_values = processor.compute_g_values(input_ids=ids).to(torch.float32)
        mask = processor.compute_context_repetition_mask(input_ids=ids).to(torch.float32)

    if mask.shape[1] != g_values.shape[1]:
        common = min(mask.shape[1], g_values.shape[1])
        mask = mask[:, -common:]
        g_values = g_values[:, -common:, :]

    depth = int(g_values.shape[-1])
    valid = int(mask.sum().item())
    if valid == 0:
        return {
            "detector_tokens": token_count,
            "valid_contexts": 0,
            "mean_score": float("nan"),
            "weighted_score": float("nan"),
            "weighted_z": float("nan"),
        }

    denom = depth * mask.sum()
    mean_score = float((g_values * mask.unsqueeze(-1)).sum().item() / denom.item())

    weights = torch.linspace(10.0, 1.0, depth)
    weights *= depth / weights.sum()
    weighted = g_values * weights.view(1, 1, -1)
    weighted_score = float((weighted * mask.unsqueeze(-1)).sum().item() / denom.item())

    # Approximate null z-score, treating binary g-values as independent fair bits.
    # Raw Weighted Mean remains the primary metric because this independence is
    # only an approximation.
    null_variance = 0.25 * float((weights**2).sum().item()) / (depth**2 * valid)
    weighted_z = (weighted_score - 0.5) / math.sqrt(null_variance)
    return {
        "detector_tokens": token_count,
        "valid_contexts": valid,
        "mean_score": mean_score,
        "weighted_score": weighted_score,
        "weighted_z": weighted_z,
    }


def auc_pairwise(positive: list[float], negative: list[float]) -> float:
    wins = 0.0
    total = len(positive) * len(negative)
    if not total:
        return float("nan")
    for p in positive:
        for n in negative:
            if p > n:
                wins += 1.0
            elif p == n:
                wins += 0.5
    return wins / total


def load_semantic_encoder():
    tokenizer = AutoTokenizer.from_pretrained(SEMANTIC_MODEL)
    model = AutoModel.from_pretrained(SEMANTIC_MODEL)
    model.eval()
    return tokenizer, model


def semantic_embeddings(tokenizer, model, texts: list[str], batch_size: int = 16) -> np.ndarray:
    vectors = []
    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        encoded = tokenizer(
            batch,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt",
        )
        with torch.inference_mode():
            out = model(**encoded).last_hidden_state
        mask = encoded["attention_mask"].unsqueeze(-1).to(out.dtype)
        pooled = (out * mask).sum(dim=1) / mask.sum(dim=1).clamp_min(1e-9)
        pooled = torch.nn.functional.normalize(pooled, p=2, dim=1)
        vectors.append(pooled.cpu().numpy())
    return np.concatenate(vectors, axis=0)


def safe_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return float("nan")


def fmt(value: float, digits: int = 4) -> str:
    if not math.isfinite(value):
        return "—"
    return f"{value:.{digits}f}"


def analyze(args: argparse.Namespace) -> None:
    generated = json.loads(Path(args.generated).read_text(encoding="utf-8"))
    rewrites = json.loads(Path(args.rewrites).read_text(encoding="utf-8"))
    model_id = generated["configuration"]["model"]
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    processor = detector_processor()

    sources = {
        (r["id"], r["source_type"]): r
        for r in generated["records"]
    }

    rows = []
    original_scores = {}
    for source in generated["records"]:
        detector = score_text(tokenizer, processor, source["text"])
        key = (source["id"], source["source_type"])
        original_scores[key] = detector
        rows.append({
            "id": source["id"],
            "source_type": source["source_type"],
            "selector": "original",
            "mode": "original",
            "text": source["text"],
            "edit_count": 0,
            "rewrite_depth": 0,
            "fivegram_disruption": 0,
            "trigram_disruption": 0,
            "token_turnover": 0,
            "coverage": 0,
            **detector,
        })

    for item in rewrites["rewrites"]:
        detector = score_text(tokenizer, processor, item["text"])
        metrics = item.get("metrics") or {}
        rows.append({
            "id": item["id"],
            "source_type": item["source_type"],
            "selector": item["selector"],
            "mode": item["mode"],
            "text": item["text"],
            "edit_count": item.get("edit_count", 0),
            "rewrite_depth": metrics.get("depth", 0),
            "fivegram_disruption": metrics.get("fivegramDisruption", 0),
            "trigram_disruption": metrics.get("trigramDisruption", 0),
            "token_turnover": metrics.get("tokenTurnover", 0),
            "coverage": metrics.get("coverage", 0),
            **detector,
        })

    # Semantic cosine for all rewrites, using one cached vector per unique text.
    semantic_tokenizer, semantic_model = load_semantic_encoder()
    unique_texts = []
    text_to_index = {}
    for source in generated["records"]:
        if source["text"] not in text_to_index:
            text_to_index[source["text"]] = len(unique_texts)
            unique_texts.append(source["text"])
    for item in rewrites["rewrites"]:
        if item["text"] not in text_to_index:
            text_to_index[item["text"]] = len(unique_texts)
            unique_texts.append(item["text"])
    embeddings = semantic_embeddings(semantic_tokenizer, semantic_model, unique_texts)

    for row in rows:
        source = sources[(row["id"], row["source_type"])]
        a = embeddings[text_to_index[source["text"]]]
        b = embeddings[text_to_index[row["text"]]]
        row["semantic_cosine"] = float(np.dot(a, b))
        base_score = original_scores[(row["id"], row["source_type"])]["weighted_score"]
        row["weighted_score_change"] = row["weighted_score"] - base_score
        row["weighted_score_reduction"] = base_score - row["weighted_score"]

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    csv_path = output_dir / "synthid_benchmark_rows.csv"
    fieldnames = [
        "id", "source_type", "selector", "mode", "edit_count",
        "rewrite_depth", "fivegram_disruption", "trigram_disruption",
        "token_turnover", "coverage", "detector_tokens", "valid_contexts",
        "mean_score", "weighted_score", "weighted_z",
        "weighted_score_change", "weighted_score_reduction", "semantic_cosine",
    ]
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k) for k in fieldnames})

    wm_original = [r for r in rows if r["source_type"] == "watermarked" and r["selector"] == "original"]
    uw_original = [r for r in rows if r["source_type"] == "unwatermarked" and r["selector"] == "original"]
    wm_scores = [r["weighted_score"] for r in wm_original if math.isfinite(r["weighted_score"])]
    uw_scores = [r["weighted_score"] for r in uw_original if math.isfinite(r["weighted_score"])]
    auc = auc_pairwise(wm_scores, uw_scores)
    empirical_control_max = max(uw_scores) if uw_scores else float("nan")

    grouped = defaultdict(list)
    for row in rows:
        if row["source_type"] == "watermarked" and row["selector"] in {"old", "context"}:
            grouped[(row["selector"], row["mode"])].append(row)

    summary = []
    for selector in ("old", "context"):
        for mode in ("light", "balanced", "thorough"):
            group = grouped[(selector, mode)]
            summary.append({
                "selector": selector,
                "mode": mode,
                "n": len(group),
                "weighted_mean": mean(r["weighted_score"] for r in group),
                "reduction_mean": mean(r["weighted_score_reduction"] for r in group),
                "reduction_median": median(r["weighted_score_reduction"] for r in group),
                "fivegram_mean": mean(r["fivegram_disruption"] for r in group),
                "depth_mean": mean(r["rewrite_depth"] for r in group),
                "edits_mean": mean(r["edit_count"] for r in group),
                "semantic_mean": mean(r["semantic_cosine"] for r in group),
                "below_control_max": sum(r["weighted_score"] <= empirical_control_max for r in group) / max(1, len(group)),
            })

    comparison = []
    by_key = {(r["id"], r["mode"], r["selector"]): r for r in rows if r["source_type"] == "watermarked"}
    for mode in ("light", "balanced", "thorough"):
        diffs = []
        context_better = 0
        matched = 0
        for source in wm_original:
            old = by_key.get((source["id"], mode, "old"))
            new = by_key.get((source["id"], mode, "context"))
            if not old or not new:
                continue
            matched += 1
            diff = new["weighted_score_reduction"] - old["weighted_score_reduction"]
            diffs.append(diff)
            if diff > 0:
                context_better += 1
        comparison.append({
            "mode": mode,
            "matched": matched,
            "extra_reduction_mean": mean(diffs) if diffs else float("nan"),
            "context_better_fraction": context_better / matched if matched else float("nan"),
        })

    watermarked_rewrites = [
        r for r in rows
        if r["source_type"] == "watermarked" and r["selector"] in {"old", "context"}
    ]
    x = np.array([r["fivegram_disruption"] for r in watermarked_rewrites], dtype=float)
    y = np.array([r["weighted_score_reduction"] for r in watermarked_rewrites], dtype=float)
    fivegram_corr = float(np.corrcoef(x, y)[0, 1]) if len(x) > 1 and np.std(x) and np.std(y) else float("nan")

    unwatermarked_rewrites = [
        r for r in rows
        if r["source_type"] == "unwatermarked" and r["selector"] in {"old", "context"}
    ]
    control_fp = (
        sum(r["weighted_score"] > empirical_control_max for r in unwatermarked_rewrites)
        / max(1, len(unwatermarked_rewrites))
    )

    report = []
    report.append("# Own Words × SynthID reference benchmark\n")
    report.append("This benchmark uses the published SynthID Text algorithm and static reference keys. It does **not** test Gemini's undisclosed production configuration and does not establish that any production watermark has been removed.\n")
    report.append("## Detector sanity check\n")
    report.append(f"- Model: `{model_id}`")
    report.append(f"- Paired prompts: {len(wm_original)}")
    report.append(f"- Mean Weighted Mean score, watermarked originals: **{fmt(mean(wm_scores))}**")
    report.append(f"- Mean Weighted Mean score, unwatermarked originals: **{fmt(mean(uw_scores))}**")
    report.append(f"- Pairwise AUROC (watermarked vs. unwatermarked originals): **{fmt(auc, 3)}**")
    report.append(f"- Highest unwatermarked-original score in this pilot: **{fmt(empirical_control_max)}** (descriptive pilot threshold only)\n")

    report.append("## Watermarked rewrite results\n")
    report.append("| selector | mode | n | weighted score | score reduction | 5-token disruption | rewrite depth | edits | semantic cosine | ≤ max control |")
    report.append("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
    for s in summary:
        report.append(
            f"| {s['selector']} | {s['mode']} | {s['n']} | {fmt(s['weighted_mean'])} | "
            f"{fmt(s['reduction_mean'])} | {s['fivegram_mean']:.1f}% | {s['depth_mean']:.1f} | "
            f"{s['edits_mean']:.1f} | {fmt(s['semantic_mean'], 3)} | {100*s['below_control_max']:.0f}% |"
        )

    report.append("\n## Old selector vs. context-aware selector\n")
    report.append("Positive extra reduction means the context-aware selector lowered the reference detector score more than the old selector on the same watermarked source.\n")
    report.append("| mode | matched passages | mean extra reduction | context selector better |")
    report.append("|---|---:|---:|---:|")
    for c in comparison:
        report.append(
            f"| {c['mode']} | {c['matched']} | {fmt(c['extra_reduction_mean'])} | "
            f"{100*c['context_better_fraction']:.0f}% |"
        )

    report.append("\n## Relationships and controls\n")
    report.append(f"- Pearson correlation: 5-token disruption vs. detector-score reduction across watermarked rewrites: **{fmt(fivegram_corr, 3)}**.")
    report.append(f"- Unwatermarked rewritten texts exceeding the pilot's max-original-control score: **{100*control_fp:.1f}%**. This is a stress check, not a calibrated FPR.")
    report.append("- Semantic cosine uses `sentence-transformers/all-MiniLM-L6-v2`; it measures broad semantic preservation, not factual correctness or prose quality.")
    report.append("- Rewrite Depth and n-gram disruption use Own Words' transparent proxy tokenizer, not the generation model's tokenizer.\n")

    report.append("## Interpretation rule\n")
    report.append("Treat the continuous detector score and paired score reduction as the primary outcomes. The pilot max-control threshold is included only to make the distributions legible; with this sample size it is not a defensible production detection threshold.")

    report_path = output_dir / "SYNTHID-BENCHMARK-RESULTS.md"
    report_path.write_text("\n".join(report) + "\n", encoding="utf-8")

    # Compact machine-readable summary.
    json_summary = {
        "model": model_id,
        "paired_prompts": len(wm_original),
        "watermarked_original_weighted_mean": mean(wm_scores),
        "unwatermarked_original_weighted_mean": mean(uw_scores),
        "original_auc": auc,
        "empirical_control_max": empirical_control_max,
        "fivegram_reduction_pearson": fivegram_corr,
        "unwatermarked_rewrite_above_control_max_fraction": control_fp,
        "groups": summary,
        "selector_comparison": comparison,
    }
    (output_dir / "synthid_benchmark_summary.json").write_text(
        json.dumps(json_summary, indent=2), encoding="utf-8"
    )

    # Plots are intentionally simple and use matplotlib defaults.
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.scatter(x, y, alpha=0.75)
    ax.set_xlabel("Own Words 5-token disruption (%)")
    ax.set_ylabel("Reference weighted detector score reduction")
    ax.set_title("Sequence disruption vs. SynthID reference-score reduction")
    fig.tight_layout()
    fig.savefig(output_dir / "fivegram_vs_detector_reduction.png", dpi=160)
    plt.close(fig)

    labels = [f"{s['selector']}\n{s['mode']}" for s in summary]
    vals = [s["reduction_mean"] for s in summary]
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.bar(labels, vals)
    ax.set_ylabel("Mean reference detector score reduction")
    ax.set_title("Old vs. context-aware rewrite selection")
    fig.tight_layout()
    fig.savefig(output_dir / "selector_comparison.png", dpi=160)
    plt.close(fig)

    print(report_path.read_text(encoding="utf-8"), flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_generate = subparsers.add_parser("generate")
    p_generate.add_argument("--model", default=DEFAULT_MODEL)
    p_generate.add_argument("--limit", type=int, default=12)
    p_generate.add_argument("--seed", type=int, default=20260811)
    p_generate.add_argument("--min-new-tokens", type=int, default=120)
    p_generate.add_argument("--max-new-tokens", type=int, default=180)
    p_generate.add_argument("--output", required=True)
    p_generate.set_defaults(func=generate)

    p_analyze = subparsers.add_parser("analyze")
    p_analyze.add_argument("--generated", required=True)
    p_analyze.add_argument("--rewrites", required=True)
    p_analyze.add_argument("--output-dir", required=True)
    p_analyze.set_defaults(func=analyze)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
