import assert from "node:assert/strict";
import test from "node:test";
import { validateCoreDataset } from "../src/core-validator.js";
import { exitCodeForResult } from "../src/diagnostics.js";

const specification = (uses) => ({
  specVersion: "0.1.0",
  uses,
});

const base = (extensions = {}, events = [], relations = []) => ({
  version: "1.0",
  entities: [],
  events,
  relations,
  extensions: {
    "draft.github.sukoyaka-dopeness.specification": specification([]),
    ...extensions,
  },
});

const historyDeclaration = (features = []) => ({ extension: "history", version: "2.0.0", ...(features.length > 0 ? { features } : {}) });
const relativeDeclaration = (features = []) => ({
  extension: "draft.github.sukoyaka-dopeness.relative-time",
  version: "0.1.0",
  ...(features.length > 0 ? { features } : {}),
});
const position = (year, extra = {}) => ({ year, ...extra });
const historyEvent = (payload) => [{ id: "event-1", extensions: { history: payload } }];
const relativeRelation = (id, sourceId, targetId, payload) => ({
  id,
  sourceId,
  targetId,
  extensions: { "draft.github.sukoyaka-dopeness.relative-time": payload },
});

function codes(result) {
  return result.diagnostics.map(({ code }) => code);
}

function diagnosticFor(result, code) {
  return result.diagnostics.find((item) => item.code === code);
}

test("accepts exact History 2.0 position assertions and keeps temporalOrder at assertion level", () => {
  const value = base({}, historyEvent({
    assertions: [{ id: "position-1", type: "position", position: position(1900), temporalOrder: 1 }],
  }));
  value.extensions["draft.github.sukoyaka-dopeness.specification"].uses = [historyDeclaration()];
  const result = validateCoreDataset(value);
  assert.equal(result.valid, true);
  assert.deepEqual(codes(result), []);
});

test("does not apply History 2.0 rules to an unsupported exact version", () => {
  const value = base({}, historyEvent({
    assertions: [{
      id: "bounded-1",
      type: "bounded-point",
      earliest: position(1904),
      latest: position(1900),
    }],
  }));
  value.extensions["draft.github.sukoyaka-dopeness.specification"].uses = [{ extension: "history", version: "2.1.0" }];
  const result = validateCoreDataset(value);
  assert.equal(result.valid, true);
  assert.ok(codes(result).includes("specification_version_unsupported"));
  assert.equal(codes(result).some((code) => code.startsWith("history_2_")), false);
});

test("reports History 2.0 structural errors separately from temporal conflicts", () => {
  const value = base({}, historyEvent({
    assertions: [{ id: "position-1", type: "position", position: { year: 1900, day: 1 } }],
  }));
  value.extensions["draft.github.sukoyaka-dopeness.specification"].uses = [historyDeclaration()];
  const result = validateCoreDataset(value);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("history_2_temporal_position_precision_gap"));
  assert.equal(result.diagnostics.find((item) => item.code === "history_2_temporal_position_precision_gap").category, "structural");
});

test("reports clearly reversed History 2.0 bounded points as warnings", () => {
  const value = base({}, historyEvent({
    assertions: [{ id: "bounded-1", type: "bounded-point", earliest: position(1904), latest: position(1900) }],
  }));
  value.extensions["draft.github.sukoyaka-dopeness.specification"].uses = [historyDeclaration(["bounded-point"])];
  const result = validateCoreDataset(value);
  const item = diagnosticFor(result, "history_2_bounded_point_bounds_reversed");
  assert.equal(result.valid, true);
  assert.equal(item.severity, "warning");
  assert.equal(item.category, "temporal-conflict");
  assert.equal(exitCodeForResult(result), 0);
});

test("skips History comparisons for approximation, partial precision, and mismatched time basis", () => {
  const value = base({}, historyEvent({
    assertions: [
      {
        id: "approximate",
        type: "bounded-point",
        earliest: position(1904, { approximation: "circa" }),
        latest: position(1900),
      },
      {
        id: "partial",
        type: "bounded-point",
        earliest: position(1904),
        latest: position(1900, { month: 1 }),
      },
      {
        id: "zone",
        type: "bounded-point",
        earliest: position(1904, { month: 1, day: 1, hour: 1, minute: 0, timeZone: "UTC", offset: "+00:00" }),
        latest: position(1900, { month: 1, day: 1, hour: 1, minute: 0, timeZone: "Asia/Tokyo", offset: "+09:00" }),
      },
    ],
  }));
  value.extensions["draft.github.sukoyaka-dopeness.specification"].uses = [historyDeclaration(["bounded-point", "multiple-assertions", "approximation"])];
  const result = validateCoreDataset(value);
  assert.equal(result.valid, true);
  assert.equal(codes(result).some((code) => code.includes("bounds_reversed")), false);
});

test("reports reversed temporal-extent boundaries without choosing a winner", () => {
  const value = base({}, historyEvent({
    assertions: [{
      id: "extent-1",
      type: "temporal-extent",
      start: { occurrence: "occurred", position: position(1904) },
      end: { occurrence: "not-occurred", position: position(1900) },
    }],
  }));
  value.extensions["draft.github.sukoyaka-dopeness.specification"].uses = [historyDeclaration(["temporal-extent"])];
  const result = validateCoreDataset(value);
  assert.equal(result.valid, true);
  assert.equal(diagnosticFor(result, "history_2_temporal_extent_boundaries_reversed").severity, "warning");
  assert.equal(diagnosticFor(result, "history_2_temporal_extent_boundaries_reversed").category, "temporal-conflict");
});

function relativeDataset(relations, features = ["relative-position"]) {
  const events = ["a", "b", "c"].map((id) => ({ id }));
  return base({}, events, relations);
}

test("maps Relative Time source/target orientation and reports a direct contradiction", () => {
  const relations = [
    relativeRelation("ab", "b", "a", { type: "relative-position", relation: "before" }),
    relativeRelation("ba", "a", "b", { type: "relative-position", relation: "before" }),
  ];
  const value = relativeDataset(relations);
  value.extensions["draft.github.sukoyaka-dopeness.specification"].uses = [relativeDeclaration(["relative-position"])];
  const before = structuredClone(value);
  const result = validateCoreDataset(value);
  assert.equal(result.valid, true);
  assert.equal(diagnosticFor(result, "temporal_before_conflict").severity, "warning");
  assert.equal(diagnosticFor(result, "temporal_before_conflict").category, "temporal-conflict");
  assert.equal(exitCodeForResult(result), 0);
  assert.deepEqual(value, before);
});

test("reports strict cycles and emits only bounded two-edge Derived evidence", () => {
  const relations = [
    relativeRelation("ab", "b", "a", { type: "relative-position", relation: "before" }),
    relativeRelation("bc", "c", "b", { type: "relative-position", relation: "before" }),
    relativeRelation("ca", "a", "c", { type: "relative-position", relation: "before" }),
  ];
  const value = relativeDataset(relations);
  value.extensions["draft.github.sukoyaka-dopeness.specification"].uses = [relativeDeclaration(["relative-position"])];
  const result = validateCoreDataset(value);
  assert.equal(result.valid, true);
  assert.equal(diagnosticFor(result, "temporal_before_cycle").severity, "warning");
  assert.equal(diagnosticFor(result, "temporal_before_cycle").category, "temporal-conflict");
  assert.deepEqual(result.derived ?? [], []);

  const chain = relativeDataset([
    relativeRelation("ab", "b", "a", { type: "relative-position", relation: "before" }),
    relativeRelation("bc", "c", "b", { type: "relative-position", relation: "before" }),
  ]);
  chain.extensions["draft.github.sukoyaka-dopeness.specification"].uses = [relativeDeclaration(["relative-position"])];
  const chainBefore = structuredClone(chain);
  const chainResult = validateCoreDataset(chain);
  assert.deepEqual(chainResult.derived, [{
    kind: "derived",
    relation: "before",
    beforeId: "a",
    afterId: "c",
    premises: [
      "/relations/0/extensions/draft.github.sukoyaka-dopeness.relative-time",
      "/relations/1/extensions/draft.github.sukoyaka-dopeness.relative-time",
    ],
  }]);
  assert.deepEqual(chain, chainBefore);

  const containmentCycle = relativeDataset([
    relativeRelation("ab", "b", "a", { type: "containment", relation: "within" }),
    relativeRelation("bc", "c", "b", { type: "containment", relation: "within" }),
    relativeRelation("ca", "a", "c", { type: "containment", relation: "within" }),
  ]);
  containmentCycle.extensions["draft.github.sukoyaka-dopeness.specification"].uses = [relativeDeclaration(["containment"])];
  const containmentResult = validateCoreDataset(containmentCycle);
  assert.equal(containmentResult.valid, true);
  assert.equal(diagnosticFor(containmentResult, "temporal_within_cycle").severity, "warning");
  assert.equal(diagnosticFor(containmentResult, "temporal_within_cycle").category, "temporal-conflict");
});

test("derives two-edge containment without creating a Relation", () => {
  const value = relativeDataset([
    relativeRelation("ab", "b", "a", { type: "containment", relation: "within" }),
    relativeRelation("bc", "c", "b", { type: "containment", relation: "within" }),
  ], ["containment"]);
  value.extensions["draft.github.sukoyaka-dopeness.specification"].uses = [relativeDeclaration(["containment"])];
  const relationCount = value.relations.length;
  const result = validateCoreDataset(value);
  assert.equal(result.valid, true);
  assert.deepEqual(result.derived[0], {
    kind: "derived",
    relation: "within",
    childId: "a",
    containerId: "c",
    premises: [
      "/relations/0/extensions/draft.github.sukoyaka-dopeness.relative-time",
      "/relations/1/extensions/draft.github.sukoyaka-dopeness.relative-time",
    ],
  });
  assert.equal(value.relations.length, relationCount);
});

test("preserves unsupported Calendar semantics and does not derive from them", () => {
  const value = relativeDataset([
    relativeRelation("ab", "b", "a", {
      type: "calendar-granule-relation",
      granularity: "month",
      displacement: 1,
      calendar: "julian",
    }),
  ], ["calendar-granule-relation"]);
  value.extensions["draft.github.sukoyaka-dopeness.specification"].uses = [relativeDeclaration(["calendar-granule-relation"])];
  const result = validateCoreDataset(value);
  assert.equal(result.valid, true);
  assert.equal(diagnosticFor(result, "temporal_calendar_unsupported").severity, "warning");
  assert.equal(diagnosticFor(result, "temporal_calendar_unsupported").category, "unsupported");
  assert.equal(result.derived, undefined);
});

test("does not activate candidate semantics for unknown Features", () => {
  const value = base({}, historyEvent({
    assertions: [{ id: "bounded-1", type: "bounded-point", earliest: position(1904), latest: position(1900) }],
  }));
  value.extensions["draft.github.sukoyaka-dopeness.specification"].uses = [historyDeclaration(["future-feature"])];
  const result = validateCoreDataset(value);
  assert.equal(result.valid, true);
  assert.ok(codes(result).includes("specification_feature_unsupported"));
  assert.equal(codes(result).some((code) => code.startsWith("history_2_") || code.startsWith("temporal_")), false);
});
