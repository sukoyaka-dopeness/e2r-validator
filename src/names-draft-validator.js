import { diagnostic, SEVERITIES } from "./diagnostics.js";
import {
  findNamesDraftRecognizedIdDuplicates,
  NAMES_DRAFT_EXTENSION_ID,
} from "./names-draft-uniqueness-detector.js";

export const NAMES_DRAFT_VERSION = "0.1.0";

const COLLECTIONS = ["entities", "events", "relations"];
const COLLECTION_ORDER = new Map(COLLECTIONS.map((collection, index) => [collection, index]));

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function add(diagnostics, code, path) {
  diagnostics.push(diagnostic(SEVERITIES.ERROR, code, path));
}

function validateExpression(expression, path, diagnostics) {
  if (!isObject(expression)) {
    add(diagnostics, "names_draft_expression_invalid", path);
    return;
  }

  if (!("id" in expression)) {
    add(diagnostics, "names_draft_expression_id_missing", `${path}/id`);
  } else if (typeof expression.id !== "string" || expression.id.length === 0) {
    add(diagnostics, "names_draft_expression_id_invalid", `${path}/id`);
  }

  if (!("value" in expression)) {
    add(diagnostics, "names_draft_expression_value_missing", `${path}/value`);
  } else if (typeof expression.value !== "string" || expression.value.length === 0) {
    add(diagnostics, "names_draft_expression_value_invalid", `${path}/value`);
  }

  if ("language" in expression && typeof expression.language !== "string") {
    add(diagnostics, "names_draft_expression_language_invalid", `${path}/language`);
  }
  if ("script" in expression && typeof expression.script !== "string") {
    add(diagnostics, "names_draft_expression_script_invalid", `${path}/script`);
  }
}

function validatePayload(payload, path, diagnostics) {
  if (!isObject(payload)) {
    add(diagnostics, "names_draft_payload_invalid", path);
    return;
  }
  if (!("expressions" in payload)) {
    add(diagnostics, "names_draft_expressions_missing", `${path}/expressions`);
    return;
  }
  if (!Array.isArray(payload.expressions)) {
    add(diagnostics, "names_draft_expressions_invalid", `${path}/expressions`);
    return;
  }

  for (const [index, expression] of payload.expressions.entries()) {
    validateExpression(expression, `${path}/expressions/${index}`, diagnostics);
  }
}

export function validateNamesDraftExtension(dataset) {
  const diagnostics = [];

  for (const collection of COLLECTIONS) {
    if (!Array.isArray(dataset[collection])) continue;
    for (const [objectIndex, object] of dataset[collection].entries()) {
      if (!isObject(object) || !isObject(object.extensions)) continue;
      if (!(NAMES_DRAFT_EXTENSION_ID in object.extensions)) continue;
      validatePayload(
        object.extensions[NAMES_DRAFT_EXTENSION_ID],
        `/${collection}/${objectIndex}/extensions/${NAMES_DRAFT_EXTENSION_ID}`,
        diagnostics,
      );
    }
  }

  const duplicateOccurrences = [...findNamesDraftRecognizedIdDuplicates(dataset).values()]
    .flat()
    .sort((left, right) => (
      COLLECTION_ORDER.get(left.collection) - COLLECTION_ORDER.get(right.collection)
      || left.objectIndex - right.objectIndex
      || left.expressionIndex - right.expressionIndex
    ));
  for (const occurrence of duplicateOccurrences) {
    add(diagnostics, "names_draft_expression_id_duplicate", occurrence.path);
  }

  return diagnostics;
}
