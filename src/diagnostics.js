export const SEVERITIES = Object.freeze({
  ERROR: "error",
  WARNING: "warning",
});

export const EXIT_CODES = Object.freeze({
  VALID: 0,
  VALIDATION_ERROR: 1,
  INPUT_ERROR: 2,
});

export function diagnostic(severity, code, path, relatedIds, details) {
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
  if (details !== undefined) {
    if (typeof details !== "object" || details === null || Array.isArray(details)) {
      throw new TypeError("Diagnostic details must be an object");
    }
    if (details.category !== undefined && typeof details.category !== "string") {
      throw new TypeError("Diagnostic category must be a string");
    }
    if (details.message !== undefined && typeof details.message !== "string") {
      throw new TypeError("Diagnostic message must be a string");
    }
    if (details.category !== undefined) result.category = details.category;
    if (details.message !== undefined) result.message = details.message;
  }
  return result;
}

export function validationResult(diagnostics = [], derived = []) {
  if (!Array.isArray(diagnostics)) {
    throw new TypeError("Diagnostics must be an array");
  }
  if (!Array.isArray(derived)) {
    throw new TypeError("Derived evidence must be an array");
  }
  const normalized = diagnostics.map((item) => ({ ...item }));
  const result = {
    valid: !normalized.some((item) => item.severity === SEVERITIES.ERROR),
    diagnostics: normalized,
  };
  if (derived.length > 0) result.derived = derived.map((item) => ({ ...item }));
  return result;
}

export function exitCodeForResult(result) {
  return result.valid ? EXIT_CODES.VALID : EXIT_CODES.VALIDATION_ERROR;
}
