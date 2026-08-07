import assert from "node:assert/strict";
import test from "node:test";
import { validateDataset } from "../src/index.js";

test("exposes validateDataset as a reusable library API", () => {
  const result = validateDataset({ version: "1.0", entities: [], events: [], relations: [] });
  assert.equal(result.valid, true);
  assert.deepEqual(result.diagnostics, []);
});
