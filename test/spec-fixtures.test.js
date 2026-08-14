import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";
import { validateCoreDataset } from "../src/core-validator.js";

const specRoot = join(process.cwd(), "..", "e2r-spec");
const validRoot = join(specRoot, "examples");
const invalidRoot = join(specRoot, "examples", "invalid");
const releaseValidRoots = [
  validRoot,
  join(validRoot, "coordinate"),
  join(validRoot, "coordinate-draft"),
  join(validRoot, "history"),
  join(validRoot, "specification"),
];

async function jsonFiles(directory, recursive = true) {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const files = [];
  for (const entry of entries) {
    const target = join(directory, entry.name);
    if (entry.isDirectory() && recursive) files.push(...await jsonFiles(target));
    else if (entry.name.endsWith(".json")) files.push(target);
  }
  return files;
}

async function releaseValidFiles() {
  const [rootFiles, ...nestedFiles] = await Promise.all(
    releaseValidRoots.map((root, index) => jsonFiles(root, index !== 0)),
  );
  return [...rootFiles, ...nestedFiles.flat()].sort((left, right) => left.localeCompare(right));
}

function asDataset(value) {
  if (value && typeof value === "object" && Object.keys(value).length === 0) return { version: "1.0", entities: [], events: [], relations: [] };
  if (value && typeof value === "object" && ("version" in value || "entities" in value || "events" in value || "relations" in value)) return value;
  if (value?.extensions) return { version: "1.0", entities: [], events: [], relations: [], extensions: value.extensions };
  return { version: "1.0", entities: [], events: [], relations: [], extensions: { history: { time: value } } };
}

function portableRelativePath(file) {
  return relative(specRoot, file).split(/[\\/]/).join("/");
}

test("accepts all specification valid JSON examples", async () => {
  const files = await releaseValidFiles();
  const results = [];
  for (const file of files) {
    const value = JSON.parse(await readFile(file, "utf8"));
    results.push([relative(specRoot, file), validateCoreDataset(asDataset(value))]);
  }
  assert.ok(results.length > 0);
  assert.deepEqual(results.filter(([, result]) => !result.valid).map(([file]) => file), []);
});

test("release-valid discovery is explicit, deterministic, and fail-closed", async () => {
  const files = await releaseValidFiles();
  const relativeFiles = files.map(portableRelativePath);
  assert.deepEqual(relativeFiles, [...relativeFiles].sort((left, right) => left.localeCompare(right)));
  assert.ok(relativeFiles.length > 0);
  assert.equal(relativeFiles.some((file) => file.startsWith("examples/research/")), false);
  assert.equal(relativeFiles.some((file) => file.startsWith("examples/invalid/")), false);
  assert.ok(relativeFiles.some((file) => file.startsWith("examples/coordinate/")));
  assert.ok(relativeFiles.some((file) => file.startsWith("examples/coordinate-draft/")));
  assert.ok(relativeFiles.some((file) => file.startsWith("examples/history/")));
  assert.ok(relativeFiles.some((file) => file.startsWith("examples/specification/")));
});

test("rejects all specification invalid JSON fixtures", async () => {
  const files = await jsonFiles(invalidRoot);
  const results = [];
  for (const file of files) {
    const value = JSON.parse(await readFile(file, "utf8"));
    results.push([relative(specRoot, file), validateCoreDataset(asDataset(value))]);
  }
  assert.ok(results.length > 0);
  assert.deepEqual(results.filter(([, result]) => result.valid).map(([file]) => file), []);
});
