#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from statistics import mean, median

import numpy as np
from transformers import AutoTokenizer

RESEARCH = Path(__file__).resolve().parents[1] / 'research'
sys.path.insert(0, str(RESEARCH))
from synthid_benchmark import detector_processor, score_text, load_semantic_encoder, semantic_embeddings  # noqa: E402


def fmt(v, n=4):
    return f'{v:.{n}f}' if math.isfinite(v) else '—'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--generated', required=True)
    parser.add_argument('--rewrites', required=True)
    parser.add_argument('--output-dir', required=True)
    args = parser.parse_args()

    generated = json.loads(Path(args.generated).read_text(encoding='utf-8'))
    payload = json.loads(Path(args.rewrites).read_text(encoding='utf-8'))
    model_id = generated['configuration']['model']
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    processor = detector_processor()

    sources = {
        r['id']: r['text'] for r in generated['records'] if r['source_type'] == 'watermarked'
    }
    originals = {sid: score_text(tokenizer, processor, text) for sid, text in sources.items()}

    # Independent semantic preservation check.
    sem_tok, sem_model = load_semantic_encoder()
    all_texts = list(sources.values()) + [r['text'] for r in payload['rewrites']]
    unique = list(dict.fromkeys(all_texts))
    index = {text: i for i, text in enumerate(unique)}
    embeddings = semantic_embeddings(sem_tok, sem_model, unique)

    rows = []
    for item in payload['rewrites']:
        sid = item['id']
        detector = score_text(tokenizer, processor, item['text'])
        base = originals[sid]['weighted_score']
        a = embeddings[index[sources[sid]]]
        b = embeddings[index[item['text']]]
        rows.append({
            'id': sid,
            'selector': item['selector'],
            'edit_count': item['edit_count'],
            'fivegram': float((item.get('metrics') or {}).get('fivegramDisruption', 0)),
            'turnover': float((item.get('metrics') or {}).get('tokenTurnover', 0)),
            'weighted_score': detector['weighted_score'],
            'reduction': base - detector['weighted_score'],
            'semantic': float(np.dot(a, b)),
            'selected': item.get('selected', []),
        })

    by = {(r['id'], r['selector']): r for r in rows}
    paired = []
    for sid in sources:
        cov = by.get((sid, 'coverage4'))
        ent = by.get((sid, 'surprisal4'))
        if not cov or not ent:
            continue
        paired.append({
            'id': sid,
            'coverage_reduction': cov['reduction'],
            'surprisal_reduction': ent['reduction'],
            'extra_reduction': ent['reduction'] - cov['reduction'],
            'coverage_fivegram': cov['fivegram'],
            'surprisal_fivegram': ent['fivegram'],
            'coverage_semantic': cov['semantic'],
            'surprisal_semantic': ent['semantic'],
        })

    def group(name):
        g = [r for r in rows if r['selector'] == name]
        return {
            'n': len(g),
            'reduction': mean(r['reduction'] for r in g),
            'fivegram': mean(r['fivegram'] for r in g),
            'semantic': mean(r['semantic'] for r in g),
            'score': mean(r['weighted_score'] for r in g),
        }

    coverage = group('coverage4')
    entropy = group('surprisal4')
    better = sum(p['extra_reduction'] > 0 for p in paired) / max(1, len(paired))
    extra = [p['extra_reduction'] for p in paired]

    report = [
        '# Coverage vs. tiny-LM surprisal targeting',
        '',
        f"Surrogate model: `{payload['surrogate_model']}`. Both selectors are limited to exactly four Own Words edits chosen from the same Thorough candidate pool. `coverage4` greedily maximizes fresh proxy five-token contexts. `surprisal4` maximizes fresh context coverage multiplied by affected-window surprisal from the unrelated surrogate LM.",
        '',
        '| selector | n | detector score | detector reduction | 5-token disruption | semantic cosine |',
        '|---|---:|---:|---:|---:|---:|',
        f"| coverage only | {coverage['n']} | {fmt(coverage['score'])} | {fmt(coverage['reduction'])} | {coverage['fivegram']:.2f}% | {fmt(coverage['semantic'],3)} |",
        f"| coverage × surprisal | {entropy['n']} | {fmt(entropy['score'])} | {fmt(entropy['reduction'])} | {entropy['fivegram']:.2f}% | {fmt(entropy['semantic'],3)} |",
        '',
        f"- Surprisal selector produced more detector-score reduction in **{100*better:.0f}%** of paired passages.",
        f"- Mean extra reduction from surprisal targeting: **{fmt(mean(extra) if extra else float('nan'))}**.",
        f"- Median extra reduction: **{fmt(median(extra) if extra else float('nan'))}**.",
        '',
        'This is a public-reference SynthID experiment. It does not establish transfer to Gemini production watermarking. The comparison tests selection efficiency at a fixed visible edit budget, not watermark removal.',
    ]

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / 'ENTROPY-SELECTION-AB.md').write_text('\n'.join(report) + '\n', encoding='utf-8')
    (output_dir / 'entropy_selection_ab.json').write_text(json.dumps({
        'surrogate_model': payload['surrogate_model'],
        'coverage': coverage,
        'surprisal': entropy,
        'paired_n': len(paired),
        'surprisal_better_fraction': better,
        'mean_extra_reduction': mean(extra) if extra else None,
        'median_extra_reduction': median(extra) if extra else None,
        'paired': paired,
    }, indent=2), encoding='utf-8')
    print('\n'.join(report), flush=True)


if __name__ == '__main__':
    main()
