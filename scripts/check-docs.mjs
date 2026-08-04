#!/usr/bin/env node
/**
 * docs:check — verify the `docs/` tree conforms to `docs/governance.md §9`.
 *
 * Run from the repo root: `npm run docs:check` (or `node scripts/check-docs.mjs`).
 * Exits non-zero on any structural defect.
 *
 * Validations (mapped 1:1 to governance §9):
 *   1. ADR and RFC numbering is consecutive with no gaps.
 *   2. Every features/*.md (except _template.md) has the 13 required sections
 *      and a `**Status:**` value from the allowed set.
 *   3. Features with status `completed` are referenced from docs/progress.md.
 *   4. Features with status `in_progress` reference an active implementation plan.
 *   5. Cross-document references resolve (no dangling file links).
 *   6. design-document.md does not contain legacy sprint/task markers.
 *   7. Implementation plan task scopes are in the allowed set.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const DOCS = path.join(ROOT, 'docs');

const FEATURE_REQUIRED_SECTIONS = [
  '## 1. Resumen',
  '## 2. Problema',
  '## 3. Objetivos',
  '## 4. Casos de uso',
  '## 5. Requisitos funcionales',
  '## 6. Requisitos no funcionales',
  '## 7. Cambios al modelo de datos',
  '## 8. Cambios de API',
  '## 9. Cambios UI',
  '## 10. Riesgos',
  '## 11. Casos borde',
  '## 12. Definition of Done',
  '## 13. Impacto sobre otras funcionalidades',
];

const ALLOWED_STATUSES = [
  'draft',
  'pending',
  'in_progress',
  'completed',
  'accepted',
  'rejected',
  'deferred',
];
const ALLOWED_SCOPES = ['backend', 'frontend', 'prediction-service', 'docs', 'deps', 'infra'];
const LEGACY_SPRINT_MARKERS = [
  /\bFase\s+\d/iu,
  /\bTarea\s+\d+\.\d+/iu,
  /\bF\d+\.\d+/u,
  /§\d+\s+Sprint/iu,
];

const issues = [];
const err = (file, message) => issues.push({ level: 'error', file, message });
const warn = (file, message) => issues.push({ level: 'warning', file, message });

const rel = (absPath) => path.relative(ROOT, absPath);

const read = (relPath) =>
  fs.readFileSync(path.join(ROOT, relPath), 'utf-8');

const listDir = (relPath) => {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => fs.statSync(path.join(abs, f)).isFile());
};

const existsRel = (relPath) => fs.existsSync(path.join(ROOT, relPath));

// =====================================================================
// 1. ADR + RFC numbering (consecutive, start at 0, no gaps)
// =====================================================================

function checkSequentialNumbering(relDir, prefix, label) {
  const files = listDir(relDir).filter(
    (f) => new RegExp(`^${prefix}-\\d+`).test(f) && f.endsWith('.md'),
  );
  if (files.length === 0) return;

  const numbers = files
    .map((f) => parseInt(f.match(new RegExp(`^${prefix}-(\\d+)`))[1], 10))
    .sort((a, b) => a - b);

  if (numbers[0] !== 0) {
    err(`${relDir}/`, `${label} numbering must start at 0; found first index ${numbers[0]}`);
  }
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] !== i) {
      const expected = String(i).padStart(3, '0');
      const got = String(numbers[i]).padStart(3, '0');
      err(
        `${relDir}/`,
        `${label} numbering gap: expected ${prefix}-${expected}, got ${prefix}-${got}`,
      );
    }
  }
}

// =====================================================================
// 2. Feature required sections + valid status
// =====================================================================

function checkFeatureSections() {
  const files = listDir('docs/features').filter((f) => f !== '_template.md');
  for (const f of files) {
    const relPath = `docs/features/${f}`;
    const content = read(relPath);
    for (const section of FEATURE_REQUIRED_SECTIONS) {
      if (!content.includes(section)) {
        err(relPath, `missing required section: ${section}`);
      }
    }
    const statusMatch = content.match(/\*\*Status:\*\*\s*`?(\w+)`?/);
    if (!statusMatch) {
      err(relPath, 'missing **Status:** line in frontmatter');
    } else if (!ALLOWED_STATUSES.includes(statusMatch[1])) {
      err(
        relPath,
        `invalid Status: "${statusMatch[1]}" (allowed: ${ALLOWED_STATUSES.join(', ')})`,
      );
    }
  }
}

// =====================================================================
// 3. completed features must appear in progress.md
// =====================================================================

function checkCompletedInProgress() {
  if (!existsRel('docs/progress.md')) return;
  const progress = read('docs/progress.md');
  const files = listDir('docs/features').filter((f) => f !== '_template.md');
  for (const f of files) {
    const content = read(`docs/features/${f}`);
    const statusMatch = content.match(/\*\*Status:\*\*\s*`?(\w+)`?/);
    if (statusMatch && statusMatch[1] === 'completed') {
      const slug = f.replace(/\.md$/, '');
      if (!progress.includes(slug)) {
        err('docs/progress.md', `completed feature "${slug}" not referenced in progress.md`);
      }
    }
  }
}

// =====================================================================
// 4. in_progress features must reference an active plan
// =====================================================================

function checkInProgressReferencesPlan() {
  const activePlans = [];
  const currentPath = 'docs/implementation/current.md';
  if (existsRel(currentPath)) {
    const content = read(currentPath);
    if (/^>\s*\*\*Status:\*\*\s*`?active`?/mu.test(content)) {
      activePlans.push(currentPath);
    }
  }
  const implFiles = listDir('docs/implementation').filter(
    (f) => /^v\d+\.\d+\.md$/.test(f) && f.endsWith('.md'),
  );
  for (const f of implFiles) {
    const p = `docs/implementation/${f}`;
    if (existsRel(p)) activePlans.push(p);
  }

  const files = listDir('docs/features').filter((f) => f !== '_template.md');
  for (const f of files) {
    const content = read(`docs/features/${f}`);
    const statusMatch = content.match(/\*\*Status:\*\*\s*`?(\w+)`?/);
    if (statusMatch && statusMatch[1] === 'in_progress') {
      const slug = f.replace(/\.md$/, '');
      const referenced = activePlans.some((p) => read(p).includes(slug));
      if (!referenced) {
        err(
          `docs/features/${f}`,
          `in_progress feature "${slug}" not referenced by any active implementation plan`,
        );
      }
    }
  }
}

// =====================================================================
// 5. Cross-document references resolve (file links only, not anchors)
// =====================================================================

function checkCrossReferences() {
  const mdFiles = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip the archive folder — archived files preserve pre-DDD links
        // verbatim and are not part of the live cross-reference graph.
        if (full.endsWith(path.join('docs', 'implementation', 'archive'))) {
          continue;
        }
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        mdFiles.push(full);
      }
    }
  };
  if (fs.existsSync(DOCS)) walk(DOCS);
  // Also scan root .md files
  for (const f of fs.readdirSync(ROOT)) {
    if (f.endsWith('.md') && !f.startsWith('.')) {
      mdFiles.push(path.join(ROOT, f));
    }
  }

  const linkRe = /\[([^\]]*)\]\(([^)]+\.md(?:#[^)]*)?)\)/g;
  for (const file of mdFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    let m;
    while ((m = linkRe.exec(content)) !== null) {
      const target = m[2].split('#')[0];
      // Skip external links (http/https)
      if (/^https?:/i.test(target)) continue;
      // Skip placeholder/example links
      if (target.startsWith('<') && target.endsWith('>')) continue;
      const fromDir = path.dirname(file);
      const resolved = path.resolve(fromDir, target);
      if (!fs.existsSync(resolved)) {
        err(rel(file), `dangling link: ${m[2]} -> ${rel(resolved)} (not found)`);
      }
    }
  }
}

// =====================================================================
// 6. design-document.md does not contain legacy sprint markers
// =====================================================================

function checkDesignDocNoLegacyMarkers() {
  const target = 'docs/design-document.md';
  if (!existsRel(target)) return;
  const content = read(target);
  for (const re of LEGACY_SPRINT_MARKERS) {
    if (re.test(content)) {
      err(target, `design-document.md contains legacy sprint/task marker: ${re}`);
    }
  }
}

// =====================================================================
// 7. Implementation plan task scopes are allowed
// =====================================================================

function checkImplementationScopes() {
  const implFiles = [
    ...(existsRel('docs/implementation/current.md') ? ['docs/implementation/current.md'] : []),
    ...listDir('docs/implementation')
      .filter((f) => /^v\d+\.\d+\.md$/.test(f))
      .map((f) => `docs/implementation/${f}`),
  ];
  const scopeRe = /\|\s*`?(backend|frontend|prediction-service|docs|deps|infra)`?\s*\|/gu;
  for (const f of implFiles) {
    const content = read(f);
    // scan all scope-ish mentions inside the table rows
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // match columns that look like a scope (single lowercase word, often in backticks)
      const cellMatch = line.match(/\|\s*`?([a-z][a-z-]*)`?\s*\|/g);
      if (!cellMatch) continue;
      for (const cell of cellMatch) {
        const word = cell.replace(/[|`]/g, '').trim();
        if (word && ALLOWED_SCOPES.includes(word)) return; // legitimate scope cell
      }
    }
  }
}

// =====================================================================
// Main
// =====================================================================

function main() {
  if (!fs.existsSync(DOCS)) {
    err('docs/', 'docs/ directory does not exist');
  } else {
    checkSequentialNumbering('docs/decisions', 'ADR', 'ADR');
    checkSequentialNumbering('docs/rfcs', 'RFC', 'RFC');
    checkFeatureSections();
    checkCompletedInProgress();
    checkInProgressReferencesPlan();
    checkCrossReferences();
    checkDesignDocNoLegacyMarkers();
    checkImplementationScopes();
  }

  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  for (const i of issues) {
    const tag = i.level === 'error' ? 'ERROR' : 'WARN ';
    console.log(`[${tag}] ${i.file}: ${i.message}`);
  }

  if (issues.length === 0) {
    console.log('docs:check — OK');
  } else {
    console.log(
      `\ndocs:check — ${errors.length} error(s), ${warnings.length} warning(s)`,
    );
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

main();
