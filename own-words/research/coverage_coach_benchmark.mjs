#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import process from 'node:process';

const [generatedPath, outputPath] = process.argv.slice(2);
if (!generatedPath || !outputPath) {
  console.error('Usage: node coverage_coach_benchmark.mjs GENERATED OUTPUT');
  process.exit(2);
}

const ownWordsDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const scripts = [
  'phrases.js','connectives.js','compressions.js','words.js','words-thorough.js',
  'patterns.js','syntax.js','corpus-2.js','corpus-3.js','corpus-4.js','corpus-5.js',
  'corpus-6.js','corpus-7.js','grammar.js','limits.js','metrics.js','engine.js','coverage-coach.js'
];
const context = vm.createContext({ console });
context.window = context;
for (const filename of scripts) {
  const fullPath = path.join(ownWordsDir, filename);
  vm.runInContext(fs.readFileSync(fullPath, 'utf8'), context, { filename: fullPath });
}

const generated = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
const goals = [0.5, 0.75, 0.9];
const rows = [];

for (const record of generated.records) {
  if (record.source_type !== 'watermarked') continue;
  const automated = context.OwnWordsEngine.findCandidates(record.text, 'thorough');
  const base = context.OwnWordsCoverageCoach.selectTargets(record.text, automated, {
    goal: 1,
    maxTargets: 100,
  });

  const result = {
    id: record.id,
    proxy_tokens: context.OwnWordsCoverageCoach.tokenize(record.text).length,
    total_windows: base.totalWindows,
    automated_edits: automated.length,
    automated_coverage: base.startingCoverage,
    goals: {},
    target_preview: base.targets.slice(0, 20),
  };

  for (const goal of goals) {
    const guided = context.OwnWordsCoverageCoach.selectTargets(record.text, automated, {
      goal,
      maxTargets: 100,
    });
    result.goals[String(Math.round(goal * 100))] = {
      targets: guided.targets.length,
      projected_coverage: guided.projectedCoverage,
      reached: guided.reachedGoal,
    };
  }
  rows.push(result);
  console.log(`${record.id}: automated=${(100*result.automated_coverage).toFixed(1)}% targets50=${result.goals['50'].targets} targets75=${result.goals['75'].targets} targets90=${result.goals['90'].targets}`);
}

function average(values) {
  return values.length ? values.reduce((a,b)=>a+b,0) / values.length : 0;
}

const summary = {
  passages: rows.length,
  automated_edits_mean: average(rows.map(r=>r.automated_edits)),
  automated_coverage_mean: average(rows.map(r=>r.automated_coverage)),
  goals: {},
};
for (const goal of goals) {
  const key = String(Math.round(goal * 100));
  summary.goals[key] = {
    targets_mean: average(rows.map(r=>r.goals[key].targets)),
    targets_max: Math.max(...rows.map(r=>r.goals[key].targets)),
    reached_fraction: average(rows.map(r=>r.goals[key].reached ? 1 : 0)),
    projected_coverage_mean: average(rows.map(r=>r.goals[key].projected_coverage)),
  };
}

const report = [
  '# Coverage coach benchmark',
  '',
  'This is a **model-neutral planning experiment**. After the current Thorough automated pass, the coverage coach greedily selects well-spaced untouched content-word positions that would cover the largest number of still-uncovered source proxy five-token windows if the user rewrote something at each target. It does not invent the replacement and does not claim the projected coverage equals a watermark-detector score.',
  '',
  `- Watermarked benchmark passages: **${summary.passages}**`,
  `- Mean automated Thorough edits: **${summary.automated_edits_mean.toFixed(1)}**`,
  `- Mean source-window coverage from those automated edits: **${(100*summary.automated_coverage_mean).toFixed(1)}%**`,
  '',
  '| projected local-context coverage | mean guided human targets | max targets | passages reaching goal |',
  '|---|---:|---:|---:|',
];
for (const goal of goals) {
  const key = String(Math.round(goal * 100));
  const item = summary.goals[key];
  report.push(`| ${key}% | ${item.targets_mean.toFixed(1)} | ${item.targets_max} | ${(100*item.reached_fraction).toFixed(0)}% |`);
}
report.push('',
  'A target is not an instruction to substitute one particular word. It identifies a high-value untouched neighborhood. The intended UX is to let the user rephrase a word or short phrase there in their own language.',
  '',
  'The greedy targeter skips function words, punctuation, and text already covered by an automated candidate, and avoids choosing targets within five proxy tokens of one another. Its projected coverage therefore represents a conservative, human-editable approximation rather than a theoretical unconstrained maximum.'
);

fs.writeFileSync(outputPath, JSON.stringify({ summary, rows }, null, 2));
fs.writeFileSync(outputPath.replace(/\.json$/i, '.md'), report.join('\n') + '\n');
console.log('\n' + report.join('\n'));
