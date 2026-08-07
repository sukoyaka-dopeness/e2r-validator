#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { diagnostic, EXIT_CODES, SEVERITIES, validationResult, exitCodeForResult } from "./diagnostics.js";
import { validateCoreDataset } from "./core-validator.js";

const filePath = process.argv[2];

if (filePath === "--help" || filePath === "-h") {
  console.log("Usage: e2r-validator <dataset.json>");
  console.log("Exit codes: 0 valid, 1 validation error, 2 input error");
  process.exit(EXIT_CODES.VALID);
}

if (filePath === "--version" || filePath === "-v") {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  console.log(`e2r-validator ${packageJson.version}`);
  process.exit(EXIT_CODES.VALID);
}

if (!filePath) {
  console.error("Usage: e2r-validator <dataset.json>");
  process.exit(EXIT_CODES.INPUT_ERROR);
}

let text;
try {
  text = await readFile(filePath, "utf8");
} catch (error) {
  console.log(JSON.stringify(validationResult([
    diagnostic(SEVERITIES.ERROR, "input_read_error", ""),
  ]), null, 2));
  process.exit(EXIT_CODES.INPUT_ERROR);
}

let value;
try {
  value = JSON.parse(text);
} catch {
  console.log(JSON.stringify(validationResult([
    diagnostic(SEVERITIES.ERROR, "json_parse_error", ""),
  ]), null, 2));
  process.exit(EXIT_CODES.INPUT_ERROR);
}

const result = validateCoreDataset(value);
console.log(JSON.stringify(result, null, 2));
process.exit(exitCodeForResult(result));
