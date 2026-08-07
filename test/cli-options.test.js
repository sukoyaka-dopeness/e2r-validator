import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const cli = join(process.cwd(), "src", "cli.js");
function run(option) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, option]);
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.on("close", (code) => resolve({ code, output }));
  });
}

test("supports help and version options", async () => {
  const help = await run("--help");
  assert.equal(help.code, 0);
  assert.match(help.output, /Usage:/);
  const version = await run("--version");
  const packageJson = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8"));
  assert.equal(version.code, 0);
  assert.equal(version.output.trim(), `e2r-validator ${packageJson.version}`);
});
