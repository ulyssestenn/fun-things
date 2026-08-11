#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import process from 'node:process';

const [generatedPath, outputPath, oldEnginePath, contextEnginePath] = process.argv.slice(2);
if (!generatedPath || !outputPath || !oldEnginePath || !contextEnginePath) {
  console.error('Usage: node synthid_rewrite_runner.mjs GENERATED OUTPUT OLD_ENGINE CONTEXT_ENGINE');
  process.exit(2);
}

const ownWordsDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const commonScripts = [
  'phrases.js',
  'words.js',
  'words-thorough.js',
  'patterns.js',
  'syntax.js',
  'corpus-2.js',
  'corpus-3.js',
  'corpus-4.js',
  'corpus-5.js',
  'corpus-6.js',
  'corpus-7.js',
  'grammar.js',
  'limits.js',
  'metrics.js',
];

function buildContext(enginePath) {
  const context = vm.createContext({ console });
  context.window = context;
  for (const filename of commonScripts) {
    const fullPath = path.join(ownWordsDir, filename);
    vm.runInContext(fs.readFileSync(fullPath, 'utf8'), context, { filename: fullPath });
  }
  vm.runInContext(fs.readFileSync(enginePath, 'utf8'), context, { filename: enginePath });
  if (!context.OwnWordsEngine || !context.OwnWordsMetrics) {
    throw new Error(`Own Words did not initialize with engine ${enginePath}`);
  }
  return context;
}

function applyCandidates(context, source, candidates, pass = 0) {
  const ordered = [...candidates].sort((a, b) => a.start - b.start);
  let output = '';
  let cursor = 0;
  for (const candidate of ordered) {
    output += source.slice(cursor, candidate.start);
    const alts = candidate.alts || [];
    let replacement = candidate.original;
    if (alts.length) {
      const choice = context.OwnWordsEngine.hash(
        `${candidate.original}|${candidate.start}|${pass}`
      ) % alts.length;
      replacement = alts[choice];
    }
    output += replacement;
    cursor = candidate.end;
  }
  return output + source.slice(cursor);
}

function metricsFor(context, record, candidates, mode = 'thorough') {
  const revised = applyCandidates(context, record.text, candidates, 0);
  const metrics = context.OwnWordsMetrics.scoreRewrite(record.text, revised, {
    candidates,
    level: mode,
  });
  return { revised, metrics };
}

function rewriteWith(context, record, selector, mode) {
  const candidates = context.OwnWordsEngine.findCandidates(record.text, mode);
  const { revised, metrics } = metricsFor(context, record, candidates, mode);
  const selectionMeta = candidates.selectionMeta ? { ...candidates.selectionMeta } : null;
  return {
    id: record.id,
    prompt: record.prompt,
    source_type: record.source_type,
    selector,
    mode,
    edit_count: candidates.length,
    selection_meta: selectionMeta,
    metrics,
    text: revised,
  };
}

function clusteredSubset(candidates, k) {
  const ordered = [...candidates].sort((a, b) => a.start - b.start);
  let best = ordered.slice(0, k);
  let bestSpan = Infinity;
  for (let i = 0; i <= ordered.length - k; i++) {
    const group = ordered.slice(i, i + k);
    const span = group[group.length - 1].end - group[0].start;
    if (span < bestSpan) {
      bestSpan = span;
      best = group;
    }
  }
  return best;
}

function spreadSubset(candidates, k) {
  const ordered = [...candidates].sort((a, b) => a.start - b.start);
  if (ordered.length <= k) return ordered;
  const selected = [ordered[0], ordered[ordered.length - 1]];
  const used = new Set(selected);
  while (selected.length < k) {
    let best = null;
    let bestDistance = -1;
    for (const candidate of ordered) {
      if (used.has(candidate)) continue;
      const center = (candidate.start + candidate.end) / 2;
      let nearest = Infinity;
      for (const chosen of selected) {
        const chosenCenter = (chosen.start + chosen.end) / 2;
        nearest = Math.min(nearest, Math.abs(center - chosenCenter));
      }
      if (nearest > bestDistance) {
        bestDistance = nearest;
        best = candidate;
      }
    }
    if (!best) break;
    selected.push(best);
    used.add(best);
  }
  return selected.sort((a, b) => a.start - b.start);
}

function seededRandom(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function randomSubset(candidates, k, seed) {
  const rng = seededRandom(seed);
  const pool = [...candidates];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, k).sort((a, b) => a.start - b.start);
}

function placementControl(context, record, mode, candidates, controlKind, controlIndex, k) {
  let subset;
  if (controlKind === 'clustered') subset = clusteredSubset(candidates, k);
  else if (controlKind === 'spread') subset = spreadSubset(candidates, k);
  else subset = randomSubset(candidates, k, context.OwnWordsEngine.hash(`${record.id}|${controlIndex}|placement`));
  const { revised, metrics } = metricsFor(context, record, subset, mode);
  return {
    id: record.id,
    prompt: record.prompt,
    source_type: record.source_type,
    selector: 'placement',
    mode: controlKind === 'random' ? `random-${String(controlIndex).padStart(2, '0')}` : controlKind,
    edit_count: subset.length,
    control_k: k,
    metrics,
    text: revised,
  };
}

const generated = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
const oldContext = buildContext(path.resolve(oldEnginePath));
const contextAware = buildContext(path.resolve(contextEnginePath));
const rewrites = [];

for (const record of generated.records) {
  for (const mode of ['light', 'balanced', 'thorough']) {
    rewrites.push(rewriteWith(oldContext, record, 'old', mode));
    rewrites.push(rewriteWith(contextAware, record, 'context', mode));
  }

  // Fixed-edit placement controls isolate whether edit dispersion matters beyond
  // raw edit count. We use the Thorough candidate set because benchmark passages
  // have historically exhausted it, making it a conservative candidate pool.
  if (record.source_type === 'watermarked') {
    const pool = contextAware.OwnWordsEngine.findCandidates(record.text, 'thorough');
    const k = 4;
    if (pool.length >= 8) {
      rewrites.push(placementControl(contextAware, record, 'thorough', pool, 'clustered', 0, k));
      rewrites.push(placementControl(contextAware, record, 'thorough', pool, 'spread', 0, k));
      for (let i = 0; i < 20; i++) {
        rewrites.push(placementControl(contextAware, record, 'thorough', pool, 'random', i, k));
      }
    }
  }
  console.log(`rewrote ${record.id} ${record.source_type}`);
}

const payload = {
  source_configuration: generated.configuration,
  old_engine: oldEnginePath,
  context_engine: contextEnginePath,
  syntax_rules: true,
  placement_control: {
    edit_count: 4,
    random_subsets_per_eligible_watermarked_passage: 20,
    minimum_candidate_pool: 8,
  },
  rewrites,
};
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
console.log(`wrote ${rewrites.length} rewrites to ${outputPath}`);
