import assert from "node:assert/strict";
import test from "node:test";
import {
  LINEAGE_DRAFT_EXTENSION_ID,
  validateLineageDraft,
  validateLineageDraftDataset,
} from "../src/lineage-draft-validator.js";

const path = `/extensions/${LINEAGE_DRAFT_EXTENSION_ID}`;
const parent = (kind = "fork", datasetId = "parent") => ({ kind, target: { datasetId } });
const dataset = (lineage, metadata = { datasetId: "child" }) => ({
  version: "1.0", entities: [], events: [], relations: [],
  extensions: { metadata, [LINEAGE_DRAFT_EXTENSION_ID]: lineage },
});
const codes = (diagnostics) => diagnostics.map(({ code }) => code);
const validateDataset = (value) => validateLineageDraftDataset(value, [
  { value: value.extensions[LINEAGE_DRAFT_EXTENSION_ID], path },
]);

test("validates the four kinds, multiple parents, unknown fields, and unresolved parents", () => {
  for (const kind of ["derived", "revision", "fork", "translation"]) {
    const result = validateDataset(dataset({
      specVersion: "0.1.0",
      futureSentinel: { token: "preserve-me" },
      parents: [parent(kind, "not-present-locally"), { ...parent("derived", "another"), futureParentField: true }],
    }), []);
    assert.deepEqual(result, []);
  }
});

test("recognizes same target under different kinds without duplicate diagnostics", () => {
  assert.deepEqual(validateDataset(dataset({
    specVersion: "0.1.0", parents: [parent("derived", "same"), parent("revision", "same")],
  }), []), []);
});

test("does not emit diagnostics for absent Lineage", () => {
  assert.deepEqual(validateLineageDraftDataset({ version: "1.0", entities: [], events: [], relations: [], extensions: {} }, []), []);
});

test("reports payload and version failures without nested payload diagnostics", () => {
  assert.deepEqual(codes(validateLineageDraft(null, path)), ["lineage_payload_invalid"]);
  assert.deepEqual(codes(validateLineageDraft({}, path)), ["lineage_spec_version_missing"]);
  assert.deepEqual(codes(validateLineageDraft({ specVersion: 1 }, path)), ["lineage_spec_version_invalid"]);
  assert.deepEqual(codes(validateLineageDraft({ specVersion: "0.2.0" }, path)), ["lineage_spec_version_unsupported"]);
});

test("reports Metadata dependency and parent structural failures in order", () => {
  const result = validateDataset(dataset({ specVersion: "0.1.0", parents: "wrong" }, null));
  assert.deepEqual(result, [
    { severity: "error", code: "lineage_metadata_dataset_id_missing", path: "/extensions/metadata/datasetId" },
    { severity: "error", code: "lineage_parents_invalid", path: `${path}/parents` },
  ]);
  assert.deepEqual(codes(validateDataset(dataset({ specVersion: "0.1.0", parents: [] }))), ["lineage_parents_empty"]);
});

test("suppresses child diagnostics for malformed parent and target containers", () => {
  const result = validateDataset(dataset({ specVersion: "0.1.0", parents: [null, { kind: "fork", target: null }] }));
  assert.deepEqual(codes(result), ["lineage_parent_invalid", "lineage_target_invalid"]);
});

test("reports self-reference and only later identical parents as duplicates", () => {
  const result = validateDataset(dataset({
    specVersion: "0.1.0", parents: [parent("fork", "child"), parent(), parent()],
  }), []);
  assert.deepEqual(result, [
    { severity: "error", code: "lineage_self_reference", path: `${path}/parents/0/target/datasetId` },
    { severity: "error", code: "lineage_duplicate_parent", path: `${path}/parents/2` },
  ]);
});

test("does not mutate payload, parent order, unknown fields, or Metadata", () => {
  const source = dataset({
    specVersion: "0.1.0",
    futureSentinel: { token: "preserve-me" },
    parents: [{ ...parent(), futureParentField: true, target: { datasetId: "parent", futureTargetField: [1, 2, 3] } }],
  });
  const before = structuredClone(source);
  validateDataset(source);
  assert.deepEqual(source, before);
});
