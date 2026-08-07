import assert from "node:assert/strict";
import test from "node:test";
import { validateDataset } from "../src/index.js";

const dataset = (time) => ({ version: "1.0", entities: [], events: [], relations: [], extensions: { history: { time } } });

test("accepts a valid leap day", () => {
  assert.equal(validateDataset(dataset({ year: 2024, month: 2, day: 29 })).valid, true);
});

test("rejects an invalid Gregorian day", () => {
  const result = validateDataset(dataset({ year: 2023, month: 2, day: 29 }));
  assert.equal(result.valid, false);
  assert.equal(result.diagnostics.some((item) => item.code === "history_day_invalid"), true);
});
