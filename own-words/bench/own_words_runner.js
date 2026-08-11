#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const [,, inputPath, oldEnginePath, newEnginePath, outputPath] = process.argv;
if (!outputPath) {
  console.error('usage: node own_words_runner.js INPUT OLD_ENGINE NEW_ENGINE OUTPUT');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..');
global.window = global;

function load(file) {
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
}

[
  'phrases.js','words.js','words-thorough.js','patterns.js',
  'corpus-2.js','corpus-3.js','corpus-4.js','corpus-5.js','corpus-6.js','corpus-7.js',
  'grammar.js','limits.js','metrics.js'
].forEach(name => load(path.join(ROOT, name)));

const metrics = window.OwnWordsMetrics;

function applyCandidates(text, candidates, engine) {
  const ordered = [...candidates].sort((a,b) => a.start - b.start);
  let out = '', cursor = 0;
  for (const c of ordered) {
    out += text.slice(cursor, c.start);
    const choice = engine.hash(`${c.original}|${c.start}|0`) % c.alts.length;
    out += c.alts[choice] || c.original;
    cursor = c.end;
  }
  return out + text.slice(cursor);
}

function runEngine(enginePath, examples, label) {
  load(enginePath);
  const engine = window.OwnWordsEngine;
  const rows = [];
  for (const example of examples) {
    for (const level of ['light','balanced','thorough']) {
      const candidates = engine.findCandidates(example.text, level);
      const revised = applyCandidates(example.text, candidates, engine);
      const scored = metrics.scoreRewrite(example.text, revised, { candidates, level });
      rows.push({
        id: example.id,
        selector: label,
        level,
        revised,
        edits: candidates.length,
        rewrite_depth: scored.depth,
        token_turnover: scored.tokenTurnover,
        trigram_disruption: scored.trigramDisruption,
        fivegram_disruption: scored.fivegramDisruption,
        coverage: scored.coverage,
        structural_edits: scored.structuralEdits,
        stop_reason: candidates.selectionMeta ? candidates.selectionMeta.reason : null
      });
    }
  }
  return rows;
}

const examples = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const rows = [
  ...runEngine(oldEnginePath, examples, 'old'),
  ...runEngine(newEnginePath, examples, 'context-aware')
];
fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2));
