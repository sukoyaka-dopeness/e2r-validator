import assert from "node:assert/strict";
import { spawn } from "node:child_process";
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
  assert.equal(version.code, 0);
  assert.match(version.output, /e2r-validator 0\.1\.0/);
});
