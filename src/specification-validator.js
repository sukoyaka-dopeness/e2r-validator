import { diagnostic, SEVERITIES } from "./diagnostics.js";
import { COORDINATE_EXTENSION_ID, COORDINATE_VERSION } from "./coordinate-validator.js";
import {
  COORDINATE_DRAFT_EXTENSION_ID,
  COORDINATE_DRAFT_VERSION,
} from "./coordinate-draft-validator.js";

export const SPECIFICATION_EXTENSION_ID = "draft.github.sukoyaka-dopeness.specification";
export const SPECIFICATION_VERSION = "0.1.0";

const VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const VERSION_SOURCE = "(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)";
const RANGE_PATTERN = new RegExp(`^(?:>=|<=|=|>|<)${VERSION_SOURCE}(?: (?:>=|<=|=|>|<)${VERSION_SOURCE})*$`);
const FEATURE_PATTERN = /^[a-z][a-z0-9-]*$/;
const LIFECYCLE_STATUSES = new Set(["draft", "experimental", "stable", "deprecated", "archived"]);
const EVOLUTION_TYPES = new Set(["supersedes", "splitInto", "mergedFrom"]);

const LOCAL_SUPPORT = new Map([
  ["metadata", { versions: new Set(["1.0.0"]), features: new Set() }],
  ["history", { versions: new Set(["1.0.0"]), features: new Set() }],
  [COORDINATE_EXTENSION_ID, { versions: new Set([COORDINATE_VERSION]), features: new Set() }],
  [COORDINATE_DRAFT_EXTENSION_ID, {
    versions: new Set([COORDINATE_DRAFT_VERSION]),
    features: new Set(),
  }],
]);

export function isLocallySupportedSpecification(extension, version) {
  return LOCAL_SUPPORT.get(extension)?.versions.has(version) ?? false;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function add(diagnostics, severity, code, path) {
  diagnostics.push(diagnostic(severity, code, path));
}

function versionValid(value) {
  return typeof value === "string" && VERSION_PATTERN.test(value);
}

function featureValid(value) {
  return typeof value === "string" && FEATURE_PATTERN.test(value);
}

function referenceKey(reference) {
  return `${reference.extension}\u0000${reference.version}`;
}

function parseVersion(value) {
  return value.split(".").map((part) => BigInt(part));
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] < b[index]) return -1;
    if (a[index] > b[index]) return 1;
  }
  return 0;
}

function satisfies(version, constraint) {
  if (constraint.version !== undefined) return version === constraint.version;
  return constraint.range.split(" ").every((comparator) => {
    const match = /^(>=|<=|=|>|<)(.+)$/.exec(comparator);
    const comparison = compareVersions(version, match[2]);
    if (match[1] === ">=") return comparison >= 0;
    if (match[1] === "<=") return comparison <= 0;
    if (match[1] === ">") return comparison > 0;
    if (match[1] === "<") return comparison < 0;
    return comparison === 0;
  });
}

function warnVersionUnspecified(occurrences, diagnostics) {
  for (const extension of LOCAL_SUPPORT.keys()) {
    const occurrence = occurrences.get(extension)?.[0];
    if (occurrence) {
      if (
        (extension === COORDINATE_EXTENSION_ID || extension === COORDINATE_DRAFT_EXTENSION_ID)
        && occurrences.get(extension)?.some(({ path, value }) =>
          path === `/extensions/${extension}`
          && isObject(value)
          && versionValid(
            extension === COORDINATE_EXTENSION_ID ? value.formatVersion : value.specVersion,
          ),
        )
      ) continue;
      add(diagnostics, SEVERITIES.WARNING, "extension_version_unspecified", occurrence.path);
    }
  }
}

function validateFeatureArray(value, path, diagnostics) {
  if (!Array.isArray(value)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_features_invalid", path);
    return { valid: false, features: new Set() };
  }

  let valid = true;
  const features = new Set();
  for (const [index, feature] of value.entries()) {
    const featurePath = `${path}/${index}`;
    if (!featureValid(feature)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_feature_invalid", featurePath);
      valid = false;
    } else if (features.has(feature)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_feature_duplicate", featurePath);
      valid = false;
    } else {
      features.add(feature);
    }
  }
  return { valid, features };
}

function validateUses(value, path, diagnostics) {
  if (value === undefined) return { valid: true, declarations: new Map() };
  if (!Array.isArray(value)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_uses_invalid", path);
    return { valid: false, declarations: new Map() };
  }

  let valid = true;
  const declarations = new Map();
  for (const [index, item] of value.entries()) {
    const itemPath = `${path}/${index}`;
    if (!isObject(item)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_use_invalid", itemPath);
      valid = false;
      continue;
    }

    let itemValid = true;
    if (!nonEmptyString(item.extension)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_extension_invalid", `${itemPath}/extension`);
      itemValid = false;
    }
    if (!versionValid(item.version)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_version_invalid", `${itemPath}/version`);
      itemValid = false;
    }

    let features = new Set();
    if ("features" in item) {
      const featureResult = validateFeatureArray(item.features, `${itemPath}/features`, diagnostics);
      features = featureResult.features;
      itemValid &&= featureResult.valid;
    }

    if (nonEmptyString(item.extension) && item.extension === SPECIFICATION_EXTENSION_ID) {
      add(diagnostics, SEVERITIES.ERROR, "specification_self_declaration", `${itemPath}/extension`);
      itemValid = false;
    }

    const support = LOCAL_SUPPORT.get(item.extension);
    if (support?.versions.has(item.version) && support.features.size === 0 && "features" in item) {
      add(diagnostics, SEVERITIES.ERROR, "specification_features_not_defined", `${itemPath}/features`);
      itemValid = false;
    }

    if (!itemValid) {
      valid = false;
      continue;
    }

    if (declarations.has(item.extension)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_declaration_duplicate", `${itemPath}/extension`);
      valid = false;
      continue;
    }

    declarations.set(item.extension, {
      extension: item.extension,
      version: item.version,
      features,
      path: itemPath,
    });
  }

  return { valid, declarations };
}

function validateReference(value, path, diagnostics) {
  if (!isObject(value)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_reference_invalid", path);
    return undefined;
  }
  let valid = true;
  if (!nonEmptyString(value.extension)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_reference_invalid", `${path}/extension`);
    valid = false;
  }
  if (!versionValid(value.version)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_reference_invalid", `${path}/version`);
    valid = false;
  }
  return valid ? { extension: value.extension, version: value.version } : undefined;
}

function validateFeatureDefinitions(value, path, diagnostics) {
  if (value === undefined) return { valid: true, features: new Set() };
  if (!Array.isArray(value)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_definition_features_invalid", path);
    return { valid: false, features: new Set() };
  }

  let valid = true;
  const features = new Set();
  for (const [index, item] of value.entries()) {
    const itemPath = `${path}/${index}`;
    if (!isObject(item) || !featureValid(item.feature)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_definition_feature_invalid", itemPath);
      valid = false;
      continue;
    }
    if (features.has(item.feature)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_definition_feature_duplicate", `${itemPath}/feature`);
      valid = false;
    } else {
      features.add(item.feature);
    }
    for (const field of ["displayName", "description"]) {
      if (field in item && typeof item[field] !== "string") {
        add(diagnostics, SEVERITIES.ERROR, "specification_field_invalid", `${itemPath}/${field}`);
        valid = false;
      }
    }
  }
  return { valid, features };
}

function validateDependency(value, path, sourceFeatures, diagnostics) {
  if (!isObject(value)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_dependency_invalid", path);
    return undefined;
  }

  let valid = true;
  if ("sourceFeature" in value) {
    if (!featureValid(value.sourceFeature)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_feature_invalid", `${path}/sourceFeature`);
      valid = false;
    } else if (!sourceFeatures.has(value.sourceFeature)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_dependency_source_feature_unknown", `${path}/sourceFeature`);
      valid = false;
    }
  }

  let target;
  if (!isObject(value.target) || !nonEmptyString(value.target.extension)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_dependency_target_invalid", `${path}/target`);
    valid = false;
  } else if ("feature" in value.target && !featureValid(value.target.feature)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_feature_invalid", `${path}/target/feature`);
    valid = false;
  } else {
    target = {
      extension: value.target.extension,
      feature: value.target.feature,
    };
  }

  const hasVersion = "version" in value;
  const hasRange = "range" in value;
  if (hasVersion === hasRange) {
    add(diagnostics, SEVERITIES.ERROR, "specification_dependency_constraint_invalid", path);
    valid = false;
  } else if (hasVersion && !versionValid(value.version)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_dependency_constraint_invalid", `${path}/version`);
    valid = false;
  } else if (hasRange && (typeof value.range !== "string" || !RANGE_PATTERN.test(value.range))) {
    add(diagnostics, SEVERITIES.ERROR, "specification_dependency_constraint_invalid", `${path}/range`);
    valid = false;
  }

  if (!valid) return undefined;
  return {
    sourceFeature: value.sourceFeature,
    target,
    version: value.version,
    range: value.range,
    path,
  };
}

function validateDependencyArray(value, path, sourceFeatures, diagnostics) {
  if (value === undefined) return { valid: true, dependencies: [] };
  if (!Array.isArray(value)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_dependencies_invalid", path);
    return { valid: false, dependencies: [] };
  }
  let valid = true;
  const dependencies = [];
  for (const [index, item] of value.entries()) {
    const dependency = validateDependency(item, `${path}/${index}`, sourceFeatures, diagnostics);
    if (dependency) dependencies.push(dependency);
    else valid = false;
  }
  return { valid, dependencies };
}

function validateDefinitions(value, path, diagnostics) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_definitions_invalid", path);
    return [];
  }

  const definitions = [];
  const seen = new Set();
  for (const [index, item] of value.entries()) {
    const itemPath = `${path}/${index}`;
    if (!isObject(item)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_definition_invalid", itemPath);
      continue;
    }

    let valid = true;
    if (!nonEmptyString(item.extension)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_extension_invalid", `${itemPath}/extension`);
      valid = false;
    }
    if (!versionValid(item.version)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_version_invalid", `${itemPath}/version`);
      valid = false;
    }
    for (const field of ["displayName", "purpose"]) {
      if (field in item && typeof item[field] !== "string") {
        add(diagnostics, SEVERITIES.ERROR, "specification_field_invalid", `${itemPath}/${field}`);
        valid = false;
      }
    }
    if ("documentation" in item) {
      if (!Array.isArray(item.documentation) || item.documentation.some((entry) => !nonEmptyString(entry))) {
        add(diagnostics, SEVERITIES.ERROR, "specification_documentation_invalid", `${itemPath}/documentation`);
        valid = false;
      }
    }

    const featureResult = validateFeatureDefinitions(item.features, `${itemPath}/features`, diagnostics);
    valid &&= featureResult.valid;
    const requires = validateDependencyArray(item.requires, `${itemPath}/requires`, featureResult.features, diagnostics);
    const optionallyUses = validateDependencyArray(item.optionallyUses, `${itemPath}/optionallyUses`, featureResult.features, diagnostics);
    const compatibleWith = validateDependencyArray(item.compatibleWith, `${itemPath}/compatibleWith`, featureResult.features, diagnostics);
    valid &&= requires.valid && optionallyUses.valid && compatibleWith.valid;

    if (!valid) continue;
    const key = `${item.extension}\u0000${item.version}`;
    if (seen.has(key)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_definition_duplicate", itemPath);
      continue;
    }
    seen.add(key);
    definitions.push({
      extension: item.extension,
      version: item.version,
      features: featureResult.features,
      requires: requires.dependencies,
      optionallyUses: optionallyUses.dependencies,
      compatibleWith: compatibleWith.dependencies,
      path: itemPath,
    });
  }
  return definitions;
}

function validateLifecycle(value, path, diagnostics) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_lifecycle_invalid", path);
    return;
  }
  for (const [index, item] of value.entries()) {
    const itemPath = `${path}/${index}`;
    if (!isObject(item)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_lifecycle_invalid", itemPath);
      continue;
    }
    validateReference(item.specification, `${itemPath}/specification`, diagnostics);
    if (!LIFECYCLE_STATUSES.has(item.status)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_lifecycle_status_invalid", `${itemPath}/status`);
    }
    if ("note" in item && typeof item.note !== "string") {
      add(diagnostics, SEVERITIES.ERROR, "specification_field_invalid", `${itemPath}/note`);
    }
    if ("deprecatedBy" in item) {
      if (!Array.isArray(item.deprecatedBy) || item.deprecatedBy.length === 0) {
        add(diagnostics, SEVERITIES.ERROR, "specification_deprecated_by_invalid", `${itemPath}/deprecatedBy`);
      } else {
        for (const [targetIndex, target] of item.deprecatedBy.entries()) {
          validateReference(target, `${itemPath}/deprecatedBy/${targetIndex}`, diagnostics);
        }
      }
    }
  }
}

function validateEvolution(value, path, diagnostics) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_evolution_invalid", path);
    return;
  }
  for (const [index, item] of value.entries()) {
    const itemPath = `${path}/${index}`;
    if (!isObject(item)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_evolution_invalid", itemPath);
      continue;
    }
    if (!EVOLUTION_TYPES.has(item.type)) {
      add(diagnostics, SEVERITIES.ERROR, "specification_evolution_type_invalid", `${itemPath}/type`);
    }
    validateReference(item.source, `${itemPath}/source`, diagnostics);
    if (!Array.isArray(item.targets) || item.targets.length === 0) {
      add(diagnostics, SEVERITIES.ERROR, "specification_evolution_targets_invalid", `${itemPath}/targets`);
      continue;
    }
    const seen = new Set();
    for (const [targetIndex, target] of item.targets.entries()) {
      const targetPath = `${itemPath}/targets/${targetIndex}`;
      const reference = validateReference(target, targetPath, diagnostics);
      if (!reference) continue;
      const key = referenceKey(reference);
      if (seen.has(key)) {
        add(diagnostics, SEVERITIES.ERROR, "specification_evolution_target_duplicate", targetPath);
      } else {
        seen.add(key);
      }
    }
  }
}

function validateTargetFeatures(definitions, diagnostics) {
  for (const definition of definitions) {
    for (const dependency of [...definition.requires, ...definition.optionallyUses, ...definition.compatibleWith]) {
      if (!dependency.target.feature) continue;
      const matchingFeatureSets = definitions
        .filter((candidate) => (
          candidate.extension === dependency.target.extension && satisfies(candidate.version, dependency)
        ))
        .map((candidate) => candidate.features);
      const localSupport = LOCAL_SUPPORT.get(dependency.target.extension);
      if (localSupport) {
        for (const version of localSupport.versions) {
          if (satisfies(version, dependency)) matchingFeatureSets.push(localSupport.features);
        }
      }
      if (matchingFeatureSets.length > 0 && matchingFeatureSets.some((features) => !features.has(dependency.target.feature))) {
        add(diagnostics, SEVERITIES.ERROR, "specification_dependency_target_feature_unknown", `${dependency.path}/target/feature`);
      }
    }
  }
}

function evaluateRequiredDependencies(definitions, declarations, occurrences, diagnostics) {
  const definitionsByKey = new Map(definitions.map((definition) => [
    `${definition.extension}\u0000${definition.version}`,
    definition,
  ]));

  for (const declaration of declarations.values()) {
    const definition = definitionsByKey.get(`${declaration.extension}\u0000${declaration.version}`);
    if (!definition) continue;
    for (const dependency of definition.requires) {
      if (dependency.sourceFeature && !declaration.features.has(dependency.sourceFeature)) continue;
      const targetDeclaration = declarations.get(dependency.target.extension);
      const targetPayload = occurrences.get(dependency.target.extension)?.[0];
      const targetFeaturePresent = !dependency.target.feature || targetDeclaration?.features.has(dependency.target.feature);
      if (!targetDeclaration || !targetPayload || !targetFeaturePresent) {
        add(diagnostics, SEVERITIES.ERROR, "specification_required_dependency_missing", `${dependency.path}/target`);
        continue;
      }
      if (!satisfies(targetDeclaration.version, dependency)) {
        add(diagnostics, SEVERITIES.ERROR, "specification_required_dependency_version_mismatch", `${dependency.path}/${dependency.version === undefined ? "range" : "version"}`);
        continue;
      }
      const support = LOCAL_SUPPORT.get(targetDeclaration.extension);
      if (!support || !support.versions.has(targetDeclaration.version)) {
        add(diagnostics, SEVERITIES.WARNING, "specification_required_dependency_unsupported", `${dependency.path}/target`);
      }
    }
  }
}

function reportDeclarationSupport(declarations, occurrences, diagnostics) {
  for (const declaration of declarations.values()) {
    if (!occurrences.has(declaration.extension)) continue;
    const support = LOCAL_SUPPORT.get(declaration.extension);
    if (!support) {
      add(diagnostics, SEVERITIES.WARNING, "specification_unavailable", `${declaration.path}/extension`);
    } else if (!support.versions.has(declaration.version)) {
      add(diagnostics, SEVERITIES.WARNING, "specification_version_unsupported", `${declaration.path}/version`);
    }
  }
}

export function validateSpecificationExtension(payload, basePath, occurrences) {
  const diagnostics = [];
  if (payload === undefined) {
    warnVersionUnspecified(occurrences, diagnostics);
    return { diagnostics, declarations: new Map(), supported: false };
  }
  if (!isObject(payload)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_invalid", basePath);
    warnVersionUnspecified(occurrences, diagnostics);
    return { diagnostics, declarations: new Map(), supported: false };
  }
  if (!("specVersion" in payload)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_spec_version_missing", `${basePath}/specVersion`);
    warnVersionUnspecified(occurrences, diagnostics);
    return { diagnostics, declarations: new Map(), supported: false };
  }
  if (!versionValid(payload.specVersion)) {
    add(diagnostics, SEVERITIES.ERROR, "specification_spec_version_invalid", `${basePath}/specVersion`);
    warnVersionUnspecified(occurrences, diagnostics);
    return { diagnostics, declarations: new Map(), supported: false };
  }
  if (payload.specVersion !== SPECIFICATION_VERSION) {
    add(diagnostics, SEVERITIES.WARNING, "specification_version_unsupported", `${basePath}/specVersion`);
    warnVersionUnspecified(occurrences, diagnostics);
    return { diagnostics, declarations: new Map(), supported: false };
  }

  const uses = validateUses(payload.uses, `${basePath}/uses`, diagnostics);
  const definitions = validateDefinitions(payload.definitions, `${basePath}/definitions`, diagnostics);
  validateTargetFeatures(definitions, diagnostics);
  validateLifecycle(payload.lifecycle, `${basePath}/lifecycle`, diagnostics);
  validateEvolution(payload.evolution, `${basePath}/evolution`, diagnostics);

  if (uses.valid) {
    const payloadExtensions = new Set([...occurrences.keys()].filter((name) => name !== SPECIFICATION_EXTENSION_ID));
    for (const declaration of uses.declarations.values()) {
      if (!payloadExtensions.has(declaration.extension)) {
        add(diagnostics, SEVERITIES.ERROR, "specification_declared_payload_missing", `${declaration.path}/extension`);
      }
    }
    for (const extension of payloadExtensions) {
      if (!uses.declarations.has(extension)) {
        add(diagnostics, SEVERITIES.ERROR, "specification_declaration_missing", occurrences.get(extension)[0].path);
      }
    }
    reportDeclarationSupport(uses.declarations, occurrences, diagnostics);
    evaluateRequiredDependencies(definitions, uses.declarations, occurrences, diagnostics);
  }

  return {
    diagnostics,
    declarations: uses.valid ? uses.declarations : new Map(),
    supported: true,
  };
}
