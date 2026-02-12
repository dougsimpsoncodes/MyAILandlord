#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function trim(s) {
  return (s || '').trim();
}

function resolveBaseRef(inputRef) {
  const fromArg = trim(inputRef);
  if (fromArg && fromArg !== '0000000000000000000000000000000000000000') {
    return fromArg;
  }

  const fromEventBefore = trim(process.env.GITHUB_EVENT_BEFORE);
  if (fromEventBefore && fromEventBefore !== '0000000000000000000000000000000000000000') {
    return fromEventBefore;
  }

  const fromBaseRef = trim(process.env.GITHUB_BASE_REF);
  if (fromBaseRef) {
    return `origin/${fromBaseRef}`;
  }

  const hasParent = run('git', ['rev-parse', '--verify', 'HEAD~1']);
  if (hasParent.status === 0) {
    return 'HEAD~1';
  }

  return '';
}

function ensureRefIsFetchable(baseRef) {
  if (!baseRef.startsWith('origin/')) {
    return;
  }

  const branch = baseRef.replace(/^origin\//, '');
  run('git', ['fetch', '--no-tags', '--prune', 'origin', branch], { stdio: 'ignore' });
}

function getChangedTsFiles(baseRef) {
  const diffRange = baseRef ? `${baseRef}...HEAD` : 'HEAD';
  const diff = run('git', ['diff', '--name-only', diffRange]);

  if (diff.status !== 0) {
    return [];
  }

  return diff.stdout
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .filter(file => /^src\/.*\.(ts|tsx)$/.test(file))
    .filter(file => fs.existsSync(file));
}

function getAddedLinesForFile(baseRef, filePath) {
  const diffRange = baseRef ? `${baseRef}...HEAD` : 'HEAD';
  const diff = run('git', ['diff', '--unified=0', diffRange, '--', filePath]);
  const lines = new Set();

  if (diff.status !== 0) {
    return lines;
  }

  for (const line of diff.stdout.split('\n')) {
    const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!match) {
      continue;
    }

    const start = Number(match[1]);
    const count = Number(match[2] || '1');
    for (let i = 0; i < count; i += 1) {
      lines.add(start + i);
    }
  }

  return lines;
}

function chunks(input, size) {
  const out = [];
  for (let i = 0; i < input.length; i += size) {
    out.push(input.slice(i, i + size));
  }
  return out;
}

function runEslintJson(files) {
  const report = [];

  for (const group of chunks(files, 25)) {
    const eslint = run('npx', ['eslint', '--format', 'json', ...group]);

    if (eslint.status !== 0 && eslint.status !== 1) {
      process.stderr.write(eslint.stderr || eslint.stdout || 'ESLint execution failed.\n');
      process.exit(eslint.status || 2);
    }

    let parsed;
    try {
      parsed = JSON.parse(eslint.stdout || '[]');
    } catch (error) {
      console.error('Failed to parse ESLint JSON output.');
      process.stderr.write(eslint.stdout || '');
      process.exit(2);
    }

    report.push(...parsed);
  }

  return report;
}

function main() {
  const baseRef = resolveBaseRef(process.argv[2]);
  if (baseRef) {
    ensureRefIsFetchable(baseRef);
  }

  const files = getChangedTsFiles(baseRef);
  if (files.length === 0) {
    console.log('No changed TypeScript files under src/. Skipping lint-on-new-lines gate.');
    process.exit(0);
  }

  const report = runEslintJson(files);

  const addedLineMap = new Map();
  for (const file of files) {
    addedLineMap.set(file, getAddedLinesForFile(baseRef, file));
  }

  const failures = [];

  for (const fileResult of report) {
    const relPath = fileResult.filePath.replace(`${process.cwd()}/`, '');
    const addedLines = addedLineMap.get(relPath) || new Set();

    for (const message of fileResult.messages || []) {
      if (message.severity !== 2) {
        continue;
      }

      const line = Number(message.line || 0);
      const endLine = Number(message.endLine || line);

      let intersectsAddedLines = false;
      if (line === 0 && endLine === 0) {
        intersectsAddedLines = true;
      } else {
        for (let n = line; n <= endLine; n += 1) {
          if (addedLines.has(n)) {
            intersectsAddedLines = true;
            break;
          }
        }
      }

      if (!intersectsAddedLines) {
        continue;
      }

      failures.push({
        file: relPath,
        line: message.line || 0,
        rule: message.ruleId || 'unknown-rule',
        text: message.message,
      });
    }
  }

  if (failures.length === 0) {
    console.log('ESLint passed for all newly added/changed lines.');
    process.exit(0);
  }

  console.error('Lint errors on newly added/changed lines:');
  for (const failure of failures) {
    console.error(`- ${failure.file}:${failure.line} [${failure.rule}] ${failure.text}`);
  }
  process.exit(1);
}

main();
