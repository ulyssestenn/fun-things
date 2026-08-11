#!/usr/bin/env python3
"""Summarize single-edit SynthID reference benchmark results by transform class."""

from __future__ import annotations

import argparse
import csv
import json
import math
from collections import defaultdict
from pathlib import Path
from statistics import mean, median


def f(value, default=float("nan")):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def fmt(value, digits=4):
    return f"{value:.{digits}f}" if math.isfinite(value) else "—"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rewrites", required=True)
    parser.add_argument("--csv", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    payload = json.loads(Path(args.rewrites).read_text(encoding="utf-8"))
    meta = {
        (item["id"], item["mode"]): item
        for item in payload["rewrites"]
        if item.get("selector") == "single"
    }

    rows = []
    with Path(args.csv).open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("selector") != "single":
                continue
            info = meta.get((row["id"], row["mode"]))
            if not info:
                continue
            rows.append({
                "id": row["id"],
                "mode": row["mode"],
                "transform_class": info.get("transform_class", "unknown"),
                "candidate_type": info.get("candidate_type", "unknown"),
                "quality": int(info.get("candidate_quality") or 0),
                "span_chars": int(info.get("candidate_span_chars") or 0),
                "original": info.get("candidate_original", ""),
                "reduction": f(row.get("weighted_score_reduction")),
                "fivegram": f(row.get("fivegram_disruption")),
                "turnover": f(row.get("token_turnover")),
                "semantic": f(row.get("semantic_cosine")),
            })

    grouped = defaultdict(list)
    for row in rows:
        if math.isfinite(row["reduction"]):
            grouped[row["transform_class"]].append(row)

    summary = []
    for transform_class, group in grouped.items():
        reductions = [r["reduction"] for r in group]
        fivegrams = [r["fivegram"] for r in group]
        semantics = [r["semantic"] for r in group if math.isfinite(r["semantic"])]
        turnovers = [r["turnover"] for r in group if math.isfinite(r["turnover"])]
        mean_five = mean(fivegrams)
        mean_reduction = mean(reductions)
        summary.append({
            "transform_class": transform_class,
            "n": len(group),
            "mean_reduction": mean_reduction,
            "median_reduction": median(reductions),
            "positive_fraction": sum(v > 0 for v in reductions) / len(reductions),
            "mean_fivegram": mean_five,
            "mean_turnover": mean(turnovers) if turnovers else float("nan"),
            "mean_semantic": mean(semantics) if semantics else float("nan"),
            "reduction_per_10_fivegram_points": (
                mean_reduction / mean_five * 10 if mean_five > 0 else float("nan")
            ),
        })

    summary.sort(key=lambda x: (-x["mean_reduction"], -x["mean_fivegram"], x["transform_class"]))

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    report = [
        "# Single-edit transformation efficiency",
        "",
        "Each row below isolates one accepted Own Words edit on a watermarked reference passage, then rescored the resulting text with the public SynthID reference configuration. These are descriptive pilot estimates, not production-watermark guarantees.",
        "",
        "| transform class | n | mean detector reduction | median reduction | positive | 5-token disruption | token turnover | semantic cosine | reduction / 10 disruption pts |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for item in summary:
        report.append(
            f"| {item['transform_class']} | {item['n']} | {fmt(item['mean_reduction'])} | "
            f"{fmt(item['median_reduction'])} | {100*item['positive_fraction']:.0f}% | "
            f"{item['mean_fivegram']:.2f}% | {item['mean_turnover']:.2f}% | "
            f"{fmt(item['mean_semantic'], 3)} | {fmt(item['reduction_per_10_fivegram_points'])} |"
        )

    report += [
        "",
        "## Interpretation",
        "",
        "The most useful transformation classes are those that combine high detector-score reduction, high local sequence disruption, and semantic cosine close to 1.0. A class with a large raw reduction but visibly lower semantic fidelity should not automatically be promoted in the runtime selector.",
        "",
        "The per-10-disruption column asks a narrower question: given the amount of proxy 5-token sequence actually changed, did that class dilute the reference score unusually efficiently? Small samples can be noisy, especially because a single edit affects only a limited number of detector observations.",
    ]

    (output_dir / "TRANSFORM-EFFICIENCY.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    (output_dir / "transform_efficiency.json").write_text(
        json.dumps({"single_edits": len(rows), "groups": summary}, indent=2), encoding="utf-8"
    )

    detail_fields = [
        "id", "mode", "transform_class", "candidate_type", "quality", "span_chars",
        "reduction", "fivegram", "turnover", "semantic", "original",
    ]
    with (output_dir / "transform_efficiency_rows.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=detail_fields)
        writer.writeheader()
        writer.writerows(rows)

    print("\n".join(report))


if __name__ == "__main__":
    main()
