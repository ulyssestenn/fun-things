#!/usr/bin/env python3
"""Analyze fixed-edit placement controls from the Own Words SynthID benchmark."""

from __future__ import annotations

import argparse
import csv
import json
import math
from collections import defaultdict
from pathlib import Path
from statistics import mean

import matplotlib.pyplot as plt
import numpy as np


def load_rows(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    numeric = {
        "edit_count", "rewrite_depth", "fivegram_disruption",
        "trigram_disruption", "token_turnover", "coverage",
        "weighted_score", "weighted_score_reduction", "semantic_cosine",
    }
    for row in rows:
        for key in numeric:
            try:
                row[key] = float(row[key])
            except (TypeError, ValueError):
                row[key] = float("nan")
    return rows


def corr(x: np.ndarray, y: np.ndarray) -> float:
    if len(x) < 3 or np.std(x) == 0 or np.std(y) == 0:
        return float("nan")
    return float(np.corrcoef(x, y)[0, 1])


def source_demean(rows: list[dict], key: str) -> np.ndarray:
    by_source = defaultdict(list)
    for i, row in enumerate(rows):
        by_source[row["id"]].append(i)
    values = np.array([row[key] for row in rows], dtype=float)
    out = values.copy()
    for indices in by_source.values():
        m = float(np.mean(values[indices]))
        out[indices] -= m
    return out


def fixed_effect_ols(rows: list[dict]) -> dict:
    """y ~ source fixed effects + fivegram disruption + token turnover."""
    ids = sorted({row["id"] for row in rows})
    id_to_col = {value: index for index, value in enumerate(ids[1:])}
    n = len(rows)
    p = 1 + max(0, len(ids) - 1) + 2
    X = np.zeros((n, p), dtype=float)
    X[:, 0] = 1.0
    five_col = p - 2
    turnover_col = p - 1
    y = np.array([row["weighted_score_reduction"] for row in rows], dtype=float)
    for i, row in enumerate(rows):
        if row["id"] in id_to_col:
            X[i, 1 + id_to_col[row["id"]]] = 1.0
        X[i, five_col] = row["fivegram_disruption"]
        X[i, turnover_col] = row["token_turnover"]
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    residual = y - X @ beta
    dof = max(1, n - X.shape[1])
    sigma2 = float((residual @ residual) / dof)
    cov = sigma2 * np.linalg.pinv(X.T @ X)
    se = np.sqrt(np.maximum(0.0, np.diag(cov)))
    return {
        "fivegram_beta": float(beta[five_col]),
        "fivegram_se": float(se[five_col]),
        "turnover_beta": float(beta[turnover_col]),
        "turnover_se": float(se[turnover_col]),
        "n": n,
        "sources": len(ids),
    }


def fmt(value: float, digits: int = 4) -> str:
    return "—" if not math.isfinite(value) else f"{value:.{digits}f}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    rows = load_rows(Path(args.csv))
    placement = [
        row for row in rows
        if row["source_type"] == "watermarked" and row["selector"] == "placement"
    ]
    random_rows = [row for row in placement if row["mode"].startswith("random-")]
    clustered = {row["id"]: row for row in placement if row["mode"] == "clustered"}
    spread = {row["id"]: row for row in placement if row["mode"] == "spread"}
    common = sorted(set(clustered) & set(spread))

    paired = []
    for source_id in common:
        c = clustered[source_id]
        s = spread[source_id]
        paired.append({
            "id": source_id,
            "clustered_fivegram": c["fivegram_disruption"],
            "spread_fivegram": s["fivegram_disruption"],
            "fivegram_gain": s["fivegram_disruption"] - c["fivegram_disruption"],
            "clustered_reduction": c["weighted_score_reduction"],
            "spread_reduction": s["weighted_score_reduction"],
            "reduction_gain": s["weighted_score_reduction"] - c["weighted_score_reduction"],
            "clustered_semantic": c["semantic_cosine"],
            "spread_semantic": s["semantic_cosine"],
        })

    x_dm = source_demean(random_rows, "fivegram_disruption") if random_rows else np.array([])
    y_dm = source_demean(random_rows, "weighted_score_reduction") if random_rows else np.array([])
    turnover_dm = source_demean(random_rows, "token_turnover") if random_rows else np.array([])
    within_corr = corr(x_dm, y_dm)

    if len(random_rows):
        controls = np.column_stack([np.ones(len(random_rows)), turnover_dm])
        bx, *_ = np.linalg.lstsq(controls, x_dm, rcond=None)
        by, *_ = np.linalg.lstsq(controls, y_dm, rcond=None)
        partial_corr = corr(x_dm - controls @ bx, y_dm - controls @ by)
        ols = fixed_effect_ols(random_rows)
    else:
        partial_corr = float("nan")
        ols = {"fivegram_beta": float("nan"), "fivegram_se": float("nan"), "turnover_beta": float("nan"), "turnover_se": float("nan"), "n": 0, "sources": 0}

    spread_better = sum(p["reduction_gain"] > 0 for p in paired) / max(1, len(paired))
    spread_more_disruption = sum(p["fivegram_gain"] > 0 for p in paired) / max(1, len(paired))

    result = {
        "paired_sources": len(paired),
        "fixed_edit_count": 4,
        "clustered_mean_fivegram": mean(p["clustered_fivegram"] for p in paired) if paired else float("nan"),
        "spread_mean_fivegram": mean(p["spread_fivegram"] for p in paired) if paired else float("nan"),
        "mean_fivegram_gain": mean(p["fivegram_gain"] for p in paired) if paired else float("nan"),
        "clustered_mean_reduction": mean(p["clustered_reduction"] for p in paired) if paired else float("nan"),
        "spread_mean_reduction": mean(p["spread_reduction"] for p in paired) if paired else float("nan"),
        "mean_reduction_gain": mean(p["reduction_gain"] for p in paired) if paired else float("nan"),
        "spread_better_fraction": spread_better,
        "spread_more_disruption_fraction": spread_more_disruption,
        "clustered_semantic_mean": mean(p["clustered_semantic"] for p in paired) if paired else float("nan"),
        "spread_semantic_mean": mean(p["spread_semantic"] for p in paired) if paired else float("nan"),
        "random_subset_rows": len(random_rows),
        "within_source_fivegram_reduction_corr": within_corr,
        "within_source_partial_corr_controlling_turnover": partial_corr,
        "fixed_effect_ols": ols,
    }

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "placement_control_summary.json").write_text(json.dumps(result, indent=2), encoding="utf-8")

    report = [
        "# Fixed-edit placement control",
        "",
        "This control asks a narrower question than the main benchmark: **with the number of edits held fixed at four, does distributing those edits across more independent source contexts reduce the published SynthID reference score more than clustering them?**",
        "",
        f"- Eligible watermarked passages: **{len(paired)}**",
        f"- Mean 5-token disruption, clustered: **{fmt(result['clustered_mean_fivegram'], 1)}%**",
        f"- Mean 5-token disruption, spread: **{fmt(result['spread_mean_fivegram'], 1)}%**",
        f"- Mean detector-score reduction, clustered: **{fmt(result['clustered_mean_reduction'])}**",
        f"- Mean detector-score reduction, spread: **{fmt(result['spread_mean_reduction'])}**",
        f"- Spread placement produced the larger detector reduction in **{100 * spread_better:.0f}%** of paired passages.",
        f"- Spread placement produced greater 5-token disruption in **{100 * spread_more_disruption:.0f}%** of paired passages.",
        f"- Mean semantic cosine, clustered: **{fmt(result['clustered_semantic_mean'], 3)}**; spread: **{fmt(result['spread_semantic_mean'], 3)}**.",
        "",
        "## Random fixed-size subsets",
        "",
        f"Across **{len(random_rows)}** deterministic random four-edit subsets, after demeaning within each source passage, the correlation between 5-token disruption and detector-score reduction is **{fmt(within_corr, 3)}**.",
        f"After additionally residualizing token turnover, the correlation is **{fmt(partial_corr, 3)}**.",
        f"A source-fixed-effects OLS model estimates **{fmt(ols['fivegram_beta'], 5)} ± {fmt(ols['fivegram_se'], 5)}** detector-score reduction per one percentage point of 5-token disruption, controlling token turnover.",
        "",
        "These controls are still observational over a finite rewrite lexicon: different subsets change different words and phrases. They are substantially stronger evidence about placement than the raw main-benchmark correlation because edit count and source passage are held fixed, but they are not a proof about Gemini's undisclosed production watermark.",
    ]
    (output_dir / "PLACEMENT-CONTROL-RESULTS.md").write_text("\n".join(report) + "\n", encoding="utf-8")

    if len(random_rows):
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.scatter(x_dm, y_dm, alpha=0.55)
        ax.axhline(0, linewidth=1)
        ax.axvline(0, linewidth=1)
        ax.set_xlabel("5-token disruption, deviation from source mean (points)")
        ax.set_ylabel("Detector-score reduction, deviation from source mean")
        ax.set_title("Fixed four-edit random subsets: within-source relationship")
        fig.tight_layout()
        fig.savefig(output_dir / "placement_random_subsets.png", dpi=160)
        plt.close(fig)

    print((output_dir / "PLACEMENT-CONTROL-RESULTS.md").read_text(encoding="utf-8"), flush=True)


if __name__ == "__main__":
    main()
