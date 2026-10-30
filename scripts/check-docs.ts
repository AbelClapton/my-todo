import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import process from 'node:process';

/**
 * The doc lint (`09-roadmap/build-order.md` step 0.3b).
 *
 * It checks the **shape** rules the doc set states about itself, because those
 * are the ones that rot silently: a doc that has grown a sixth section, an ADR
 * that skipped its Consequences, a new spec nobody added to the reading order,
 * an ADR number reused. Every rule below is quoted from the document that owns
 * it, so a failure is never a matter of taste.
 *
 * **What it deliberately does not check.** `docs/README.md` also requires
 * canonical terms rather than synonyms, that a rule is referenced by name rather
 * than restated, and that dates are absolute rather than "recently" or "last
 * week". Those are prose judgements, and a lint that guesses at prose produces
 * false positives — "the last two `day.opened` entries" is correct and "last
 * week" is not, and no regular expression separates them. What can be decided
 * mechanically is decided here; the rest stays review.
 */

const REPO_ROOT = join(import.meta.dirname, '..');
const DOCS_ROOT = join(REPO_ROOT, 'docs');
const DECISIONS_DIR = join(DOCS_ROOT, '08-decisions');
const ADR_INDEX = join(DECISIONS_DIR, 'README.md');
const DOC_INDEX = join(DOCS_ROOT, 'README.md');

/** `docs/README.md` §Doc structure, in the order it gives them. */
const SPEC_SECTIONS = [
  '## Purpose',
  '## Invariants',
  '## Specification',
  '## Examples',
  '## What this doc must NOT do',
] as const;

/** The same section's ADR shape. */
const ADR_SECTIONS = [
  '## Context',
  '## Decision',
  '## Consequences',
  '## Alternatives considered',
] as const;

/** The three-line header every ADR carries, as ADR 0010 established it. */
const ADR_FIELDS = ['**Status:**', '**Date:**', '**Deciders:**'] as const;

type Issue = {
  readonly file: string;
  readonly line: number;
  readonly message: string;
};

type Heading = {
  readonly text: string;
  readonly line: number;
};

/** Paths are posix here, so a message reads the same on Windows and in CI. */
function toPosix(path: string): string {
  return path.split(sep).join('/');
}

function displayPath(absolutePath: string): string {
  return toPosix(relative(REPO_ROOT, absolutePath));
}

function linesOf(path: string): readonly string[] {
  return readFileSync(path, 'utf8').split(/\r?\n/);
}

function markdownFilesIn(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      return markdownFilesIn(full);
    }
    return entry.isFile() && entry.name.endsWith('.md') ? [full] : [];
  });
}

function headingsOf(lines: readonly string[]): readonly Heading[] {
  return lines.flatMap((text, index) =>
    text.startsWith('## ') ? [{ text, line: index + 1 }] : [],
  );
}

/** The body under a heading, up to the next `##`. */
function bodyOf(lines: readonly string[], heading: Heading): readonly string[] {
  const rest = lines.slice(heading.line);
  const end = rest.findIndex((text) => text.startsWith('## '));
  return end === -1 ? rest : rest.slice(0, end);
}

function lineOf(lines: readonly string[], test: (text: string) => boolean): number {
  const index = lines.findIndex(test);
  return index === -1 ? 1 : index + 1;
}

function exists(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * A spec doc has the five sections in order, and the prohibitions are last and
 * not empty — *"Prohibitions are mandatory. Do not leave the section empty."*
 */
function checkSpecDoc(path: string, lines: readonly string[]): readonly Issue[] {
  const file = displayPath(path);
  const headings = headingsOf(lines);
  const issues: Issue[] = [];

  let floor = 0;
  for (const section of SPEC_SECTIONS) {
    const at = headings.findIndex((heading) => heading.text === section);
    if (at === -1) {
      issues.push({ file, line: 1, message: `missing section \`${section}\`` });
      continue;
    }
    const heading = headings[at];
    if (heading === undefined) {
      continue;
    }
    if (at < floor) {
      issues.push({ file, line: heading.line, message: `section \`${section}\` is out of order` });
    }
    floor = at;
  }

  const prohibitions = headings.find((heading) => heading.text === '## What this doc must NOT do');
  if (prohibitions !== undefined) {
    if (!bodyOf(lines, prohibitions).some((text) => /^\s*[-*]\s+\S/.test(text))) {
      issues.push({ file, line: prohibitions.line, message: 'the prohibitions section is empty' });
    }
    for (const heading of headings.filter((each) => each.line > prohibitions.line)) {
      issues.push({
        file,
        line: heading.line,
        message: `\`${heading.text}\` follows the prohibitions, which are the last section`,
      });
    }
  }

  return issues;
}

/** The ADR shape, its header, and its filename. */
function checkAdr(path: string, lines: readonly string[]): readonly Issue[] {
  const file = displayPath(path);
  const headings = headingsOf(lines);
  const text = lines.join('\n');
  const issues: Issue[] = [];

  for (const section of ADR_SECTIONS) {
    if (!headings.some((heading) => heading.text === section)) {
      issues.push({ file, line: 1, message: `missing section \`${section}\`` });
    }
  }

  for (const field of ADR_FIELDS) {
    if (!text.includes(field)) {
      issues.push({ file, line: 1, message: `missing \`${field}\`` });
    }
  }

  if (!/^\d{4}(?:-[a-z0-9]+)+\.md$/.test(basename(path))) {
    issues.push({ file, line: 1, message: 'the name must be `NNNN-kebab-case.md`' });
  }

  return issues;
}

function adrNumber(path: string): string {
  return basename(path).slice(0, 4);
}

/** *"Numbering. Sequential, four digits, never reused."* */
function checkAdrNumbering(paths: readonly string[]): readonly Issue[] {
  return paths.flatMap((path, index) => {
    const expected = String(index + 1).padStart(4, '0');
    const actual = adrNumber(path);
    return actual === expected
      ? []
      : [
          {
            file: displayPath(path),
            line: 1,
            message: `expected ADR ${expected}, found ${actual} — numbers are sequential and never reused`,
          },
        ];
  });
}

/** Every ADR appears in the index, and the index states the next number. */
function checkAdrIndex(paths: readonly string[], lines: readonly string[]): readonly Issue[] {
  const text = lines.join('\n');
  const file = displayPath(ADR_INDEX);
  const tableLine = lineOf(lines, (line) => /^\|\s*0001\s*\|/.test(line));
  const numberingLine = lineOf(lines, (line) => line.includes('The next one is'));
  const issues: Issue[] = [];

  for (const path of paths) {
    const number = adrNumber(path);
    if (!text.includes(`| ${number} |`)) {
      issues.push({ file, line: tableLine, message: `ADR ${number} is not in the index` });
    }
  }

  const expected = String(paths.length + 1).padStart(4, '0');
  const stated = /The next one is\s+\*\*(\d{4})\*\*/.exec(text)?.[1];
  if (stated === undefined) {
    issues.push({
      file,
      line: numberingLine,
      message: 'the index does not state the next ADR number',
    });
  } else if (stated !== expected) {
    issues.push({
      file,
      line: numberingLine,
      message: `the index says the next ADR is ${stated}, and there are ${paths.length} of them`,
    });
  }

  return issues;
}

/**
 * The reading order is the set's only table of contents, so a spec doc missing
 * from it is a doc nobody will find, and an entry naming a file that does not
 * exist is a link that has rotted.
 */
function checkReadingOrder(
  specPaths: readonly string[],
  indexLines: readonly string[],
): readonly Issue[] {
  const issues: Issue[] = [];
  const file = displayPath(DOC_INDEX);
  const entries: { readonly path: string; readonly line: number }[] = [];

  indexLines.forEach((text, index) => {
    if (!/^\d+\.\s/.test(text)) {
      return;
    }
    for (const match of text.matchAll(/`([^`]+)`/g)) {
      const value = match[1];
      if (value !== undefined) {
        entries.push({ path: value, line: index + 1 });
      }
    }
  });

  const exact = new Set(entries.map((entry) => entry.path));
  const folders = entries.flatMap((entry) =>
    entry.path.endsWith('/*') ? [entry.path.slice(0, -2)] : [],
  );

  for (const path of specPaths) {
    const rel = toPosix(relative(DOCS_ROOT, path));
    if (!exact.has(rel) && !folders.some((folder) => rel.startsWith(`${folder}/`))) {
      issues.push({ file, line: 1, message: `\`${rel}\` is not in the reading order` });
    }
  }

  for (const entry of entries) {
    const isFolder = entry.path.endsWith('/*');
    const target = join(DOCS_ROOT, isFolder ? entry.path.slice(0, -2) : entry.path);
    const found = isFolder
      ? safeReadDirectory(target).some((name) => name.endsWith('.md'))
      : exists(target);
    if (!found) {
      issues.push({
        file,
        line: entry.line,
        message: `the reading order names \`${entry.path}\`, which does not exist`,
      });
    }
  }

  return issues;
}

function safeReadDirectory(path: string): readonly string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

function main(): void {
  const allMarkdown = markdownFilesIn(DOCS_ROOT);
  const isAdr = (path: string): boolean => toPosix(path).includes('/08-decisions/');

  // `docs/README.md` is the index and `08-decisions/*` are ADRs; both are
  // exempt from the five-section shape, and the index says so by name.
  const specPaths = allMarkdown.filter((path) => path !== DOC_INDEX && !isAdr(path));
  const adrPaths = allMarkdown
    .filter((path) => isAdr(path) && basename(path) !== 'README.md')
    .sort();

  const issues: Issue[] = [
    ...specPaths.flatMap((path) => checkSpecDoc(path, linesOf(path))),
    ...adrPaths.flatMap((path) => checkAdr(path, linesOf(path))),
    ...checkAdrNumbering(adrPaths),
    ...checkAdrIndex(adrPaths, linesOf(ADR_INDEX)),
    ...checkReadingOrder(specPaths, linesOf(DOC_INDEX)),
  ];

  if (issues.length === 0) {
    console.log('No issues.');
    return;
  }

  for (const issue of issues) {
    console.log(`${issue.file}:${issue.line}: ${issue.message}`);
  }
  console.log(`\n${issues.length} issue${issues.length === 1 ? '' : 's'}.`);
  process.exitCode = 1;
}

main();
