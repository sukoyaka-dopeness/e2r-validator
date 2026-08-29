import assert from "node:assert/strict";
import test from "node:test";
import { validateDataset } from "../src/index.js";
import { SPECIFICATION_EXTENSION_ID } from "../src/specification-validator.js";
import { PRESENTATION_EXTENSION_ID, PRESENTATION_VERSION } from "../src/presentation-validator.js";

const base = () => ({ version: "1.0", entities: [], events: [], relations: [] });

function codes(result) {
  return result.diagnostics.map((item) => item.code);
}

test("supports the exact Presentation declaration and keeps payload bootstrap separate", () => {
  const presentation = {
    specVersion: PRESENTATION_VERSION,
    relations: {},
  };
  const declared = validateDataset({
    ...base(),
    extensions: {
      [PRESENTATION_EXTENSION_ID]: presentation,
      [SPECIFICATION_EXTENSION_ID]: {
        specVersion: "0.1.0",
        uses: [{ extension: PRESENTATION_EXTENSION_ID, version: PRESENTATION_VERSION }],
      },
    },
  });
  assert.equal(declared.valid, true);
  assert.deepEqual(declared.diagnostics, []);

  const bootstrapOnly = validateDataset({
    ...base(),
    extensions: { [PRESENTATION_EXTENSION_ID]: presentation },
  });
  assert.equal(bootstrapOnly.valid, true);
  assert.deepEqual(codes(bootstrapOnly), ["extension_version_unspecified"]);
});

test("accepts exact locally supported declarations across Dataset and Core Object payloads", () => {
  const dataset = {
    ...base(),
    events: [{ id: "event-1", extensions: { history: { time: { year: 2026 } } } }],
    extensions: {
      metadata: { title: "Exact declarations" },
      [SPECIFICATION_EXTENSION_ID]: {
        specVersion: "0.1.0",
        uses: [
          { extension: "metadata", version: "1.0.0" },
          { extension: "history", version: "1.0.0" },
        ],
      },
    },
  };

  const result = validateDataset(dataset);
  assert.equal(result.valid, true);
  assert.deepEqual(result.diagnostics, []);
});

test("warns when a known Extension version is unspecified", () => {
  const dataset = {
    ...base(),
    events: [{ id: "event-1", extensions: { history: { time: { year: 2026 } } } }],
  };
  const result = validateDataset(dataset);
  assert.equal(result.valid, true);
  assert.deepEqual(result.diagnostics, [{
    severity: "warning",
    code: "extension_version_unspecified",
    path: "/events/0/extensions/history",
  }]);
});

test("distinguishes an unsupported known version from an unavailable specification", () => {
  const dataset = {
    ...base(),
    extensions: {
      metadata: { title: "Support states" },
      "vendor.example.unknown": { value: 42 },
      [SPECIFICATION_EXTENSION_ID]: {
        specVersion: "0.1.0",
        uses: [
          { extension: "metadata", version: "2.0.0" },
          { extension: "vendor.example.unknown", version: "3.2.1" },
        ],
      },
    },
  };
  const result = validateDataset(dataset);
  assert.equal(result.valid, true);
  assert.ok(codes(result).includes("specification_version_unsupported"));
  assert.ok(codes(result).includes("specification_unavailable"));
  assert.ok(codes(result).includes("unknown_extension"));
});

test("validates only the exact locally supported payload version", () => {
  const supported = validateDataset({
    ...base(),
    extensions: {
      metadata: { title: "   " },
      [SPECIFICATION_EXTENSION_ID]: {
        specVersion: "0.1.0",
        uses: [{ extension: "metadata", version: "1.0.0" }],
      },
    },
  });
  assert.equal(supported.valid, false);
  assert.ok(codes(supported).includes("metadata_title_invalid"));

  const unsupported = validateDataset({
    ...base(),
    extensions: {
      metadata: { title: "   " },
      [SPECIFICATION_EXTENSION_ID]: {
        specVersion: "0.1.0",
        uses: [{ extension: "metadata", version: "2.0.0" }],
      },
    },
  });
  assert.equal(unsupported.valid, true);
  assert.ok(codes(unsupported).includes("specification_version_unsupported"));
  assert.ok(!codes(unsupported).includes("metadata_title_invalid"));
});

test("does not interpret declarations from an unsupported bootstrap version", () => {
  const dataset = {
    ...base(),
    extensions: {
      metadata: { title: "Future bootstrap" },
      [SPECIFICATION_EXTENSION_ID]: {
        specVersion: "9.0.0",
        uses: [{ extension: "metadata", version: "1.0.0" }],
      },
    },
  };
  const result = validateDataset(dataset);
  assert.equal(result.valid, true);
  assert.deepEqual(codes(result), [
    "specification_version_unsupported",
    "extension_version_unspecified",
  ]);
});

test("rejects declaration completeness conflicts", () => {
  const missingDeclaration = validateDataset({
    ...base(),
    extensions: {
      metadata: { title: "Missing declaration" },
      [SPECIFICATION_EXTENSION_ID]: { specVersion: "0.1.0", uses: [] },
    },
  });
  assert.equal(missingDeclaration.valid, false);
  assert.ok(codes(missingDeclaration).includes("specification_declaration_missing"));

  const missingPayload = validateDataset({
    ...base(),
    extensions: {
      [SPECIFICATION_EXTENSION_ID]: {
        specVersion: "0.1.0",
        uses: [{ extension: "history", version: "1.0.0" }],
      },
    },
  });
  assert.equal(missingPayload.valid, false);
  assert.ok(codes(missingPayload).includes("specification_declared_payload_missing"));
});

test("rejects duplicate declarations and Features on Extensions without Features", () => {
  const result = validateDataset({
    ...base(),
    extensions: {
      history: { time: { year: 2026 } },
      metadata: { title: "Feature error" },
      [SPECIFICATION_EXTENSION_ID]: {
        specVersion: "0.1.0",
        uses: [
          { extension: "history", version: "1.0.0" },
          { extension: "history", version: "1.0.0" },
          { extension: "metadata", version: "1.0.0", features: [] },
        ],
      },
    },
  });
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("specification_features_not_defined"));
  assert.ok(codes(result).includes("specification_declaration_duplicate"));
});

test("reports missing required dependency data", () => {
  const result = validateDataset({
    ...base(),
    extensions: {
      "vendor.example.source": { value: true },
      [SPECIFICATION_EXTENSION_ID]: {
        specVersion: "0.1.0",
        uses: [{ extension: "vendor.example.source", version: "1.0.0" }],
        definitions: [{
          extension: "vendor.example.source",
          version: "1.0.0",
          requires: [{
            target: { extension: "vendor.example.target" },
            version: "1.0.0",
          }],
        }],
      },
    },
  });
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("specification_required_dependency_missing"));
});

test("warns when compatible required dependency data is unsupported locally", () => {
  const result = validateDataset({
    ...base(),
    extensions: {
      "vendor.example.source": { value: true },
      "vendor.example.target": { value: true },
      [SPECIFICATION_EXTENSION_ID]: {
        specVersion: "0.1.0",
        uses: [
          { extension: "vendor.example.source", version: "1.0.0" },
          { extension: "vendor.example.target", version: "1.4.0" },
        ],
        definitions: [{
          extension: "vendor.example.source",
          version: "1.0.0",
          requires: [{
            target: { extension: "vendor.example.target" },
            range: ">=1.2.0 <2.0.0",
          }],
        }],
      },
    },
  });
  assert.equal(result.valid, true);
  assert.ok(codes(result).includes("specification_required_dependency_unsupported"));
});

test("rejects a required dependency version mismatch", () => {
  const result = validateDataset({
    ...base(),
    extensions: {
      "vendor.example.source": { value: true },
      "vendor.example.target": { value: true },
      [SPECIFICATION_EXTENSION_ID]: {
        specVersion: "0.1.0",
        uses: [
          { extension: "vendor.example.source", version: "1.0.0" },
          { extension: "vendor.example.target", version: "2.0.0" },
        ],
        definitions: [{
          extension: "vendor.example.source",
          version: "1.0.0",
          requires: [{
            target: { extension: "vendor.example.target" },
            range: ">=1.0.0 <2.0.0",
          }],
        }],
      },
    },
  });
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("specification_required_dependency_version_mismatch"));
});

test("validates definition, lifecycle, and evolution structures", () => {
  const result = validateDataset({
    ...base(),
    extensions: {
      [SPECIFICATION_EXTENSION_ID]: {
        specVersion: "0.1.0",
        definitions: [{
          extension: "draft.org.example.presentation",
          version: "0.3.0",
          features: [{ feature: "media-icon" }],
          optionallyUses: [{
            sourceFeature: "media-icon",
            target: { extension: "draft.org.example.media", feature: "resource" },
            range: ">=0.2.0 <1.0.0",
          }],
        }],
        lifecycle: [{
          specification: { extension: "draft.org.example.presentation", version: "0.3.0" },
          status: "experimental",
        }],
        evolution: [{
          type: "supersedes",
          source: { extension: "draft.org.example.presentation", version: "0.3.0" },
          targets: [{ extension: "draft.org.example.appearance", version: "0.2.0" }],
        }],
      },
    },
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.diagnostics, []);
});

test("rejects object-level Specification Extension placement", () => {
  const result = validateDataset({
    ...base(),
    entities: [{
      id: "entity-1",
      extensions: {
        [SPECIFICATION_EXTENSION_ID]: { specVersion: "0.1.0", uses: [] },
      },
    }],
  });
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("specification_scope_invalid"));
});
