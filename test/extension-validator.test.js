import assert from "node:assert/strict";
import test from "node:test";
import { validateCoreDataset } from "../src/core-validator.js";

const base = { version: "1.0", entities: [], events: [], relations: [] };

test("accepts valid Metadata and History values", () => {
  const result = validateCoreDataset({ ...base, extensions: { metadata: { title: "Example" }, history: { time: { year: 2020, month: 1, day: 2 } } } });
  assert.equal(result.valid, true);
});

test("rejects invalid recognized Extension values", () => {
  const result = validateCoreDataset({ ...base, extensions: { metadata: { title: "   " }, history: { time: { month: 1 } } } });
  assert.equal(result.valid, false);
  assert.equal(result.diagnostics.some((item) => item.code === "metadata_title_invalid"), true);
  assert.equal(result.diagnostics.some((item) => item.code === "history_time_precision_gap"), true);
});

test("warns about unknown Extensions without rejecting the Dataset", () => {
  const result = validateCoreDataset({ ...base, extensions: { future: { value: true } } });
  assert.equal(result.valid, true);
  assert.equal(result.diagnostics[0].severity, "warning");
});
