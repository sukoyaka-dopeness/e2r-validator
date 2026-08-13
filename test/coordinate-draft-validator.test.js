import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { validateDataset } from "../src/index.js";
import {
  COORDINATE_DRAFT_EXTENSION_ID,
  COORDINATE_DRAFT_VERSION,
} from "../src/coordinate-draft-validator.js";
import {
  COORDINATE_EXTENSION_ID,
  COORDINATE_VERSION,
} from "../src/coordinate-validator.js";

const specRoot = join(process.cwd(), "..", "e2r-spec");

async function fixture(relativePath) {
  return JSON.parse(await readFile(join(specRoot, relativePath), "utf8"));
}

function codes(result) {
  return result.diagnostics.map(({ code }) => code);
}

const validFixtures = [
  "basic.json",
  "external-reference.json",
  "opaque-identifiers.json",
  "prototype-migration-output.json",
  "with-specification-declaration.json",
];

const invalidFixtures = new Map([
  ["component-bounds-inverted.json", "coordinate_draft_component_bounds_inverted"],
  ["dataset-format-version-present.json", "coordinate_draft_prototype_version_field_prohibited"],
  ["dataset-payload-missing.json", "coordinate_draft_dataset_payload_missing"],
  ["duplicate-external-component.json", "coordinate_draft_external_component_duplicate"],
  ["duplicate-object-coordinate.json", "coordinate_draft_object_space_duplicate"],
  ["duplicate-space-id.json", "coordinate_draft_space_id_duplicate"],
  ["external-component-without-reference.json", "coordinate_draft_external_component_without_reference"],
  ["missing-spec-version.json", "coordinate_draft_spec_version_missing"],
  ["object-spec-version-present.json", "coordinate_draft_object_version_field_prohibited"],
  ["prototype-field-substitution.json", "coordinate_draft_spec_version_missing"],
  ["relation-scope.json", "coordinate_draft_scope_invalid"],
  ["specification-declaration-duplicate.json", "coordinate_draft_version_declaration_duplicate"],
  ["specification-declaration-missing.json", "coordinate_draft_version_declaration_missing"],
  ["specification-version-conflict.json", "coordinate_draft_version_declaration_conflict"],
  ["unresolved-component.json", "coordinate_draft_component_unresolved"],
  ["unresolved-space.json", "coordinate_draft_space_unresolved"],
  ["value-out-of-range.json", "coordinate_draft_value_out_of_range"],
  ["whitespace-space-id.json", "coordinate_draft_space_id_invalid"],
]);

test("accepts all five Coordinate Draft 0.1.0 fixtures", async () => {
  for (const fileName of validFixtures) {
    const result = validateDataset(await fixture(`examples/coordinate-draft/${fileName}`));
    assert.equal(result.valid, true, fileName);
    assert.deepEqual(result.diagnostics, [], fileName);
  }
});

test("rejects all eighteen Coordinate Draft 0.1.0 invalid fixtures with draft-specific codes", async () => {
  for (const [fileName, expectedCode] of invalidFixtures) {
    const result = validateDataset(await fixture(
      `examples/invalid/extensions/coordinate-draft/${fileName}`,
    ));
    assert.equal(result.valid, false, fileName);
    assert.ok(codes(result).includes(expectedCode), `${fileName}: ${JSON.stringify(result.diagnostics)}`);
  }
});

test("warns and preserves an unsupported exact Draft version without applying 0.1.0 rules", () => {
  const result = validateDataset({
    version: "1.0",
    entities: [{
      id: "entity-1",
      extensions: {
        [COORDINATE_DRAFT_EXTENSION_ID]: {
          specVersion: "object versions are prohibited in 0.1.0",
          coordinates: [],
        },
      },
    }],
    events: [],
    relations: [],
    extensions: {
      [COORDINATE_DRAFT_EXTENSION_ID]: {
        specVersion: "9.0.0",
        formatVersion: "not interpreted",
        spaces: "not interpreted",
      },
    },
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.diagnostics, [{
    severity: "warning",
    code: "coordinate_draft_version_unsupported",
    path: `/extensions/${COORDINATE_DRAFT_EXTENSION_ID}/specVersion`,
  }]);
});

test("keeps Prototype and Draft identities independently readable", () => {
  const space = { id: "graph", components: { x: {} } };
  const result = validateDataset({
    version: "1.0",
    entities: [],
    events: [],
    relations: [],
    extensions: {
      [COORDINATE_EXTENSION_ID]: {
        formatVersion: COORDINATE_VERSION,
        spaces: [space],
      },
      [COORDINATE_DRAFT_EXTENSION_ID]: {
        specVersion: COORDINATE_DRAFT_VERSION,
        spaces: [space],
      },
    },
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.diagnostics, []);
});

test("escapes opaque Component IDs in Coordinate Draft diagnostic pointers", () => {
  const result = validateDataset({
    version: "1.0",
    entities: [{
      id: "entity-1",
      extensions: {
        [COORDINATE_DRAFT_EXTENSION_ID]: {
          coordinates: [{ spaceId: "graph", values: { "missing/~": 1 } }],
        },
      },
    }],
    events: [],
    relations: [],
    extensions: {
      [COORDINATE_DRAFT_EXTENSION_ID]: {
        specVersion: COORDINATE_DRAFT_VERSION,
        spaces: [{ id: "graph", components: { x: {} } }],
      },
    },
  });

  assert.ok(result.diagnostics.some(({ code, path }) => (
    code === "coordinate_draft_component_unresolved"
    && path.endsWith("/values/missing~1~0")
  )));
});
