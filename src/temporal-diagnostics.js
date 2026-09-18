import { diagnostic, SEVERITIES } from "./diagnostics.js";
import {
  HISTORY_VERSION,
  RELATIVE_TIME_EXTENSION_ID,
  RELATIVE_TIME_VERSION,
  isLocallySupportedFeature,
} from "./specification-validator.js";

export const HISTORY_EXTENSION_ID = "history";

const HISTORY_FEATURES = new Set([
  "approximation",
  "bounded-point",
  "multiple-assertions",
  "temporal-extent",
]);
const RELATIVE_TIME_FEATURES = new Set([
  "calendar-granule-relation",
  "containment",
  "elapsed-offset",
  "relative-position",
]);
const POSITION_FIELDS = ["year", "month", "day", "hour", "minute", "second"];

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function pointerSegment(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function add(diagnostics, severity, code, path, category, message, relatedIds) {
  diagnostics.push(diagnostic(severity, code, path, relatedIds, { category, message }));
}

function structuralError(diagnostics, code, path, message) {
  add(diagnostics, SEVERITIES.ERROR, code, path, "structural", message);
}

function unsupportedWarning(diagnostics, code, path, message, relatedIds) {
  add(diagnostics, SEVERITIES.WARNING, code, path, "unsupported", message, relatedIds);
}

function conflictWarning(diagnostics, code, path, message, relatedIds) {
  add(diagnostics, SEVERITIES.WARNING, code, path, "temporal-conflict", message, relatedIds);
}

function requireFields(value, fields, path, diagnostics, codePrefix) {
  let valid = true;
  for (const field of fields) {
    if (!(field in value)) {
      structuralError(
        diagnostics,
        `${codePrefix}_${field}_missing`,
        `${path}/${pointerSegment(field)}`,
        `Required field ${field} is missing.`,
      );
      valid = false;
    }
  }
  return valid;
}

function validateTemporalPosition(value, path, diagnostics) {
  if (!isObject(value)) {
    structuralError(diagnostics, "history_2_temporal_position_invalid", path, "Temporal Position must be an object.");
    return false;
  }

  let valid = requireFields(value, ["year"], path, diagnostics, "history_2_temporal_position");
  if ("year" in value && !Number.isInteger(value.year)) {
    structuralError(diagnostics, "history_2_temporal_position_year_invalid", `${path}/year`, "Temporal Position year must be an integer.");
    valid = false;
  }

  const ranges = [
    ["month", 1, 12],
    ["day", 1, 31],
    ["hour", 0, 23],
    ["minute", 0, 59],
    ["second", 0, 59],
  ];
  for (const [field, minimum, maximum] of ranges) {
    if (!(field in value)) continue;
    if (!Number.isInteger(value[field]) || value[field] < minimum || value[field] > maximum) {
      structuralError(
        diagnostics,
        "history_2_temporal_position_field_invalid",
        `${path}/${field}`,
        `Temporal Position ${field} is outside its supported range.`,
      );
      valid = false;
    }
  }

  for (let index = 1; index < POSITION_FIELDS.length; index += 1) {
    const field = POSITION_FIELDS[index];
    if (field in value && !(POSITION_FIELDS[index - 1] in value)) {
      structuralError(
        diagnostics,
        "history_2_temporal_position_precision_gap",
        `${path}/${field}`,
        `Temporal Position fields must be contiguous from year through the recorded precision.`,
      );
      valid = false;
    }
  }

  if (Number.isInteger(value.year) && Number.isInteger(value.month) && Number.isInteger(value.day)) {
    const leap = value.year % 4 === 0 && (value.year % 100 !== 0 || value.year % 400 === 0);
    const lastDay = [4, 6, 9, 11].includes(value.month) ? 30 : value.month === 2 ? (leap ? 29 : 28) : 31;
    if (value.day > lastDay) {
      structuralError(diagnostics, "history_2_temporal_position_day_invalid", `${path}/day`, "Day is invalid for the recorded Gregorian month.");
      valid = false;
    }
  }

  if (("timeZone" in value) !== ("offset" in value)) {
    structuralError(diagnostics, "history_2_temporal_position_timezone_offset_pair_invalid", path, "timeZone and offset must occur together.");
    valid = false;
  }
  if (("timeZone" in value || "offset" in value)
    && POSITION_FIELDS.indexOf("minute") > POSITION_FIELDS.indexOf("year")
    && (!["year", "month", "day", "hour", "minute"].every((field) => field in value))) {
    structuralError(diagnostics, "history_2_temporal_position_timezone_precision_invalid", path, "A time zone and offset require minute precision.");
    valid = false;
  }
  if ("timeZone" in value && !nonEmpty(value.timeZone)) {
    structuralError(diagnostics, "history_2_temporal_position_timezone_invalid", `${path}/timeZone`, "timeZone must be a non-empty string.");
    valid = false;
  }
  if ("offset" in value && (typeof value.offset !== "string" || !/^[+-][0-9]{2}:[0-9]{2}$/.test(value.offset))) {
    structuralError(diagnostics, "history_2_temporal_position_offset_invalid", `${path}/offset`, "offset must use +HH:MM or -HH:MM form.");
    valid = false;
  }
  if ("approximation" in value && value.approximation !== "circa") {
    structuralError(diagnostics, "history_2_approximation_invalid", `${path}/approximation`, "The only initial approximation value is circa.");
    valid = false;
  }
  for (const field of ["temporalOrder", "order"]) {
    if (field in value) {
      structuralError(diagnostics, "history_2_temporal_order_scope_invalid", `${path}/${field}`, "temporalOrder belongs to a position assertion, not a Temporal Position.");
      valid = false;
    }
  }
  return valid;
}

function validateBoundary(value, path, diagnostics) {
  if (!isObject(value)) {
    structuralError(diagnostics, "history_2_boundary_invalid", path, "Temporal Boundary must be an object.");
    return false;
  }
  let valid = requireFields(value, ["occurrence"], path, diagnostics, "history_2_boundary");
  if (!["occurred", "not-occurred", "unknown"].includes(value.occurrence)) {
    structuralError(diagnostics, "history_2_boundary_occurrence_invalid", `${path}/occurrence`, "Boundary occurrence must be occurred, not-occurred, or unknown.");
    valid = false;
  }
  if ("inclusive" in value || "exclusive" in value) {
    structuralError(diagnostics, "history_2_boundary_membership_unsupported", path, "History 2.0 does not define inclusive or exclusive boundary membership.");
    valid = false;
  }
  if ("position" in value) valid = validateTemporalPosition(value.position, `${path}/position`, diagnostics) && valid;
  return valid;
}

export function validateHistory2Extension(value, basePath, diagnostics) {
  if (!isObject(value)) {
    structuralError(diagnostics, "history_2_invalid", basePath, "History 2.0 payload must be an object.");
    return { valid: false, assertions: [] };
  }
  let valid = true;
  if ("time" in value) {
    structuralError(diagnostics, "history_2_time_and_assertions_conflict", `${basePath}/time`, "History 2.0 uses assertions and must not contain the History 1.0 time field.");
    valid = false;
  }
  if (!Array.isArray(value.assertions) || value.assertions.length === 0) {
    structuralError(diagnostics, "history_2_assertions_invalid", `${basePath}/assertions`, "History 2.0 assertions must be a non-empty array.");
    return { valid: false, assertions: [] };
  }

  const assertions = [];
  const ids = new Set();
  for (const [index, assertion] of value.assertions.entries()) {
    const path = `${basePath}/assertions/${index}`;
    if (!isObject(assertion)) {
      structuralError(diagnostics, "history_2_assertion_invalid", path, "History assertion must be an object.");
      valid = false;
      continue;
    }
    let assertionValid = requireFields(assertion, ["id", "type"], path, diagnostics, "history_2_assertion");
    if (!nonEmpty(assertion.id)) {
      structuralError(diagnostics, "history_2_assertion_id_invalid", `${path}/id`, "History assertion id must be a non-empty string.");
      assertionValid = false;
    } else if (ids.has(assertion.id)) {
      structuralError(diagnostics, "history_2_assertion_id_duplicate", `${path}/id`, "History assertion ids must be unique within one payload.", [assertion.id]);
      assertionValid = false;
    } else {
      ids.add(assertion.id);
    }

    if (assertion.type === "position") {
      assertionValid = requireFields(assertion, ["position"], path, diagnostics, "history_2_position") && assertionValid;
      if ("position" in assertion) assertionValid = validateTemporalPosition(assertion.position, `${path}/position`, diagnostics) && assertionValid;
      if ("temporalOrder" in assertion && !Number.isInteger(assertion.temporalOrder)) {
        structuralError(diagnostics, "history_2_temporal_order_invalid", `${path}/temporalOrder`, "position assertion temporalOrder must be an integer.");
        assertionValid = false;
      }
      for (const field of ["earliest", "latest", "start", "end", "approximation"]) {
        if (field in assertion) {
          structuralError(diagnostics, "history_2_position_variant_field_invalid", `${path}/${field}`, "Position assertions must not contain another temporal shape or assertion-level approximation.");
          assertionValid = false;
        }
      }
    } else if (assertion.type === "bounded-point") {
      assertionValid = requireFields(assertion, ["earliest", "latest"], path, diagnostics, "history_2_bounded_point") && assertionValid;
      for (const field of ["earliest", "latest"]) {
        if (field in assertion) assertionValid = validateTemporalPosition(assertion[field], `${path}/${field}`, diagnostics) && assertionValid;
      }
      for (const field of ["position", "temporalOrder", "start", "end", "approximation"]) {
        if (field in assertion) {
          structuralError(diagnostics, "history_2_bounded_point_variant_field_invalid", `${path}/${field}`, "Bounded-point assertions must not contain another temporal shape or temporalOrder.");
          assertionValid = false;
        }
      }
    } else if (assertion.type === "temporal-extent") {
      assertionValid = requireFields(assertion, ["start", "end"], path, diagnostics, "history_2_temporal_extent") && assertionValid;
      for (const field of ["start", "end"]) {
        if (field in assertion) assertionValid = validateBoundary(assertion[field], `${path}/${field}`, diagnostics) && assertionValid;
      }
      for (const field of ["position", "temporalOrder", "earliest", "latest", "approximation"]) {
        if (field in assertion) {
          structuralError(diagnostics, "history_2_temporal_extent_variant_field_invalid", `${path}/${field}`, "Temporal-extent assertions must not contain another temporal shape or temporalOrder.");
          assertionValid = false;
        }
      }
    } else {
      structuralError(diagnostics, "history_2_assertion_type_unknown", `${path}/type`, "History 2.0 assertion type is unsupported.");
      assertionValid = false;
    }
    valid = assertionValid && valid;
    if (assertionValid) assertions.push({ assertion, path });
  }
  return { valid, assertions };
}

function rejectKnownFields(value, fields, path, diagnostics, code, message) {
  let valid = true;
  for (const field of fields) {
    if (field in value) {
      structuralError(diagnostics, code, `${path}/${field}`, message);
      valid = false;
    }
  }
  return valid;
}

export function validateRelativeTimeExtension(value, basePath, diagnostics) {
  if (!isObject(value)) {
    structuralError(diagnostics, "relative_time_invalid", basePath, "Relative Time payload must be an object.");
    return { valid: false, type: undefined };
  }
  let valid = true;
  if (typeof value.type !== "string") {
    structuralError(diagnostics, "relative_time_type_missing", `${basePath}/type`, "Relative Time type is required.");
    return { valid: false, type: undefined };
  }
  if (value.type === "relative-position") {
    valid = requireFields(value, ["relation"], basePath, diagnostics, "relative_time") && valid;
    if (!["before", "after", "same-instant"].includes(value.relation)) {
      structuralError(diagnostics, "relative_time_relation_invalid", `${basePath}/relation`, "Relative position relation is unsupported.");
      valid = false;
    }
    valid = rejectKnownFields(value, ["granularity", "displacement", "calendar", "direction", "value", "unit"], basePath, diagnostics, "relative_time_variant_field_invalid", "Relative-position payload contains a field from another variant.") && valid;
  } else if (value.type === "containment") {
    valid = requireFields(value, ["relation"], basePath, diagnostics, "relative_time") && valid;
    if (value.relation !== "within") {
      structuralError(diagnostics, "relative_time_containment_invalid", `${basePath}/relation`, "Containment relation must be within.");
      valid = false;
    }
    valid = rejectKnownFields(value, ["granularity", "displacement", "calendar", "direction", "value", "unit"], basePath, diagnostics, "relative_time_variant_field_invalid", "Containment payload contains a field from another variant.") && valid;
  } else if (value.type === "calendar-granule-relation") {
    valid = requireFields(value, ["granularity", "displacement"], basePath, diagnostics, "relative_time") && valid;
    if (!["year", "month", "day", "hour", "minute", "second"].includes(value.granularity)) {
      structuralError(diagnostics, "relative_time_granularity_invalid", `${basePath}/granularity`, "Calendar granularity is unsupported.");
      valid = false;
    }
    if (!Number.isInteger(value.displacement)) {
      structuralError(diagnostics, "relative_time_displacement_invalid", `${basePath}/displacement`, "Calendar displacement must be an integer.");
      valid = false;
    }
    if ("calendar" in value && !nonEmpty(value.calendar)) {
      structuralError(diagnostics, "relative_time_calendar_invalid", `${basePath}/calendar`, "Calendar identifier must be a non-empty string.");
      valid = false;
    }
    valid = rejectKnownFields(value, ["relation", "direction", "value", "unit"], basePath, diagnostics, "relative_time_variant_field_invalid", "Calendar-granule payload contains a field from another variant.") && valid;
  } else if (value.type === "elapsed-offset") {
    valid = requireFields(value, ["direction", "value", "unit"], basePath, diagnostics, "relative_time") && valid;
    if (!["before", "after"].includes(value.direction)) {
      structuralError(diagnostics, "relative_time_direction_invalid", `${basePath}/direction`, "Elapsed offset direction is unsupported.");
      valid = false;
    }
    if (!Number.isInteger(value.value) || value.value < 1) {
      structuralError(diagnostics, "relative_time_elapsed_value_invalid", `${basePath}/value`, "Elapsed offset value must be a positive integer.");
      valid = false;
    }
    if (!["second", "minute", "hour"].includes(value.unit)) {
      structuralError(diagnostics, "relative_time_elapsed_unit_invalid", `${basePath}/unit`, "Elapsed offset unit is unsupported.");
      valid = false;
    }
    valid = rejectKnownFields(value, ["relation", "granularity", "displacement", "calendar"], basePath, diagnostics, "relative_time_variant_field_invalid", "Elapsed-offset payload contains a field from another variant.") && valid;
  } else {
    structuralError(diagnostics, "relative_time_type_unknown", `${basePath}/type`, "Relative Time type is unsupported.");
    valid = false;
  }
  return { valid, type: valid ? value.type : undefined };
}

function comparablePosition(left, right) {
  if (!left || !right) return undefined;
  if (left.approximation !== undefined || right.approximation !== undefined) return undefined;
  const leftHasBasis = "timeZone" in left || "offset" in left;
  const rightHasBasis = "timeZone" in right || "offset" in right;
  if (leftHasBasis !== rightHasBasis) return undefined;
  if (leftHasBasis && (left.timeZone !== right.timeZone || left.offset !== right.offset)) return undefined;
  const leftPrecision = POSITION_FIELDS.reduce((last, field, index) => (field in left ? index : last), -1);
  const rightPrecision = POSITION_FIELDS.reduce((last, field, index) => (field in right ? index : last), -1);
  if (leftPrecision !== rightPrecision) return undefined;
  for (const field of POSITION_FIELDS) {
    if (!(field in left) || !(field in right)) break;
    if (left[field] < right[field]) return -1;
    if (left[field] > right[field]) return 1;
  }
  return undefined;
}

function cycleKeys(edges) {
  const adjacency = new Map();
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from).push(edge);
  }
  const cycles = new Map();
  for (const start of adjacency.keys()) {
    const visit = (current, path, seen) => {
      if (path.length > 32) return;
      for (const edge of adjacency.get(current) ?? []) {
        if (edge.to === start && path.length >= 2) {
          const nodes = [...path.map((item) => item.from), edge.to];
          const key = [...new Set(nodes)].sort().join("\u0000");
          if (!cycles.has(key)) cycles.set(key, [...path, edge]);
        } else if (!seen.has(edge.to)) {
          visit(edge.to, [...path, edge], new Set([...seen, edge.to]));
        }
      }
    };
    visit(start, [], new Set([start]));
  }
  return [...cycles.values()];
}

function deriveTwoStep(edges, relation) {
  if (cycleKeys(edges).length > 0) return [];
  const results = [];
  const seen = new Set();
  for (const first of edges) {
    for (const second of edges) {
      if (first.to !== second.from || first.from === second.to) continue;
      const key = `${first.from}\u0000${second.to}`;
      if (seen.has(key)) continue;
      if (edges.some((edge) => edge.from === second.to && edge.to === first.from)) continue;
      seen.add(key);
      results.push({
        kind: "derived",
        relation,
        ...(relation === "before"
          ? { beforeId: first.from, afterId: second.to }
          : { childId: first.from, containerId: second.to }),
        premises: [first.path, second.path],
      });
    }
  }
  return results;
}

function diagnoseHistory(historyCandidates, diagnostics) {
  for (const candidate of historyCandidates) {
    for (const { assertion, path } of candidate.assertions) {
      if (assertion.type === "bounded-point") {
        if (comparablePosition(assertion.earliest, assertion.latest) === 1) {
          conflictWarning(diagnostics, "history_2_bounded_point_bounds_reversed", path, "Bounded-point earliest is clearly later than latest.", [assertion.id]);
        }
      }
      if (assertion.type === "temporal-extent") {
        const start = assertion.start.position;
        const end = assertion.end.position;
        if (comparablePosition(start, end) === 1) {
          conflictWarning(diagnostics, "history_2_temporal_extent_boundaries_reversed", path, "Temporal-extent start is clearly later than end.", [assertion.id]);
        }
      }
    }
  }
}

function diagnoseRelative(relativeCandidates, diagnostics) {
  const beforeEdges = [];
  const withinEdges = [];
  for (const candidate of relativeCandidates) {
    const { payload, path, sourceId, targetId } = candidate;
    if (payload.type === "calendar-granule-relation" && payload.calendar !== undefined && payload.calendar !== "gregorian") {
      unsupportedWarning(diagnostics, "temporal_calendar_unsupported", `${path}/calendar`, "Calendar identifier is preserved but not semantically evaluated.", [sourceId, targetId]);
    }
    if (payload.type === "relative-position") {
      if (payload.relation === "before") beforeEdges.push({ from: targetId, to: sourceId, path });
      if (payload.relation === "after") beforeEdges.push({ from: sourceId, to: targetId, path });
    }
    if (payload.type === "containment" && payload.relation === "within") {
      withinEdges.push({ from: targetId, to: sourceId, path });
    }
  }

  const beforePairs = new Set();
  for (const edge of beforeEdges) {
    const reverse = beforeEdges.find((candidate) => candidate.from === edge.to && candidate.to === edge.from);
    if (!reverse) continue;
    const key = [edge.from, edge.to].sort().join("\u0000");
    if (beforePairs.has(key)) continue;
    beforePairs.add(key);
    conflictWarning(diagnostics, "temporal_before_conflict", edge.path, "Recorded before assertions contradict each other.", [edge.from, edge.to]);
  }
  for (const cycle of cycleKeys(beforeEdges)) {
    const nodes = [...new Set(cycle.flatMap((edge) => [edge.from, edge.to]))];
    conflictWarning(diagnostics, "temporal_before_cycle", cycle[0].path, "Recorded before assertions contain a strict cycle.", nodes);
  }
  for (const cycle of cycleKeys(withinEdges)) {
    const nodes = [...new Set(cycle.flatMap((edge) => [edge.from, edge.to]))];
    conflictWarning(diagnostics, "temporal_within_cycle", cycle[0].path, "Recorded within assertions contain a containment cycle.", nodes);
  }
  return [
    ...deriveTwoStep(beforeEdges, "before"),
    ...deriveTwoStep(withinEdges, "within"),
  ];
}

export function collectTemporalDiagnostics({ historyCandidates = [], relativeCandidates = [] }) {
  const diagnostics = [];
  diagnoseHistory(historyCandidates, diagnostics);
  const derived = diagnoseRelative(relativeCandidates, diagnostics);
  return { diagnostics, derived };
}

export function supportedCandidateFeatures(extension, version, features) {
  const expected = extension === HISTORY_EXTENSION_ID && version === HISTORY_VERSION
    ? HISTORY_FEATURES
    : extension === RELATIVE_TIME_EXTENSION_ID && version === RELATIVE_TIME_VERSION
      ? RELATIVE_TIME_FEATURES
      : new Set();
  return [...(features ?? [])].every((feature) => expected.has(feature)
    && isLocallySupportedFeature(extension, version, feature));
}

export function usedHistory2Features(historyCandidates) {
  const features = new Set();
  for (const candidate of historyCandidates) {
    if (candidate.assertions.length > 1) features.add("multiple-assertions");
    for (const { assertion } of candidate.assertions) {
      if (assertion.type === "bounded-point") features.add("bounded-point");
      if (assertion.type === "temporal-extent") features.add("temporal-extent");
      const positions = [
        assertion.position,
        assertion.earliest,
        assertion.latest,
        assertion.start?.position,
        assertion.end?.position,
      ];
      if (positions.some((position) => position?.approximation !== undefined)) features.add("approximation");
    }
  }
  return features;
}

export function usedRelativeTimeFeatures(relativeCandidates) {
  return new Set(relativeCandidates.map(({ payload }) => payload.type));
}
