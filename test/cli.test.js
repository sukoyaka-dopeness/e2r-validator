import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

const cli = join(process.cwd(), "src", "cli.js");

function run(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], { encoding: "utf8" });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("returns 0 for a valid Dataset", async () => {
  const directory = await mkdtemp(join(tmpdir(), "e2r-validator-"));
  const file = join(directory, "valid.json");
  await writeFile(file, JSON.stringify({ version: "1.0", entities: [], events: [], relations: [] }));
  try {
    const result = await run([file]);
    assert.equal(result.code, 0);
    assert.equal(JSON.parse(result.stdout).valid, true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("returns 1 for a validation error", async () => {
  const directory = await mkdtemp(join(tmpdir(), "e2r-validator-"));
  const file = join(directory, "invalid.json");
  await writeFile(file, JSON.stringify({}));
  try {
    const result = await run([file]);
    assert.equal(result.code, 1);
    assert.equal(JSON.parse(result.stdout).valid, false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("returns 2 for invalid JSON and missing arguments", async () => {
  const directory = await mkdtemp(join(tmpdir(), "e2r-validator-"));
  const file = join(directory, "broken.json");
  await writeFile(file, "{ broken");
  try {
    const broken = await run([file]);
    assert.equal(broken.code, 2);
    assert.equal(JSON.parse(broken.stdout).diagnostics[0].code, "json_parse_error");
    const missing = await run([]);
    assert.equal(missing.code, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
