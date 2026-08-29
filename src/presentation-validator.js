import { diagnostic, SEVERITIES } from "./diagnostics.js";

export const PRESENTATION_EXTENSION_ID =
  "draft.github.sukoyaka-dopeness.liaisonscape-presentation";
export const PRESENTATION_VERSION = "0.1.0";

const KNOWN_ARROWS = new Set(["normal", "reverse", "undirected", "bidirectional"]);
const KNOWN_LINE_STYLES = new Set(["solid", "dashed", "dotted"]);
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const pointer = (value) => String(value).replaceAll("~", "~0").replaceAll("/", "~1");

function error(code, path) { return diagnostic(SEVERITIES.ERROR, code, path); }
function warning(code, path) { return diagnostic(SEVERITIES.WARNING, code, path); }

export function validatePresentationExtension(occurrences, relationIds) {
  const diagnostics = [];
  for (const { value, path } of occurrences) {
    if (!isObject(value)) {
      diagnostics.push(error("presentation_payload_invalid", path));
      continue;
    }
    if (!("specVersion" in value)) {
      diagnostics.push(error("presentation_spec_version_missing", `${path}/specVersion`));
      continue;
    }
    if (value.specVersion !== PRESENTATION_VERSION) {
      if (!nonEmpty(value.specVersion)) diagnostics.push(error("presentation_spec_version_invalid", `${path}/specVersion`));
      else diagnostics.push(warning("presentation_version_unsupported", `${path}/specVersion`));
      continue;
    }
    if (!isObject(value.relations)) {
      diagnostics.push(error("presentation_relations_invalid", `${path}/relations`));
      continue;
    }
    for (const [relationId, record] of Object.entries(value.relations)) {
      const recordPath = `${path}/relations/${pointer(relationId)}`;
      if (!nonEmpty(relationId)) {
        diagnostics.push(error("presentation_relation_id_invalid", recordPath));
        continue;
      }
      if (!isObject(record)) {
        diagnostics.push(error("presentation_relation_record_invalid", recordPath));
      } else {
        const keys = Object.keys(record);
        if (keys.length === 0) diagnostics.push(error("presentation_relation_record_empty", recordPath));
        if ("arrowDisplay" in record && !nonEmpty(record.arrowDisplay)) diagnostics.push(error("presentation_arrow_display_invalid", `${recordPath}/arrowDisplay`));
        if ("lineStyle" in record && !nonEmpty(record.lineStyle)) diagnostics.push(error("presentation_line_style_invalid", `${recordPath}/lineStyle`));
        if ("arrowDisplay" in record && nonEmpty(record.arrowDisplay) && KNOWN_ARROWS.has(record.arrowDisplay)) { /* supported */ }
        if ("lineStyle" in record && nonEmpty(record.lineStyle) && KNOWN_LINE_STYLES.has(record.lineStyle)) { /* supported */ }
      }
      if (!relationIds.has(relationId)) {
        diagnostics.push(warning("presentation_orphan_relation", recordPath));
      }
    }
  }
  return diagnostics;
}
