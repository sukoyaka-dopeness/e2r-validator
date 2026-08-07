import { diagnostic, SEVERITIES } from "./diagnostics.js";

const recognized = new Set(["metadata", "history"]);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

export function validateExtensions(dataset) {
  const diagnostics = [];
  if (!("extensions" in dataset)) return diagnostics;
  if (typeof dataset.extensions !== "object" || dataset.extensions === null || Array.isArray(dataset.extensions)) {
    diagnostics.push(diagnostic(SEVERITIES.ERROR, "extensions_invalid", "/extensions"));
    return diagnostics;
  }
  for (const name of Object.keys(dataset.extensions)) {
    const value = dataset.extensions[name];
    if (!recognized.has(name)) {
      diagnostics.push(diagnostic(SEVERITIES.WARNING, "unknown_extension", `/extensions/${name.replaceAll("~", "~0").replaceAll("/", "~1")}`));
      continue;
    }
    if (name === "metadata") validateMetadata(value, diagnostics);
    if (name === "history") validateHistory(value, diagnostics);
  }
  return diagnostics;
}

function validateMetadata(value, diagnostics) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    diagnostics.push(diagnostic(SEVERITIES.ERROR, "metadata_invalid", "/extensions/metadata"));
    return;
  }
  for (const field of ["datasetId", "title"]) {
    if (field in value && !nonEmpty(value[field])) {
      diagnostics.push(diagnostic(SEVERITIES.ERROR, `metadata_${field}_invalid`, `/extensions/metadata/${field}`));
    }
  }
}

function validateHistory(value, diagnostics) {
  const base = "/extensions/history";
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
