#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--generated', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--model', default='EleutherAI/pythia-14m')
    args = parser.parse_args()

    generated = json.loads(Path(args.generated).read_text(encoding='utf-8'))
    tokenizer = AutoTokenizer.from_pretrained(args.model, use_fast=True)
    model = AutoModelForCausalLM.from_pretrained(args.model)
    model.eval()
    torch.set_num_threads(max(1, min(4, torch.get_num_threads())))

    maps = {}
    for record in generated['records']:
        if record['source_type'] != 'watermarked':
            continue
        text = record['text']
        encoded = tokenizer(
            text,
            return_tensors='pt',
            add_special_tokens=False,
            return_offsets_mapping=True,
        )
        offsets = encoded.pop('offset_mapping')[0].tolist()
        ids = encoded['input_ids']
        if ids.shape[1] < 2:
            maps[record['id']] = []
            continue

        with torch.inference_mode():
            logits = model(**encoded).logits[0, :-1, :].float()
            log_probs = torch.log_softmax(logits, dim=-1)
            target = ids[0, 1:]
            surprisal = (-log_probs.gather(1, target[:, None]).squeeze(1)).cpu().tolist()

        # surprisal[i-1] is the surprisal of token i, predicted from its prefix.
        tokens = []
        for token_index in range(1, len(offsets)):
            start, end = offsets[token_index]
            tokens.append({
                'start': int(start),
                'end': int(end),
                'surprisal': float(surprisal[token_index - 1]),
            })
        maps[record['id']] = tokens
        print(f"mapped {record['id']} ({len(tokens)} tokens)", flush=True)

    Path(args.output).write_text(json.dumps({
        'surrogate_model': args.model,
        'maps': maps,
    }), encoding='utf-8')


if __name__ == '__main__':
    main()
