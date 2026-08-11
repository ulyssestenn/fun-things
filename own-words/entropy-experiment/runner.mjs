#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import process from 'node:process';

const [generatedPath, surprisalPath, outputPath] = process.argv.slice(2);
if (!generatedPath || !surprisalPath || !outputPath) {
  console.error('Usage: node runner.mjs GENERATED SURPRISAL OUTPUT');
  process.exit(2);
}

const ownWordsDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const scripts = [
  'phrases.js','connectives.js','compressions.js','words.js','words-thorough.js',
  'patterns.js','syntax.js','corpus-2.js','corpus-3.js','corpus-4.js','corpus-5.js',
  'corpus-6.js','corpus-7.js','grammar.js','limits.js','metrics.js','engine.js'
];
const context = vm.createContext({ console });
context.window = context;
for (const filename of scripts) {
  const fullPath = path.join(ownWordsDir, filename);
  vm.runInContext(fs.readFileSync(fullPath, 'utf8'), context, { filename: fullPath });
}

const generated = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
const surprisalPayload = JSON.parse(fs.readFileSync(surprisalPath, 'utf8'));
const maps = surprisalPayload.maps || {};
const engine = context.OwnWordsEngine;
const metrics = context.OwnWordsMetrics;
const K = 4;

function candidateSurprisal(candidate, tokenMap) {
  if (!tokenMap || !tokenMap.length) return 0;
  const direct = [];
  for (let i = 0; i < tokenMap.length; i++) {
    const token = tokenMap[i];
    if (token.end > candidate.start && token.start < candidate.end) direct.push(i);
  }
  if (!direct.length) return 0;
  const affected = new Set();
  for (const base of direct) {
    for (let i = base; i < Math.min(tokenMap.length, base + 5); i++) affected.add(i);
  }
  let total = 0;
  for (const i of affected) total += tokenMap[i].surprisal;
  return total / affected.size;
}

function greedy(pool, k, weighted) {
  const remaining = [...pool];
  const selected = [];
  const covered = new Set();

  while (remaining.length && selected.length < k) {
    let bestIndex = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i];
      const windows = Array.isArray(c.contextWindows) ? c.contextWindows : [];
      let fresh = 0;
      for (const w of windows) if (!covered.has(w)) fresh++;
      const weight = weighted ? Math.max(0.01, c.surprisal || 0) : 1;
      // Quality breaks near-ties but does not overwhelm marginal sequence gain.
      const score = fresh * weight + (c.q || 0) * 1e-3;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    if (bestIndex < 0) break;
    const candidate = remaining.splice(bestIndex, 1)[0];
    selected.push(candidate);
    for (const w of candidate.contextWindows || []) covered.add(w);
    // The product cannot apply overlapping source edits simultaneously.
    for (let i = remaining.length - 1; i >= 0; i--) {
      const c = remaining[i];
      if (candidate.start < c.end && c.start < candidate.end) remaining.splice(i, 1);
    }
  }
  return selected.sort((a, b) => a.start - b.start);
}

function apply(source, candidates) {
  let out = '', cursor = 0;
  for (const c of candidates) {
    out += source.slice(cursor, c.start);
    out += (c.alts && c.alts[0]) || c.original;
    cursor = c.end;
  }
  return out + source.slice(cursor);
}

function emit(record, selector, candidates) {
  const text = apply(record.text, candidates);
  return {
    id: record.id,
    prompt: record.prompt,
    source_type: record.source_type,
    selector,
    mode: 'fixed4',
    edit_count: candidates.length,
    metrics: metrics.scoreRewrite(record.text, text, { candidates, level: 'thorough' }),
    selected: candidates.map(c => ({
      original: c.original,
      start: c.start,
      end: c.end,
      q: c.q,
      type: c.type,
      transformClass: c.transformClass || null,
      destroyedWindows: (c.contextWindows || []).length,
      surprisal: c.surprisal || 0,
    })),
    text,
  };
}

const rewrites = [];
for (const record of generated.records) {
  if (record.source_type !== 'watermarked') continue;
  const pool = engine.findCandidates(record.text, 'thorough');
  if (pool.length < K) continue;
  const tokenMap = maps[record.id] || [];
  for (const c of pool) c.surprisal = candidateSurprisal(c, tokenMap);

  const coverage = greedy(pool, K, false);
  const entropy = greedy(pool, K, true);
  rewrites.push(emit(record, 'coverage4', coverage));
  rewrites.push(emit(record, 'surprisal4', entropy));
  console.log(`${record.id}: pool=${pool.length} coverage=${coverage.length} surprisal=${entropy.length}`);
}

fs.writeFileSync(outputPath, JSON.stringify({
  source_configuration: generated.configuration,
  surrogate_model: surprisalPayload.surrogate_model,
  fixed_edit_count: K,
  rewrites,
}, null, 2));
