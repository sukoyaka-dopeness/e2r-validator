import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { validateDataset } from "../src/index.js";
import { NAMES_DRAFT_EXTENSION_ID } from "../src/names-draft-uniqueness-detector.js";
import { NAMES_DRAFT_VERSION } from "../src/names-draft-validator.js";
import { SPECIFICATION_EXTENSION_ID } from "../src/specification-validator.js";

const base = () => ({ version: "1.0", entities: [], events: [], relations: [] });

function namesObject(id, payload) {
  return { id, extensions: { [NAMES_DRAFT_EXTENSION_ID]: payload } };
}

function declaration(version = NAMES_DRAFT_VERSION) {
  return {
    specVersion: "0.1.0",
    uses: [{ extension: NAMES_DRAFT_EXTENSION_ID, version }],
  };
}

function activeDataset(payload, overrides = {}) {
  return {
    ...base(),
    entities: [namesObject("E1", payload)],
    extensions: { [SPECIFICATION_EXTENSION_ID]: declaration() },
    ...overrides,
  };
}

function namesDiagnostics(result) {
  return result.diagnostics.filter(({ code }) => code.startsWith("names_draft_"));
}

test("activates local and duplicate rules only with the exact supported declaration", () => {
  const active = activeDataset({ expressions: [
    { id: "N1", value: "Tokyo", language: 123 },
    { id: "N1", value: "東京" },
  ] });
  assert.deepEqual(namesDiagnostics(validateDataset(active)), [
    {
      severity: "error",
      code: "names_draft_expression_language_invalid",
      path: `/entities/0/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/0/language`,
    },
    {
      severity: "error",
      code: "names_draft_expression_id_duplicate",
      path: `/entities/0/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/0/id`,
    },
    {
      severity: "error",
      code: "names_draft_expression_id_duplicate",
      path: `/entities/0/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/1/id`,
    },
  ]);
});

test("orders Specification diagnostics before local and duplicate diagnostics", () => {
  const source = activeDataset({ expressions: [
    { id: "N1", value: "" },
    { id: "N1", value: "Tokyo" },
  ] });
  source.extensions[SPECIFICATION_EXTENSION_ID].definitions = {};

  assert.deepEqual(validateDataset(source).diagnostics.map(({ code }) => code), [
    "specification_definitions_invalid",
    "names_draft_expression_value_invalid",
    "names_draft_expression_id_duplicate",
    "names_draft_expression_id_duplicate",
  ]);
});

test("keeps a payload without a declaration version-unspecified and uninterpreted", () => {
  const source = { ...base(), entities: [namesObject("E1", { expressions: [
    { id: "N1", value: "" },
    { id: "N1", value: "Tokyo" },
  ] })] };
  const result = validateDataset(source);

  assert.deepEqual(result.diagnostics, [{
    severity: "warning",
    code: "extension_version_unspecified",
    path: `/entities/0/extensions/${NAMES_DRAFT_EXTENSION_ID}`,
  }]);
  assert.equal(result.valid, true);
});

test("does not apply 0.1.0 rules to an unsupported Names version", () => {
  const source = activeDataset(
    { expressions: [{ id: "N1", value: "" }, { id: "N1", value: "Tokyo" }] },
    { extensions: { [SPECIFICATION_EXTENSION_ID]: declaration("0.2.0") } },
  );
  const result = validateDataset(source);

  assert.equal(namesDiagnostics(result).length, 0);
  assert.ok(result.diagnostics.some(({ code }) => code === "specification_version_unsupported"));
  assert.equal(result.valid, true);
});

test("does not activate from unrelated, Stable, research, or malformed declarations", () => {
  const identities = ["vendor.example.other", "names", "research.fixture.p1-names"];
  for (const extension of identities) {
    const source = {
      ...base(),
      entities: [namesObject("E1", { expressions: [{ id: "N1", value: "" }] })],
      extensions: {
        [extension]: {},
        [SPECIFICATION_EXTENSION_ID]: {
          specVersion: "0.1.0",
          uses: [{ extension, version: "0.1.0" }],
        },
      },
    };
    assert.equal(namesDiagnostics(validateDataset(source)).length, 0, extension);
  }

  const malformed = activeDataset(
    { expressions: [{ id: "N1", value: "" }] },
    { extensions: {
      [SPECIFICATION_EXTENSION_ID]: {
        specVersion: "0.1.0",
        uses: [{ extension: NAMES_DRAFT_EXTENSION_ID, version: null }],
      },
    } },
  );
  const malformedResult = validateDataset(malformed);
  assert.equal(namesDiagnostics(malformedResult).length, 0);
  assert.ok(malformedResult.diagnostics.some(({ code }) => code === "specification_version_invalid"));
});

test("accepts all local valid boundaries without Names diagnostics", () => {
  const validPayloads = [
    { expressions: [] },
    { expressions: [{ id: "N1", value: "Tokyo" }] },
    { expressions: [{ id: "N1", value: "東京", language: "ja", script: "Jpan" }] },
    { expressions: [{ id: "N1", value: "Tokyo" }, { id: "N2", value: "Tokyo" }] },
    { futurePayload: null, expressions: [{ id: "N1", value: " ", future: null }] },
  ];

  for (const payload of validPayloads) {
    const result = validateDataset(activeDataset(payload));
    assert.deepEqual(namesDiagnostics(result), [], JSON.stringify(payload));
    assert.equal(result.valid, true, JSON.stringify(payload));
  }
});

const invalidCases = [
  ["payload wrong type", [], "names_draft_payload_invalid", ""],
  ["missing expressions", {}, "names_draft_expressions_missing", "/expressions"],
  ["expressions wrong type", { expressions: {} }, "names_draft_expressions_invalid", "/expressions"],
  ["member not object", { expressions: ["Tokyo"] }, "names_draft_expression_invalid", "/expressions/0"],
  ["missing id", { expressions: [{ value: "Tokyo" }] }, "names_draft_expression_id_missing", "/expressions/0/id"],
  ["id wrong type", { expressions: [{ id: 1, value: "Tokyo" }] }, "names_draft_expression_id_invalid", "/expressions/0/id"],
  ["id null", { expressions: [{ id: null, value: "Tokyo" }] }, "names_draft_expression_id_invalid", "/expressions/0/id"],
  ["id empty", { expressions: [{ id: "", value: "Tokyo" }] }, "names_draft_expression_id_invalid", "/expressions/0/id"],
  ["missing value", { expressions: [{ id: "N1" }] }, "names_draft_expression_value_missing", "/expressions/0/value"],
  ["value wrong type", { expressions: [{ id: "N1", value: 1 }] }, "names_draft_expression_value_invalid", "/expressions/0/value"],
  ["value null", { expressions: [{ id: "N1", value: null }] }, "names_draft_expression_value_invalid", "/expressions/0/value"],
  ["value empty", { expressions: [{ id: "N1", value: "" }] }, "names_draft_expression_value_invalid", "/expressions/0/value"],
  ["language wrong type", { expressions: [{ id: "N1", value: "Tokyo", language: 1 }] }, "names_draft_expression_language_invalid", "/expressions/0/language"],
  ["language null", { expressions: [{ id: "N1", value: "Tokyo", language: null }] }, "names_draft_expression_language_invalid", "/expressions/0/language"],
  ["script wrong type", { expressions: [{ id: "N1", value: "Tokyo", script: 1 }] }, "names_draft_expression_script_invalid", "/expressions/0/script"],
  ["script null", { expressions: [{ id: "N1", value: "Tokyo", script: null }] }, "names_draft_expression_script_invalid", "/expressions/0/script"],
];

for (const [label, payload, code, suffix] of invalidCases) {
  test(`maps ${label} to its exact local diagnostic`, () => {
    const result = validateDataset(activeDataset(payload));
    assert.deepEqual(namesDiagnostics(result), [{
      severity: "error",
      code,
      path: `/entities/0/extensions/${NAMES_DRAFT_EXTENSION_ID}${suffix}`,
    }]);
    assert.equal(result.valid, false);
  });
}

test("uses specific field diagnostics without a generic unrecognized diagnostic", () => {
  const result = validateDataset(activeDataset({ expressions: [
    { id: "N1", opaqueFutureData: true },
    { value: "Tokyo" },
  ] }));
  assert.deepEqual(namesDiagnostics(result), [
    {
      severity: "error",
      code: "names_draft_expression_value_missing",
      path: `/entities/0/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/0/value`,
    },
    {
      severity: "error",
      code: "names_draft_expression_id_missing",
      path: `/entities/0/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/1/id`,
    },
  ]);
});

test("coexists with duplicate diagnostics for every locally invalid recognized candidate", () => {
  const source = activeDataset({ expressions: [
    { id: "", value: "Tokyo" },
    { id: "", value: "Kyoto" },
    { id: "N1", value: "Tokyo", language: 123 },
    { id: "N1", value: "Arrival" },
    { id: "N2", value: "Tokyo", script: null },
    { id: "N2", value: "Relation" },
    { id: "N3", value: "" },
    { id: "N3", value: "Event" },
  ] });
  const result = namesDiagnostics(validateDataset(source));

  assert.deepEqual(result.map(({ code }) => code), [
    "names_draft_expression_id_invalid",
    "names_draft_expression_id_invalid",
    "names_draft_expression_language_invalid",
    "names_draft_expression_script_invalid",
    "names_draft_expression_value_invalid",
    "names_draft_expression_id_duplicate",
    "names_draft_expression_id_duplicate",
    "names_draft_expression_id_duplicate",
    "names_draft_expression_id_duplicate",
    "names_draft_expression_id_duplicate",
    "names_draft_expression_id_duplicate",
    "names_draft_expression_id_duplicate",
    "names_draft_expression_id_duplicate",
  ]);
  assert.ok(result.every((item) => !("relatedIds" in item)));
});

test("excludes missing and non-string identity fields and opaque same-ID members", () => {
  const source = activeDataset({ expressions: [
    { id: "N1", value: "Tokyo" },
    { id: "N1", opaqueFutureData: true },
    { id: "N1", value: 123 },
    { value: "Tokyo" },
    { id: 123, value: "Tokyo" },
  ] });
  const result = namesDiagnostics(validateDataset(source));

  assert.equal(result.some(({ code }) => code === "names_draft_expression_id_duplicate"), false);
  assert.deepEqual(result.map(({ code }) => code), [
    "names_draft_expression_value_missing",
    "names_draft_expression_value_invalid",
    "names_draft_expression_id_missing",
    "names_draft_expression_id_invalid",
  ]);
});

test("emits duplicate diagnostics for every occurrence in deterministic Dataset order", () => {
  const source = {
    ...base(),
    entities: [
      namesObject("E1", { expressions: [{ id: "N1", value: "Tokyo" }, { id: "N2", value: "A" }] }),
      namesObject("E2", { expressions: [{ id: "N2", value: "B" }, { id: "N1", value: "Kyoto" }] }),
    ],
    events: [namesObject("EV1", { expressions: [{ id: "N1", value: "Arrival" }] })],
    relations: [{
      ...namesObject("R1", { expressions: [{ id: "N1", value: "Occurred at" }] }),
      sourceId: "E1",
      targetId: "EV1",
    }],
    extensions: { [SPECIFICATION_EXTENSION_ID]: declaration() },
  };

  assert.deepEqual(namesDiagnostics(validateDataset(source)), [
    `/entities/0/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/0/id`,
    `/entities/0/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/1/id`,
    `/entities/1/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/0/id`,
    `/entities/1/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/1/id`,
    `/events/0/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/0/id`,
    `/relations/0/extensions/${NAMES_DRAFT_EXTENSION_ID}/expressions/0/id`,
  ].map((path) => ({
    severity: "error",
    code: "names_draft_expression_id_duplicate",
    path,
  })));
});

test("keeps Core and other Extension IDs outside Names uniqueness", () => {
  const source = activeDataset({ expressions: [{ id: "N1", value: "Tokyo" }] });
  source.entities[0].id = "N1";
  source.entities[0].extensions.other = { records: [{ id: "N1" }] };

  assert.equal(
    namesDiagnostics(validateDataset(source))
      .some(({ code }) => code === "names_draft_expression_id_duplicate"),
    false,
  );
});

test("does not interpret a Dataset-level Names payload as object-local Draft data", () => {
  const source = {
    ...base(),
    extensions: {
      [NAMES_DRAFT_EXTENSION_ID]: { expressions: [
        { id: "N1", value: "" },
        { id: "N1", value: "Tokyo" },
      ] },
      [SPECIFICATION_EXTENSION_ID]: declaration(),
    },
  };

  assert.deepEqual(namesDiagnostics(validateDataset(source)), []);
});

test("does not mutate Names data, unknown fields, nulls, or array order", () => {
  const source = activeDataset({
    futurePayload: null,
    expressions: [
      { id: "N1", value: "Tokyo", future: { order: [2, 1] } },
      { id: "N1", value: "東京", language: "ja", script: "Jpan", opaque: null },
    ],
  });
  const before = structuredClone(source);

  validateDataset(source);

  assert.deepEqual(source, before);
});

test("CLI and library expose identical Names diagnostic semantics", async () => {
  const source = activeDataset({ expressions: [
    { id: "N1", value: "Tokyo", language: null },
    { id: "N1", value: "東京" },
  ] });
  const libraryResult = validateDataset(source);
  const directory = await mkdtemp(join(tmpdir(), "e2r-validator-names-"));
  const file = join(directory, "names.json");
  await writeFile(file, JSON.stringify(source));

  try {
    const cliResult = await new Promise((resolve) => {
      const child = spawn(process.execPath, [join(process.cwd(), "src", "cli.js"), file]);
      let stdout = "";
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.on("close", (code) => resolve({ code, result: JSON.parse(stdout) }));
    });
    assert.equal(cliResult.code, 1);
    assert.deepEqual(cliResult.result, libraryResult);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
