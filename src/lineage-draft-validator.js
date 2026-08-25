import { diagnostic, SEVERITIES } from "./diagnostics.js";

export const LINEAGE_DRAFT_EXTENSION_ID = "draft.github.sukoyaka-dopeness.lineage";
export const LINEAGE_DRAFT_VERSION = "0.1.0";

const VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const KINDS = new Set(["derived", "revision", "fork", "translation"]);
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const nonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

function add(diagnostics, code, path) {
  diagnostics.push(diagnostic(SEVERITIES.ERROR, code, path));
}

export function validateLineageDraft(value, path) {
  const diagnostics = [];
  const base = path;

  if (!isObject(value)) {
    add(diagnostics, "lineage_payload_invalid", base);
    return diagnostics;
  }

  if (!("specVersion" in value)) {
    add(diagnostics, "lineage_spec_version_missing", `${base}/specVersion`);
  } else if (typeof value.specVersion !== "string" || !VERSION_PATTERN.test(value.specVersion)) {
    add(diagnostics, "lineage_spec_version_invalid", `${base}/specVersion`);
  } else if (value.specVersion !== LINEAGE_DRAFT_VERSION) {
    add(diagnostics, "lineage_spec_version_unsupported", `${base}/specVersion`);
  }

  return diagnostics;
}

export function validateLineageDraftDataset(dataset, occurrences) {
  const diagnostics = [];
  const datasetPath = `/extensions/${LINEAGE_DRAFT_EXTENSION_ID}`;
  const occurrence = occurrences.find(({ path }) => path === datasetPath);
  if (!occurrence) return diagnostics;

  const payloadDiagnostics = validateLineageDraft(occurrence.value, datasetPath);
  diagnostics.push(...payloadDiagnostics);
  if (payloadDiagnostics.some(({ code }) => code === "lineage_payload_invalid")) return diagnostics;

  const metadata = isObject(dataset.extensions?.metadata) ? dataset.extensions.metadata : undefined;
  const childDatasetId = metadata && nonEmptyString(metadata.datasetId) ? metadata.datasetId : undefined;
  if (childDatasetId === undefined) add(diagnostics, "lineage_metadata_dataset_id_missing", "/extensions/metadata/datasetId");

  const payload = occurrence.value;
  const parentsPath = `${datasetPath}/parents`;
  if (!("parents" in payload)) {
    add(diagnostics, "lineage_parents_missing", parentsPath);
    return diagnostics;
  }
  if (!Array.isArray(payload.parents)) {
    add(diagnostics, "lineage_parents_invalid", parentsPath);
    return diagnostics;
  }
  if (payload.parents.length === 0) {
    add(diagnostics, "lineage_parents_empty", parentsPath);
    return diagnostics;
  }

  const seen = new Set();
  for (const [index, parent] of payload.parents.entries()) {
    const parentPath = `${parentsPath}/${index}`;
    if (!isObject(parent)) {
      add(diagnostics, "lineage_parent_invalid", parentPath);
      continue;
    }

    const kindPath = `${parentPath}/kind`;
    let kindValid = true;
    if (!("kind" in parent)) {
      add(diagnostics, "lineage_kind_missing", kindPath);
      kindValid = false;
    } else if (typeof parent.kind !== "string" || !KINDS.has(parent.kind)) {
      add(diagnostics, "lineage_kind_invalid", kindPath);
      kindValid = false;
    }

    const targetPath = `${parentPath}/target`;
    if (!isObject(parent.target)) {
      add(diagnostics, "lineage_target_invalid", targetPath);
      continue;
    }

    const targetDatasetIdPath = `${targetPath}/datasetId`;
    if (!nonEmptyString(parent.target.datasetId)) {
      add(diagnostics, "lineage_target_dataset_id_invalid", targetDatasetIdPath);
      continue;
    }

    if (childDatasetId !== undefined && parent.target.datasetId === childDatasetId) {
      add(diagnostics, "lineage_self_reference", targetDatasetIdPath);
    }

    if (kindValid) {
      const key = `${parent.kind}\u0000${parent.target.datasetId}`;
      if (seen.has(key)) add(diagnostics, "lineage_duplicate_parent", parentPath);
      else seen.add(key);
    }
  }

  return diagnostics;
}
