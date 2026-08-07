import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";
import { validateCoreDataset } from "../src/core-validator.js";

const specRoot = join(process.cwd(), "..", "e2r-spec");
const validRoot = join(specRoot, "examples");
const invalidRoot = join(specRoot, "examples", "invalid");

async function jsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await jsonFiles(target));
    else if (entry.name.endsWith(".json")) files.push(target);
  }
  return files;
}

function asDataset(value) {
  if (value && typeof value === "object" && Object.keys(value).length === 0) return { version: "1.0", entities: [], events: [], relations: [] };
  if (value && typeof value === "object" && ("version" in value || "entities" in value || "events" in value || "relations" in value)) return value;
  if (value?.extensions) return { version: "1.0", entities: [], events: [], relations: [], extensions: value.extensions };
  return { version: "1.0", entities: [], events: [], relations: [], extensions: { history: { time: value } } };
}

test("accepts all specification valid JSON examples", async () => {
  const files = await jsonFiles(validRoot);
  const results = [];
  for (const file of files) {
    if (file.startsWith(invalidRoot)) continue;
    const value = JSON.parse(await readFile(file, "utf8"));
    results.push([relative(specRoot, file), validateCoreDataset(asDataset(value))]);
  }
  assert.ok(results.length > 0);
  assert.deepEqual(results.filter(([, result]) => !result.valid).map(([file]) => file), []);
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
