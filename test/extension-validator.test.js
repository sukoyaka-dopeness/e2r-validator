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

test("recognizes a valid Lineage Draft without an unknown-extension warning", () => {
  const result = validateCoreDataset({
    ...base,
    extensions: {
      metadata: { datasetId: "child" },
      "draft.github.sukoyaka-dopeness.lineage": {
        specVersion: "0.1.0",
        parents: [{ kind: "fork", target: { datasetId: "parent" } }],
      },
    },
  });
  assert.equal(result.valid, true);
  assert.equal(result.diagnostics.some(({ code }) => code === "unknown_extension"), false);
  assert.equal(result.diagnostics.some(({ code }) => code.startsWith("lineage_")), false);
});

test("reports invalid recognized Lineage without unknown-extension duplication", () => {
  const result = validateCoreDataset({
    ...base,
    extensions: {
      metadata: { datasetId: "child" },
      "draft.github.sukoyaka-dopeness.lineage": {
        specVersion: "0.1.0",
        parents: [{ kind: "merge", target: { datasetId: "child" } }],
      },
    },
  });
  assert.equal(result.valid, false);
  assert.deepEqual(result.diagnostics.map(({ code }) => code), [
    "extension_version_unspecified",
    "lineage_kind_invalid",
    "lineage_self_reference",
  ]);
  assert.equal(result.diagnostics.some(({ code }) => code === "unknown_extension"), false);
});

test("preserves unknown Lineage fields without mutation and does not require Specification", () => {
  const dataset = {
    ...base,
    extensions: {
      metadata: { datasetId: "child", unknownMetadata: { keep: true } },
      "draft.github.sukoyaka-dopeness.lineage": {
        specVersion: "0.1.0",
        futureSentinel: { token: "preserve-me" },
        parents: [{
          kind: "fork",
          futureParentField: true,
          target: { datasetId: "unresolved-parent", futureTargetField: [1, 2, 3] },
        }],
      },
    },
  };
  const before = structuredClone(dataset);
  const result = validateCoreDataset(dataset);
  assert.equal(result.valid, true);
  assert.deepEqual(dataset, before);
});
