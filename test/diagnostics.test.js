import assert from "node:assert/strict";
import test from "node:test";
import {
  diagnostic,
  exitCodeForResult,
  EXIT_CODES,
  SEVERITIES,
  validationResult,
} from "../src/diagnostics.js";

test("creates a diagnostic with optional related IDs", () => {
  assert.deepEqual(
    diagnostic(SEVERITIES.ERROR, "relation_source_unresolved", "/relations/0/sourceId", ["missing"]),
    { severity: "error", code: "relation_source_unresolved", path: "/relations/0/sourceId", relatedIds: ["missing"] },
  );
});

test("omits empty related IDs", () => {
  assert.deepEqual(diagnostic(SEVERITIES.WARNING, "unknown_extension", "/extensions/example", []), {
    severity: "warning", code: "unknown_extension", path: "/extensions/example",
  });
});

test("warnings do not make a result invalid", () => {
  const result = validationResult([diagnostic(SEVERITIES.WARNING, "unknown_extension", "/extensions/example")]);
  assert.equal(result.valid, true);
  assert.equal(exitCodeForResult(result), EXIT_CODES.VALID);
});

test("errors make a result invalid", () => {
  const result = validationResult([diagnostic(SEVERITIES.ERROR, "version_missing", "/version")]);
  assert.equal(result.valid, false);
  assert.equal(exitCodeForResult(result), EXIT_CODES.VALIDATION_ERROR);
});

test("rejects unsupported diagnostic values", () => {
  assert.throws(() => diagnostic("fatal", "bad_code", ""), TypeError);
  assert.throws(() => diagnostic(SEVERITIES.ERROR, "", ""), TypeError);
  assert.throws(() => diagnostic(SEVERITIES.ERROR, "bad_path", 1), TypeError);
});
