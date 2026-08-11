#!/usr/bin/env python3
"""Test whether LM uncertainty predicts single-edit SynthID score reduction.

This is research-only. It uses the public benchmark model as a surrogate signal
estimator and does not assume access to any production watermark model or key.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from pathlib import Path

import numpy as np
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


def as_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float("nan")


def corr(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    mask = np.isfinite(a) & np.isfinite(b)
    a, b = a[mask], b[mask]
    if len(a) < 3 or np.std(a) == 0 or np.std(b) == 0:
        return float("nan")
    return float(np.corrcoef(a, b)[0, 1])


def fmt(value, digits=3):
    return f"{value:.{digits}f}" if math.isfinite(value) else "—"


def infer_span(source: str, item: dict) -> tuple[int, int] | None:
    original = item.get("candidate_original") or ""
    revised = item.get("text") or ""
    alts = item.get("candidate_alternatives") or []
    if not original or not revised or not alts:
        return None

    start = 0
    while True:
        pos = source.find(original, start)
        if pos < 0:
            return None
        tail = source[pos + len(original):]
        prefix = source[:pos]
        for alt in alts:
            if prefix + alt + tail == revised:
                return pos, pos + len(original)
        start = pos + 1


def source_design(ids: list[str], *controls: np.ndarray) -> np.ndarray:
    unique = sorted(set(ids))
    columns = [np.ones(len(ids), dtype=float)]
    # Source fixed effects: omit first source to avoid exact collinearity.
    for source_id in unique[1:]:
        columns.append(np.array([1.0 if value == source_id else 0.0 for value in ids]))
    for control in controls:
        columns.append(np.asarray(control, dtype=float))
    return np.column_stack(columns)


def residualize(y: np.ndarray, x: np.ndarray) -> np.ndarray:
    beta, *_ = np.linalg.lstsq(x, y, rcond=None)
    return y - x @ beta


def standardized_regression(y: np.ndarray, ids: list[str], controls: list[np.ndarray], signal: np.ndarray):
    finite = np.isfinite(y) & np.isfinite(signal)
    for control in controls:
        finite &= np.isfinite(control)
    if finite.sum() < 8:
        return float("nan"), float("nan"), int(finite.sum())

    yf = y[finite]
    idf = [ids[i] for i in np.flatnonzero(finite)]
    cf = [np.asarray(c)[finite] for c in controls]
    sf = signal[finite]
    if np.std(sf) == 0:
        return float("nan"), float("nan"), len(yf)
    sf = (sf - sf.mean()) / sf.std()

    base = source_design(idf, *cf)
    x = np.column_stack([base, sf])
    beta, *_ = np.linalg.lstsq(x, yf, rcond=None)
    resid = yf - x @ beta
    dof = max(1, len(yf) - x.shape[1])
    sigma2 = float(resid @ resid / dof)
    cov = sigma2 * np.linalg.pinv(x.T @ x)
    se = math.sqrt(max(0.0, float(cov[-1, -1])))
    return float(beta[-1]), se, len(yf)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--generated", required=True)
    parser.add_argument("--rewrites", required=True)
    parser.add_argument("--csv", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    generated = json.loads(Path(args.generated).read_text(encoding="utf-8"))
    rewrites = json.loads(Path(args.rewrites).read_text(encoding="utf-8"))
    model_id = generated["configuration"]["model"]

    sources = {
        (record["id"], record["source_type"]): record["text"]
        for record in generated["records"]
    }
    single_meta = {
        (item["id"], item["mode"]): item
        for item in rewrites["rewrites"]
        if item.get("selector") == "single" and item.get("source_type") == "watermarked"
    }

    detector_rows = {}
    with Path(args.csv).open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("selector") == "single" and row.get("source_type") == "watermarked":
                detector_rows[(row["id"], row["mode"])] = row

    tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=True)
    model = AutoModelForCausalLM.from_pretrained(model_id)
    model.eval()
    torch.set_num_threads(max(1, min(4, torch.get_num_threads())))

    per_source_token_stats = {}
    for (source_id, source_type), text in sources.items():
        if source_type != "watermarked":
            continue
        encoded = tokenizer(
            text,
            return_tensors="pt",
            add_special_tokens=False,
            return_offsets_mapping=True,
        )
        offsets = encoded.pop("offset_mapping")[0].tolist()
        input_ids = encoded["input_ids"]
        if input_ids.shape[1] < 2:
            continue
        with torch.inference_mode():
            logits = model(**encoded).logits[0, :-1, :].float()
            log_probs = torch.log_softmax(logits, dim=-1)
            probs = torch.exp(log_probs)
            target_ids = input_ids[0, 1:]
            observed_logp = log_probs.gather(1, target_ids[:, None]).squeeze(1)
            entropy = -(probs * log_probs).sum(dim=-1)
            confidence = probs.max(dim=-1).values

        # index i in these arrays describes source token i+1, predicted from its prefix.
        per_source_token_stats[source_id] = {
            "offsets": offsets,
            "entropy": entropy.cpu().numpy(),
            "surprisal": (-observed_logp).cpu().numpy(),
            "confidence": confidence.cpu().numpy(),
        }
        print(f"scored uncertainty for {source_id}", flush=True)

    rows = []
    for key, item in single_meta.items():
        detector = detector_rows.get(key)
        source = sources.get((item["id"], "watermarked"))
        stats = per_source_token_stats.get(item["id"])
        if not detector or source is None or stats is None:
            continue
        span = infer_span(source, item)
        if not span:
            continue
        start, end = span
        offsets = stats["offsets"]

        direct = []
        for token_index, (a, b) in enumerate(offsets):
            if token_index == 0:
                continue
            if b > start and a < end:
                direct.append(token_index - 1)
        if not direct:
            continue

        # Editing a token also perturbs the four subsequent context windows in the
        # published ngram_len=5 scheme, so record a slightly wider local signal too.
        affected = sorted(set(
            idx
            for base in direct
            for idx in range(base, min(len(stats["entropy"]), base + 5))
        ))

        def avg(name, indices):
            values = stats[name][indices]
            return float(np.mean(values)) if len(values) else float("nan")

        rows.append({
            "id": item["id"],
            "mode": item["mode"],
            "transform_class": item.get("transform_class") or item.get("candidate_type") or "unknown",
            "reduction": as_float(detector.get("weighted_score_reduction")),
            "fivegram": as_float(detector.get("fivegram_disruption")),
            "turnover": as_float(detector.get("token_turnover")),
            "semantic": as_float(detector.get("semantic_cosine")),
            "direct_entropy": avg("entropy", direct),
            "direct_surprisal": avg("surprisal", direct),
            "direct_confidence": avg("confidence", direct),
            "affected_entropy": avg("entropy", affected),
            "affected_surprisal": avg("surprisal", affected),
            "affected_confidence": avg("confidence", affected),
            "direct_tokens": len(direct),
            "affected_tokens": len(affected),
        })

    ids = [r["id"] for r in rows]
    reduction = np.array([r["reduction"] for r in rows], dtype=float)
    fivegram = np.array([r["fivegram"] for r in rows], dtype=float)
    turnover = np.array([r["turnover"] for r in rows], dtype=float)

    signals = {
        "direct entropy": np.array([r["direct_entropy"] for r in rows]),
        "direct surprisal": np.array([r["direct_surprisal"] for r in rows]),
        "direct confidence": np.array([r["direct_confidence"] for r in rows]),
        "affected-window entropy": np.array([r["affected_entropy"] for r in rows]),
        "affected-window surprisal": np.array([r["affected_surprisal"] for r in rows]),
        "affected-window confidence": np.array([r["affected_confidence"] for r in rows]),
    }

    base = source_design(ids, fivegram, turnover)
    reduction_resid = residualize(reduction, base)

    results = []
    for name, signal in signals.items():
        signal_resid = residualize(signal, base)
        partial = corr(reduction_resid, signal_resid)
        beta, se, n = standardized_regression(reduction, ids, [fivegram, turnover], signal)
        results.append({
            "signal": name,
            "raw_corr": corr(reduction, signal),
            "partial_corr": partial,
            "standardized_beta": beta,
            "standardized_se": se,
            "n": n,
        })

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    report = [
        "# Entropy-weighted edit targeting",
        "",
        f"Surrogate model: `{model_id}`. Each observation is one accepted Own Words edit on a watermarked passage. The analysis asks whether local LM uncertainty predicts additional reference-detector reduction after controlling for Own Words proxy 5-token disruption, token turnover, and source-passage fixed effects.",
        "",
        "This is a reference-model experiment, not a claim that the same uncertainty map is available for or transfers to Gemini production generation.",
        "",
        "| signal | n | raw r | partial r | standardized beta ± SE |",
        "|---|---:|---:|---:|---:|",
    ]
    for result in results:
        report.append(
            f"| {result['signal']} | {result['n']} | {fmt(result['raw_corr'])} | "
            f"{fmt(result['partial_corr'])} | {fmt(result['standardized_beta'], 4)} ± {fmt(result['standardized_se'], 4)} |"
        )

    report += [
        "",
        "## Reading the signs",
        "",
        "If Tournament-watermark theory transfers cleanly to this setup, higher entropy / surprisal should be associated with larger detector-score reduction, while higher confidence should be associated with smaller reduction. The partial columns are the important ones because raw uncertainty can correlate with how many tokens a candidate changes.",
        "",
        "A weak or unstable partial relationship means Own Words should remain model-free and optimize sequence coverage alone. A strong stable relationship would justify a second experiment using a *different* small surrogate LM to test whether uncertainty targeting transfers across models.",
    ]

    (output_dir / "ENTROPY-EFFICIENCY.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    (output_dir / "entropy_efficiency.json").write_text(
        json.dumps({"rows": len(rows), "results": results}, indent=2), encoding="utf-8"
    )
    if rows:
        with (output_dir / "entropy_efficiency_rows.csv").open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

    print("\n".join(report), flush=True)


if __name__ == "__main__":
    main()
