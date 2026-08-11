#!/usr/bin/env python3
import argparse
import json
import math
import os
import random
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import matplotlib.pyplot as plt

SYNTHID_SRC = os.environ.get('SYNTHID_SRC')
if not SYNTHID_SRC:
    raise RuntimeError('SYNTHID_SRC must point to google-deepmind/synthid-text/src')
sys.path.insert(0, SYNTHID_SRC)

import transformers
from synthid_text import logits_processing, synthid_mixin

PROMPTS = [
    'The relationship between technological progress and human happiness is complicated. ',
    'The fall of the Roman Republic cannot be explained by a single cause. ',
    'A useful way to think about artificial intelligence is to separate capability from judgment. ',
    'Public institutions often fail for reasons that are less dramatic than corruption or conspiracy. ',
    'The strongest argument for preserving old buildings is not simply nostalgia. ',
    'Scientific explanations become misleading when a mechanism is mistaken for a complete account. ',
    'Economic growth changes daily life in ways that are both obvious and surprisingly difficult to measure. ',
    'A good educational system has to balance knowledge, practice, independence, and correction. ',
]
LENGTHS = [96, 192, 320]
TEMPERATURE = 0.7
TOP_K = 40
TOP_P = 0.95


def clean_text(text):
    return re.sub(r'\s+', ' ', text).strip()


def word_overlap(a, b):
    wa = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", a.lower())
    wb = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", b.lower())
    if not wa and not wb:
        return 1.0
    ca, cb = {}, {}
    for w in wa: ca[w] = ca.get(w, 0) + 1
    for w in wb: cb[w] = cb.get(w, 0) + 1
    overlap = sum(min(n, cb.get(w, 0)) for w, n in ca.items())
    return overlap / max(len(wa), len(wb), 1)


def make_models(model_name, device):
    tokenizer = transformers.AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = 'left'
    standard = transformers.GPT2LMHeadModel.from_pretrained(model_name).to(device).eval()
    watermarked = synthid_mixin.SynthIDGPT2LMHeadModel.from_pretrained(model_name).to(device).eval()
    return tokenizer, standard, watermarked


def generate_one(model, tokenizer, prompt, new_tokens, seed, watermarked):
    torch.manual_seed(seed)
    random.seed(seed)
    inputs = tokenizer(prompt, return_tensors='pt').to(model.device)
    input_len = inputs['input_ids'].shape[1]
    kwargs = dict(
        **inputs,
        do_sample=True,
        max_new_tokens=new_tokens,
        min_new_tokens=new_tokens,
        temperature=TEMPERATURE,
        top_k=TOP_K,
        top_p=TOP_P,
        pad_token_id=tokenizer.eos_token_id,
    )
    with torch.no_grad():
        output = model.generate(**kwargs)
    continuation = output[0, input_len:]
    return clean_text(tokenizer.decode(continuation, skip_special_tokens=True))


def synthid_processor():
    config = synthid_mixin.DEFAULT_WATERMARKING_CONFIG
    return logits_processing.SynthIDLogitsProcessor(
        **config,
        top_k=TOP_K,
        temperature=TEMPERATURE,
    )


def detector_scores(text, tokenizer, processor):
    ids = tokenizer(text, return_tensors='pt', add_special_tokens=False)['input_ids']
    if ids.shape[1] < processor.ngram_len:
        return math.nan, math.nan, 0
    g = processor.compute_g_values(ids).cpu().numpy().astype(np.float64)
    mask = processor.compute_context_repetition_mask(ids).cpu().numpy().astype(np.float64)
    valid = float(mask.sum())
    if valid <= 0:
        return math.nan, math.nan, 0
    mean = float((g * mask[..., None]).sum() / (g.shape[-1] * valid))
    weights = np.linspace(10.0, 1.0, g.shape[-1])
    weights *= g.shape[-1] / weights.sum()
    weighted = float((g * mask[..., None] * weights[None, None, :]).sum() / (g.shape[-1] * valid))
    return mean, weighted, int(valid)


def build_corpus(standard, watermarked, tokenizer, per_length):
    rows = []
    for length in LENGTHS:
        for i in range(per_length):
            prompt = PROMPTS[i % len(PROMPTS)]
            seed = 20260811 + length * 100 + i
            for source, model, wm in [
                ('unwatermarked', standard, False),
                ('watermarked', watermarked, True),
            ]:
                text = generate_one(model, tokenizer, prompt, length, seed, wm)
                rows.append({
                    'id': f'{source}-{length}-{i:02d}',
                    'source': source,
                    'length_bucket': length,
                    'prompt': prompt,
                    'seed': seed,
                    'text': text,
                })
                print(f'generated {source} length={length} sample={i+1}/{per_length}', flush=True)
    return rows


def run_own_words(repo_root, corpus, outdir):
    input_path = outdir / 'own_words_input.json'
    old_engine = outdir / 'engine-old.js'
    new_engine = repo_root / 'own-words' / 'engine.js'
    runner = repo_root / 'own-words' / 'bench' / 'own_words_runner.js'
    output_path = outdir / 'own_words_rewrites.json'
    input_path.write_text(json.dumps([{'id': r['id'], 'text': r['text']} for r in corpus]), encoding='utf-8')
    with old_engine.open('w', encoding='utf-8') as f:
        subprocess.run(['git','show','origin/main:own-words/engine.js'], cwd=repo_root, stdout=f, check=True)
    subprocess.run(['node', str(runner), str(input_path), str(old_engine), str(new_engine), str(output_path)], cwd=repo_root, check=True)
    return json.loads(output_path.read_text(encoding='utf-8'))


def score_all(corpus, rewrites, tokenizer, processor):
    originals = {r['id']: r for r in corpus}
    rows = []
    for original in corpus:
        mean, weighted, valid = detector_scores(original['text'], tokenizer, processor)
        rows.append({
            **original,
            'selector': 'original', 'level': 'original', 'revised': original['text'],
            'edits': 0, 'rewrite_depth': 0, 'token_turnover': 0,
            'trigram_disruption': 0, 'fivegram_disruption': 0, 'coverage': 0,
            'structural_edits': 0, 'stop_reason': None,
            'mean_score': mean, 'weighted_score': weighted, 'valid_positions': valid,
            'word_overlap': 1.0,
        })
    for rewrite in rewrites:
        original = originals[rewrite['id']]
        mean, weighted, valid = detector_scores(rewrite['revised'], tokenizer, processor)
        base_mean, base_weighted, _ = detector_scores(original['text'], tokenizer, processor)
        rows.append({
            **{k: original[k] for k in ['id','source','length_bucket','prompt','seed','text']},
            **rewrite,
            'mean_score': mean,
            'weighted_score': weighted,
            'valid_positions': valid,
            'mean_drop': base_mean - mean,
            'weighted_drop': base_weighted - weighted,
            'word_overlap': word_overlap(original['text'], rewrite['revised']),
        })
    return pd.DataFrame(rows)


def summarize(df, outdir):
    originals = df[df.selector == 'original']
    revised = df[df.selector != 'original']
    wm = revised[revised.source == 'watermarked'].copy()
    uw = revised[revised.source == 'unwatermarked'].copy()

    summary = {
        'original_scores': originals.groupby(['source','length_bucket'])[['mean_score','weighted_score','valid_positions']].agg(['mean','std','count']).round(5).to_dict(),
        'watermarked_rewrite': wm.groupby(['selector','level'])[['weighted_score','weighted_drop','fivegram_disruption','token_turnover','rewrite_depth','edits','word_overlap']].mean().round(5).to_dict(),
        'unwatermarked_rewrite': uw.groupby(['selector','level'])[['weighted_score','fivegram_disruption','rewrite_depth','edits']].mean().round(5).to_dict(),
        'correlations_watermarked': wm[['weighted_drop','fivegram_disruption','trigram_disruption','token_turnover','coverage','edits','rewrite_depth']].corr().round(4).to_dict(),
    }
    (outdir / 'summary.json').write_text(json.dumps(summary, indent=2, default=str), encoding='utf-8')

    table = wm.groupby(['selector','level']).agg(
        n=('id','count'),
        weighted_before=('weighted_score', lambda s: np.nan),
        weighted_after=('weighted_score','mean'),
        weighted_drop=('weighted_drop','mean'),
        fivegram=('fivegram_disruption','mean'),
        turnover=('token_turnover','mean'),
        depth=('rewrite_depth','mean'),
        edits=('edits','mean'),
        overlap=('word_overlap','mean'),
    ).reset_index()
    # Recover before score from weighted_after + drop.
    table['weighted_before'] = table['weighted_after'] + table['weighted_drop']
    table.round(4).to_csv(outdir / 'summary_table.csv', index=False)

    fig, ax = plt.subplots(figsize=(8,5))
    for (selector, level), group in wm.groupby(['selector','level']):
        ax.scatter(group['fivegram_disruption'], group['weighted_drop'], alpha=.6, label=f'{selector}/{level}')
    ax.axhline(0, linewidth=1)
    ax.set_xlabel('Own Words 5-token disruption (%)')
    ax.set_ylabel('SynthID weighted-mean score drop')
    ax.set_title('Sequence disruption vs SynthID score change')
    ax.legend(fontsize=7, ncol=2)
    fig.tight_layout()
    fig.savefig(outdir / 'fivegram_vs_score_drop.png', dpi=160)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(9,5))
    labels, values = [], []
    for selector in ['old','context-aware']:
        for level in ['light','balanced','thorough']:
            g = wm[(wm.selector == selector) & (wm.level == level)]
            labels.append(f'{selector}\n{level}')
            values.append(g['weighted_drop'].dropna().values)
    ax.boxplot(values, labels=labels, showmeans=True)
    ax.axhline(0, linewidth=1)
    ax.set_ylabel('SynthID weighted-mean score drop')
    ax.set_title('Old vs context-aware Own Words selector')
    fig.tight_layout()
    fig.savefig(outdir / 'selector_comparison.png', dpi=160)
    plt.close(fig)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--model', default='distilgpt2')
    p.add_argument('--per-length', type=int, default=8)
    p.add_argument('--outdir', default='benchmark-artifacts')
    args = p.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    outdir = Path(args.outdir).resolve()
    outdir.mkdir(parents=True, exist_ok=True)
    device = torch.device('cpu')
    print(f'model={args.model} device={device} transformers={transformers.__version__}', flush=True)

    tokenizer, standard, watermarked = make_models(args.model, device)
    corpus = build_corpus(standard, watermarked, tokenizer, args.per_length)
    (outdir / 'generated_corpus.json').write_text(json.dumps(corpus, indent=2), encoding='utf-8')

    processor = synthid_processor()
    rewrites = run_own_words(repo_root, corpus, outdir)
    df = score_all(corpus, rewrites, tokenizer, processor)
    df.to_csv(outdir / 'benchmark_results.csv', index=False)
    summarize(df, outdir)
    print(df[df.selector == 'original'].groupby(['source','length_bucket']).weighted_score.mean())
    print(df[(df.source == 'watermarked') & (df.selector != 'original')].groupby(['selector','level'])[['weighted_drop','fivegram_disruption','rewrite_depth','edits']].mean())

if __name__ == '__main__':
    main()
