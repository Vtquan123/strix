import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONFIG_DIR = join(ROOT, 'config');
export const SCHEMA_DIR = join(CONFIG_DIR, 'schemas');

/** Parse a config YAML file. The `yaml` package is YAML 1.2, so `no` stays a string. */
export function loadYaml(name) {
  return parse(readFileSync(join(CONFIG_DIR, `${name}.yaml`), 'utf8'));
}

export function loadJson(relPath) {
  return JSON.parse(readFileSync(join(ROOT, relPath), 'utf8'));
}

export function loadSchema(name) {
  return JSON.parse(readFileSync(join(SCHEMA_DIR, `${name}.schema.json`), 'utf8'));
}

export function loadAll() {
  return {
    routing: loadYaml('routing'),
    capabilities: loadYaml('capabilities'),
    skills: loadYaml('skills'),
    taskSchema: loadYaml('task-schema'),
    executors: loadYaml('executors'),
  };
}

/** Directory names under a path, sorted. */
export function dirNames(relPath) {
  return readdirSync(join(ROOT, relPath), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/**
 * Split a Markdown file into { frontmatter, body }. Returns frontmatter: null when
 * the file does not open with `---` at byte 0 (Agent Skills spec requirement).
 */
export function readFrontmatter(absPath) {
  const raw = readFileSync(absPath, 'utf8');
  if (!raw.startsWith('---\n')) return { raw, frontmatter: null, frontmatterText: null };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { raw, frontmatter: null, frontmatterText: null };
  const frontmatterText = raw.slice(4, end + 1);
  return { raw, frontmatter: parse(frontmatterText), frontmatterText };
}
