import assert from "node:assert/strict";
import test from "node:test";
import { validateCoreDataset } from "../src/core-validator.js";

const valid = {
  version: "1.0",
  entities: [{ id: "entity-1" }],
  events: [{ id: "event-1" }],
  relations: [{ id: "relation-1", sourceId: "event-1", targetId: "entity-1" }],
};

test("accepts a valid Core Dataset", () => {
  assert.equal(validateCoreDataset(valid).valid, true);
});

test("reports missing fields and collection types", () => {
  assert.deepEqual(validateCoreDataset({ version: "1.0", entities: {}, events: [] }).diagnostics, [
    { severity: "error", code: "entities_invalid", path: "/entities" },
    { severity: "error", code: "relations_missing", path: "/relations" },
  ]);
});

test("reports duplicate IDs across collections", () => {
  const result = validateCoreDataset({ ...valid, events: [{ id: "entity-1" }], relations: [] });
  assert.deepEqual(result.diagnostics, [{ severity: "error", code: "core_object_id_duplicate", path: "/events/0/id", relatedIds: ["entity-1"] }]);
});

test("reports unresolved and Relation endpoints", () => {
  const result = validateCoreDataset({
    ...valid,
    relations: [
      { id: "relation-1", sourceId: "relation-2", targetId: "missing" },
      { id: "relation-2", sourceId: "entity-1", targetId: "entity-1" },
    ],
  });
  assert.deepEqual(result.diagnostics, [
    { severity: "error", code: "relation_source_is_relation", path: "/relations/0/sourceId", relatedIds: ["relation-2"] },
    { severity: "error", code: "relation_target_unresolved", path: "/relations/0/targetId", relatedIds: ["missing"] },
  ]);
});

test("preserves unknown fields by accepting them", () => {
  assert.equal(validateCoreDataset({ ...valid, futureField: true, extensions: { future: { value: 1 } } }).valid, true);
});
