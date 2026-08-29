import { diagnostic, SEVERITIES } from "./diagnostics.js";
import {
  COORDINATE_EXTENSION_ID,
  validateCoordinateExtension,
} from "./coordinate-validator.js";
import {
  COORDINATE_DRAFT_EXTENSION_ID,
  validateCoordinateDraftExtension,
} from "./coordinate-draft-validator.js";
import {
  isLocallySupportedSpecification,
  SPECIFICATION_EXTENSION_ID,
  validateSpecificationExtension,
} from "./specification-validator.js";
import { NAMES_DRAFT_EXTENSION_ID } from "./names-draft-uniqueness-detector.js";
import {
  NAMES_DRAFT_VERSION,
  validateNamesDraftExtension,
} from "./names-draft-validator.js";
import {
  LINEAGE_DRAFT_EXTENSION_ID,
  validateLineageDraftDataset,
} from "./lineage-draft-validator.js";
import {
  PRESENTATION_EXTENSION_ID,
  validatePresentationExtension,
} from "./presentation-validator.js";

const recognized = new Set([
  "metadata",
  "history",
  COORDINATE_EXTENSION_ID,
  COORDINATE_DRAFT_EXTENSION_ID,
  NAMES_DRAFT_EXTENSION_ID,
  LINEAGE_DRAFT_EXTENSION_ID,
  SPECIFICATION_EXTENSION_ID,
  PRESENTATION_EXTENSION_ID,
]);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

function pointerSegment(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function extensionContainers(dataset) {
  const containers = [{ owner: dataset, path: "" }];
  for (const collection of ["entities", "events", "relations"]) {
    if (!Array.isArray(dataset[collection])) continue;
    for (const [index, value] of dataset[collection].entries()) {
      if (isObject(value)) containers.push({ owner: value, path: `/${collection}/${index}` });
    }
  }
  return containers;
}

export function validateExtensions(dataset) {
  const diagnostics = [];
  const occurrences = new Map();
  let specificationPayload;
  let specificationPath = `/extensions/${pointerSegment(SPECIFICATION_EXTENSION_ID)}`;

  for (const container of extensionContainers(dataset)) {
    if (!("extensions" in container.owner)) continue;
    const extensionsPath = `${container.path}/extensions`;
    const extensions = container.owner.extensions;
    if (!isObject(extensions)) {
      diagnostics.push(diagnostic(SEVERITIES.ERROR, "extensions_invalid", extensionsPath));
      continue;
    }

    for (const [name, value] of Object.entries(extensions)) {
      const valuePath = `${extensionsPath}/${pointerSegment(name)}`;
      if (!occurrences.has(name)) occurrences.set(name, []);
      occurrences.get(name).push({ value, path: valuePath });

      if (!recognized.has(name)) {
        diagnostics.push(diagnostic(SEVERITIES.WARNING, "unknown_extension", valuePath));
        continue;
      }
      if (name === SPECIFICATION_EXTENSION_ID) {
        if (container.path !== "") {
          diagnostics.push(diagnostic(SEVERITIES.ERROR, "specification_scope_invalid", valuePath));
        } else {
          specificationPayload = value;
          specificationPath = valuePath;
        }
      }
    }
  }

  const specification = validateSpecificationExtension(specificationPayload, specificationPath, occurrences);
  diagnostics.push(...specification.diagnostics);

  for (const [name, validator] of [["metadata", validateMetadata], ["history", validateHistory]]) {
    const declaration = specification.declarations.get(name);
    if (declaration && !isLocallySupportedSpecification(name, declaration.version)) continue;
    for (const occurrence of occurrences.get(name) ?? []) {
      validator(occurrence.value, occurrence.path, diagnostics);
    }
  }
  diagnostics.push(...validateLineageDraftDataset(
    dataset,
    occurrences.get(LINEAGE_DRAFT_EXTENSION_ID) ?? [],
  ));
  const coordinateOccurrences = occurrences.get(COORDINATE_EXTENSION_ID) ?? [];
  if (coordinateOccurrences.length > 0) {
    diagnostics.push(...validateCoordinateExtension(
      coordinateOccurrences,
      specification.declarations.get(COORDINATE_EXTENSION_ID),
    ));
  }
  const coordinateDraftOccurrences = occurrences.get(COORDINATE_DRAFT_EXTENSION_ID) ?? [];
  if (coordinateDraftOccurrences.length > 0) {
    diagnostics.push(...validateCoordinateDraftExtension(
      coordinateDraftOccurrences,
      specification.supported ? specificationPayload : undefined,
      specificationPath,
    ));
  }
  diagnostics.push(...validatePresentationExtension(
    occurrences.get(PRESENTATION_EXTENSION_ID) ?? [],
    new Set((dataset.relations ?? []).filter(isObject).map((relation) => relation.id).filter(nonEmpty)),
  ));
  const namesDeclaration = specification.declarations.get(NAMES_DRAFT_EXTENSION_ID);
  if (
    namesDeclaration?.version === NAMES_DRAFT_VERSION
    && isLocallySupportedSpecification(NAMES_DRAFT_EXTENSION_ID, namesDeclaration.version)
  ) {
    diagnostics.push(...validateNamesDraftExtension(dataset));
  }
  return diagnostics;
}

function validateMetadata(value, base, diagnostics) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    diagnostics.push(diagnostic(SEVERITIES.ERROR, "metadata_invalid", base));
    return;
  }
  for (const field of ["datasetId", "title"]) {
    if (field in value && !nonEmpty(value[field])) {
      diagnostics.push(diagnostic(SEVERITIES.ERROR, `metadata_${field}_invalid`, `${base}/${field}`));
    }
  }
}

function validateHistory(value, base, diagnostics) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    diagnostics.push(diagnostic(SEVERITIES.ERROR, "history_invalid", base));
    return;
  }
  if (!("time" in value)) return;
  const time = value.time;
  const path = `${base}/time`;
  if (typeof time !== "object" || time === null || Array.isArray(time)) {
    diagnostics.push(diagnostic(SEVERITIES.ERROR, "history_time_invalid", path));
    return;
  }
  const integerFields = ["year", "month", "day", "hour", "minute", "second", "temporalOrder"];
  for (const field of integerFields) {
    if (field in time && !Number.isInteger(time[field])) diagnostics.push(diagnostic(SEVERITIES.ERROR, "history_time_field_invalid", `${path}/${field}`));
  }
  const ranges = [["month", 1, 12], ["day", 1, 31], ["hour", 0, 23], ["minute", 0, 59], ["second", 0, 59]];
  for (const [field, min, max] of ranges) if (field in time && Number.isInteger(time[field]) && (time[field] < min || time[field] > max)) diagnostics.push(diagnostic(SEVERITIES.ERROR, "history_time_field_out_of_range", `${path}/${field}`));
  if (Number.isInteger(time.year) && Number.isInteger(time.month) && Number.isInteger(time.day) && time.month >= 1 && time.month <= 12) {
    const leap = time.year % 4 === 0 && (time.year % 100 !== 0 || time.year % 400 === 0);
    const lastDay = [4, 6, 9, 11].includes(time.month) ? 30 : time.month === 2 ? (leap ? 29 : 28) : 31;
    if (time.day < 1 || time.day > lastDay) diagnostics.push(diagnostic(SEVERITIES.ERROR, "history_day_invalid", `${path}/day`));
  }
  const order = ["year", "month", "day", "hour", "minute", "second"];
  for (let i = 1; i < order.length; i++) if (order[i] in time && !(order[i - 1] in time)) diagnostics.push(diagnostic(SEVERITIES.ERROR, "history_time_precision_gap", `${path}/${order[i]}`));
  if (!("year" in time) && !("temporalOrder" in time)) diagnostics.push(diagnostic(SEVERITIES.ERROR, "history_time_empty", path));
  if (("timeZone" in time) !== ("offset" in time)) diagnostics.push(diagnostic(SEVERITIES.ERROR, "history_timezone_offset_pair_invalid", path));
  if (("timeZone" in time || "offset" in time) && (!("year" in time) || !("month" in time) || !("day" in time) || !("hour" in time) || !("minute" in time))) diagnostics.push(diagnostic(SEVERITIES.ERROR, "history_timezone_precision_invalid", path));
  if ("timeZone" in time && typeof time.timeZone !== "string") diagnostics.push(diagnostic(SEVERITIES.ERROR, "history_timezone_invalid", `${path}/timeZone`));
  if ("offset" in time && (typeof time.offset !== "string" || !/^[+-][0-9]{2}:[0-9]{2}$/.test(time.offset))) diagnostics.push(diagnostic(SEVERITIES.ERROR, "history_offset_invalid", `${path}/offset`));
}
