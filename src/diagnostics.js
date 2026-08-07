export const SEVERITIES = Object.freeze({
  ERROR: "error",
  WARNING: "warning",
});

export const EXIT_CODES = Object.freeze({
  VALID: 0,
  VALIDATION_ERROR: 1,
  INPUT_ERROR: 2,
});

export function diagnostic(severity, code, path, relatedIds) {
  if (severity !== SEVERITIES.ERROR && severity !== SEVERITIES.WARNING) {
    throw new TypeError(`Unsupported diagnostic severity: ${severity}`);
  }
  if (typeof code !== "string" || code.length === 0) {
    throw new TypeError("Diagnostic code must be a non-empty string");
  }
  if (typeof path !== "string") {
    throw new TypeError("Diagnostic path must be a string");
  }

  const result = { severity, code, path };
  if (relatedIds !== undefined) {
    if (!Array.isArray(relatedIds) || relatedIds.some((id) => typeof id !== "string")) {
      throw new TypeError("Diagnostic relatedIds must be an array of strings");
    }
    if (relatedIds.length > 0) result.relatedIds = [...relatedIds];
  }
  return result;
}

export function validationResult(diagnostics = []) {
  if (!Array.isArray(diagnostics)) {
    throw new TypeError("Diagnostics must be an array");
  }
  const normalized = diagnostics.map((item) => ({ ...item }));
  return {
    valid: !normalized.some((item) => item.severity === SEVERITIES.ERROR),
    diagnostics: normalized,
  };
}

export function exitCodeForResult(result) {
  return result.valid ? EXIT_CODES.VALID : EXIT_CODES.VALIDATION_ERROR;
}
