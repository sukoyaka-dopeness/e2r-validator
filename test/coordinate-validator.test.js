import assert from "node:assert/strict";
import test from "node:test";
import { validateDataset } from "../src/index.js";
import {
  COORDINATE_EXTENSION_ID,
  COORDINATE_VERSION,
} from "../src/coordinate-validator.js";
import { SPECIFICATION_EXTENSION_ID } from "../src/specification-validator.js";

function datasetWithCoordinate({ spaces, objectPayload, relationPayload, formatVersion = COORDINATE_VERSION }) {
  return {
    version: "1.0",
    entities: objectPayload ? [{ id: "entity-1", extensions: { [COORDINATE_EXTENSION_ID]: objectPayload } }] : [],
    events: [],
    relations: relationPayload ? [{
      id: "relation-1",
      sourceId: "entity-1",
      targetId: "entity-1",
      extensions: { [COORDINATE_EXTENSION_ID]: relationPayload },
    }] : [],
    extensions: {
      [COORDINATE_EXTENSION_ID]: { formatVersion, spaces },
    },
  };
}

function codes(result) {
  return result.diagnostics.map(({ code }) => code);
}

const graphSpace = {
  id: "graph",
  kind: "cartesian-2d",
  components: {
    x: { unit: "user-unit", positiveDirection: "display-right" },
    y: { unit: "user-unit", positiveDirection: "display-down" },
  },
};

test("accepts partial and multiple-Space Coordinate prototype values", () => {
  const result = validateDataset(datasetWithCoordinate({
    spaces: [graphSpace, {
      id: "site-plan",
      components: { east: { unit: "metre" }, north: { unit: "metre" } },
    }],
    objectPayload: { coordinates: [
      { spaceId: "graph", values: { y: 24 } },
      { spaceId: "site-plan", values: { east: 10, north: 20 } },
    ] },
  }));
  assert.equal(result.valid, true);
  assert.deepEqual(result.diagnostics, []);
});

test("validates external references offline as opaque local data", () => {
  const result = validateDataset(datasetWithCoordinate({
    spaces: [{
      id: "geographic",
      externalReference: {
        authority: "OGC",
        identifier: "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
      },
      components: { longitude: {}, latitude: {} },
    }],
    objectPayload: { coordinates: [
      { spaceId: "geographic", values: { longitude: 139.7671, latitude: 35.6812 } },
    ] },
  }));
  assert.equal(result.valid, true);
  assert.deepEqual(result.diagnostics, []);
});

test("reports duplicate Space and per-object Coordinate claims as conflicts", () => {
  const duplicateSpaces = validateDataset(datasetWithCoordinate({
    spaces: [graphSpace, { ...graphSpace }],
  }));
  assert.equal(duplicateSpaces.valid, false);
  assert.ok(codes(duplicateSpaces).includes("coordinate_space_id_duplicate"));

  const duplicateCoordinates = validateDataset(datasetWithCoordinate({
    spaces: [graphSpace],
    objectPayload: { coordinates: [
      { spaceId: "graph", values: { x: 1 } },
      { spaceId: "graph", values: { y: 2 } },
    ] },
  }));
  assert.equal(duplicateCoordinates.valid, false);
  assert.ok(codes(duplicateCoordinates).includes("coordinate_space_coordinate_duplicate"));
});

test("rejects unresolved Spaces and Components and Relation placement", () => {
  const unresolved = validateDataset(datasetWithCoordinate({
    spaces: [graphSpace],
    objectPayload: { coordinates: [
      { spaceId: "missing", values: { x: 1 } },
      { spaceId: "graph", values: { z: 2 } },
    ] },
  }));
  assert.ok(codes(unresolved).includes("coordinate_space_unresolved"));
  assert.ok(codes(unresolved).includes("coordinate_component_unresolved"));

  const relation = validateDataset(datasetWithCoordinate({
    spaces: [graphSpace],
    objectPayload: { coordinates: [{ spaceId: "graph", values: { x: 1 } }] },
    relationPayload: { coordinates: [{ spaceId: "graph", values: { x: 2 } }] },
  }));
  assert.ok(codes(relation).includes("coordinate_scope_invalid"));
});

test("keeps unsupported Coordinate versions as warnings and detects declaration conflicts", () => {
  const unsupported = validateDataset(datasetWithCoordinate({
    spaces: [],
    formatVersion: "9.0.0",
  }));
  assert.equal(unsupported.valid, true);
  assert.ok(codes(unsupported).includes("coordinate_version_unsupported"));

  const conflict = datasetWithCoordinate({ spaces: [graphSpace] });
  conflict.extensions[SPECIFICATION_EXTENSION_ID] = {
    specVersion: "0.1.0",
    uses: [{ extension: COORDINATE_EXTENSION_ID, version: "9.0.0" }],
  };
  const conflictResult = validateDataset(conflict);
  assert.equal(conflictResult.valid, false);
  assert.ok(codes(conflictResult).includes("coordinate_version_declaration_conflict"));
});

test("rejects malformed format versions and values outside Component bounds", () => {
  const malformed = validateDataset(datasetWithCoordinate({
    spaces: [],
    formatVersion: "future",
  }));
  assert.equal(malformed.valid, false);
  assert.ok(codes(malformed).includes("coordinate_format_version_invalid"));

  const outOfRange = validateDataset(datasetWithCoordinate({
    spaces: [{
      id: "bounded",
      components: { percentage: { minimum: 0, maximum: 100 } },
    }],
    objectPayload: { coordinates: [
      { spaceId: "bounded", values: { percentage: 101 } },
    ] },
  }));
  assert.equal(outOfRange.valid, false);
  assert.ok(codes(outOfRange).includes("coordinate_value_out_of_range"));
});
