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
  let output = '';
  let cursor = 0;
  for (const candidate of candidates) {
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

function rewriteWith(context, record, selector, mode) {
  const candidates = context.OwnWordsEngine.findCandidates(record.text, mode);
  const revised = applyCandidates(context, record.text, candidates, 0);
  const metrics = context.OwnWordsMetrics.scoreRewrite(record.text, revised, {
    candidates,
    level: mode,
  });
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

const generated = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
const oldContext = buildContext(path.resolve(oldEnginePath));
const contextAware = buildContext(path.resolve(contextEnginePath));
const rewrites = [];

for (const record of generated.records) {
  for (const mode of ['light', 'balanced', 'thorough']) {
    rewrites.push(rewriteWith(oldContext, record, 'old', mode));
    rewrites.push(rewriteWith(contextAware, record, 'context', mode));
  }
  console.log(`rewrote ${record.id} ${record.source_type}`);
}

const payload = {
  source_configuration: generated.configuration,
  old_engine: oldEnginePath,
  context_engine: contextEnginePath,
  rewrites,
};
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
console.log(`wrote ${rewrites.length} rewrites to ${outputPath}`);
