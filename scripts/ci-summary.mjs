/**
 * Turns JUnit XML into a table in the GitHub job summary.
 *
 * The summary is the layer nobody has to click into. A check run lists tests, artifacts
 * hold the evidence - but the summary is what a reviewer sees without leaving the run page,
 * and it is the difference between a result that gets read and one that gets ignored.
 *
 * Usage: node scripts/ci-summary.mjs reports/*.xml
 */
import { readFile, appendFile } from 'node:fs/promises';
import { basename } from 'node:path';

/** Minimal attribute reader - a full XML parser would be a dependency for no gain. */
function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : null;
}

async function readSuite(file) {
  const xml = await readFile(file, 'utf8');
  const totals = { tests: 0, failures: 0, errors: 0, skipped: 0, time: 0 };

  // Only top-level <testsuites> counts, when present: nested <testsuite> elements would
  // otherwise be added twice.
  const root = xml.match(/<testsuites[^>]*>/);
  const tags = root ? [root[0]] : (xml.match(/<testsuite\s[^>]*>/g) ?? []);

  for (const tag of tags) {
    totals.tests += Number(attr(tag, 'tests') ?? 0);
    totals.failures += Number(attr(tag, 'failures') ?? 0);
    totals.errors += Number(attr(tag, 'errors') ?? 0);
    totals.skipped += Number(attr(tag, 'skipped') ?? 0);
    totals.time += Number(attr(tag, 'time') ?? 0);
  }

  return { name: basename(file, '.xml'), ...totals };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Pass at least one JUnit XML file');
  process.exit(1);
}

const suites = [];
for (const file of files) {
  try {
    suites.push(await readSuite(file));
  } catch {
    // A missing report means the job never got that far. That is worth noting in the
    // summary rather than failing the step that only reports.
    suites.push({ name: basename(file, '.xml'), missing: true });
  }
}

const lines = ['## Test results', '', '| Suite | Tests | Failures | Skipped | Time |', '|---|---:|---:|---:|---:|'];

let anyFailure = false;
for (const s of suites) {
  if (s.missing) {
    lines.push(`| ${s.name} | — | — | — | brak raportu |`);
    continue;
  }
  const failed = s.failures + s.errors;
  if (failed > 0) anyFailure = true;
  const mark = failed > 0 ? '❌' : '✅';
  lines.push(`| ${mark} ${s.name} | ${s.tests} | ${failed} | ${s.skipped} | ${s.time.toFixed(1)} s |`);
}

const total = suites.filter((s) => !s.missing).reduce((sum, s) => sum + s.tests, 0);
lines.push('', anyFailure ? `**Some of the ${total} tests failed.**` : `**All ${total} tests passed.**`);

const output = lines.join('\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, output);
} else {
  console.log(output);
}
