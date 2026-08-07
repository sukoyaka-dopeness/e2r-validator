import { diagnostic, SEVERITIES, validationResult } from "./diagnostics.js";
import { validateExtensions } from "./extension-validator.js";

const COLLECTIONS = ["entities", "events", "relations"];

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function pointerSegment(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function path(collection, index, field) {
  return `/${pointerSegment(collection)}/${index}${field ? `/${pointerSegment(field)}` : ""}`;
}

function validateObject(value, collection, index, diagnostics) {
  if (!isObject(value)) {
    diagnostics.push(diagnostic(SEVERITIES.ERROR, "core_object_not_object", path(collection, index)));
    return undefined;
  }
  if (!("id" in value)) {
    diagnostics.push(diagnostic(SEVERITIES.ERROR, "core_object_id_missing", path(collection, index, "id")));
    return undefined;
  }
  if (!nonEmptyString(value.id)) {
    diagnostics.push(diagnostic(SEVERITIES.ERROR, "core_object_id_invalid", path(collection, index, "id")));
    return undefined;
  }
  return value.id;
}

export function validateCoreDataset(value) {
  const diagnostics = [];
  if (!isObject(value)) {
    return validationResult([diagnostic(SEVERITIES.ERROR, "dataset_not_object", "")]);
  }

  if (!("version" in value)) {
    diagnostics.push(diagnostic(SEVERITIES.ERROR, "version_missing", "/version"));
  } else if (!nonEmptyString(value.version)) {
    diagnostics.push(diagnostic(SEVERITIES.ERROR, "version_invalid", "/version"));
  }

  const collections = new Map();
  for (const collection of COLLECTIONS) {
    if (!(collection in value)) {
      diagnostics.push(diagnostic(SEVERITIES.ERROR, `${collection}_missing`, `/${collection}`));
    } else if (!Array.isArray(value[collection])) {
      diagnostics.push(diagnostic(SEVERITIES.ERROR, `${collection}_invalid`, `/${collection}`));
    } else {
      collections.set(collection, value[collection]);
    }
  }

  const ids = new Map();
  const relationIds = new Set();
  const endpointIds = new Set();
  for (const collection of COLLECTIONS) {
    for (const [index, object] of (collections.get(collection) ?? []).entries()) {
      const id = validateObject(object, collection, index, diagnostics);
      if (!id) continue;
      if (ids.has(id)) {
        diagnostics.push(diagnostic(SEVERITIES.ERROR, "core_object_id_duplicate", path(collection, index, "id"), [id]));
      } else {
        ids.set(id, collection);
        if (collection === "relations") relationIds.add(id);
        else endpointIds.add(id);
      }
    }
  }

  for (const [index, relation] of (collections.get("relations") ?? []).entries()) {
    if (!isObject(relation)) continue;
    for (const endpoint of ["sourceId", "targetId"]) {
      const endpointPath = path("relations", index, endpoint);
      const missingCode = endpoint === "sourceId" ? "relation_source_id_missing" : "relation_target_id_missing";
      const invalidCode = endpoint === "sourceId" ? "relation_source_id_invalid" : "relation_target_id_invalid";
      const unresolvedCode = endpoint === "sourceId" ? "relation_source_unresolved" : "relation_target_unresolved";
      const relationCode = endpoint === "sourceId" ? "relation_source_is_relation" : "relation_target_is_relation";
      if (!(endpoint in relation)) {
        diagnostics.push(diagnostic(SEVERITIES.ERROR, missingCode, endpointPath));
      } else if (!nonEmptyString(relation[endpoint])) {
        diagnostics.push(diagnostic(SEVERITIES.ERROR, invalidCode, endpointPath));
      } else if (relationIds.has(relation[endpoint])) {
        diagnostics.push(diagnostic(SEVERITIES.ERROR, relationCode, endpointPath, [relation[endpoint]]));
      } else if (!endpointIds.has(relation[endpoint])) {
        diagnostics.push(diagnostic(SEVERITIES.ERROR, unresolvedCode, endpointPath, [relation[endpoint]]));
      }
    }
  }
  diagnostics.push(...validateExtensions(value));
  return validationResult(diagnostics);
}
